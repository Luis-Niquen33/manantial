// Devocionales diarios escritos para cada uno de los 365 días del plan.
// Están divididos en bloques de 31 días (01.js = días 1–31, 02.js = días 32–62, …)
// y cada bloque se descarga solo cuando se necesita.
const blocks = import.meta.glob("./[0-9][0-9].js");
const cache = new Map();

export const BLOCK_SIZE = 31;

function blockPath(day) {
  return `./${String(Math.ceil(day / BLOCK_SIZE)).padStart(2, "0")}.js`;
}

export async function loadDevotional(day) {
  const path = blockPath(day);
  if (!blocks[path]) return null;
  if (!cache.has(path)) {
    cache.set(path, blocks[path]().then((module) => new Map(module.default.map((item) => [item.day, item]))));
  }
  try {
    return (await cache.get(path)).get(day) ?? null;
  } catch {
    cache.delete(path);
    return null;
  }
}
