import "./config.js";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const databasePath = resolve(process.env.DATA_DIR ?? "data", "database.json");
const isProduction = process.env.NODE_ENV === "production";
const sessionLifetime = 30 * 24 * 60 * 60 * 1000;
const attempts = new Map();
const database = loadDatabase();

function loadDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  if (!existsSync(databasePath)) return { users: [], groups: [], sessions: [] };
  const parsed = JSON.parse(readFileSync(databasePath, "utf8"));
  if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.sessions)) {
    throw new Error("La base de datos local tiene un formato inválido.");
  }
  return parsed;
}

function persistDatabase() {
  writeFileSync(databasePath, JSON.stringify(database, null, 2), { mode: 0o600 });
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(password, salt, 64);
  return { salt, hash: derivedKey.toString("hex") };
}

function safeEqualHex(first, second) {
  if (first.length !== second.length || first.length % 2 !== 0) return false;
  return timingSafeEqual(Buffer.from(first, "hex"), Buffer.from(second, "hex"));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function cookieOptions(maxAge) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function setSessionCookie(response, token, maxAge = sessionLifetime / 1000) {
  response.setHeader("Set-Cookie", `manantial_session=${token}; ${cookieOptions(maxAge)}`);
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `manantial_session=; ${cookieOptions(0)}`);
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error("La solicitud es demasiado grande.");
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new Error("El cuerpo de la solicitud debe ser JSON válido.");
  }
}

function getSession(request) {
  const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("manantial_session="));
  const token = cookie?.slice("manantial_session=".length);
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = database.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    database.sessions = database.sessions.filter((item) => item !== session);
    persistDatabase();
    return null;
  }
  const user = database.users.find((item) => item.id === session.userId);
  return user ? { session, user } : null;
}

function rateLimit(request) {
  const ip = request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= 10;
}

function isDayList(value) {
  return Array.isArray(value) && value.length <= 365 && value.every((day) => Number.isInteger(day) && day >= 1 && day <= 365);
}

function makeGroup(name, admin) {
  let code;
  do {
    code = randomBytes(5).toString("hex").toUpperCase();
  } while (database.groups.some((group) => group.code === code));
  return {
    id: randomBytes(12).toString("hex"),
    name,
    code,
    createdBy: admin.id,
    createdAt: new Date().toISOString(),
  };
}

function groupWithMembers(group) {
  const members = database.users
    .filter((user) => user.groupId === group.id)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      completedCount: user.completed.length,
      progress: Math.round((user.completed.length / 365) * 100),
      lastActive: user.lastActive,
    }));
  return { ...group, members };
}

function adminGroup(admin, groupId) {
  return database.groups.find((group) => group.id === groupId && group.createdBy === admin.id) ?? null;
}

function managedUser(user, admin) {
  const group = user.groupId ? adminGroup(admin, user.groupId) : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    groupId: group?.id ?? null,
    groupName: group?.name ?? null,
    completedCount: user.completed.length,
    progress: Math.round((user.completed.length / 365) * 100),
    createdAt: user.createdAt,
    lastActive: user.lastActive,
  };
}

