import test from "node:test";
import assert from "node:assert/strict";
import {
  COOK_STATES,
  KONAMI_CODE,
  advanceCookware,
  advanceKonami,
  cookwareStatus,
  createRigBag,
  handValue,
  progressStage,
  riggedDealerCards,
  scoreEmail,
  takeRiggedDealerCards,
  takeOffHeat,
} from "../src/gameLogic.js";
import { COPY } from "../src/copy.js";

function pot(overrides = {}) {
  return {
    name: "COUSCOUS",
    ingredient: "COUSCOUS",
    heat: true,
    elapsed: 0,
    readyAt: 12,
    burnAt: 18,
    removed: false,
    result: null,
    ...overrides,
  };
}

test("cookware becomes ready only inside its target window", () => {
  const item = pot();
  advanceCookware(item, 11.9);
  assert.equal(cookwareStatus(item), COOK_STATES.COOKING);
  advanceCookware(item, 0.2);
  assert.equal(cookwareStatus(item), COOK_STATES.READY);
  assert.equal(takeOffHeat(item), COOK_STATES.READY);
  assert.equal(cookwareStatus(item), COOK_STATES.DONE);
});

test("cookware keeps advancing while another kitchen view is open", () => {
  const item = pot();
  advanceCookware(item, 6);
  advanceCookware(item, 6.1);
  assert.equal(item.elapsed, 12.1);
  assert.equal(cookwareStatus(item), COOK_STATES.READY);
});

test("late cookware burns and early cookware is raw", () => {
  const burnt = pot({ elapsed: 18.1 });
  assert.equal(cookwareStatus(burnt), COOK_STATES.BURNT);
  const raw = pot({ elapsed: 4 });
  assert.equal(takeOffHeat(raw), COOK_STATES.COOKING);
});

test("email rubric requires recipient, tone, document, and permission", () => {
  const document = { name: "VISA", email: "visa@example.de" };
  const selections = {
    greeting: { good: true },
    accountability: { good: true },
    explanation: { mentionsDocument: true },
    request: { asksPermission: true },
    closing: { good: true },
  };
  assert.equal(scoreEmail({ to: document.email, document, selections }).approved, true);
  const denied = scoreEmail({ to: "wrong@example.de", document, selections });
  assert.equal(denied.approved, false);
  assert.equal(denied.checks.recipient, false);
});

test("every email segment has exactly one acceptable option", () => {
  Object.entries(COPY.emailPieces).forEach(([category, pieces]) => {
    assert.equal(
      pieces.filter((piece) => piece.good).length,
      1,
      `${category} should have one acceptable line`
    );
  });
});

test("blackjack hand values handle soft and multiple aces", () => {
  assert.equal(handValue([{ rank: "A" }, { rank: "K" }]), 21);
  assert.equal(handValue([{ rank: "A" }, { rank: "A" }, { rank: "9" }]), 21);
  assert.equal(handValue([{ rank: "A" }, { rank: "9" }, { rank: "8" }]), 18);
});

test("dealer rig bag contains one rigged and one fair round", () => {
  assert.deepEqual(createRigBag(() => 0.25), [true, false]);
  assert.deepEqual(createRigBag(() => 0.75), [false, true]);
  assert.equal(handValue(riggedDealerCards()), 21);
  const deck = [
    { rank: "2", suit: "♣" },
    { rank: "A", suit: "♠" },
    { rank: "K", suit: "♥" },
    { rank: "9", suit: "♦" },
  ];
  const dealer = takeRiggedDealerCards(deck);
  assert.equal(handValue(dealer), 21);
  assert.equal(deck.some((card) => card.rank === "A" && card.suit === "♠"), false);
  assert.equal(deck.some((card) => card.rank === "K" && card.suit === "♥"), false);
});

test("timeline stage follows strict checkpoint order", () => {
  assert.equal(progressStage({ cook: false, docs: false, blackjack: false, sprint: false }), 0);
  assert.equal(progressStage({ cook: true, docs: false, blackjack: false, sprint: false }), 1);
  assert.equal(progressStage({ cook: true, docs: true, blackjack: true, sprint: false }), 3);
  assert.equal(progressStage({ cook: true, docs: true, blackjack: true, sprint: true }), 4);
});

test("konami code advances and restarts from a fresh up", () => {
  let progress = 0;
  for (const code of KONAMI_CODE) progress = advanceKonami(progress, code);
  assert.equal(progress, KONAMI_CODE.length);

  progress = 0;
  progress = advanceKonami(progress, "ArrowUp");
  progress = advanceKonami(progress, "ArrowLeft");
  assert.equal(progress, 0);
  progress = advanceKonami(progress, "ArrowUp");
  progress = advanceKonami(progress, "ArrowUp");
  progress = advanceKonami(progress, "ArrowUp");
  assert.equal(progress, 1);
  progress = advanceKonami(progress, "KeyM");
  assert.equal(progress, 1);
});
