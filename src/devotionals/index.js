// Devocionales diarios escritos para cada uno de los 365 días del plan.
// Están divididos en bloques de 31 días (01.js = días 1–31, 02.js = días 32–62, …)
// y cada bloque se descarga solo cuando se necesita.
// Hay dos ediciones: la general (esta carpeta) y la de músicos cristianos (musicos/).
const blocks = {
  general: import.meta.glob("./[0-9][0-9].js"),
  musicos: import.meta.glob("./musicos/[0-9][0-9].js"),
};
const cache = new Map();

export const BLOCK_SIZE = 31;
export const EDITIONS = [
  { id: "general", label: "General" },
  { id: "musicos", label: "Músicos" },
];

function blockPath(day, edition) {
  const file = `${String(Math.ceil(day / BLOCK_SIZE)).padStart(2, "0")}.js`;
  return edition === "musicos" ? `./musicos/${file}` : `./${file}`;
}

export async function loadDevotional(day, edition = "general") {
  const editionBlocks = blocks[edition] ?? blocks.general;
  const path = blockPath(day, edition in blocks ? edition : "general");
  if (!editionBlocks[path]) return null;
  if (!cache.has(path)) {
    cache.set(path, editionBlocks[path]().then((module) => new Map(module.default.map((item) => [item.day, item]))));
  }
  try {
    return (await cache.get(path)).get(day) ?? null;
  } catch {
    cache.delete(path);
    return null;
  }
}
