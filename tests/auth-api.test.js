import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("registration, group invitations, private progress, and admin authorization", async (context) => {
  const workingDirectory = await mkdtemp(join(tmpdir(), "manantial-test-"));
  const apiPort = await getFreePort();
  const serverFile = fileURLToPath(new URL("../server.js", import.meta.url));
  const server = spawn(process.execPath, [serverFile], {
    cwd: workingDirectory,
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      API_HOST: "127.0.0.1",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "a-strong-test-password",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  server.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  context.after(async () => {
    if (server.exitCode === null) {
      server.kill();
      await once(server, "exit");
    }
    await rm(workingDirectory, { recursive: true, force: true });
  });

  await waitForServer(server, () => output.includes(`http://127.0.0.1:${apiPort}`), output);
  const api = `http://127.0.0.1:${apiPort}`;
  const request = (path, { cookie, ...options } = {}) => fetch(`${api}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  });
  const jsonRequest = (method, body, cookie) => ({
    method,
    body: JSON.stringify(body),
    ...(cookie ? { cookie } : {}),
  });
  const cookieFrom = (response) => response.headers.get("set-cookie")?.match(/manantial_session=[^;]+/)?.[0];
  const adminResponse = await request("/api/auth/login", jsonRequest("POST", {
    email: "admin@example.com",
    password: "a-strong-test-password",
  }));
  assert.equal(adminResponse.status, 200);
  const adminCookie = cookieFrom(adminResponse);
  assert.ok(adminCookie);

  const forbidden = await request("/api/groups", jsonRequest("POST", { name: "No autorizado" }));
  assert.equal(forbidden.status, 401);

  const createdGroup = await request("/api/groups", jsonRequest("POST", { name: "Comunidad de prueba" }, adminCookie));
  assert.equal(createdGroup.status, 201);
  const { group } = await createdGroup.json();
  assert.match(group.code, /^[A-F0-9]{10}$/);

  const registered = await request("/api/auth/register", jsonRequest("POST", {
    name: "Ana Prueba",
    email: "ana@example.com",
    password: "una-clave-segura",
    groupCode: group.code,
    role: "admin",
  }));
  assert.equal(registered.status, 201);
  const userCookie = cookieFrom(registered);
  assert.ok(userCookie);

  const userCannotAdmin = await request("/api/groups", { cookie: userCookie });
  assert.equal(userCannotAdmin.status, 403);
  const userProfile = await request("/api/auth", { cookie: userCookie });
  assert.equal((await userProfile.json()).user.role, "user");

  const savedProgress = await request("/api/progress", jsonRequest("PUT", {
    completed: [1, 365],
    saved: [2],
  }, userCookie));
  assert.equal(savedProgress.status, 200);
  const invalidProgress = await request("/api/progress", jsonRequest("PUT", {
    completed: [366],
    saved: [],
  }, userCookie));
  assert.equal(invalidProgress.status, 400);

  const trackedGroups = await request("/api/groups", { cookie: adminCookie });
  const tracked = (await trackedGroups.json()).groups[0];
  assert.equal(tracked.members.length, 1);
  assert.equal(tracked.members[0].name, "Ana Prueba");
  assert.equal(tracked.members[0].completedCount, 2);
  assert.equal(tracked.members[0].progress, 1);
  assert.equal("saved" in tracked.members[0], false);

  const duplicate = await request("/api/auth/register", jsonRequest("POST", {
    name: "Ana Duplicada",
    email: "ANA@example.com",
    password: "una-clave-segura",
  }));
  assert.equal(duplicate.status, 400);

  const userCannotManageUsers = await request("/api/users", { cookie: userCookie });
  assert.equal(userCannotManageUsers.status, 403);
  const managed = await request("/api/users", jsonRequest("POST", {
    name: "Beto Creado",
    email: "beto@example.com",
    password: "otra-clave-segura",
    groupId: group.id,
  }, adminCookie));
  assert.equal(managed.status, 201);
  const { user: betoUser } = await managed.json();
  assert.equal(betoUser.groupName, "Comunidad de prueba");
  const betoLogin = await request("/api/auth/login", jsonRequest("POST", { email: "beto@example.com", password: "otra-clave-segura" }));
  assert.equal(betoLogin.status, 200);
  const ungrouped = await request(`/api/users/${betoUser.id}`, jsonRequest("PATCH", { groupId: "" }, adminCookie));
  assert.equal((await ungrouped.json()).user.groupId, null);
  const userList = await (await request("/api/users", { cookie: adminCookie })).json();
  assert.deepEqual(userList.users.map((item) => item.email).sort(), ["ana@example.com", "beto@example.com"]);
  assert.equal("hash" in userList.users[0], false);
  const deleted = await request(`/api/users/${betoUser.id}`, { method: "DELETE", cookie: adminCookie });
  assert.equal(deleted.status, 200);
  const betoSession = await request("/api/progress", { cookie: cookieFrom(betoLogin) });
  assert.equal(betoSession.status, 401);

  const loggedOut = await request("/api/auth/logout", { method: "POST", cookie: userCookie });
  assert.equal(loggedOut.status, 200);
  const expiredSession = await request("/api/progress", { cookie: userCookie });
  assert.equal(expiredSession.status, 401);
});

async function getFreePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  socket.close();
  await once(socket, "close");
  return address.port;
}

async function waitForServer(server, isReady, getOutput) {
  const timeout = Date.now() + 10000;
  while (Date.now() < timeout) {
    if (server.exitCode !== null) throw new Error(`API server exited early: ${getOutput()}`);
    if (isReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`API server did not start: ${getOutput()}`);
}
