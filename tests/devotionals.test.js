import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

const FIELDS = ["title", "passage", "reflection", "meditation", "prayer", "practice", "storyTitle", "story", "lesson"];
const UNIQUE_FIELDS = ["title", "reflection", "storyTitle", "story", "lesson", "prayer", "meditation", "practice"];
const editions = {
  general: new URL("../src/devotionals/", import.meta.url),
  musicos: new URL("../src/devotionals/musicos/", import.meta.url),
};

async function loadEdition(directory) {
  const files = (await readdir(directory)).filter((name) => /^\d\d\.js$/.test(name)).sort();
  const devotionals = [];
  for (const file of files) {
    const { default: block } = await import(new URL(file, directory));
    const first = (Number(file.slice(0, 2)) - 1) * 31 + 1;
    block.forEach((item, index) => assert.equal(item.day, first + index, `${file}: se esperaba el día ${first + index}`));
    devotionals.push(...block);
  }
  return devotionals;
}

for (const [name, directory] of Object.entries(editions)) {
  test(`edición ${name}: cada uno de los 365 días tiene un devocional completo y diferente`, async () => {
    const devotionals = await loadEdition(directory);
    assert.deepEqual(devotionals.map((item) => item.day), Array.from({ length: 365 }, (_, index) => index + 1));
    for (const item of devotionals) {
      for (const field of FIELDS) {
        assert.ok(typeof item[field] === "string" && item[field].trim().length > 0, `día ${item.day}: falta ${field}`);
      }
    }
    for (const field of UNIQUE_FIELDS) {
      const seen = new Map();
      for (const item of devotionals) {
        const key = item[field].trim().toLowerCase();
        assert.ok(!seen.has(key), `${field} repetido en los días ${seen.get(key)} y ${item.day}`);
        seen.set(key, item.day);
      }
    }
  });
}

test("la edición de músicos usa el mismo pasaje de cada día y no copia el texto general", async () => {
  const general = await loadEdition(editions.general);
  const musicos = await loadEdition(editions.musicos);
  for (const [index, item] of musicos.entries()) {
    assert.equal(item.passage, general[index].passage, `día ${item.day}: el pasaje no coincide con la lectura del día`);
    for (const field of UNIQUE_FIELDS) {
      assert.notEqual(item[field].trim(), general[index][field].trim(), `día ${item.day}: ${field} es igual a la edición general`);
    }
  }
});
