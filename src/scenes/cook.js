import { game, goto, just, clicked, mouseIn } from "../engine.js";
import { P, fill, stroke, text, bar, drawPan, scanlines } from "../draw.js";
import { COPY } from "../copy.js";
import { sfx } from "../audio.js";
import { Scenes } from "../flow.js";
import {
  COOK_STATES,
  advanceCookware,
  cookwareStatus,
  takeOffHeat,
} from "../gameLogic.js";

const POT_ZONES = [
  { x: 50, y: 78, w: 174, h: 108 },
  { x: 256, y: 78, w: 174, h: 108 },
];
const KNOB_ZONES = [
  { x: 58, y: 190, w: 78, h: 28 },
  { x: 264, y: 190, w: 78, h: 28 },
];
const LIFT_ZONES = [
  { x: 142, y: 190, w: 74, h: 28 },
  { x: 348, y: 190, w: 74, h: 28 },
];
const PAN_ZONE = { x: 50, y: 226, w: 174, h: 108 };
const PANTRY_ZONES = {
  COUSCOUS: { x: 492, y: 92, w: 128, h: 52 },
  BUCKWHEAT: { x: 492, y: 154, w: 128, h: 52 },
  STEAK: { x: 492, y: 226, w: 128, h: 78 },
};
const TIMINGS = {
  COUSCOUS: { readyAt: 12, burnAt: 18 },
  BUCKWHEAT: { readyAt: 15, burnAt: 22 },
};
const STEAK_GREEN_START = 0.62;
const STEAK_GREEN_END = 0.86;
const STEAK_PAN_ZONE = { x: 245, y: 116, w: 300, h: 164 };
const STEAK_SOURCE_ZONE = { x: 58, y: 145, w: 150, h: 110 };

function blankPot(label) {
  return {
    name: label,
    ingredient: null,
    heat: false,
    elapsed: 0,
    readyAt: 1,
    burnAt: 1,
    removed: false,
    result: null,
    readyAlerted: false,
    burnWarned: false,
  };
}

function reset() {
  return {
    mode: "stove",
    drag: null,
    pots: [blankPot("POT A"), blankPot("POT B")],
    steak: {
      loaded: false,
      dragging: false,
      side: 0,
      sides: [0, 0],
      done: false,
      sizzleClock: 0,
    },
    failure: "",
    failureType: "",
    failedFrom: "",
    t: 0,
    elapsed: 0,
  };
}

function stateColor(state) {
  if (state === COOK_STATES.READY || state === COOK_STATES.DONE) return P.green;
  if (state === COOK_STATES.BURNT) return P.red;
  if (state === COOK_STATES.COOKING) return P.orange;
  return P.muted;
}

function ingredientColor(name) {
  if (name === "COUSCOUS") return P.cous;
  if (name === "BUCKWHEAT") return P.buck;
  return P.steak;
}

function pointIn(zone) {
  return mouseIn(zone.x, zone.y, zone.w, zone.h);
}

function ingredientUsed(s, name) {
  if (name === "STEAK") return s.steak.loaded;
  return s.pots.some((pot) => pot.ingredient === name);
}

function failKitchen(s, reason, type = "kitchen") {
  s.drag = null;
  s.steak.dragging = false;
  s.failedFrom = s.mode;
  s.mode = "failed";
  s.failure = reason;
  s.failureType = type;
  sfx.bad();
}

function drawBag(ctx, name, x, y, scale = 1, faded = false) {
  const w = 88 * scale;
  const h = 42 * scale;
  ctx.globalAlpha = faded ? 0.35 : 1;
  fill(ctx, x + 4 * scale, y + 4 * scale, w, h, P.bg2);
  fill(ctx, x, y, w, h, name === "COUSCOUS" ? "#ead9a0" : "#a98243");
  fill(ctx, x, y, w, 8 * scale, name === "COUSCOUS" ? P.yellow : P.orange);
  text(ctx, name, x + w / 2, y + 17 * scale, {
    size: Math.max(5, 6 * scale),
    align: "center",
    color: P.bg,
  });
  ctx.globalAlpha = 1;
}

