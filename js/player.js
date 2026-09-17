"use strict";

/* =================================================================
   PLAYER — position, facing, animation state (idle/walk/run),
   carry mode (normal/carrying), and the one-shot collect/put-down
   action, plus the per-frame update logic.
================================================================= */
const player = {
  x: MAP_W / 2,
  y: MAP_H / 2,
  speed: 110,     // world px / second (walking)
  runMult: 1.8,   // multiplier applied to speed while running
  facing: "down", // "down" | "up" | "left" | "right"
  anim: "idle",   // "idle" | "walk" | "run" — the underlying movement anim,
                  // kept up to date even while carrying (mode picks the sheet)
  mode: "normal", // "normal" | "carrying"
  action: null,   // null | "collect" — a one-shot animation that locks movement
  frame: 0,
  frameTimer: 0
};

// Which image to use for a given animation + facing + carry mode.
// "left" reuses the *Side sheets and gets flipped horizontally at draw time
// (in camera.js) instead of needing separate left-facing art.
function spriteForFacing(anim, facing, mode) {
  // the one-shot collect/put-down animation ignores carry mode — it's the
  // same "bend down and pick something up (or set it down)" motion either way
  if (anim === "collect") {
    if (facing === "down") return assets.collectDown;
    if (facing === "up") return assets.collectUp;
    return assets.collectSide;
  }

  const carrying = mode === "carrying";

  if (facing === "down") {
    if (anim === "idle") return carrying ? assets.carryIdleDown : assets.idleDown;
    if (anim === "run") return carrying ? assets.carryRunDown : assets.runDown;
    return carrying ? assets.carryWalkDown : assets.walkDown;
  }
  if (facing === "up") {
    if (anim === "idle") return carrying ? assets.carryIdleUp : assets.idleUp;
    if (anim === "run") return carrying ? assets.carryRunUp : assets.runUp;
    return carrying ? assets.carryWalkUp : assets.walkUp;
  }
  // "left" or "right" both use the side sheet; left is flipped when drawn
  if (anim === "idle") return carrying ? assets.carryIdleSide : assets.idleSide;
  if (anim === "run") return carrying ? assets.carryRunSide : assets.runSide;
  return carrying ? assets.carryWalkSide : assets.walkSide;
}

function updatePlayer(dt) {
  // --- one-shot collect/put-down action: locks movement until it finishes ---
  if (player.action === "collect") {
    const fps = ANIM_FPS.collect;
    const frameCount = FRAME_COUNTS.collect;
    player.frameTimer += dt;
    if (player.frameTimer >= 1 / fps) {
      player.frameTimer = 0;
      player.frame++;
      if (player.frame >= frameCount) {
        // animation finished — flip the carry mode and hand control back
        player.mode = player.mode === "carrying" ? "normal" : "carrying";
        player.action = null;
        player.frame = 0;
      }
    }
    return; // no movement / other animation while this plays
  }

  // pressing F starts the collect animation (picks up if not carrying,
  // puts down if already carrying); consumes the one-shot flag from input.js
  if (collectRequested) {
    collectRequested = false;
    player.action = "collect";
    player.frame = 0;
    player.frameTimer = 0;
    return;
  }

  let vx = 0, vy = 0;
  if (keys["w"] || keys["arrowup"]) vy -= 1;
  if (keys["s"] || keys["arrowdown"]) vy += 1;
  if (keys["a"] || keys["arrowleft"]) vx -= 1;
  if (keys["d"] || keys["arrowright"]) vx += 1;

  // Q/E as a keyboard alternative to the mouse wheel for zoom
  if (keys["q"]) zoom = clamp(zoom - ZOOM_STEP * dt * 6, ZOOM_MIN, ZOOM_MAX);
  if (keys["e"]) zoom = clamp(zoom + ZOOM_STEP * dt * 6, ZOOM_MIN, ZOOM_MAX);

  const moving = vx !== 0 || vy !== 0;
  const running = moving && keys["shift"];
  const nextAnim = moving ? (running ? "run" : "walk") : "idle";

  if (moving) {
    const len = Math.hypot(vx, vy) || 1;
    vx /= len; vy /= len;
    const speed = player.speed * (running ? player.runMult : 1);

    player.x = clamp(player.x + vx * speed * dt, DRAW_SIZE / 2, MAP_W - DRAW_SIZE / 2);
    player.y = clamp(player.y + vy * speed * dt, DRAW_SIZE / 2, MAP_H - DRAW_SIZE / 2);

    // Any horizontal input at all (including diagonals like top-left,
    // top-right, bottom-left, bottom-right) uses the left/right side
    // sprite. Up/down is only used for purely vertical movement, since
    // there's no dedicated diagonal artwork.
    if (vx !== 0) {
      player.facing = vx > 0 ? "right" : "left";
    } else {
      player.facing = vy > 0 ? "down" : "up";
    }
  }

  // reset the frame counter whenever the animation state changes, so we
  // never end up pointing at a frame index that doesn't exist in the
  // new sheet (e.g. idle only has 4 frames, run/walk have 6)
  if (nextAnim !== player.anim) {
    player.anim = nextAnim;
    player.frame = 0;
    player.frameTimer = 0;
  }

  // carry* sheets share the same frame counts/speeds as their normal
  // counterparts (idle/walk/run), so the anim key alone is enough here —
  // spriteForFacing() is what actually picks the carry vs normal sheet.
  const fps = ANIM_FPS[player.anim];
  const frameCount = FRAME_COUNTS[player.anim];
  player.frameTimer += dt;
  if (player.frameTimer >= 1 / fps) {
    player.frameTimer = 0;
    player.frame = (player.frame + 1) % frameCount;
  }
}
