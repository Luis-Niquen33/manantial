import "./config.js";
import { handleAuthRequest } from "./auth-api.js";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

// Render y otros alojamientos asignan el puerto con PORT.
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const API_BASE_URL = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
const API_KEY = process.env.AI_API_KEY;
const dailyCache = new Map();
const distDir = resolve("dist");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const books = [
  ["Génesis", 50], ["Éxodo", 40], ["Levítico", 27], ["Números", 36], ["Deuteronomio", 34],
  ["Josué", 24], ["Jueces", 21], ["Rut", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Reyes", 22], ["2 Reyes", 25], ["1 Crónicas", 29], ["2 Crónicas", 36], ["Esdras", 10],
  ["Nehemías", 13], ["Ester", 10], ["Job", 42], ["Salmos", 150], ["Proverbios", 31],
  ["Eclesiastés", 12], ["Cantares", 8], ["Isaías", 66], ["Jeremías", 52], ["Lamentaciones", 5],
  ["Ezequiel", 48], ["Daniel", 12], ["Oseas", 14], ["Joel", 3], ["Amós", 9],
  ["Abdías", 1], ["Jonás", 4], ["Miqueas", 7], ["Nahúm", 3], ["Habacuc", 3],
  ["Sofonías", 3], ["Hageo", 2], ["Zacarías", 14], ["Malaquías", 4],
  ["Mateo", 28], ["Marcos", 16], ["Lucas", 24], ["Juan", 21], ["Hechos", 28],
  ["Romanos", 16], ["1 Corintios", 16], ["2 Corintios", 13], ["Gálatas", 6], ["Efesios", 6],
  ["Filipenses", 4], ["Colosenses", 4], ["1 Tesalonicenses", 5], ["2 Tesalonicenses", 3],
  ["1 Timoteo", 6], ["2 Timoteo", 4], ["Tito", 3], ["Filemón", 1], ["Hebreos", 13],
  ["Santiago", 5], ["1 Pedro", 5], ["2 Pedro", 3], ["1 Juan", 5], ["2 Juan", 1],
  ["3 Juan", 1], ["Judas", 1], ["Apocalipsis", 22],
];

const totalChapters = books.reduce((sum, [, chapters]) => sum + chapters, 0);

function getReading(day) {
  const first = Math.floor(((day - 1) * totalChapters) / 365);
  const last = Math.floor((day * totalChapters) / 365);
  const segments = [];
  let offset = 0;

  for (const [book, chapters] of books) {
    const start = Math.max(first, offset);
    const end = Math.min(last, offset + chapters);
    if (start < end) {
      const from = start - offset + 1;
      const to = end - offset;
      segments.push(`${book} ${from}${from === to ? "" : `–${to}`}`);
    }
    offset += chapters;
    if (offset >= last) break;
  }

  return segments.join("; ");
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function generateDevotional(day) {
  const reading = getReading(day);
  const result = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres un escritor pastoral cristiano evangélico, bíblicamente cuidadoso y cálido. Escribe en español latinoamericano natural, con sensibilidad y sin clichés. Genera reflexiones originales y respetuosas de las distintas tradiciones cristianas. No inventes citas bíblicas ni presentes paráfrasis como citas textuales. Reina-Valera 1960 tiene derechos de autor: no reproduzcas su texto; ofrece solo referencias. Devuelve exclusivamente un objeto JSON con estas cadenas: title (título breve), passage (referencia bíblica), reflection (reflexión de 100 a 150 palabras), meditation (una pregunta abierta), prayer (oración breve), practice (acción concreta y amable para hoy), storyTitle (título de la historia), story (historia breve de la vida cotidiana actual, de 70 a 110 palabras, con personajes ficticios, que aplique la enseñanza de la lectura), lesson (la lección aprendida de la historia en una sola frase).",
        },
        {
          role: "user",
          content: `Crea el devocional original para el día ${day} de un plan que recorre la Biblia completa en orden. Lectura asignada: ${reading}. Basa el tema en esta lectura y cita una referencia concreta incluida en ella, sin incluir texto bíblico literal. Incluye una historia corta de aplicación cristiana relacionada directamente con esta lectura y su lección aprendida. El tono debe ser esperanzador y práctico.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!result.ok) {
    const details = await result.text();
    console.error(`El proveedor de IA respondió ${result.status}: ${details.slice(0, 500)}`);
    throw new Error("El proveedor de IA no pudo generar el devocional.");
  }

  const responseBody = await result.json();
  const content = responseBody.choices?.[0]?.message?.content;
  if (!content) throw new Error("El proveedor de IA devolvió una respuesta vacía.");

  const devotional = JSON.parse(content);
  for (const field of ["title", "passage", "reflection", "meditation", "prayer", "practice", "storyTitle", "story", "lesson"]) {
    if (typeof devotional[field] !== "string" || !devotional[field].trim()) {
      throw new Error(`La respuesta de IA no incluye el campo ${field}.`);
    }
  }
  return { ...devotional, day, reading };
}

// En producción el mismo servidor entrega la web compilada en dist/.
async function serveStatic(response, pathname) {
  try {
    let filePath = resolve(distDir, `.${decodeURIComponent(pathname)}`);
    if (filePath !== distDir && !filePath.startsWith(distDir + sep)) filePath = distDir;
    if (filePath === distDir || !extname(filePath)) filePath = resolve(distDir, "index.html");
    const content = await readFile(filePath);
    const cache = filePath.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache";
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream", "cache-control": cache });
    response.end(content);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No encontrado.");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (await handleAuthRequest(request, response, url)) return;
  if (!url.pathname.startsWith("/api/") && (request.method === "GET" || request.method === "HEAD")) {
    await serveStatic(response, url.pathname);
    return;
  }
  if (url.pathname !== "/api/devotional" || request.method !== "GET") {
    sendJson(response, 404, { error: "Ruta no encontrada." });
    return;
  }

  const day = Number(url.searchParams.get("day"));
  if (!Number.isInteger(day) || day < 1 || day > 365) {
    sendJson(response, 400, { error: "El día debe ser un número entre 1 y 365." });
    return;
  }
  if (!API_KEY) {
    sendJson(response, 503, { error: "Falta configurar AI_API_KEY en el servidor." });
    return;
  }
  if (dailyCache.has(day)) {
    sendJson(response, 200, dailyCache.get(day));
    return;
  }

  try {
    const devotional = await generateDevotional(day);
    dailyCache.set(day, devotional);
    sendJson(response, 200, devotional);
  } catch (error) {
    console.error("No se pudo generar el devocional:", error);
    sendJson(response, 502, { error: "No se pudo generar el devocional. Intenta nuevamente." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`API devocional disponible en http://${HOST}:${PORT}`);
});
