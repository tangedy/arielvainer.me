import { game, goto, just, clicked, mouseIn, resetGame } from "../engine.js";
import { P, fill, stroke, text, bar, drawAriel, drawPlane, scanlines } from "../draw.js";
import { COPY } from "../copy.js";
import { sfx } from "../audio.js";
import { Scenes } from "../flow.js";
import {
  NAME_COLORS,
  boardRemark,
  calculateScore,
  formatLeaderboardTime,
  getLeaderboard,
  leaderboardConfigured,
  normalizeNameColor,
  placementColor,
  placementLabel,
  submitScore,
} from "../leaderboard.js";

const COLOR_SWATCH = { x: 28, y: 256, size: 20, gap: 4 };
const LOG_BOX = { x: 300, y: 284, w: 150, h: 36 };
const PLAY_BOX = { x: 458, y: 284, w: 160, h: 36 };

function colorSwatchRect(index) {
  return {
    x: COLOR_SWATCH.x + index * (COLOR_SWATCH.size + COLOR_SWATCH.gap),
    y: COLOR_SWATCH.y,
    w: COLOR_SWATCH.size,
    h: COLOR_SWATCH.size,
  };
}

function fmt(n) {
  return `${n.toFixed(1)}s`;
}

function sprintState() {
  return {
    mode: "sprint",
    distance: 0,
    speed: 0,
    time: 13,
    elapsed: 0,
    taps: 0,
    t: 0,
    line: 0,
    lineTimer: 0,
    departureTime: 0,
    boardAlpha: 0,
    scores: [],
    score: null,
    playerName: "",
    nameColor: NAME_COLORS[0],
    loading: false,
    submitted: false,
    status: "",
  };
}

