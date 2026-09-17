"use strict";

/* =================================================================
   ASSETS — loads every image the game needs, then calls whatever
   callback was registered with whenAssetsReady()
================================================================= */
const assets = {
  dirt: new Image(),

  idleDown: new Image(),
  idleUp: new Image(),
  idleSide: new Image(),

  walkDown: new Image(),
  walkUp: new Image(),
  walkSide: new Image(),

  runDown: new Image(),
  runUp: new Image(),
  runSide: new Image(),

  collectDown: new Image(),
  collectUp: new Image(),
  collectSide: new Image(),

  carryIdleDown: new Image(),
  carryIdleUp: new Image(),
  carryIdleSide: new Image(),

  carryWalkDown: new Image(),
  carryWalkUp: new Image(),
  carryWalkSide: new Image(),

  carryRunDown: new Image(),
  carryRunUp: new Image(),
  carryRunSide: new Image(),

  grass: new Image(),
  grassTL: new Image(),
  grassTC: new Image(),
  grassTR: new Image(),
  grassL: new Image(),
  grassInner: new Image(),
  grassR: new Image(),
  grassBL: new Image(),
  grassBC: new Image(),
  grassBR: new Image()
};

assets.dirt.src = "assets/tiles/dirt.png";

assets.idleDown.src = "assets/sprites/Idle_Down-Sheet.png";
assets.idleUp.src = "assets/sprites/Idle_Up-Sheet.png";
assets.idleSide.src = "assets/sprites/Idle_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

assets.walkDown.src = "assets/sprites/Walk_Down-Sheet.png";
assets.walkUp.src = "assets/sprites/Walk_Up-Sheet.png";
assets.walkSide.src = "assets/sprites/Walk_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

assets.runDown.src = "assets/sprites/Run_Down-Sheet.png";
assets.runUp.src = "assets/sprites/Run_Up-Sheet.png";
assets.runSide.src = "assets/sprites/Run_Side-Sheet.png";   // faces RIGHT; flipped in code for LEFT

// one-shot "picking something up / putting it down" animation
assets.collectDown.src = "assets/sprites/Collect_Down-Sheet.png";
assets.collectUp.src = "assets/sprites/Collect_Up-Sheet.png";
assets.collectSide.src = "assets/sprites/Collect_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

// used instead of the normal idle/walk/run sheets while player.mode === "carrying"
assets.carryIdleDown.src = "assets/sprites/Carry_Idle_Down-Sheet.png";
assets.carryIdleUp.src = "assets/sprites/Carry_Idle_Up-Sheet.png";
assets.carryIdleSide.src = "assets/sprites/Carry_Idle_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

assets.carryWalkDown.src = "assets/sprites/Carry_Walk_Down-Sheet.png";
assets.carryWalkUp.src = "assets/sprites/Carry_Walk_Up-Sheet.png";
assets.carryWalkSide.src = "assets/sprites/Carry_Walk_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

assets.carryRunDown.src = "assets/sprites/Carry_Run_Down-Sheet.png";
assets.carryRunUp.src = "assets/sprites/Carry_Run_Up-Sheet.png";
assets.carryRunSide.src = "assets/sprites/Carry_Run_Side-Sheet.png"; // faces RIGHT; flipped in code for LEFT

// item icons — used both in the inventory UI and drawn on the ground when placed
assets.grass.src = "assets/items/grass.png"; // the original single grass tuft (not tile-sized, 28x27)

// a 3x3 grass "edge" tileset (all a clean 16x16, matching TILE exactly) —
// meant to be placed together to build a proper-looking grass patch with
// edges/corners, instead of scattering the single 28x27 tuft above
assets.grassTL.src = "assets/items/grass_tl.png";       // top-left corner
assets.grassTC.src = "assets/items/grass_tc.png";       // top edge
assets.grassTR.src = "assets/items/grass_tr.png";       // top-right corner
assets.grassL.src = "assets/items/grass_l.png";         // left edge
assets.grassInner.src = "assets/items/grass_inner.png"; // fill / center
assets.grassR.src = "assets/items/grass_r.png";         // right edge
assets.grassBL.src = "assets/items/grass_bl.png";       // bottom-left corner
assets.grassBC.src = "assets/items/grass_bc.png";       // bottom edge
assets.grassBR.src = "assets/items/grass_br.png";       // bottom-right corner

let assetsLoadedCount = 0;
const assetsNeededCount = Object.keys(assets).length;
let onAssetsReadyCallback = null;

function whenAssetsReady(callback) {
  onAssetsReadyCallback = callback;
}

Object.values(assets).forEach((img) => {
  img.onload = () => {
    assetsLoadedCount++;
    if (assetsLoadedCount === assetsNeededCount && onAssetsReadyCallback) {
      onAssetsReadyCallback();
    }
  };
  img.onerror = () => console.error("Failed to load asset:", img.src);
});
