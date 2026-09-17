"use strict";

/* =================================================================
   CONFIG
================================================================= */
const TILE = 16; // ground tile size (px)
const MAP_W = 3000; // world width (px)
const MAP_H = 1640; // world height (px)

const FRAME_SIZE = 64; // each character sprite frame is 64x64
const FRAME_COUNT = 6; // 6 frames per walk sheet
const DRAW_SIZE = 48; // character size in WORLD px (scales with zoom)
const ANIM_FPS = 8; // walk animation speed

const ZOOM_MIN = 3;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.15;
let zoom = ZOOM_MIN; // current camera zoom (world px -> screen px multiplier)

/* =================================================================
   ASSET LOADING
================================================================= */
const assets = {
  dirt: new Image(),
  down: new Image(),
  up: new Image(),
  side: new Image(),
};
assets.dirt.src = "assets/tiles/dirt.png";
assets.down.src = "assets/sprites/Walk_Down-Sheet.png";
assets.up.src = "assets/sprites/Walk_Up-Sheet.png";
assets.side.src = "assets/sprites/Walk_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

let loaded = 0;
const need = Object.keys(assets).length;
Object.values(assets).forEach((img) => {
  img.onload = () => {
    loaded++;
    if (loaded === need) start();
  };
  img.onerror = () => console.error("Failed to load:", img.src);
});

/* =================================================================
   WORLD LAYER — pre-render the tiled dirt ground once (plain repeat,
   no color variation — just the dirt tile itself, tiled)
================================================================= */
const worldCanvas = document.createElement("canvas");
worldCanvas.width = MAP_W;
worldCanvas.height = MAP_H;
const worldCtx = worldCanvas.getContext("2d");

function buildWorld() {
  worldCtx.imageSmoothingEnabled = false;
  const pattern = worldCtx.createPattern(assets.dirt, "repeat");
  worldCtx.fillStyle = pattern;
  worldCtx.fillRect(0, 0, MAP_W, MAP_H);
}

/* =================================================================
   PLAYER
================================================================= */
const player = {
  x: MAP_W / 2,
  y: MAP_H / 2,
  speed: 110, // world px / second
  runMult: 1.8,
  facing: "down", // "down" | "up" | "left" | "right"
  moving: false,
  frame: 0,
  frameTimer: 0,
};

function spriteForFacing(facing) {
  if (facing === "down") return assets.down;
  if (facing === "up") return assets.up;
  return assets.side; // used for both "left" (flipped) and "right"
}

/* =================================================================
   INPUT — WASD to move, mouse wheel or Q/E to zoom
================================================================= */
const keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
    e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = clamp(zoom - Math.sign(e.deltaY) * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
  },
  { passive: false },
);

/* =================================================================
   CANVAS / FULLSCREEN
================================================================= */
const view = document.getElementById("view");
const ctx = view.getContext("2d");
ctx.imageSmoothingEnabled = false;

function resizeCanvas() {
  view.width = window.innerWidth;
  view.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* =================================================================
   MAIN LOOP
================================================================= */
let last = performance.now();

function update(dt) {
  let vx = 0,
    vy = 0;
  if (keys["w"] || keys["arrowup"]) vy -= 1;
  if (keys["s"] || keys["arrowdown"]) vy += 1;
  if (keys["a"] || keys["arrowleft"]) vx -= 1;
  if (keys["d"] || keys["arrowright"]) vx += 1;

  if (keys["q"]) zoom = clamp(zoom - ZOOM_STEP * dt * 6, ZOOM_MIN, ZOOM_MAX);
  if (keys["e"]) zoom = clamp(zoom + ZOOM_STEP * dt * 6, ZOOM_MIN, ZOOM_MAX);

  player.moving = vx !== 0 || vy !== 0;

  if (player.moving) {
    const len = Math.hypot(vx, vy) || 1;
    vx /= len;
    vy /= len;
    const speed = player.speed * (keys["shift"] ? player.runMult : 1);

    player.x = clamp(
      player.x + vx * speed * dt,
      DRAW_SIZE / 2,
      MAP_W - DRAW_SIZE / 2,
    );
    player.y = clamp(
      player.y + vy * speed * dt,
      DRAW_SIZE / 2,
      MAP_H - DRAW_SIZE / 2,
    );

    if (Math.abs(vx) > Math.abs(vy)) {
      player.facing = vx > 0 ? "right" : "left";
    } else {
      player.facing = vy > 0 ? "down" : "up";
    }

    player.frameTimer += dt;
    if (player.frameTimer >= 1 / ANIM_FPS) {
      player.frameTimer = 0;
      player.frame = (player.frame + 1) % FRAME_COUNT;
    }
  } else {
    player.frame = 0;
    player.frameTimer = 0;
  }
}

function drawPlayer(px, py, scale) {
  const sheet = spriteForFacing(player.facing);
  const sx = player.frame * FRAME_SIZE;
  const size = DRAW_SIZE * scale;

  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.ellipse(
    px,
    py + size * 0.42,
    size * 0.28,
    size * 0.12,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.save();
  if (player.facing === "left") {
    ctx.translate(px, py);
    ctx.scale(-1, 1);
    ctx.drawImage(
      sheet,
      sx,
      0,
      FRAME_SIZE,
      FRAME_SIZE,
      -size / 2,
      -size / 2,
      size,
      size,
    );
  } else {
    ctx.drawImage(
      sheet,
      sx,
      0,
      FRAME_SIZE,
      FRAME_SIZE,
      px - size / 2,
      py - size / 2,
      size,
      size,
    );
  }
  ctx.restore();
}

function render() {
  const vw = view.width,
    vh = view.height;

  // how much of the WORLD is visible at the current zoom level
  const viewWorldW = vw / zoom;
  const viewWorldH = vh / zoom;

  const camX = clamp(
    player.x - viewWorldW / 2,
    0,
    Math.max(0, MAP_W - viewWorldW),
  );
  const camY = clamp(
    player.y - viewWorldH / 2,
    0,
    Math.max(0, MAP_H - viewWorldH),
  );

  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(worldCanvas, camX, camY, viewWorldW, viewWorldH, 0, 0, vw, vh);

  drawPlayer((player.x - camX) * zoom, (player.y - camY) * zoom, zoom);
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function start() {
  buildWorld();
  last = performance.now();
  requestAnimationFrame(loop);
}
