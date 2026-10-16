import assert from "node:assert/strict";
import test from "node:test";
import { phraseOfTheDay, welcomeVerse } from "../src/phrases.js";

for (const edition of ["general", "musicos"]) {
  test(`edición ${edition}: la frase cambia de un día al siguiente y no hay frases repetidas`, () => {
    const texts = new Set();
    for (let day = 1; day <= 365; day += 1) {
      const phrase = phraseOfTheDay(edition, day);
      assert.ok(phrase[0] && phrase[1], `día ${day}: frase incompleta`);
      if (day < 365) assert.notDeepEqual(phrase, phraseOfTheDay(edition, day + 1), `días ${day} y ${day + 1} repiten frase`);
      texts.add(`${phrase[0]} ${phrase[1]}`.toLowerCase());
    }
    const listLength = Math.min(365, new Set(Array.from({ length: 365 }, (_, index) => phraseOfTheDay(edition, index + 1))).size);
    assert.equal(texts.size, listLength, "hay frases con el mismo texto");
  });
}

test("la bienvenida muestra un versículo distinto al de la tarjeta principal", () => {
  for (let day = 1; day <= 365; day += 1) {
    const verse = welcomeVerse(day);
    assert.ok(verse[2], `día ${day}: la bienvenida debe mostrar un versículo con cita`);
    assert.notDeepEqual(verse, phraseOfTheDay("general", day), `día ${day}: bienvenida igual a la tarjeta`);
  }
});
