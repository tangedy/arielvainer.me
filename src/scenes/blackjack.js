import { game, goto, just, clicked, mouseIn } from "../engine.js";
import { P, fill, stroke, text, bar, drawCard, scanlines } from "../draw.js";
import { sfx } from "../audio.js";
import { Scenes } from "../flow.js";
import { createRigBag, handValue, takeRiggedDealerCards } from "../gameLogic.js";

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];
const DEAL_INTERVAL = 0.16;
const CARD_W = 43;
const CARD_GAP = 48;

function shuffledDeck() {
  const deck = [];
  SUITS.forEach((suit) => RANKS.forEach((rank) => deck.push({ rank, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

function initialState() {
  return {
    bankroll: 15,
    bet: 5,
    phase: "bet",
    player: [],
    dealer: [],
    deck: [],
    rigBag: createRigBag(),
    rigged: false,
    message: "PLACE YOUR BET",
    elapsed: 0,
    rounds: 0,
    dealTimer: 0,
    dealSoundStep: 0,
    dealerTimer: 0,
    dealerRevealed: false,
    playerCardAnim: 1,
    dealerCardAnim: 1,
  };
}

function resultMessage(outcome, amount = 0) {
  if (outcome === "win") return `WIN +$${amount}`;
  if (outcome === "push") return "PUSH — BET RETURNED";
  if (outcome === "bust") return "BUST — HOUSE WINS";
  return "DEALER WINS";
}

function drawPill(ctx, x, y, w, label, value, color) {
  fill(ctx, x, y, w, 28, "#172131");
  stroke(ctx, x, y, w, 28, "#2c3a50", 1);
  text(ctx, label, x + 8, y + 7, { size: 5, color: P.muted });
  text(ctx, value, x + w - 8, y + 7, { size: 7, align: "right", color });
}

function drawCasinoButton(ctx, x, y, w, label, primary = false) {
  fill(ctx, x + 3, y + 3, w, 38, "#050910");
  fill(ctx, x, y, w, 38, primary ? "#ffb629" : "#1b283a");
  stroke(ctx, x, y, w, 38, primary ? "#ffe28a" : "#344963", 2);
  text(ctx, label, x + w / 2, y + 14, {
    size: 7,
    align: "center",
    color: primary ? "#111722" : P.ink,
  });
}

function handStart(count) {
  const width = CARD_W + Math.max(0, count - 1) * CARD_GAP;
  return 320 - width / 2;
}

function drawMovingCard(ctx, card, targetX, targetY, progress, hidden = false) {
  if (progress <= 0) return;
  const p = easeOut(progress);
  const x = 563 + (targetX - 563) * p;
  const y = 137 + (targetY - 137) * p;
  fill(ctx, x + 4, y + 5, CARD_W, 59, "rgba(0,0,0,0.35)");
  drawCard(ctx, card, x, y, hidden, 0.9);
}

function drawFlippingCard(ctx, card, x, y, progress) {
  const p = clamp01(progress);
  const scaleX = Math.max(0.04, Math.abs(1 - p * 2));
  const hidden = p < 0.5;
  const cardWidth = 48 * 0.9;
  ctx.save();
  ctx.translate(x + cardWidth / 2, y);
  ctx.scale(scaleX, 1);
  drawCard(ctx, card, -cardWidth / 2, 0, hidden, 0.9);
  ctx.restore();
}

export const blackjack = {
  s: null,
  enter() {
    this.s = initialState();
  },
  deal() {
    const s = this.s;
    if (s.bankroll < s.bet || s.bet < 5) return;
    s.bankroll -= s.bet;
    s.deck = shuffledDeck();
    if (!s.rigBag.length) s.rigBag = createRigBag();
    s.rigged = s.rigBag.shift();
    if (s.rigged) {
      s.dealer = takeRiggedDealerCards(s.deck);
      s.player = [s.deck.pop(), s.deck.pop()];
    } else {
      s.player = [s.deck.pop(), s.deck.pop()];
      s.dealer = [s.deck.pop(), s.deck.pop()];
    }
    s.phase = "dealing";
    s.message = "DEALING";
    s.rounds += 1;
    s.dealTimer = 0;
    s.dealSoundStep = 0;
    s.dealerRevealed = false;
    s.playerCardAnim = 1;
    s.dealerCardAnim = 1;
  },
  hit() {
    const s = this.s;
    if (s.phase !== "player") return;
    s.player.push(s.deck.pop());
    s.playerCardAnim = 0;
    sfx.card();
    const value = handValue(s.player);
    if (value > 21) {
      s.dealerRevealed = true;
      sfx.cardFlip();
      s.phase = "result";
      s.message = resultMessage("bust");
      sfx.bad();
    } else if (value === 21) {
      this.beginDealer();
    }
  },
  beginDealer() {
    const s = this.s;
    if (s.phase !== "player" && s.phase !== "dealing") return;
    s.phase = "dealer";
    s.message = "DEALER TURN";
    s.dealerTimer = 0;
    s.dealerRevealed = false;
  },
  finishRound() {
    const s = this.s;
    const playerTotal = handValue(s.player);
    const dealerTotal = handValue(s.dealer);
    const playerNatural = playerTotal === 21 && s.player.length === 2;
    const dealerNatural = dealerTotal === 21 && s.dealer.length === 2;

    if (playerNatural && dealerNatural) {
      s.bankroll += s.bet;
      s.message = "DOUBLE BLACKJACK — PUSH";
      sfx.tick();
    } else if (dealerTotal > 21 || playerTotal > dealerTotal || (playerNatural && !dealerNatural)) {
      const bonus = playerNatural ? 35 : 25;
      const returned = playerNatural ? Math.floor(s.bet * 2.5) : s.bet * 2;
      const gain = returned + bonus;
      s.bankroll += gain;
      s.message = resultMessage("win", gain - s.bet);
      sfx.win();
    } else if (playerTotal === dealerTotal) {
      s.bankroll += s.bet;
      s.message = resultMessage("push");
      sfx.tick();
    } else {
      s.message = s.rigged ? "DEALER BLACKJACK — RIGGED AGAIN" : resultMessage("lose");
      sfx.bad();
    }
    s.phase = s.bankroll >= 100 ? "won" : "result";
  },
  continueRound() {
    const s = this.s;
    if (s.bankroll < 5) {
      s.phase = "bailout";
      s.message = "EMERGENCY CREDIT APPROVED: $15";
      return;
    }
    s.bet = Math.min(Math.max(5, s.bet), s.bankroll);
    s.phase = "bet";
    s.message = "PLACE YOUR BET";
  },
  update(dt) {
    const s = this.s;
    s.elapsed += dt;
    s.playerCardAnim = Math.min(1, s.playerCardAnim + dt * 5);
    s.dealerCardAnim = Math.min(1, s.dealerCardAnim + dt * 5);

    if (s.phase === "dealing") {
      s.dealTimer += dt;
      const soundSteps = Math.min(4, Math.floor(s.dealTimer / DEAL_INTERVAL) + 1);
      while (s.dealSoundStep < soundSteps) {
        s.dealSoundStep += 1;
        sfx.card();
      }
      if (s.dealTimer >= DEAL_INTERVAL * 4 + 0.18) {
        s.phase = "player";
        s.message = handValue(s.player) === 21 ? "BLACKJACK" : "YOUR MOVE";
        if (handValue(s.player) === 21) this.beginDealer();
      }
      return;
    }

    if (s.phase === "dealer") {
      s.dealerTimer += dt;
      if (!s.dealerRevealed && s.dealerTimer >= 0.48) {
        s.dealerRevealed = true;
        s.dealerTimer = 0;
        sfx.cardFlip();
        return;
      }
      if (s.dealerRevealed && s.dealerTimer >= 0.5) {
        if (!s.rigged && handValue(s.dealer) < 17) {
          s.dealer.push(s.deck.pop());
          s.dealerCardAnim = 0;
          s.dealerTimer = 0;
          sfx.card();
        } else {
          this.finishRound();
        }
      }
      return;
    }

    if (s.phase === "won") {
      if (just("Space") || just("Enter") || clicked()) {
        game.done.blackjack = true;
        game.times.blackjack = s.elapsed;
        goto(Scenes.hub, { justCompleted: true, fromStage: 2 });
      }
      return;
    }
    if (s.phase === "bailout") {
      if (just("Space") || just("Enter") || clicked()) {
        game.stats.casinoBailouts += 1;
        s.bankroll = 15;
        s.bet = 5;
        s.phase = "bet";
        s.message = "PLACE YOUR BET";
        sfx.good();
      }
      return;
    }
    if (s.phase === "result") {
      if (just("Space") || just("Enter") || clicked()) this.continueRound();
      return;
    }

    if (s.phase === "bet") {
      if (clicked() && mouseIn(72, 305, 104, 38)) {
        s.bet = Math.max(5, s.bet - 5);
        sfx.tick();
      } else if (clicked() && mouseIn(184, 305, 104, 38)) {
        s.bet = Math.min(s.bankroll, s.bet + 5);
        sfx.tick();
      } else if (clicked() && mouseIn(296, 305, 104, 38)) {
        s.bet = s.bankroll;
        sfx.tick();
      } else if (
        just("Space") ||
        just("Enter") ||
        (clicked() && mouseIn(408, 305, 160, 38))
      ) {
        this.deal();
      }
    } else if (s.phase === "player") {
      if (just("KeyH") || (clicked() && mouseIn(170, 305, 140, 38))) this.hit();
      if (
        just("KeyS") ||
        just("Space") ||
        (clicked() && mouseIn(330, 305, 140, 38))
      ) {
        this.beginDealer();
      }
    }
  },
  draw(ctx) {
    const s = this.s;
    fill(ctx, 0, 0, 640, 360, "#070b13");
    fill(ctx, 0, 0, 640, 45, "#101827");
    fill(ctx, 0, 42, 640, 3, "#f4b83b");
    text(ctx, "VAINER", 16, 12, { size: 9, color: P.ink });
    text(ctx, "BET", 80, 12, { size: 9, color: "#f4b83b" });
    fill(ctx, 122, 11, 42, 18, "#b13e53");
    text(ctx, "LIVE", 143, 17, { size: 6, align: "center" });
    text(ctx, "BLACKJACK · BERLIN FLIGHT FUND", 176, 15, { size: 6, color: P.muted });
    drawPill(ctx, 442, 7, 84, "BET", `$${s.bet}`, P.yellow);
    drawPill(ctx, 532, 7, 94, "BALANCE", `$${s.bankroll}`, P.green);

    fill(ctx, 14, 54, 612, 238, "#0d3d3a");
    stroke(ctx, 14, 54, 612, 238, "#1a6a61", 3);
    fill(ctx, 24, 64, 592, 218, "#104943");
    for (let y = 70; y < 280; y += 12) {
      fill(ctx, 28, y, 584, 1, "rgba(255,255,255,0.025)");
    }
    fill(ctx, 552, 120, 50, 70, "#0a2d2b");
    stroke(ctx, 552, 120, 50, 70, "#2b776e", 2);
    text(ctx, "DECK", 577, 193, { size: 5, align: "center", color: P.muted });

    text(ctx, `DEALER  ${this.dealerValueLabel()}`, 320, 60, {
      size: 6,
      align: "center",
      color: P.dim,
    });
    this.drawDealer(ctx);

    fill(ctx, 187, 146, 266, 30, "rgba(5,10,16,0.82)");
    stroke(ctx, 187, 146, 266, 30, "#2d7f74", 1);
    text(ctx, s.message, 320, 157, {
      size: 6,
      align: "center",
      color: s.phase === "won" ? P.green : P.ink,
      maxWidth: 246,
    });

    text(ctx, `YOUR HAND  ${handValue(s.player) || "—"}`, 320, 185, {
      size: 6,
      align: "center",
      color: P.dim,
    });
    this.drawPlayer(ctx);

    fill(ctx, 14, 298, 612, 54, "#0c121e");
    stroke(ctx, 14, 298, 612, 54, "#202e42", 2);
    this.drawControls(ctx);
    text(ctx, `ROUND ${s.rounds}`, 20, 345, { size: 5, color: P.muted });
    bar(ctx, 505, 345, 115, 6, s.bankroll / 100, P.green, P.dark);
    text(ctx, "$100", 500, 344, { size: 5, align: "right", color: P.green });
    scanlines(ctx);
  },
  drawDealer(ctx) {
    const s = this.s;
    const cards = s.dealer;
    const start = handStart(cards.length);
    cards.forEach((card, index) => {
      const x = start + index * CARD_GAP;
      let progress = 1;
      if (s.phase === "dealing") {
        const order = index === 0 ? 1 : 3;
        progress = clamp01((s.dealTimer - order * DEAL_INTERVAL) / 0.18);
      } else if (index === cards.length - 1 && cards.length > 2) {
        progress = s.dealerCardAnim;
      }
      const shouldHide =
        index === 1 &&
        (s.phase === "dealing" || s.phase === "player" || (s.phase === "dealer" && !s.dealerRevealed));
      if (index === 1 && s.phase === "dealer" && !s.dealerRevealed) {
        drawFlippingCard(ctx, card, x, 77, s.dealerTimer / 0.48);
      } else {
        drawMovingCard(ctx, card, x, 77, progress, shouldHide);
      }
    });
  },
  drawPlayer(ctx) {
    const s = this.s;
    const cards = s.player;
    const start = handStart(cards.length);
    cards.forEach((card, index) => {
      const x = start + index * CARD_GAP;
      let progress = 1;
      if (s.phase === "dealing") {
        const order = index === 0 ? 0 : 2;
        progress = clamp01((s.dealTimer - order * DEAL_INTERVAL) / 0.18);
      } else if (index === cards.length - 1 && cards.length > 2) {
        progress = s.playerCardAnim;
      }
      drawMovingCard(ctx, card, x, 202, progress, false);
    });
  },
  dealerValueLabel() {
    const s = this.s;
    if (!s.dealer.length) return "—";
    if (s.phase === "dealing" || s.phase === "player" || (s.phase === "dealer" && !s.dealerRevealed)) {
      return "?";
    }
    return handValue(s.dealer);
  },
  drawControls(ctx) {
    const s = this.s;
    if (s.phase === "bet") {
      drawCasinoButton(ctx, 72, 305, 104, "− $5");
      drawCasinoButton(ctx, 184, 305, 104, "+ $5");
      drawCasinoButton(ctx, 296, 305, 104, "MAX");
      drawCasinoButton(ctx, 408, 305, 160, "DEAL", true);
    } else if (s.phase === "player") {
      drawCasinoButton(ctx, 170, 305, 140, "H — HIT");
      drawCasinoButton(ctx, 330, 305, 140, "S — STAND", true);
    } else if (s.phase === "dealing" || s.phase === "dealer") {
      text(ctx, s.phase === "dealing" ? "DEALING CARDS..." : "DEALER PLAYING...", 320, 320, {
        size: 7,
        align: "center",
        color: P.yellow,
      });
    } else {
      drawCasinoButton(
        ctx,
        194,
        305,
        252,
        s.phase === "won"
          ? "COLLECT $100"
          : s.phase === "bailout"
            ? "ACCEPT CREDIT"
            : "NEXT HAND",
        true
      );
    }
  },
};
