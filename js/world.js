"use strict";

/* =================================================================
   WORLD — pre-renders the ground once onto an offscreen canvas
   (worldCanvas), which camera.js later draws from every frame.

   dirt.png is a strip of 3 different 16x16 dirt tile variants placed
   side by side. Instead of repeating just one of them, buildWorld()
   slices out all 3 and picks a random one for every tile on the map
   (seeded, so the layout is the same every time you reload).
================================================================= */
const worldCanvas = document.createElement("canvas");
worldCanvas.width = MAP_W;
worldCanvas.height = MAP_H;
const worldCtx = worldCanvas.getContext("2d");

function sliceDirtVariants() {
  const variantCount = Math.floor(assets.dirt.width / TILE); // 3 variants
  const variants = [];
  for (let i = 0; i < variantCount; i++) {
    const c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    const cctx = c.getContext("2d");
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(assets.dirt, i * TILE, 0, TILE, TILE, 0, 0, TILE, TILE);
    variants.push(c);
  }
  return variants;
}

function buildWorld() {
  worldCtx.imageSmoothingEnabled = false;

  const variants = sliceDirtVariants();

  // simple seeded PRNG so the random tile layout is stable across reloads
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const variant = variants[Math.floor(rnd() * variants.length)];
      worldCtx.drawImage(variant, c * TILE, r * TILE, TILE, TILE);
    }
  }
}
