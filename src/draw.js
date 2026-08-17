export const P = {
  bg: "#1a1c2c",
  bg2: "#0f1220",
  ink: "#f4f4f4",
  dim: "#94b0c2",
  muted: "#566c86",
  dark: "#333c57",
  orange: "#ef7d57",
  yellow: "#ffcd75",
  green: "#a7f070",
  green2: "#38b764",
  blue: "#41a6f6",
  cyan: "#73eff7",
  red: "#b13e53",
  pink: "#de7070",
  skin: "#e8b894",
  hair: "#3b2414",
  wood: "#6b3e26",
  steak: "#8a2e2e",
  buck: "#c4a35a",
  cous: "#efe0b0",
  water: "#1d4e89",
  road: "#2a2e3a",
};

export function fill(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function stroke(ctx, x, y, w, h, color, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
}

export function text(ctx, str, x, y, opts = {}) {
  const {
    size = 8,
    color = P.ink,
    align = "left",
    baseline = "top",
    maxWidth,
    lineHeight,
  } = opts;
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (!maxWidth) {
    ctx.fillText(str, Math.round(x), Math.round(y));
    return;
  }
  const words = str.split(" ");
  let line = "";
  let yy = y;
  const lh = lineHeight ?? size + 6;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, Math.round(x), Math.round(yy));
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, Math.round(x), Math.round(yy));
}

export function panel(ctx, x, y, w, h, title) {
  fill(ctx, x, y, w, h, P.bg2);
  stroke(ctx, x, y, w, h, P.dark, 3);
  if (title) {
    fill(ctx, x, y, w, 22, P.dark);
    text(ctx, title, x + w / 2, y + 7, { size: 8, align: "center", color: P.yellow });
  }
}

export function bar(ctx, x, y, w, h, t, fg, bg = P.dark) {
  fill(ctx, x, y, w, h, bg);
  fill(ctx, x, y, Math.max(0, w * Math.min(1, t)), h, fg);
  stroke(ctx, x, y, w, h, P.ink, 1);
}

export function button(ctx, x, y, w, h, label, hot) {
  fill(ctx, x, y, w, h, hot ? P.orange : P.dark);
  stroke(ctx, x, y, w, h, hot ? P.yellow : P.muted, 2);
  text(ctx, label, x + w / 2, y + h / 2 - 4, {
    size: 8,
    align: "center",
    color: hot ? P.bg : P.ink,
  });
}

/** Tiny pixel blit. Each char in `rows` maps through `pal`. `.` is empty. */
export function blit(ctx, rows, pal, x, y, scale = 3, flip = false) {
  const h = rows.length;
  const w = rows[0].length;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i];
      if (!ch || ch === ".") continue;
      const c = pal[ch];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x + i * scale), Math.round(y + j * scale), scale, scale);
    }
  }
}

export function scanlines(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < 360; y += 2) ctx.fillRect(0, y, 640, 1);
}

const ARIEL = [
  "..HHHHHH..",
  ".HSSSSSSH.",
  ".HSEESSSH.",
  ".HSSNSSSH.",
  "..HSSSSH..",
  ".BBBBBBBB.",
  ".B.BBBB.B.",
  "BBBBBBBBBB",
  "BB..BB..BB",
  "LL......LL",
  "LL......LL",
  "FF......FF",
];

export function drawAriel(ctx, x, y, { scale = 3, flip = false, body = P.blue, frame = 0, shake = 0 } = {}) {
  const pal = {
    H: P.hair,
    S: P.skin,
    E: "#1a1c2c",
    N: "#c47a6a",
    B: body,
    L: "#2b3347",
    F: "#1a1c2c",
  };
  const ox = shake ? (frame % 2 === 0 ? -1 : 1) * scale : 0;
  const bob = frame % 2;
  blit(ctx, ARIEL, pal, x + ox, y + bob, scale, flip);
}

export function drawPan(ctx, x, y, color, steam) {
  fill(ctx, x + 8, y + 18, 48, 10, "#2a2a32");
  fill(ctx, x, y + 8, 56, 16, "#3a3a44");
  fill(ctx, x + 6, y + 10, 44, 10, color);
  fill(ctx, x + 56, y + 12, 16, 6, "#3a3a44");
  if (steam) {
    ctx.globalAlpha = 0.5;
    fill(ctx, x + 14, y - 6, 6, 10, P.dim);
    fill(ctx, x + 26, y - 10, 6, 12, P.dim);
    fill(ctx, x + 38, y - 5, 6, 8, P.dim);
    ctx.globalAlpha = 1;
  }
}

export function drawCard(ctx, card, x, y, hidden = false, scale = 1) {
  const w = 48 * scale;
  const h = 66 * scale;
  fill(ctx, x, y, w, h, hidden ? P.blue : P.ink);
  stroke(ctx, x, y, w, h, hidden ? P.cyan : P.dark, Math.max(1, scale));
  if (hidden) {
    for (let yy = y + 7 * scale; yy < y + h - 5 * scale; yy += 8 * scale) {
      for (let xx = x + 6 * scale; xx < x + w - 5 * scale; xx += 8 * scale) {
        fill(ctx, xx, yy, 3 * scale, 3 * scale, P.cyan);
      }
    }
    return;
  }
  const red = card.suit === "♥" || card.suit === "♦";
  const color = red ? P.red : P.bg;
  text(ctx, card.rank, x + 5 * scale, y + 5 * scale, {
    size: 8 * scale,
    color,
  });
  text(ctx, card.suit, x + w / 2, y + h / 2 - 6 * scale, {
    size: 12 * scale,
    align: "center",
    color,
  });
}

export function drawPlane(ctx, x, y, color = P.ink, scale = 1) {
  fill(ctx, x, y + 9 * scale, 58 * scale, 10 * scale, color);
  fill(ctx, x + 36 * scale, y, 25 * scale, 10 * scale, color);
  fill(ctx, x + 18 * scale, y + 18 * scale, 9 * scale, 14 * scale, color);
  fill(ctx, x - 8 * scale, y + 12 * scale, 12 * scale, 5 * scale, P.orange);
}
