import "./style.css";
import { boot } from "./engine.js";
import { Scenes } from "./flow.js";
import { startMusic, unlockAudio } from "./audio.js";
import { hub } from "./scenes/hub.js";
import { cook } from "./scenes/cook.js";
import { docs } from "./scenes/docs.js";
import { blackjack } from "./scenes/blackjack.js";
import { ending } from "./scenes/ending.js";
import introVideoUrl from "./video/lv_7351076414516432133_20240416191213.mp4";
import themeMusicUrl from "./jame_gam_map_theme.mp3";

Scenes.hub = hub;
Scenes.cook = cook;
Scenes.docs = docs;
Scenes.blackjack = blackjack;
Scenes.sprint = ending;

let booted = false;
let canvasBooted = false;
const landing = document.getElementById("landing");
const landingCopy = document.getElementById("landing-copy");
const video = document.getElementById("intro-video");
const startButton = document.getElementById("start-game");
const wrap = document.getElementById("wrap");

video.src = introVideoUrl;
video.volume = 1;

let revealed = false;
let introStarted = false;
function markIntroStarted() {
  if (introStarted) return;
  introStarted = true;
  setTimeout(revealLanding, 4300);
}

function revealLanding() {
  if (revealed) return;
  revealed = true;
  video.volume = 0.12;
  landing.classList.add("is-ready");
  landingCopy.setAttribute("aria-hidden", "false");
  startButton.focus({ preventScroll: true });
}

video.addEventListener("timeupdate", () => {
  if (video.currentTime >= 3.5) revealLanding();
});
video.addEventListener("playing", markIntroStarted);

function unmuteIntro() {
  video.muted = false;
  video.volume = revealed ? 0.12 : 1;
  video.play().catch(() => {});
}

function playIntro() {
  video.muted = false;
  video.volume = 1;
  const attempt = video.play();
  if (!attempt?.then) {
    markIntroStarted();
    return;
  }
  attempt.then(markIntroStarted).catch(() => {
    video.muted = true;
    video.play().then(markIntroStarted, markIntroStarted);
  });
}

landing.addEventListener("pointerdown", unmuteIntro);
playIntro();

function startGame() {
  if (booted) return;
  booted = true;
  unmuteIntro();
  unlockAudio();
  startMusic(themeMusicUrl);
  landing.classList.add("is-leaving");
  wrap.classList.add("is-active");
  wrap.setAttribute("aria-hidden", "false");
  const bootCanvas = () => {
    if (canvasBooted) return;
    canvasBooted = true;
    boot(hub);
  };
  document.fonts.ready.then(bootCanvas);
  setTimeout(bootCanvas, 800);
  setTimeout(() => {
    video.pause();
    landing.hidden = true;
  }, 720);
}

startButton.addEventListener("click", startGame);
window.addEventListener("keydown", (event) => {
  if (revealed && !booted && (event.code === "Space" || event.code === "Enter")) {
    event.preventDefault();
    startGame();
  }
});