function drawRawSteak(ctx, x, y, scale = 1, cooked = 0, flip = false) {
  const outside = cooked >= STEAK_GREEN_START ? "#7b3028" : P.steak;
  const inside = cooked >= STEAK_GREEN_START ? "#a64a34" : "#c94f59";
  fill(ctx, x + 8 * scale, y, 52 * scale, 8 * scale, outside);
  fill(ctx, x, y + 8 * scale, 68 * scale, 36 * scale, outside);
  fill(ctx, x + 10 * scale, y + 15 * scale, 46 * scale, 20 * scale, inside);
  fill(ctx, x + (flip ? 12 : 48) * scale, y + 18 * scale, 8 * scale, 8 * scale, P.cous);
}

function drawBurner(ctx, x, y, on, t) {
  fill(ctx, x, y, 150, 98, "#20242a");
  stroke(ctx, x + 22, y + 13, 106, 70, on ? P.orange : P.dark, 6);
  stroke(ctx, x + 38, y + 25, 74, 46, on ? P.yellow : P.muted, 3);
  if (on) {
    const flicker = Math.floor(t * 10) % 2;
    fill(ctx, x + 28, y + 78 - flicker * 3, 12, 8 + flicker * 3, P.orange);
    fill(ctx, x + 110, y + 78 - (1 - flicker) * 3, 12, 8 + (1 - flicker) * 3, P.orange);
  }
}

function drawPot(ctx, pot, x, y, t) {
  const state = cookwareStatus(pot);
  const contents = pot.ingredient ? ingredientColor(pot.ingredient) : "#1b2028";
  fill(ctx, x - 12, y + 18, 22, 14, "#6c7480");
  fill(ctx, x + 98, y + 18, 22, 14, "#6c7480");
  fill(ctx, x, y, 108, 63, "#7e8794");
  fill(ctx, x + 8, y + 8, 92, 43, contents);
  fill(ctx, x + 26, y - 8, 56, 9, "#555d68");
  fill(ctx, x + 46, y - 14, 16, 7, "#7e8794");
  if (pot.heat && pot.ingredient && !pot.removed) {
    const bob = Math.floor(t * 5) % 2;
    fill(ctx, x + 20, y - 27 - bob * 3, 7, 12, P.dim);
    fill(ctx, x + 51, y - 32 + bob * 3, 7, 15, P.dim);
    fill(ctx, x + 80, y - 25 - bob * 2, 7, 10, P.dim);
  }
  if (pot.removed) {
    fill(ctx, x + 5, y + 18, 98, 27, "rgba(15,18,32,0.82)");
    text(ctx, "DONE", x + 54, y + 28, { size: 8, align: "center", color: P.green });
  } else if (!pot.ingredient) {
    text(ctx, "DROP FOOD", x + 54, y + 25, { size: 6, align: "center", color: P.muted });
  }
  return state;
}

