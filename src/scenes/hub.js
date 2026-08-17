import { game, goto, just, clicked, mouseIn } from "../engine.js";
import { P, fill, stroke, text, drawAriel, scanlines } from "../draw.js";
import { COPY } from "../copy.js";
import { sfx } from "../audio.js";
import { Scenes } from "../flow.js";
import { progressStage } from "../gameLogic.js";

const X0 = 68;
const X1 = 572;
const TRACK_Y = 160;

function stageX(stage) {
  return X0 + ((X1 - X0) * stage) / 4;
}

function drawMilestoneIcon(ctx, id, x, y, active) {
  const c = active ? P.yellow : P.muted;
  if (id === "cook") {
    fill(ctx, x - 18, y - 8, 28, 12, P.steak);
    fill(ctx, x + 10, y - 5, 16, 5, c);
  } else if (id === "docs") {
    fill(ctx, x - 15, y - 18, 30, 36, P.ink);
    fill(ctx, x - 10, y - 10, 20, 4, P.blue);
    fill(ctx, x - 10, y, 16, 4, P.muted);
  } else if (id === "blackjack") {
    fill(ctx, x - 20, y - 17, 28, 36, P.ink);
    text(ctx, "A", x - 15, y - 12, { size: 8, color: P.red });
    fill(ctx, x - 5, y - 10, 26, 34, P.ink);
    text(ctx, "21", x + 8, y, { size: 8, align: "center", color: P.bg });
  } else if (id === "sprint") {
    drawAriel(ctx, x - 18, y - 20, { scale: 2, body: P.orange, frame: 1 });
  } else {
    fill(ctx, x - 28, y - 6, 48, 12, P.ink);
    fill(ctx, x + 8, y - 16, 22, 12, P.ink);
    fill(ctx, x - 35, y - 2, 10, 5, P.orange);
  }
}

export const hub = {
  t: 0,
  shownStage: 0,
  targetStage: 0,
  settle: 0,
  enter(data = {}) {
    this.t = 0;
    this.targetStage = progressStage(game.done);
    this.shownStage = data.fromStage ?? Math.max(0, this.targetStage - (data.justCompleted ? 1 : 0));
    this.settle = data.justCompleted ? 0.9 : 0;
  },
  update(dt) {
    this.t += dt;
    if (this.settle > 0) {
      this.settle -= dt;
    } else if (this.shownStage < this.targetStage) {
      this.shownStage = Math.min(this.targetStage, this.shownStage + dt * 0.75);
    }
    const ready = Math.abs(this.shownStage - this.targetStage) < 0.01 && this.targetStage < 4;
    if (ready && (just("Space") || just("Enter") || (clicked() && mouseIn(188, 290, 264, 40)))) {
      const id = COPY.timeline[this.targetStage].id;
      sfx.start();
      goto(Scenes[id]);
    }
  },
  draw(ctx) {
    fill(ctx, 0, 0, 640, 360, "#18243a");
    fill(ctx, 0, 0, 640, 70, P.bg2);
    text(ctx, "ARIEL'S EXTREMELY WELL-PLANNED DAY", 320, 17, {
      size: 8,
      align: "center",
      color: P.yellow,
    });
    text(ctx, "9:00 AM  →  FLIGHT AT 5:00 PM", 320, 40, {
      size: 8,
      align: "center",
      color: P.dim,
    });

    fill(ctx, X0, TRACK_Y - 5, X1 - X0, 10, P.dark);
    fill(ctx, X0, TRACK_Y - 5, stageX(this.shownStage) - X0, 10, P.orange);

    COPY.timeline.forEach((stop, index) => {
      const x = stageX(index);
      const reached = this.shownStage >= index - 0.01;
      const secret = stop.id === "blackjack" && this.targetStage < 2;
      fill(ctx, x - 7, TRACK_Y - 7, 14, 14, reached ? P.yellow : P.dark);
      stroke(ctx, x - 7, TRACK_Y - 7, 14, 14, P.ink, 1);
      if (secret) {
        text(ctx, "?", x, 108, { size: 14, align: "center", color: P.muted });
      } else {
        drawMilestoneIcon(ctx, stop.id, x, 116, reached);
      }
      text(ctx, stop.time, x, 180, {
        size: 8,
        align: "center",
        color: reached ? P.ink : P.muted,
      });
      text(ctx, secret ? "???" : stop.title, x, 198, {
        size: index === 4 ? 6 : 7,
        align: "center",
        color: reached ? P.yellow : P.muted,
      });
    });

    const avatarX = stageX(this.shownStage) - 15;
    drawAriel(ctx, avatarX, 128, {
      scale: 2,
      body: P.blue,
      frame: Math.floor(this.t * 8),
    });

    const stage = Math.min(this.targetStage, 4);
    const item = COPY.timeline[stage];
    fill(ctx, 28, 235, 584, 105, P.bg2);
    stroke(ctx, 28, 235, 584, 105, P.dark, 3);
    text(ctx, `${item.time} — ${item.title}`, 320, 252, {
      size: 8,
      align: "center",
      color: P.orange,
    });
    text(ctx, item.subtitle, 320, 273, {
      size: 8,
      align: "center",
      color: P.ink,
      maxWidth: 540,
    });
    if (stage < 4 && Math.abs(this.shownStage - this.targetStage) < 0.01) {
      fill(ctx, 188, 300, 264, 28, P.orange);
      text(ctx, item.prompt, 320, 310, { size: 8, align: "center", color: P.bg });
    } else if (stage === 4) {
      text(ctx, "He made it. Against every available data point.", 320, 310, {
        size: 8,
        align: "center",
        color: P.green,
      });
    } else {
      text(ctx, "TIME IS PASSING...", 320, 310, { size: 8, align: "center", color: P.muted });
    }
    text(ctx, game.muted ? "M: MUTED" : "M: SOUND", 8, 347, { size: 6, color: P.muted });
    scanlines(ctx);
  },
};
