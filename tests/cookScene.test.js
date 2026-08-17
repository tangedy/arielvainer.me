import test from "node:test";
import assert from "node:assert/strict";
import { game } from "../src/engine.js";
import { cook } from "../src/scenes/cook.js";

function pointer(x, y, { clicked = false, down = false, released = false } = {}) {
  game.mouse.x = x;
  game.mouse.y = y;
  game.mouse.clicked = clicked;
  game.mouse.down = down;
  game.mouse.released = released;
}

test("pantry ingredients drag into pots and burners ignite", () => {
  const muted = game.muted;
  game.muted = true;
  cook.enter();

  pointer(520, 115, { clicked: true, down: true });
  cook.updateStove();
  assert.equal(cook.s.drag.name, "COUSCOUS");

  pointer(110, 120, { released: true });
  cook.updateStove();
  assert.equal(cook.s.pots[0].ingredient, "COUSCOUS");
  assert.equal(cook.s.drag, null);

  pointer(80, 202, { clicked: true });
  cook.updateStove();
  assert.equal(cook.s.pots[0].heat, true);
  game.muted = muted;
});

test("steak drag-and-hold cooks both sides in the green zone", () => {
  const muted = game.muted;
  game.muted = true;
  cook.enter();

  pointer(540, 255, { clicked: true, down: true });
  cook.updateStove();
  assert.equal(cook.s.drag.name, "STEAK");

  pointer(110, 260, { released: true });
  cook.updateStove();
  assert.equal(cook.s.mode, "steak");
  assert.equal(cook.s.steak.loaded, true);

  pointer(115, 190, { clicked: true, down: true });
  cook.updateSteak(0);
  pointer(350, 190, { down: true });
  cook.updateSteak(2);
  pointer(220, 190, { released: true });
  cook.updateSteak(0);
  assert.equal(cook.s.steak.side, 1);

  pointer(115, 190, { clicked: true, down: true });
  cook.updateSteak(0);
  pointer(350, 190, { down: true });
  cook.updateSteak(2);
  pointer(220, 190, { released: true });
  cook.updateSteak(0);
  assert.equal(cook.s.steak.done, true);
  assert.equal(cook.s.mode, "stove");
  game.muted = muted;
});

test("burned steak shows failure and retry resets the entire kitchen", () => {
  const muted = game.muted;
  game.muted = true;
  cook.enter();
  cook.s.mode = "steak";
  cook.s.steak.loaded = true;
  cook.s.pots[0].ingredient = "COUSCOUS";

  pointer(115, 190, { clicked: true, down: true });
  cook.updateSteak(0);
  pointer(350, 190, { down: true });
  cook.updateSteak(3);
  pointer(220, 190, { released: true });
  cook.updateSteak(0);
  assert.equal(cook.s.mode, "failed");
  assert.equal(cook.s.failureType, "steak");

  pointer(320, 240, { clicked: true });
  cook.update(0);
  assert.equal(cook.s.mode, "stove");
  assert.equal(cook.s.pots[0].ingredient, null);
  assert.equal(cook.s.steak.loaded, false);
  game.muted = muted;
});
