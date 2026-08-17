export const COOK_STATES = {
  EMPTY: "empty",
  RAW: "raw",
  COOKING: "cooking",
  READY: "ready",
  BURNT: "burnt",
  DONE: "done",
};

export function cookwareStatus(item) {
  if (!item.ingredient) return COOK_STATES.EMPTY;
  if (item.removed) return item.result === COOK_STATES.READY ? COOK_STATES.DONE : item.result;
  if (!item.heat) return COOK_STATES.RAW;
  if (item.elapsed > item.burnAt) return COOK_STATES.BURNT;
  if (item.elapsed >= item.readyAt) return COOK_STATES.READY;
  return COOK_STATES.COOKING;
}

export function advanceCookware(item, dt) {
  if (!item.removed && item.heat && item.ingredient) item.elapsed += dt;
  return cookwareStatus(item);
}

export function takeOffHeat(item) {
  const state = cookwareStatus(item);
  item.removed = true;
  item.heat = false;
  item.result = state === COOK_STATES.READY ? COOK_STATES.READY : state;
  return item.result;
}

export function scoreEmail({ to, document, selections }) {
  const recipient = to === document.email;
  const tone =
    Boolean(selections.greeting?.good) &&
    Boolean(selections.accountability?.good) &&
    Boolean(selections.closing?.good);
  const documentNamed = Boolean(selections.explanation?.mentionsDocument);
  const permissionAsked = Boolean(selections.request?.asksPermission);
  const score = [recipient, tone, documentNamed, permissionAsked].filter(Boolean).length;
  return {
    approved: score === 4,
    score,
    checks: { recipient, tone, documentNamed, permissionAsked },
  };
}

export function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function createRigBag(random = Math.random) {
  return random() < 0.5 ? [true, false] : [false, true];
}

export function riggedDealerCards() {
  return [
    { rank: "A", suit: "♠" },
    { rank: "K", suit: "♥" },
  ];
}

export function takeRiggedDealerCards(deck) {
  return riggedDealerCards().map((wanted) => {
    const index = deck.findIndex(
      (card) => card.rank === wanted.rank && card.suit === wanted.suit
    );
    if (index < 0) throw new Error(`Missing rigged card ${wanted.rank}${wanted.suit}`);
    return deck.splice(index, 1)[0];
  });
}

export const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

export function advanceKonami(progress, code) {
  if (code === "KeyM") return progress;
  if (code === KONAMI_CODE[progress]) return progress + 1;
  if (code === KONAMI_CODE[0]) return 1;
  return 0;
}

export function progressStage(done) {
  if (!done.cook) return 0;
  if (!done.docs) return 1;
  if (!done.blackjack) return 2;
  if (!done.sprint) return 3;
  return 4;
}
