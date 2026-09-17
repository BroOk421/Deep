"use strict";

/* =================================================================
   CAMERA / RENDERER — owns the visible <canvas>, keeps it sized to
   the full window at native device resolution (fixes blur/blockiness
   on high-DPI screens), and draws the world + player each frame at
   the current zoom level.

   The character is drawn with the SAME crisp, no-smoothing settings
   as the ground tiles (imageSmoothingEnabled = false everywhere).
   Turning smoothing on for the sprite made it look soft/blurry
   instead of sharp, since it's a low-res pixel-art source being
   scaled up a lot — nearest-neighbor keeps every pixel edge crisp,
   which is the correct look for this kind of pixel art.
================================================================= */
const view = document.getElementById("view");
const ctx = view.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Current camera top-left corner in world px — updated every render() call.
// Exposed at module scope (not local to render()) so inventory.js can
// convert a canvas click into world/tile coordinates for item placement.
let camX = 0;
let camY = 0;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  // Render at full device-pixel resolution so nothing gets upscaled/blurred
  // by the browser, then keep the CSS size at the window size.
  view.width = Math.round(window.innerWidth * dpr);
  view.height = Math.round(window.innerHeight * dpr);
  view.style.width = window.innerWidth + "px";
  view.style.height = window.innerHeight + "px";
  ctx.imageSmoothingEnabled = false; // resizing resets this on some browsers
}
window.addEventListener("resize", resizeCanvas);

// scratch canvas reused every frame to build a silhouette out of the
// currently-playing sprite frame (so the shadow has an actual head,
// arms, body and legs — not a plain blob — and automatically follows
// whatever pose idle/walk/run is currently on)
const silhouetteCanvas = document.createElement("canvas");
silhouetteCanvas.width = FRAME_SIZE;
silhouetteCanvas.height = FRAME_SIZE;
const silhouetteCtx = silhouetteCanvas.getContext("2d");
silhouetteCtx.imageSmoothingEnabled = false;

function buildSilhouette(sheet, sx) {
  silhouetteCtx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
  silhouetteCtx.drawImage(
    sheet,
    sx,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
  );
  // tint every opaque pixel of the sprite a soft dark tone, keep its alpha shape
  silhouetteCtx.globalCompositeOperation = "source-in";
  silhouetteCtx.fillStyle = "rgba(35,25,20,0.32)"; // lighter than solid black
  silhouetteCtx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE);
  silhouetteCtx.globalCompositeOperation = "source-over";
  return silhouetteCanvas;
}

function drawShadow(px, feetY, size, sheet, sx) {
  const silhouette = buildSilhouette(sheet, sx);

  const squashY = 0.6;   // flatten vertically so it lies on the ground
  const skew = SHADOW_LEAN; // fixed lean direction — always the same side,
                            // regardless of which way the character is facing

  ctx.save();
  ctx.translate(px, feetY);
  // Negative Y scale flips the silhouette upside-down. Because the image is
  // drawn with its bottom edge (the feet) exactly at local y = 0 (dy = -size),
  // that edge stays pinned at the pivot no matter the scale/skew — only the
  // head/body end (top of the source) swings away from it. That's what
  // keeps the shadow's feet glued to the character's feet.
  ctx.transform(1, 0, skew, -squashY, 0, 0);
  // This mirror is ONLY for the silhouette's pose (so a left-facing character
  // casts a shadow with left-facing arms/legs, using the same right-facing
  // side sheet flipped) — it does not affect which side the shadow leans
  // toward, since `skew` above is fixed and doesn't depend on facing.
  if (player.facing === "left") ctx.scale(-1, 1);
  ctx.filter = "blur(3px)"; // soften the shadow edges
  ctx.drawImage(silhouette, -size / 2, -size, size, size);
  ctx.filter = "none";
  ctx.restore();
}

function drawPlayer(px, py, scale) {
  // while the collect action plays, use its sheet; otherwise the normal
  // idle/walk/run (or carry* equivalent, picked by spriteForFacing via mode)
  const animKey = player.action === "collect" ? "collect" : player.anim;
  const sheet = spriteForFacing(animKey, player.facing, player.mode);
  const sx = player.frame * FRAME_SIZE;
  const size = DRAW_SIZE * scale;
  // Anchor the shadow at the real feet-pixel position within the sprite
  // frame (measured — see SPRITE_FEET_FRACTION in config.js), not a guess.
  // The character itself is drawn centered on py (top = py - size/2), so
  // the feet row lands at py - size/2 + size * SPRITE_FEET_FRACTION.
  const feetY = py - size / 2 + size * SPRITE_FEET_FRACTION;
  const shadowX = px + SHADOW_OFFSET_X * scale; // left/right nudge, scaled with zoom

  drawShadow(shadowX, feetY, size, sheet, sx);

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

function drawGroundItems(camX, camY) {
  groundItems.forEach((type, key) => {
    const [col, row] = key.split(",").map(Number);
    const icon = itemDefs[type].icon;
    const screenX = (col * TILE - camX) * zoom;
    const screenY = (row * TILE - camY) * zoom;
    const size = TILE * zoom;
    ctx.drawImage(icon, screenX, screenY, size, size);
  });
}

function drawPlacementRange(camX, camY) {
  if (!heldItem) return;

  const p = getPlayerTile();
  const size = TILE * zoom;

  for (let row = p.row - PLACEMENT_RANGE; row <= p.row + PLACEMENT_RANGE; row++) {
    for (let col = p.col - PLACEMENT_RANGE; col <= p.col + PLACEMENT_RANGE; col++) {
      const outOfBounds = col < 0 || row < 0 || col >= COLS || row >= ROWS;
      if (outOfBounds) continue; // nothing to highlight past the edge of the map

      const screenX = (col * TILE - camX) * zoom;
      const screenY = (row * TILE - camY) * zoom;
      const existingId = getGroundItemId(col, row);

      let color;
      if (existingId === null) {
        color = "rgba(255,255,255,0.55)";   // empty — valid to place
      } else if (existingId === heldItem.type) {
        color = "rgba(220,40,40,0.9)";      // same item already there — blocked
      } else {
        color = "rgba(255,200,60,0.9)";     // different item there — will be replaced
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, size - 2, size - 2);
    }
  }
}

function render() {
  const vw = view.width,
    vh = view.height;

  // how much of the WORLD is visible at the current zoom level
  const viewWorldW = vw / zoom;
  const viewWorldH = vh / zoom;

  // assign to the module-level camX/camY (declared near the top of this
  // file) rather than shadowing with local consts, so inventory.js can
  // read the current camera position when converting a click to a tile.
  camX = clamp(
    player.x - viewWorldW / 2,
    0,
    Math.max(0, MAP_W - viewWorldW),
  );
  camY = clamp(
    player.y - viewWorldH / 2,
    0,
    Math.max(0, MAP_H - viewWorldH),
  );

  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(worldCanvas, camX, camY, viewWorldW, viewWorldH, 0, 0, vw, vh);

  drawGroundItems(camX, camY);
  drawPlacementRange(camX, camY);
  drawPlayer((player.x - camX) * zoom, (player.y - camY) * zoom, zoom);
}
