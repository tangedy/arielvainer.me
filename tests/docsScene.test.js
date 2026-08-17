import test from "node:test";
import assert from "node:assert/strict";
import { game } from "../src/engine.js";
import { COPY } from "../src/copy.js";
import { docs } from "../src/scenes/docs.js";

function chooseCorrectEmail(documentIndex = 0) {
  docs.s.index = documentIndex;
  docs.s.to = COPY.documents[documentIndex].email;
  docs.s.choices = {
    greeting: 0,
    accountability: 0,
    explanation: 0,
    request: 0,
    closing: 0,
  };
}

test("document attempts count only denials", () => {
  const muted = game.muted;
  game.muted = true;
  docs.enter();
  chooseCorrectEmail();
  docs.submit();
  assert.equal(docs.s.result.approved, true);
  assert.equal(docs.s.failedAttempts, 0);

  docs.enter();
  chooseCorrectEmail();
  docs.s.to = "wrong@office.de";
  docs.submit();
  assert.equal(docs.s.result.approved, false);
  assert.equal(docs.s.failedAttempts, 1);
  game.muted = muted;
});

test("last approval opens failed-attempt summary before leaving", () => {
  const muted = game.muted;
  game.muted = true;
  docs.enter();
  docs.s.failedAttempts = 11;
  chooseCorrectEmail(COPY.documents.length - 1);
  docs.submit();
  game.mouse.x = 320;
  game.mouse.y = 280;
  game.mouse.clicked = true;
  docs.update(0);
  game.mouse.clicked = false;
  assert.equal(docs.s.complete, true);
  assert.equal(docs.s.failedAttempts, 11);
  game.muted = muted;
});
