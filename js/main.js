"use strict";

/* =================================================================
   MAIN — entry point. Waits for assets, sets everything up, and
   runs the game loop (update -> render -> repeat).
================================================================= */
let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  updatePlayer(dt);
  render();
  requestAnimationFrame(loop);
}

function start() {
  resizeCanvas();
  buildWorld();
  loadGame(); // restore placed items / inventory / position from last time, if any
  setupPlacementClickHandler();
  last = performance.now();
  requestAnimationFrame(loop);
}

whenAssetsReady(start);
