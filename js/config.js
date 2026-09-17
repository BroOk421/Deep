"use strict";

/* =================================================================
   CONFIG — all the tunable numbers for the game live here
================================================================= */
const TILE = 16; // ground tile size (px)
const MAP_W = 3000; // world width (px)
const MAP_H = 1640; // world height (px)
const COLS = Math.ceil(MAP_W / TILE); // ground tile columns
const ROWS = Math.ceil(MAP_H / TILE); // ground tile rows

const FRAME_SIZE = 64; // every character sprite frame is 64x64
const DRAW_SIZE = 48; // character size in WORLD px (scales with zoom)

// Measured from the actual sprite sheets: across every idle/walk/run frame,
// the feet pixels sit at y ≈ 47–48 out of the 64px frame (there's empty
// padding above the head and below the feet baked into the art). Used to
// anchor the shadow exactly at the feet instead of guessing.
const SPRITE_FEET_FRACTION = 0.62;

// Nudge the shadow left/right relative to the character's feet.
// In WORLD px (same units as DRAW_SIZE) — negative = shift left, positive = shift right.
const SHADOW_OFFSET_X = 6;

// Which side the shadow leans/slants toward — fixed, always the same
// regardless of which way the character is facing (only the silhouette's
// pose mirrors with facing, not this). Positive leans left, negative leans
// right (see drawShadow() in camera.js for exactly how this is applied).
const SHADOW_LEAN = 0.6;

// Each animation state has its own frame count (from the sheets you gave)
// and its own playback speed (frames per second).
// "collect" is a one-shot action (picking up / putting down), the
// carry* ones are used instead of idle/walk/run while player.mode === "carrying".
const FRAME_COUNTS = {
  idle: 4, walk: 6, run: 6,
  collect: 8,
  carryIdle: 4, carryWalk: 6, carryRun: 6
};
const ANIM_FPS = {
  idle: 4, walk: 8, run: 12,
  collect: 10,
  carryIdle: 4, carryWalk: 8, carryRun: 12
};

const ZOOM_MIN = 4;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.15;

// --- Inventory / hotbar / placement ---
const INVENTORY_ROWS = 8;
const INVENTORY_COLS = 9;      // 8x9 = 72 slots total
const HOTBAR_SIZE = 7;         // hotbar = the first 7 slots of inventory row 0
const PLACEMENT_RANGE = 5;     // tiles around the player where items can be placed (Chebyshev distance)
