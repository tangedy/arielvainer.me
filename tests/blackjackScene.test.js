import test from "node:test";
import assert from "node:assert/strict";
import { game } from "../src/engine.js";
import { handValue } from "../src/gameLogic.js";
import { blackjack } from "../src/scenes/blackjack.js";

test("casino deal animates before player input and rigged hand is 21", () => {
  const muted = game.muted;
  game.muted = true;
  blackjack.enter();
  blackjack.s.rigBag = [true];
  blackjack.deal();

  assert.equal(blackjack.s.phase, "dealing");
  assert.equal(handValue(blackjack.s.dealer), 21);
  blackjack.update(1);
  assert.ok(["player", "dealer"].includes(blackjack.s.phase));

  if (blackjack.s.phase === "player") blackjack.beginDealer();
  blackjack.update(0.5);
  assert.equal(blackjack.s.dealerRevealed, true);
  game.muted = muted;
});