export const ending = {
  s: null,
  enter() {
    game.acceptingText = false;
    this.s = sprintState();
    sfx.start();
  },
  exit() {
    game.acceptingText = false;
  },
  update(dt) {
    const s = this.s;
    s.t += dt;

    if (s.mode === "failed") {
      if (just("Space") || just("Enter") || clicked()) {
        game.stats.sprintRetries += 1;
        this.s = sprintState();
        sfx.start();
      }
      return;
    }

    if (s.mode === "epilogue") {
      s.lineTimer += dt;
      if (s.lineTimer > 1.25 && s.line < COPY.end.lines.length - 1) {
        s.line += 1;
        s.lineTimer = 0;
      }
      if (s.line === COPY.end.lines.length - 1 && s.lineTimer > 1.6) {
        this.startDeparture();
        return;
      }
      if (just("Space") || just("Enter") || clicked()) {
        if (s.line < COPY.end.lines.length - 1) {
          s.line += 1;
          s.lineTimer = 0;
        } else {
          this.startDeparture();
        }
      }
      return;
    }

    if (s.mode === "departure") {
      s.departureTime += dt;
      if (s.departureTime >= 4.4) this.startLeaderboard();
      return;
    }

    if (s.mode === "leaderboard") {
      s.boardAlpha = Math.min(1, s.boardAlpha + dt * 0.8);
      this.updateLeaderboardInput();
      return;
    }

    s.elapsed += dt;
    s.time -= dt;
    if (just("Space")) {
      s.speed = Math.min(1.45, s.speed + 0.24);
      s.distance += 0.012;
      s.taps += 1;
      sfx.tick();
    }
    s.speed = Math.max(0, s.speed - dt * 0.72);
    s.distance += s.speed * dt * 0.12;

    if (s.distance >= 1) {
      s.distance = 1;
      s.mode = "epilogue";
      s.line = 0;
      s.lineTimer = 0;
      game.done.sprint = true;
      game.times.sprint = s.elapsed;
      sfx.win();
    } else if (s.time <= 0) {
      s.mode = "failed";
      sfx.bad();
    }
  },
  startDeparture() {
    const s = this.s;
    s.mode = "departure";
    s.departureTime = 0;
    game.acceptingText = false;
    sfx.planeAway();
  },
  startLeaderboard() {
    const s = this.s;
    s.mode = "leaderboard";
    s.boardAlpha = 0;
    s.score = calculateScore(game);
    s.loading = true;
    s.status = leaderboardConfigured ? "CONTACTING DEPARTURES BOARD..." : "LOCAL DEMO BOARD";
    game.acceptingText = true;
    const current = s;
    getLeaderboard()
      .then((scores) => {
        if (this.s !== current) return;
        s.scores = scores;
        s.status = leaderboardConfigured
          ? "GLOBAL DEPARTURES ONLINE"
          : "LOCAL BOARD — ADD SUPABASE KEYS FOR A SHARED WORLD BOARD";
      })
      .catch((error) => {
        if (this.s !== current) return;
        s.status = error.message.toUpperCase();
      })
      .finally(() => {
        if (this.s === current) s.loading = false;
      });
  },
  updateLeaderboardInput() {
    const s = this.s;
    for (const char of game.textJust) {
      if (char === "\b") {
        s.playerName = s.playerName.slice(0, -1);
      } else if (/^[a-zA-Z0-9 _-]$/.test(char) && s.playerName.length < 16) {
        s.playerName += char;
      }
    }

    if (clicked() && !s.submitted) {
      const picked = NAME_COLORS.findIndex((_, index) => {
        const box = colorSwatchRect(index);
        return mouseIn(box.x, box.y, box.w, box.h);
      });
      if (picked >= 0) {
        s.nameColor = NAME_COLORS[picked];
        sfx.tick();
        return;
      }
    }

    if (
      !s.submitted &&
      !s.loading &&
      (just("Enter") || (clicked() && mouseIn(LOG_BOX.x, LOG_BOX.y, LOG_BOX.w, LOG_BOX.h)))
    ) {
      this.logScore();
    }

    if (clicked() && mouseIn(PLAY_BOX.x, PLAY_BOX.y, PLAY_BOX.w, PLAY_BOX.h)) {
      game.acceptingText = false;
      resetGame();
      sfx.start();
      goto(Scenes.hub);
    }
  },
  logScore() {
    const s = this.s;
    if (!s.playerName.trim()) {
      s.status = "TYPE A PASSENGER NAME";
      sfx.bad();
      return;
    }
    s.loading = true;
    s.status = "UPDATING DEPARTURES...";
    submitScore(s.playerName, s.score, s.nameColor)
      .then((scores) => {
        if (this.s !== s) return;
        s.scores = scores;
        s.submitted = true;
        s.status = leaderboardConfigured
          ? "PASSENGER LOGGED · FLIGHT DEPARTED"
          : "PASSENGER LOGGED ON THIS COMPUTER";
        sfx.win();
      })
      .catch((error) => {
        if (this.s !== s) return;
        s.status = error.message.toUpperCase();
        sfx.bad();
      })
      .finally(() => {
        if (this.s === s) s.loading = false;
      });
  },
  draw(ctx) {
    const s = this.s;
    if (s.mode === "epilogue") {
      this.drawEpilogue(ctx);
      return;
    }
    if (s.mode === "departure") {
      this.drawDeparture(ctx);
      return;
    }
    if (s.mode === "leaderboard") {
      this.drawLeaderboard(ctx);
      return;
    }

    fill(ctx, 0, 0, 640, 360, "#263d5c");
    fill(ctx, 0, 0, 640, 58, P.bg2);
    text(ctx, COPY.sprint.title, 14, 10, { size: 8, color: P.yellow });
    text(ctx, COPY.sprint.help, 14, 31, { size: 6, color: P.dim });

    fill(ctx, 0, 215, 640, 145, P.road);
    fill(ctx, 0, 208, 640, 10, P.muted);
    const scroll = (s.t * (60 + s.speed * 180)) % 100;
    for (let i = -1; i < 8; i++) fill(ctx, i * 100 - scroll, 286, 55, 7, P.yellow);
    for (let i = 0; i < 7; i++) {
      fill(ctx, i * 110 - scroll * 0.3, 162, 48, 46, "#172b43");
      fill(ctx, i * 110 + 9 - scroll * 0.3, 174, 8, 12, P.yellow);
    }

    const runnerX = 40 + s.distance * 470;
    drawAriel(ctx, runnerX, 226, {
      scale: 3,
      body: P.orange,
      frame: Math.floor(s.t * (8 + s.speed * 8)),
      shake: s.speed > 0.7,
    });
    drawPlane(ctx, 550, 191, P.ink, 1);

    fill(ctx, 28, 72, 584, 80, P.bg2);
    stroke(ctx, 28, 72, 584, 80, s.time < 4 ? P.red : P.dark, 3);
    text(ctx, `GATE CLOSES  ${this.clockText()}`, 320, 88, {
      size: 10,
      align: "center",
      color: s.time < 4 ? P.red : P.ink,
    });
    bar(ctx, 64, 118, 512, 14, s.distance, P.green, P.dark);
    text(ctx, `${Math.floor(s.distance * 100)}% TO GATE  ·  ${s.taps} STEPS`, 320, 138, {
      size: 6,
      align: "center",
      color: P.dim,
    });

    fill(ctx, 170, 315, 300, 34, P.orange);
    text(ctx, "MASH SPACE", 320, 327, { size: 9, align: "center", color: P.bg });

    if (s.mode === "failed") {
      fill(ctx, 80, 110, 480, 142, P.bg2);
      stroke(ctx, 80, 110, 480, 142, P.red, 4);
      text(ctx, COPY.sprint.fail, 320, 145, {
        size: 8,
        align: "center",
        color: P.pink,
        maxWidth: 420,
        lineHeight: 16,
      });
      text(ctx, "SPACE — REWIND TIME", 320, 213, {
        size: 8,
        align: "center",
        color: P.yellow,
      });
    }
    scanlines(ctx);
  },
  clockText() {
    const used = 13 - Math.max(0, this.s.time);
    const totalSeconds = Math.min(8 * 60, Math.floor((used / 13) * 8 * 60));
    const minutes = 52 + Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hour = minutes >= 60 ? 5 : 4;
    return `${hour}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")} PM`;
  },
  drawEpilogue(ctx) {
    const s = this.s;
    fill(ctx, 0, 0, 640, 210, "#152238");
    fill(ctx, 0, 210, 640, 150, P.bg);
    fill(ctx, 0, 202, 640, 10, P.dark);
    drawPlane(ctx, 230, 74, P.ink, 2);
    text(ctx, COPY.end.title, 320, 18, { size: 9, align: "center", color: P.yellow });
    text(ctx, COPY.sprint.win, 320, 174, {
      size: 7,
      align: "center",
      color: P.green,
      maxWidth: 580,
    });
    drawAriel(ctx, 32, 238, { scale: 3, body: P.blue, frame: Math.floor(s.t * 5) });
    COPY.end.lines.forEach((line, index) => {
      if (index > s.line) return;
      text(ctx, line, 128, 230 + index * 18, {
        size: 7,
        color: index === s.line ? P.ink : P.dim,
      });
    });
    if (s.line >= COPY.end.lines.length - 1) {
      text(
        ctx,
        `COOK ${fmt(game.times.cook)}  ·  DOCS ${fmt(game.times.docs)}  ·  CARDS ${fmt(game.times.blackjack)}  ·  RUN ${fmt(game.times.sprint)}`,
        320,
        326,
        { size: 6, align: "center", color: P.orange }
      );
      text(ctx, "SPACE — WATCH THE PLANE LEAVE", 320, 344, {
        size: 6,
        align: "center",
        color: P.yellow,
      });
    }
    scanlines(ctx);
  },
  drawDeparture(ctx) {
    const p = Math.min(1, this.s.departureTime / 4.2);
    fill(ctx, 0, 0, 640, 360, "#0b1220");
    fill(ctx, 0, 0, 640, 70, "#141c2e");
    fill(ctx, 0, 70, 640, 90, "#1d2d48");
    fill(ctx, 0, 160, 640, 70, "#3a4d68");
    fill(ctx, 0, 230, 640, 40, "#c9844a");
    fill(ctx, 0, 270, 640, 90, "#12161d");
    fill(ctx, 0, 268, 640, 8, "#2a3340");
    for (let i = 0; i < 18; i++) {
      fill(ctx, (i * 73 + this.s.t * 8) % 700 - 20, 28 + (i % 5) * 18, 2, 2, "rgba(244,244,244,0.55)");
    }
    for (let i = 0; i < 9; i++) {
      fill(ctx, 24 + i * 72, 286, 8, 8, i % 2 ? "#ffcd75" : "#566c86");
    }
    const scale = Math.max(0.18, 2.05 - p * 1.88);
    const planeX = 36 + p * 520;
    const planeY = 248 - p * 168;
    for (let i = 0; i < 10; i++) {
      const trailX = planeX - 10 - i * (9 + p * 10);
      fill(
        ctx,
        trailX,
        planeY + 10 * scale,
        Math.max(1, 11 - i),
        Math.max(1, 3 * scale),
        `rgba(244,244,244,${0.34 - i * 0.03})`
      );
    }
    drawPlane(ctx, planeX, planeY, P.ink, scale);
    text(ctx, "LH471  ·  BERLIN", 320, 318, {
      size: 8,
      align: "center",
      color: `rgba(255,205,117,${Math.min(1, p * 1.4)})`,
    });
    text(ctx, "DEPARTED", 320, 338, {
      size: 6,
      align: "center",
      color: `rgba(167,240,112,${Math.max(0, (p - 0.45) / 0.55)})`,
    });
    scanlines(ctx);
  },
  drawLeaderboard(ctx) {
    const s = this.s;
    fill(ctx, 0, 0, 640, 360, "#101418");
    fill(ctx, 0, 0, 640, 22, "#2b3338");
    for (let x = 18; x < 640; x += 88) fill(ctx, x, 22, 8, 8, "#3d484f");

    ctx.globalAlpha = s.boardAlpha;
    fill(ctx, 16, 16, 608, 328, "#070808");
    stroke(ctx, 16, 16, 608, 328, "#6a5a28", 4);
    fill(ctx, 22, 22, 596, 36, "#c9a227");
    text(ctx, "DEPARTURES", 36, 33, { size: 10, color: "#16140d" });
    text(ctx, "FRA  →  BER    GATE 47", 606, 35, {
      size: 7,
      align: "right",
      color: "#16140d",
    });

    fill(ctx, 22, 62, 596, 18, "#12100a");
    text(ctx, "PLACE", 36, 67, { size: 6, color: "#e8c15a" });
    text(ctx, "PASSENGER", 110, 67, { size: 6, color: "#e8c15a" });
    text(ctx, "DEST", 330, 67, { size: 6, color: "#e8c15a" });
    text(ctx, "TIME", 410, 67, { size: 6, color: "#e8c15a" });
    text(ctx, "REMARK", 510, 67, { size: 6, color: "#e8c15a" });

    const rows = s.scores.slice(0, 7);
    const visible = Math.min(rows.length, Math.floor(s.boardAlpha * 10));
    if (!rows.length && !s.loading) {
      text(ctx, "NO PASSENGERS LOGGED", 320, 150, {
        size: 8,
        align: "center",
        color: P.muted,
      });
    }
    rows.slice(0, visible).forEach((entry, index) => {
      const y = 84 + index * 24;
      const mine =
        s.submitted &&
        s.score &&
        entry.name.toUpperCase() === s.playerName.trim().toUpperCase() &&
        entry.adjusted_seconds === s.score.adjustedSeconds;
      fill(ctx, 22, y, 596, 22, mine ? "#2a2410" : index % 2 ? "#141210" : "#0c0c0b");
      const remark = boardRemark(index, mine);
      const remarkColor =
        remark === "ON TIME" || remark === "DEPARTED"
          ? P.green
          : remark === "DELAYED"
            ? P.orange
            : P.yellow;
      text(ctx, placementLabel(index), 36, y + 7, {
        size: 7,
        color: placementColor(index),
      });
      text(ctx, String(entry.name).toUpperCase().slice(0, 16), 110, y + 7, {
        size: 7,
        color: normalizeNameColor(entry.name_color),
      });
      text(ctx, "BER", 330, y + 7, { size: 7, color: "#f3e6c0" });
      text(ctx, formatLeaderboardTime(entry.adjusted_seconds), 410, y + 7, {
        size: 7,
        color: P.green,
      });
      text(ctx, remark, 510, y + 7, { size: 7, color: remarkColor });
    });

    const score = s.score || calculateScore(game);
    fill(ctx, 22, 252, 596, 26, "#16130c");
    NAME_COLORS.forEach((color, index) => {
      const box = colorSwatchRect(index);
      fill(ctx, box.x, box.y, box.w, box.h, color);
      if (s.nameColor === color) stroke(ctx, box.x, box.y, box.w, box.h, "#ffcd75", 2);
      else stroke(ctx, box.x, box.y, box.w, box.h, "#3d3330", 1);
    });
    text(
      ctx,
      `TIME ${formatLeaderboardTime(score.adjustedSeconds)}  RAW ${formatLeaderboardTime(score.rawSeconds)}  +${score.penaltySeconds}s`,
      606,
      260,
      { size: 6, align: "right", color: "#e8c15a" }
    );

    const cursor = Math.floor(s.t * 2) % 2 === 0 ? "_" : " ";
    const nameLabel = s.playerName
      ? `${s.playerName.toUpperCase()}${s.submitted ? "" : cursor}`
      : `PASSENGER NAME${cursor}`;
    fill(ctx, 22, 284, 270, 36, "#10100c");
    stroke(ctx, 22, 284, 270, 36, "#6a5a28", 2);
    text(ctx, nameLabel, 34, 297, {
      size: 7,
      color: s.playerName ? s.nameColor : P.muted,
    });
    fill(ctx, LOG_BOX.x, LOG_BOX.y, LOG_BOX.w, LOG_BOX.h, s.submitted ? "#1c1c16" : "#c9a227");
    text(ctx, s.submitted ? "LOGGED" : s.loading ? "WAIT..." : "LOG SCORE", 375, 297, {
      size: 7,
      align: "center",
      color: s.submitted ? P.muted : "#16140d",
    });
    fill(ctx, PLAY_BOX.x, PLAY_BOX.y, PLAY_BOX.w, PLAY_BOX.h, "#1c1c16");
    stroke(ctx, PLAY_BOX.x, PLAY_BOX.y, PLAY_BOX.w, PLAY_BOX.h, "#6a5a28", 2);
    text(ctx, "PLAY AGAIN", 538, 297, { size: 7, align: "center", color: "#f3e6c0" });
    text(ctx, s.status, 320, 332, {
      size: 6,
      align: "center",
      color: s.status.includes("FAILED") ? P.red : P.dim,
    });
    ctx.globalAlpha = 1;
    scanlines(ctx);
  },
};
