export const W = 640;
export const H = 360;
const storedMute =
  typeof window !== "undefined" && window.localStorage?.getItem?.("gorb-mute") === "1";

export const game = {
  canvas: null,
  ctx: null,
  scene: null,
  last: 0,
  keys: new Set(),
  keysJust: new Set(),
  textJust: [],
  acceptingText: false,
  mouse: { x: 0, y: 0, down: false, clicked: false, released: false },
  muted: storedMute,
  times: { cook: 0, docs: 0, blackjack: 0, sprint: 0 },
  done: { cook: false, docs: false, blackjack: false, sprint: false },
  stats: { emailFailures: 0, cookingRetries: 0, sprintRetries: 0, casinoBailouts: 0 },
  scale: 1,
};

export function resetGame() {
  game.times = { cook: 0, docs: 0, blackjack: 0, sprint: 0 };
  game.done = { cook: false, docs: false, blackjack: false, sprint: false };
  game.stats = { emailFailures: 0, cookingRetries: 0, sprintRetries: 0, casinoBailouts: 0 };
  game.acceptingText = false;
  game.textJust = [];
}

export function just(code) {
  return game.keysJust.has(code);
}

export function held(code) {
  return game.keys.has(code);
}

export function clicked() {
  return game.mouse.clicked;
}

export function mouseIn(x, y, w, h) {
  const m = game.mouse;
  return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
}

export function goto(scene, data) {
  if (game.scene?.exit) game.scene.exit();
  game.scene = scene;
  if (scene.enter) scene.enter(data);
}

function canvasToWorld(clientX, clientY) {
  const r = game.canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * W,
    y: ((clientY - r.top) / r.height) * H,
  };
}

function resize() {
  const maxW = window.innerWidth - 32;
  const maxH = window.innerHeight - 32;
  const available = Math.min(maxW / W, maxH / H);
  const s = available < 1 ? Math.max(0.5, available) : Math.floor(available);
  game.scale = s;
  game.canvas.style.width = `${W * s}px`;
  game.canvas.style.height = `${H * s}px`;
}

export function boot(firstScene) {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  game.canvas = canvas;
  game.ctx = ctx;
  goto(firstScene);
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (!game.keys.has(e.code)) game.keysJust.add(e.code);
    game.keys.add(e.code);
    if (game.acceptingText) {
      if (e.key === "Backspace") game.textJust.push("\b");
      else if (e.key.length === 1) game.textJust.push(e.key);
    }
    if (e.code === "KeyM" && !game.acceptingText) {
      game.muted = !game.muted;
      window.localStorage?.setItem?.("gorb-mute", game.muted ? "1" : "0");
      window.dispatchEvent(new Event("game-mute-changed"));
    }
  });
  window.addEventListener("keyup", (e) => game.keys.delete(e.code));
  window.addEventListener("blur", () => game.keys.clear());

  const updatePointer = (e) => {
    const p = canvasToWorld(e.clientX, e.clientY);
    game.mouse.x = p.x;
    game.mouse.y = p.y;
  };
  canvas.addEventListener("pointermove", updatePointer);
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    updatePointer(e);
    game.mouse.down = true;
    game.mouse.clicked = true;
    game.mouse.released = false;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    updatePointer(e);
    game.mouse.down = false;
    game.mouse.released = true;
    canvas.releasePointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    game.mouse.down = false;
    game.mouse.released = true;
  });

  requestAnimationFrame(tick);
}

function tick(t) {
  const dt = Math.min(0.05, (t - (game.last || t)) / 1000);
  game.last = t;
  if (game.scene?.update) game.scene.update(dt);
  const ctx = game.ctx;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  if (game.scene?.draw) game.scene.draw(ctx);
  game.keysJust.clear();
  game.textJust = [];
  game.mouse.clicked = false;
  game.mouse.released = false;
  requestAnimationFrame(tick);
}
