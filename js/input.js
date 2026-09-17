"use strict";

/* =================================================================
   INPUT — keyboard state (WASD / arrows / shift) and zoom controls
   (mouse wheel, or Q/E). `zoom` is read by camera.js each frame.

   `collectRequested` is a one-shot "just pressed F" flag, not part of
   the continuously-held `keys` state — player.js reads and clears it
   each frame, so holding F down doesn't retrigger the action every frame.
================================================================= */
const keys = {};
let zoom = ZOOM_MIN;
let collectRequested = false;

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === "f") collectRequested = true; // collect / put-down toggle (see player.js)
  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom = clamp(zoom - Math.sign(e.deltaY) * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