async function createAccount({ name, email, password, groupCode = "" }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";
  if (cleanName.length < 2 || cleanName.length > 80) throw new Error("Escribe un nombre de 2 a 80 caracteres.");
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Escribe un correo electrónico válido.");
  if (cleanPassword.length < 10 || cleanPassword.length > 128) throw new Error("La contraseña debe tener entre 10 y 128 caracteres.");
  if (database.users.some((user) => user.email === cleanEmail)) throw new Error("Ya existe una cuenta con ese correo.");

  let groupId = null;
  if (groupCode) {
    const group = database.groups.find((item) => item.code === String(groupCode).trim().toUpperCase());
    if (!group) throw new Error("El código de invitación no es válido.");
    groupId = group.id;
  }
  const credentials = await hashPassword(cleanPassword);
  const user = {
    id: randomBytes(12).toString("hex"),
    name: cleanName,
    email: cleanEmail,
    ...credentials,
    role: "user",
    groupId,
    completed: [],
    saved: [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  database.users.push(user);
  persistDatabase();
  return user;
}

function createSession(user, response) {
  const token = randomBytes(32).toString("hex");
  database.sessions = database.sessions.filter((session) => session.expiresAt > Date.now());
  database.sessions.push({ tokenHash: createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: Date.now() + sessionLifetime });
  persistDatabase();
  setSessionCookie(response, token);
}

function requireUser(request, response, adminOnly = false) {
  const authenticated = getSession(request);
  if (!authenticated) {
    json(response, 401, { error: "Inicia sesión para continuar." });
    return null;
  }
  if (adminOnly && authenticated.user.role !== "admin") {
    json(response, 403, { error: "Esta función es exclusiva del administrador." });
    return null;
  }
  return authenticated.user;
}

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  const minimumLength = isProduction ? 12 : 8;
  if (!email || !password || password.length < minimumLength) {
    throw new Error(`Configura ADMIN_EMAIL y ADMIN_PASSWORD (mínimo ${minimumLength} caracteres) juntos.`);
  }
  const existing = database.users.find((user) => user.email === email);
  if (existing) {
    if (existing.role !== "admin") throw new Error("ADMIN_EMAIL ya pertenece a una cuenta que no es administradora.");
    return;
  }
  await createAdminAccount(email, password);
  persistDatabase();
}

async function createAdminAccount(email, password) {
  // Fuera de producción se permite un nombre de usuario simple (por ejemplo "admin") para uso local.
  const validIdentifier = isProduction ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/ : /^([^\s@]+@[^\s@]+\.[^\s@]+|[a-z0-9._-]{3,64})$/;
  if (!validIdentifier.test(email)) throw new Error("ADMIN_EMAIL no es un correo o usuario válido.");
  const credentials = await hashPassword(password);
  const admin = {
    id: randomBytes(12).toString("hex"),
    name: "Administrador",
    email,
    ...credentials,
    role: "admin",
    groupId: null,
    completed: [],
    saved: [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  database.users.push(admin);
  return admin;
}

await bootstrapAdmin();

export async function handleAuthRequest(request, response, url) {
  const { pathname } = url;
  if (!["/api/auth", "/api/progress", "/api/groups", "/api/users"].some((prefix) => pathname.startsWith(prefix))) return false;

  if (pathname === "/api/auth" && request.method === "GET") {
    const authenticated = getSession(request);
    json(response, 200, { user: authenticated ? publicUser(authenticated.user) : null });
    return true;
  }

  if (pathname === "/api/auth/register" && request.method === "POST") {
    if (!rateLimit(request)) {
      json(response, 429, { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." });
      return true;
    }
    try {
      const user = await createAccount(await readBody(request));
      createSession(user, response);
      json(response, 201, { user: publicUser(user) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    if (!rateLimit(request)) {
      json(response, 429, { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." });
      return true;
    }
    try {
      const { email, password } = await readBody(request);
      const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      const user = database.users.find((item) => item.email === cleanEmail);
      if (!user || typeof password !== "string") {
        await hashPassword(typeof password === "string" ? password : "");
        json(response, 401, { error: "Correo o contraseña incorrectos." });
        return true;
      }
      const attempt = await hashPassword(password, user.salt);
      if (!safeEqualHex(attempt.hash, user.hash)) {
        json(response, 401, { error: "Correo o contraseña incorrectos." });
        return true;
      }
      user.lastActive = new Date().toISOString();
      createSession(user, response);
      json(response, 200, { user: publicUser(user) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    const authenticated = getSession(request);
    if (authenticated) {
      database.sessions = database.sessions.filter((item) => item !== authenticated.session);
      persistDatabase();
    }
    clearSessionCookie(response);
    json(response, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/progress" && request.method === "GET") {
    const user = requireUser(request, response);
    if (!user) return true;
    json(response, 200, { completed: user.completed, saved: user.saved });
    return true;
  }

  if (pathname === "/api/progress" && request.method === "PUT") {
    const user = requireUser(request, response);
    if (!user) return true;
    try {
      const data = await readBody(request);
      if (!isDayList(data.completed) || !isDayList(data.saved)) {
        json(response, 400, { error: "El progreso debe contener listas válidas de días entre 1 y 365." });
        return true;
      }
      user.completed = [...new Set(data.completed)].sort((a, b) => a - b);
      user.saved = [...new Set(data.saved)].sort((a, b) => a - b);
      user.lastActive = new Date().toISOString();
      persistDatabase();
      json(response, 200, { completed: user.completed, saved: user.saved });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/groups/join" && request.method === "POST") {
    const user = requireUser(request, response);
    if (!user) return true;
    if (user.role === "admin") {
      json(response, 403, { error: "Las cuentas administradoras no se unen a grupos." });
      return true;
    }
    try {
      const body = await readBody(request);
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const group = database.groups.find((item) => item.code === code);
      if (!group) {
        json(response, 404, { error: "No encontramos un grupo con ese código." });
        return true;
      }
      if (user.groupId && user.groupId !== group.id) {
        json(response, 409, { error: "Ya perteneces a un grupo. Contacta al administrador para cambiarlo." });
        return true;
      }
      user.groupId = group.id;
      user.lastActive = new Date().toISOString();
      persistDatabase();
      json(response, 200, { group: { id: group.id, name: group.name } });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/groups/mine" && request.method === "GET") {
    const user = requireUser(request, response);
    if (!user) return true;
    const group = database.groups.find((item) => item.id === user.groupId);
    json(response, 200, { group: group ? { id: group.id, name: group.name } : null });
    return true;
  }

  if (pathname === "/api/groups" && request.method === "GET") {
    const user = requireUser(request, response, true);
    if (!user) return true;
    json(response, 200, { groups: database.groups.filter((group) => group.createdBy === user.id).map(groupWithMembers) });
    return true;
  }

  if (pathname === "/api/groups" && request.method === "POST") {
    const user = requireUser(request, response, true);
    if (!user) return true;
    try {
      const body = await readBody(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80) {
        json(response, 400, { error: "El nombre del grupo debe tener entre 2 y 80 caracteres." });
        return true;
      }
      const group = makeGroup(name, user);
      database.groups.push(group);
      persistDatabase();
      json(response, 201, { group: groupWithMembers(group) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/users" && request.method === "GET") {
    const admin = requireUser(request, response, true);
    if (!admin) return true;
    json(response, 200, { users: database.users.filter((item) => item.role !== "admin").map((item) => managedUser(item, admin)) });
    return true;
  }

  if (pathname === "/api/users" && request.method === "POST") {
    const admin = requireUser(request, response, true);
    if (!admin) return true;
    try {
      const body = await readBody(request);
      const groupId = typeof body.groupId === "string" && body.groupId ? body.groupId : null;
      const group = groupId ? adminGroup(admin, groupId) : null;
      if (groupId && !group) {
        json(response, 400, { error: "Elige un grupo válido." });
        return true;
      }
      const user = await createAccount({ name: body.name, email: body.email, password: body.password, groupCode: group?.code ?? "" });
      json(response, 201, { user: managedUser(user, admin) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const userMatch = pathname.match(/^\/api\/users\/([a-f0-9]{24})$/);
  if (userMatch && (request.method === "PATCH" || request.method === "DELETE")) {
    const admin = requireUser(request, response, true);
    if (!admin) return true;
    const user = database.users.find((item) => item.id === userMatch[1] && item.role !== "admin");
    if (!user) {
      json(response, 404, { error: "No encontramos ese usuario." });
      return true;
    }
    if (request.method === "DELETE") {
      database.users = database.users.filter((item) => item !== user);
      database.sessions = database.sessions.filter((item) => item.userId !== user.id);
      persistDatabase();
      json(response, 200, { ok: true });
      return true;
    }
    try {
      const body = await readBody(request);
      const groupId = typeof body.groupId === "string" && body.groupId ? body.groupId : null;
      if (groupId && !adminGroup(admin, groupId)) {
        json(response, 400, { error: "Elige un grupo válido." });
        return true;
      }
      user.groupId = groupId;
      persistDatabase();
      json(response, 200, { user: managedUser(user, admin) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  json(response, 404, { error: "Ruta no encontrada." });
  return true;
}
