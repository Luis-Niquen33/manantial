import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

const FIELDS = ["title", "passage", "reflection", "meditation", "prayer", "practice", "storyTitle", "story", "lesson"];
const directory = new URL("../src/devotionals/", import.meta.url);

test("cada uno de los 365 días tiene un devocional completo y diferente", async () => {
  const files = (await readdir(directory)).filter((name) => /^\d\d\.js$/.test(name)).sort();
  const devotionals = [];
  for (const file of files) {
    const { default: block } = await import(new URL(file, directory));
    const first = (Number(file.slice(0, 2)) - 1) * 31 + 1;
    block.forEach((item, index) => assert.equal(item.day, first + index, `${file}: se esperaba el día ${first + index}`));
    devotionals.push(...block);
  }

  assert.deepEqual(devotionals.map((item) => item.day), Array.from({ length: 365 }, (_, index) => index + 1));
  for (const item of devotionals) {
    for (const field of FIELDS) {
      assert.ok(typeof item[field] === "string" && item[field].trim().length > 0, `día ${item.day}: falta ${field}`);
    }
  }
  for (const field of ["title", "reflection", "storyTitle", "story", "lesson", "prayer", "meditation", "practice"]) {
    const seen = new Map();
    for (const item of devotionals) {
      const key = item[field].trim().toLowerCase();
      assert.ok(!seen.has(key), `${field} repetido en los días ${seen.get(key)} y ${item.day}`);
      seen.set(key, item.day);
    }
  }
});