export const cook = {
  s: null,
  enter() {
    this.s = reset();
  },
  update(dt) {
    const s = this.s;
    s.t += dt;

    if (s.mode === "won") {
      if (just("Space") || just("Enter") || clicked()) {
        game.done.cook = true;
        game.times.cook = s.elapsed;
        sfx.good();
        goto(Scenes.hub, { justCompleted: true, fromStage: 0 });
      }
      return;
    }
    if (s.mode === "failed") {
      if (
        just("Space") ||
        just("Enter") ||
        (clicked() && mouseIn(202, 222, 236, 38))
      ) {
        game.stats.cookingRetries += 1;
        this.s = reset();
        sfx.start();
      }
      return;
    }

    s.elapsed += dt;
    s.pots.forEach((pot) => {
      const state = advanceCookware(pot, dt);
      if (state === COOK_STATES.READY && !pot.readyAlerted) {
        pot.readyAlerted = true;
        sfx.good();
      }
      if (pot.heat && pot.elapsed >= pot.burnAt - 2 && !pot.burnWarned) {
        pot.burnWarned = true;
        sfx.bad();
      }
      if (state === COOK_STATES.BURNT) {
        failKitchen(
          s,
          `${pot.ingredient || pot.name} BURNED while Ariel was doing something else.`
        );
      }
    });
    if (s.mode === "failed") return;

    if (s.mode === "steak") this.updateSteak(dt);
    else this.updateStove();

    if (
      s.steak.done &&
      s.pots.every((pot) => pot.removed && pot.result === COOK_STATES.READY)
    ) {
      s.mode = "won";
      sfx.win();
    }
  },
  updateStove() {
    const s = this.s;

    if (clicked()) {
      for (const [name, zone] of Object.entries(PANTRY_ZONES)) {
        if (pointIn(zone) && !ingredientUsed(s, name)) {
          s.drag = { name };
          sfx.lift();
          break;
        }
      }

      s.pots.forEach((pot, index) => {
        if (pointIn(KNOB_ZONES[index])) {
          if (pot.ingredient && !pot.removed && !pot.heat) {
            pot.heat = true;
            sfx.burner();
          } else {
            sfx.bad();
          }
        } else if (pointIn(LIFT_ZONES[index])) {
          if (!pot.ingredient || pot.removed) {
            sfx.bad();
            return;
          }
          const result = takeOffHeat(pot);
          sfx.lift();
          if (result !== COOK_STATES.READY) {
            failKitchen(
              s,
              `${pot.ingredient} IS ${result === COOK_STATES.BURNT ? "BURNT" : "TOO RAW"}.`
            );
          }
        }
      });

      if (pointIn(PAN_ZONE) && s.steak.loaded && !s.steak.done) {
        s.mode = "steak";
        sfx.start();
      }
    }

    if (game.mouse.released && s.drag) {
      const dragged = s.drag.name;
      let placed = false;
      if (dragged === "STEAK" && pointIn(PAN_ZONE)) {
        s.steak.loaded = true;
        s.mode = "steak";
        placed = true;
      } else if (dragged !== "STEAK") {
        POT_ZONES.forEach((zone, index) => {
          const pot = s.pots[index];
          if (!placed && pointIn(zone) && !pot.ingredient) {
            const timing = TIMINGS[dragged];
            pot.ingredient = dragged;
            pot.readyAt = timing.readyAt;
            pot.burnAt = timing.burnAt;
            placed = true;
          }
        });
      }
      if (placed) sfx.drop();
      else sfx.bad();
      s.drag = null;
    }
  },
  updateSteak(dt) {
    const s = this.s;
    const steak = s.steak;

    if (just("Escape")) {
      steak.dragging = false;
      s.mode = "stove";
      return;
    }

    if (clicked() && pointIn(STEAK_SOURCE_ZONE)) {
      steak.dragging = true;
      sfx.lift();
    }

    if (steak.dragging && game.mouse.down && pointIn(STEAK_PAN_ZONE)) {
      steak.sides[steak.side] += dt * 0.32;
      steak.sizzleClock -= dt;
      if (steak.sizzleClock <= 0) {
        steak.sizzleClock = 0.11;
        sfx.sizzle();
      }
      if (steak.sides[steak.side] > 1) {
        failKitchen(s, "The steak crossed all the way into red.", "steak");
      }
    } else {
      steak.sizzleClock = 0;
    }

    if (game.mouse.released && steak.dragging) {
      steak.dragging = false;
      const sear = steak.sides[steak.side];
      if (sear > STEAK_GREEN_END) {
        failKitchen(s, "The steak was lifted after the green zone.", "steak");
      } else if (sear >= STEAK_GREEN_START) {
        sfx.flip();
        if (steak.side === 0) {
          steak.side = 1;
        } else {
          steak.done = true;
          s.mode = "stove";
          sfx.win();
        }
      } else {
        sfx.lift();
      }
    }
  },
  draw(ctx) {
    const s = this.s;
    fill(ctx, 0, 0, 640, 360, "#251a18");
    fill(ctx, 0, 0, 640, 58, P.bg2);
    text(ctx, COPY.cook.title, 16, 10, { size: 8, color: P.yellow });
    text(ctx, COPY.cook.help, 16, 31, { size: 7, color: P.dim, maxWidth: 610 });

    if (s.mode === "steak" || (s.mode === "failed" && s.failedFrom === "steak")) {
      this.drawSteak(ctx);
    }
    else this.drawStove(ctx);

    if (s.mode === "failed" || s.mode === "won") {
      fill(ctx, 0, 58, 640, 302, "rgba(8,10,16,0.74)");
      fill(ctx, 150, 94, 340, 180, P.bg2);
      stroke(ctx, 150, 94, 340, 180, s.mode === "won" ? P.green : P.red, 4);
      text(
        ctx,
        s.mode === "won"
          ? "BREAKFAST COMPLETE"
          : s.failureType === "steak"
            ? "STEAK BURNED!"
            : "KITCHEN FAILED",
        320,
        116,
        {
          size: 12,
          align: "center",
          color: s.mode === "won" ? P.green : P.red,
        }
      );
      text(ctx, s.mode === "won" ? COPY.cook.win : s.failure, 320, 153, {
        size: 8,
        align: "center",
        color: s.mode === "won" ? P.green : P.pink,
        maxWidth: 292,
        lineHeight: 16,
      });
      fill(ctx, 202, 222, 236, 38, s.mode === "won" ? P.green2 : P.orange);
      text(ctx, s.mode === "won" ? "SPACE — CONTINUE" : "TRY AGAIN — RESET ALL", 320, 236, {
        size: 8,
        align: "center",
        color: P.bg,
      });
    }
    scanlines(ctx);
  },
  drawStove(ctx) {
    const s = this.s;
    for (let y = 60; y < 350; y += 22) {
      for (let x = 0; x < 480; x += 42) {
        fill(ctx, x, y, 40, 20, (x / 42 + y / 22) % 2 ? "#d4c7ad" : "#c5b79e");
      }
    }
    fill(ctx, 26, 68, 438, 280, "#454951");
    stroke(ctx, 26, 68, 438, 280, "#747b87", 4);

    drawBurner(ctx, 62, 82, s.pots[0].heat, s.t);
    drawBurner(ctx, 268, 82, s.pots[1].heat, s.t);
    const state0 = drawPot(ctx, s.pots[0], 83, 105, s.t);
    const state1 = drawPot(ctx, s.pots[1], 289, 105, s.t);

    s.pots.forEach((pot, index) => {
      const x = 58 + index * 206;
      const state = index ? state1 : state0;
      const ratio = pot.ingredient ? pot.elapsed / pot.burnAt : 0;
      bar(ctx, x, 174, 158, 9, ratio, stateColor(state), "#20242a");
      if (pot.ingredient) {
        const greenX = x + (pot.readyAt / pot.burnAt) * 158;
        stroke(ctx, greenX, 172, x + 158 - greenX, 13, P.green, 2);
      }
      fill(ctx, x, 190, 78, 28, pot.heat ? P.orange : P.dark);
      text(ctx, pot.heat ? "HEAT ON" : "IGNITE", x + 39, 201, {
        size: 6,
        align: "center",
        color: pot.heat ? P.bg : P.ink,
      });
      fill(ctx, x + 84, 190, 74, 28, state === COOK_STATES.READY ? P.green2 : P.blue);
      text(ctx, "LIFT POT", x + 121, 201, { size: 6, align: "center" });
      text(ctx, pot.ingredient || pot.name, x + 79, 221, {
        size: 6,
        align: "center",
        color: stateColor(state),
      });
    });

    drawBurner(ctx, 62, 240, true, s.t);
    drawPan(ctx, 83, 263, s.steak.done ? P.green : s.steak.loaded ? P.steak : "#252830", true);
    text(ctx, s.steak.done ? "STEAK DONE" : s.steak.loaded ? "CLICK PAN" : "DROP STEAK", 141, 318, {
      size: 6,
      align: "center",
      color: s.steak.done ? P.green : P.yellow,
    });

    drawBurner(ctx, 268, 240, false, s.t);
    text(ctx, "4TH BURNER", 343, 282, { size: 7, align: "center", color: P.muted });
    text(ctx, "(OPTIMISM)", 343, 299, { size: 6, align: "center", color: P.dark });

    fill(ctx, 476, 68, 158, 280, "#50351f");
    stroke(ctx, 476, 68, 158, 280, "#8a6038", 4);
    fill(ctx, 484, 82, 142, 26, "#2d1f19");
    text(ctx, "PANTRY — DRAG", 555, 92, { size: 7, align: "center", color: P.yellow });
    fill(ctx, 486, 146, 138, 6, "#8a6038");
    fill(ctx, 486, 208, 138, 6, "#8a6038");
    fill(ctx, 486, 310, 138, 6, "#8a6038");
    drawBag(ctx, "COUSCOUS", 506, 103, 1, ingredientUsed(s, "COUSCOUS"));
    drawBag(ctx, "BUCKWHEAT", 506, 165, 1, ingredientUsed(s, "BUCKWHEAT"));
    ctx.globalAlpha = ingredientUsed(s, "STEAK") ? 0.35 : 1;
    drawRawSteak(ctx, 520, 239, 1);
    text(ctx, ingredientUsed(s, "STEAK") ? "IN PAN" : "RAW STEAK", 556, 290, {
      size: 6,
      align: "center",
      color: P.ink,
    });
    ctx.globalAlpha = 1;

    if (!s.drag) {
      Object.entries(PANTRY_ZONES).forEach(([name, zone]) => {
        if (!ingredientUsed(s, name) && pointIn(zone)) {
          stroke(ctx, zone.x - 2, zone.y - 2, zone.w + 4, zone.h + 4, P.yellow, 3);
        }
      });
      KNOB_ZONES.forEach((zone) => {
        if (pointIn(zone)) stroke(ctx, zone.x, zone.y, zone.w, zone.h, P.yellow, 2);
      });
      LIFT_ZONES.forEach((zone) => {
        if (pointIn(zone)) stroke(ctx, zone.x, zone.y, zone.w, zone.h, P.yellow, 2);
      });
    }

    if (s.drag) {
      if (s.drag.name === "STEAK") {
        stroke(ctx, PAN_ZONE.x, PAN_ZONE.y, PAN_ZONE.w, PAN_ZONE.h, P.yellow, 4);
      } else {
        POT_ZONES.forEach((zone, index) => {
          if (!s.pots[index].ingredient) {
            stroke(ctx, zone.x, zone.y, zone.w, zone.h, P.yellow, 4);
          }
        });
      }
      ctx.globalAlpha = 0.92;
      if (s.drag.name === "STEAK") drawRawSteak(ctx, game.mouse.x - 34, game.mouse.y - 22, 1);
      else drawBag(ctx, s.drag.name, game.mouse.x - 44, game.mouse.y - 21, 1);
      ctx.globalAlpha = 1;
      text(ctx, "DROP ON COOKWARE", game.mouse.x, game.mouse.y - 35, {
        size: 6,
        align: "center",
        color: P.yellow,
      });
    }
  },
  drawSteak(ctx) {
    const s = this.s;
    const steak = s.steak;
    fill(ctx, 0, 58, 640, 302, "#101722");
    fill(ctx, 18, 70, 224, 38, "#1c2938");
    stroke(ctx, 18, 70, 224, 38, "#34465d", 2);
    text(ctx, `STEAK — SIDE ${steak.side + 1}/2`, 32, 83, {
      size: 8,
      color: P.yellow,
    });

    [0, 1].forEach((side) => {
      const complete = steak.side > side || steak.done;
      const current = steak.side === side && !steak.done;
      const x = 254 + side * 78;
      fill(ctx, x, 70, 68, 38, complete ? P.green2 : current ? P.orange : P.dark);
      text(ctx, complete ? `${side + 1} OK` : `SIDE ${side + 1}`, x + 34, 84, {
        size: 6,
        align: "center",
        color: complete || current ? P.bg : P.muted,
      });
    });

    s.pots.forEach((pot, index) => {
      const state = cookwareStatus(pot);
      const x = 420 + index * 102;
      fill(ctx, x, 70, 94, 38, "#1c2938");
      stroke(ctx, x, 70, 94, 38, stateColor(state), 2);
      text(ctx, pot.ingredient || pot.name, x + 47, 78, {
        size: 5,
        align: "center",
        color: P.ink,
      });
      text(ctx, state.toUpperCase(), x + 47, 93, {
        size: 5,
        align: "center",
        color: stateColor(state),
      });
    });

    fill(ctx, 18, 118, 604, 174, "#182331");
    stroke(ctx, 18, 118, 604, 174, "#2b3b50", 3);
    fill(ctx, 42, 138, 166, 128, "#263548");
    fill(ctx, 54, 148, 142, 108, "#d8d3c4");
    stroke(ctx, 54, 148, 142, 108, "#f3eddd", 3);
    text(ctx, "PLATE", 125, 272, { size: 6, align: "center", color: P.muted });
    if (!steak.dragging) {
      drawRawSteak(ctx, 86, 172, 1.45, steak.sides[steak.side], steak.side === 1);
      if (pointIn(STEAK_SOURCE_ZONE)) {
        stroke(ctx, 58, 145, 150, 108, P.yellow, 3);
      }
    }

    fill(ctx, 230, 127, 354, 150, "#252f3c");
    stroke(ctx, 246, 137, 288, 130, "#080b10", 9);
    stroke(ctx, 270, 152, 240, 100, "#3c4653", 4);
    if (steak.dragging && pointIn(STEAK_PAN_ZONE)) {
      stroke(ctx, 246, 137, 288, 130, P.green, 4);
    }
    fill(ctx, 534, 184, 72, 28, "#252f3c");
    fill(ctx, 282, 260, 230, 6, P.orange);

    if (steak.dragging) {
      drawRawSteak(
        ctx,
        game.mouse.x - 50,
        game.mouse.y - 32,
        1.45,
        steak.sides[steak.side],
        steak.side === 1
      );
    }

    const sear = steak.sides[steak.side];
    const meterX = 70;
    const meterW = 500;
    fill(ctx, meterX, 307, meterW * STEAK_GREEN_START, 18, "#394656");
    fill(
      ctx,
      meterX + meterW * STEAK_GREEN_START,
      307,
      meterW * (STEAK_GREEN_END - STEAK_GREEN_START),
      18,
      "#28724a"
    );
    fill(
      ctx,
      meterX + meterW * STEAK_GREEN_END,
      307,
      meterW * (1 - STEAK_GREEN_END),
      18,
      "#6f2935"
    );
    const markerX = meterX + meterW * Math.min(1, sear);
    fill(ctx, markerX - 3, 302, 6, 28, P.ink);
    stroke(ctx, meterX, 307, meterW, 18, P.ink, 2);
    text(ctx, "RAW", meterX, 334, { size: 6, color: P.muted });
    text(ctx, "RARE", meterX + meterW * 0.74, 334, {
      size: 6,
      align: "center",
      color: P.green,
    });
    text(ctx, "BURNED", meterX + meterW, 334, { size: 6, align: "right", color: P.red });
  },
};
