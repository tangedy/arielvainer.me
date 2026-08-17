import { game, goto, just, clicked, mouseIn } from "../engine.js";
import { P, fill, stroke, text, bar, scanlines } from "../draw.js";
import { COPY } from "../copy.js";
import { sfx } from "../audio.js";
import { Scenes } from "../flow.js";
import { scoreEmail } from "../gameLogic.js";

const CATEGORIES = ["greeting", "accountability", "explanation", "request", "closing"];

function initialChoices(round) {
  return Object.fromEntries(CATEGORIES.map((category, index) => [category, (round + index) % 3]));
}

function reset() {
  return {
    index: 0,
    to: "",
    clipboard: "",
    choices: initialChoices(0),
    result: null,
    complete: false,
    elapsed: 0,
    failedAttempts: 0,
    t: 0,
  };
}

function selectedPieces(s) {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, COPY.emailPieces[category][s.choices[category]]])
  );
}

function withDocument(textValue, document) {
  return textValue.replaceAll("{document}", document.name.toLowerCase());
}

export const docs = {
  s: null,
  enter() {
    this.s = reset();
  },
  submit() {
    const s = this.s;
    const document = COPY.documents[s.index];
    s.result = scoreEmail({
      to: s.to,
      document,
      selections: selectedPieces(s),
    });
    if (s.result.approved) {
      sfx.win();
    } else {
      s.failedAttempts += 1;
      game.stats.emailFailures = s.failedAttempts;
      sfx.bad();
    }
  },
  update(dt) {
    const s = this.s;
    s.t += dt;
    s.elapsed += dt;

    if (s.complete) {
      if (
        just("Space") ||
        just("Enter") ||
        (clicked() && mouseIn(176, 244, 288, 36))
      ) {
        game.done.docs = true;
        game.times.docs = s.elapsed;
        sfx.good();
        goto(Scenes.hub, { justCompleted: true, fromStage: 1 });
      }
      return;
    }

    if (s.result) {
      if (just("Space") || just("Enter") || (clicked() && mouseIn(190, 272, 260, 30))) {
        if (s.result.approved) {
          if (s.index === COPY.documents.length - 1) {
            s.result = null;
            s.complete = true;
            sfx.good();
            return;
          }
          s.index += 1;
          s.to = "";
          s.clipboard = "";
          s.choices = initialChoices(s.index);
          s.result = null;
          sfx.ok();
        } else {
          s.result = null;
          sfx.tick();
        }
      }
      return;
    }

    if (!clicked()) return;
    const document = COPY.documents[s.index];
    if (mouseIn(22, 176, 142, 32)) {
      s.clipboard = document.email;
      sfx.ok();
      return;
    }
    if (mouseIn(548, 68, 76, 26)) {
      if (s.clipboard) {
        s.to = s.clipboard;
        sfx.ok();
      } else {
        sfx.bad();
      }
      return;
    }

    CATEGORIES.forEach((category, index) => {
      const y = 128 + index * 34;
      if (mouseIn(260, y, 24, 28)) {
        s.choices[category] = (s.choices[category] + 2) % 3;
        sfx.tick();
      } else if (mouseIn(596, y, 24, 28)) {
        s.choices[category] = (s.choices[category] + 1) % 3;
        sfx.tick();
      }
    });
    if (mouseIn(430, 312, 190, 36)) this.submit();
  },
  draw(ctx) {
    const s = this.s;
    const document = COPY.documents[s.index];
    fill(ctx, 0, 0, 640, 360, "#d9e4ed");
    fill(ctx, 0, 0, 640, 50, "#0b5ba8");
    text(ctx, COPY.docs.title, 14, 10, { size: 8, color: P.ink });
    text(ctx, COPY.docs.help, 14, 29, { size: 7, color: "#cce5ff" });

    fill(ctx, 8, 58, 166, 294, "#e8eef3");
    stroke(ctx, 8, 58, 166, 294, "#6d8294", 2);
    text(ctx, `OVERDUE ${s.index + 1}/10`, 20, 72, { size: 7, color: P.red });
    text(ctx, document.name, 20, 98, {
      size: 8,
      color: P.bg,
      maxWidth: 142,
      lineHeight: 14,
    });
    text(ctx, "SEND TO:", 20, 136, { size: 6, color: P.muted });
    text(ctx, document.email, 20, 148, {
      size: 6,
      color: "#174b73",
      maxWidth: 142,
      lineHeight: 10,
    });
    fill(ctx, 22, 176, 142, 32, s.clipboard ? P.green2 : "#0b5ba8");
    text(ctx, s.clipboard ? "COPIED" : "COPY ADDRESS", 93, 188, {
      size: 7,
      align: "center",
    });
    text(ctx, "DEADLINE", 20, 230, { size: 6, color: P.muted });
    text(ctx, "YESTERDAY", 20, 246, { size: 8, color: P.red });
    text(ctx, `FAILED: ${s.failedAttempts}`, 20, 326, {
      size: 7,
      color: s.failedAttempts > 10 ? P.red : P.muted,
    });

    fill(ctx, 184, 58, 448, 294, P.ink);
    stroke(ctx, 184, 58, 448, 294, "#6d8294", 2);
    text(ctx, "New message", 196, 68, { size: 7, color: P.bg });
    fill(ctx, 196, 66, 344, 30, "#f6f8fa");
    text(ctx, `To: ${s.to || "(paste recipient)"}`, 204, 75, {
      size: 7,
      color: s.to === document.email ? P.green2 : P.bg,
      maxWidth: 320,
    });
    fill(ctx, 548, 68, 76, 26, "#0b5ba8");
    text(ctx, "PASTE", 586, 78, { size: 6, align: "center" });
    text(ctx, `Subject: Late ${document.name.toLowerCase()} submission`, 204, 105, {
      size: 6,
      color: P.bg,
      maxWidth: 410,
    });

    CATEGORIES.forEach((category, index) => {
      const y = 128 + index * 34;
      const piece = COPY.emailPieces[category][s.choices[category]];
      const labels = ["HELLO", "SORRY", "DETAIL", "ASK", "SIGN"];
      text(ctx, labels[index], 196, y + 10, { size: 6, color: P.muted });
      fill(ctx, 260, y, 24, 28, P.dark);
      text(ctx, "<", 272, y + 10, { size: 7, align: "center" });
      fill(ctx, 288, y, 304, 28, "#edf2f6");
      text(ctx, withDocument(piece.text, document), 296, y + 5, {
        size: 6,
        color: P.bg,
        maxWidth: 286,
        lineHeight: 10,
      });
      fill(ctx, 596, y, 24, 28, P.dark);
      text(ctx, ">", 608, y + 10, { size: 7, align: "center" });
    });

    bar(ctx, 196, 326, 216, 9, s.index / COPY.documents.length, "#0b5ba8", "#b9c8d4");
    fill(ctx, 430, 312, 190, 36, "#0b5ba8");
    text(ctx, "SEND EMAIL", 525, 324, { size: 8, align: "center" });

    if (s.result) this.drawResult(ctx);
    if (s.complete) this.drawSummary(ctx);
    scanlines(ctx);
  },
  drawResult(ctx) {
    const s = this.s;
    const r = s.result;
    fill(ctx, 100, 65, 440, 250, P.bg2);
    stroke(ctx, 100, 65, 440, 250, r.approved ? P.green : P.red, 4);
    text(ctx, r.approved ? "APPROVED" : "DENIED", 320, 86, {
      size: 16,
      align: "center",
      color: r.approved ? P.green : P.red,
    });
    text(ctx, r.approved ? COPY.docs.approved : COPY.docs.denied, 320, 118, {
      size: 7,
      align: "center",
      color: P.ink,
      maxWidth: 390,
      lineHeight: 13,
    });
    const checks = [
      ["RIGHT RECIPIENT", r.checks.recipient],
      ["PROFESSIONAL TONE", r.checks.tone],
      ["NAMES DOCUMENT", r.checks.documentNamed],
      ["POLITE REQUEST", r.checks.permissionAsked],
    ];
    checks.forEach(([label, ok], index) => {
      text(ctx, `${ok ? "OK" : "X "}  ${label}`, 178, 166 + index * 20, {
        size: 7,
        color: ok ? P.green : P.pink,
      });
    });
    fill(ctx, 190, 272, 260, 30, r.approved ? P.green2 : P.orange);
    text(ctx, r.approved ? "SPACE — NEXT EMAIL" : "SPACE — REVISE", 320, 283, {
      size: 7,
      align: "center",
      color: P.bg,
    });
  },
  drawSummary(ctx) {
    const count = this.s.failedAttempts;
    const roast =
      count > 10
        ? `${count} FAILED ATTEMPTS — ARE YOU STUPID, ARIEL?`
        : `${count} FAILED ATTEMPTS — SOMEHOW, ALL TEN WERE ACCEPTED.`;
    fill(ctx, 68, 72, 504, 218, P.bg2);
    stroke(ctx, 68, 72, 504, 218, count > 10 ? P.red : P.green, 4);
    text(ctx, "ALL 10 DOCUMENTS APPROVED", 320, 98, {
      size: 12,
      align: "center",
      color: P.green,
    });
    text(ctx, roast, 320, 146, {
      size: 9,
      align: "center",
      color: count > 10 ? P.pink : P.yellow,
      maxWidth: 440,
      lineHeight: 18,
    });
    text(ctx, COPY.docs.win, 320, 194, {
      size: 7,
      align: "center",
      color: P.ink,
      maxWidth: 430,
      lineHeight: 13,
    });
    fill(ctx, 176, 244, 288, 36, P.green2);
    text(ctx, "SPACE — CONTINUE", 320, 257, {
      size: 8,
      align: "center",
      color: P.bg,
    });
  },
};
