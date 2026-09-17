"use strict";

/* =================================================================
   INVENTORY / HOTBAR / GROUND PLACEMENT

   - `inventory` is a flat array of INVENTORY_ROWS * INVENTORY_COLS slots
     (null, or {type, count}).
   - `hotbar` is a SEPARATE array of HOTBAR_SIZE entries, each either null
     or an index into `inventory`. This is what makes hotbar assignment
     flexible — any inventory slot (not just the first row) can be put on
     any of the 7 hotkeys. Clicking an item in the full inventory panel
     opens a small menu (`openItemActionMenu`) with a "Hold" button and
     buttons 1-7; picking a number assigns that inventory slot to that
     hotbar position (overwriting whatever was there before).
   - Clicking a hotbar slot directly still just holds its item right away
     (that's the point of a hotbar — quick reuse of something already
     assigned), it doesn't open the assign menu.
   - Clicking "Hold" (or a hotbar slot) sets `heldItem`. While holding,
     tiles within PLACEMENT_RANGE of the player are highlighted in
     camera.js (light border = free, red border = already occupied).
     Clicking the game canvas while holding places the item on a valid
     tile and decrements its count.
   - `groundItems` maps "col,row" -> item type, for tiles that have an
     item placed on them. camera.js reads this to draw the icons and to
     know which highlighted tiles should be red.
================================================================= */

// registry of placeable item types -> which asset image represents them.
// `id` is the item's unique identifier (used to tell items apart when
// deciding whether a ground tile can be replaced — see placeHeldItemAt).
// It's the same string as the object's own key, kept explicit so other
// code compares `itemDefs[x].id` rather than assuming the key is the id.
const itemDefs = {
  grass: { id: "grass", name: "Grass", icon: assets.grass },
  grassTL: { id: "grassTL", name: "Grass (Top-Left)", icon: assets.grassTL },
  grassTC: { id: "grassTC", name: "Grass (Top)", icon: assets.grassTC },
  grassTR: { id: "grassTR", name: "Grass (Top-Right)", icon: assets.grassTR },
  grassL: { id: "grassL", name: "Grass (Left)", icon: assets.grassL },
  grassInner: { id: "grassInner", name: "Grass (Inner)", icon: assets.grassInner },
  grassR: { id: "grassR", name: "Grass (Right)", icon: assets.grassR },
  grassBL: { id: "grassBL", name: "Grass (Bottom-Left)", icon: assets.grassBL },
  grassBC: { id: "grassBC", name: "Grass (Bottom)", icon: assets.grassBC },
  grassBR: { id: "grassBR", name: "Grass (Bottom-Right)", icon: assets.grassBR }
};

const inventory = new Array(INVENTORY_ROWS * INVENTORY_COLS).fill(null);
// slot 0 = the original single grass tuft; slots 1-9 = the 3x3 tile-edge
// set, in reading order (top row, then left/inner/right, then bottom row)
// so placing them together lets you build a clean-edged grass patch
// instead of scattering the single (non-tile-sized) tuft around.
inventory[0] = { type: "grass", count: 99 };
inventory[1] = { type: "grassTL", count: 99 };
inventory[2] = { type: "grassTC", count: 99 };
inventory[3] = { type: "grassTR", count: 99 };
inventory[4] = { type: "grassL", count: 99 };
inventory[5] = { type: "grassInner", count: 99 };
inventory[6] = { type: "grassR", count: 99 };
inventory[7] = { type: "grassBL", count: 99 };
inventory[8] = { type: "grassBC", count: 99 };
inventory[9] = { type: "grassBR", count: 99 };

// default hotbar: slots 1-7 mirror inventory slots 0-6, same as before —
// but now this is just a starting point, freely reassignable via the
// inventory panel's action menu.
const hotbar = [0, 1, 2, 3, 4, 5, 6];

let selectedHotbarIndex = 0;
let heldItem = null;        // null | { type, fromSlot }  (fromSlot = an INVENTORY index)
let inventoryOpen = false;
const groundItems = new Map(); // "col,row" -> type

function tileKey(col, row) {
  return col + "," + row;
}

// The id of whatever's on a tile, or null if it's empty.
function getGroundItemId(col, row) {
  const id = groundItems.get(tileKey(col, row));
  return id === undefined ? null : id;
}

function getPlayerTile() {
  return {
    col: Math.floor(player.x / TILE),
    row: Math.floor(player.y / TILE)
  };
}

function isWithinPlacementRange(col, row) {
  const p = getPlayerTile();
  // Chebyshev distance (a square range, not a circle) — simple and matches
  // "5 range ng tiles" without needing to justify a specific shape.
  return Math.max(Math.abs(col - p.col), Math.abs(row - p.row)) <= PLACEMENT_RANGE;
}

/* ---------------- holding / placing ---------------- */

function holdSlot(slotIndex) {
  const slot = inventory[slotIndex];
  if (!slot || slot.count <= 0) return;
  heldItem = { type: slot.type, fromSlot: slotIndex };
  renderHotbar();
  renderInventory();
}

function cancelHeldItem() {
  heldItem = null;
  renderHotbar();
  renderInventory();
}

function placeHeldItemAt(col, row) {
  if (!heldItem) return;
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return; // outside the map
  if (!isWithinPlacementRange(col, row)) return; // outside the 5-tile range

  const existingId = getGroundItemId(col, row);
  if (existingId === heldItem.type) return; // same item already there — nothing to do
  // a DIFFERENT item already there gets replaced (falls through and overwrites below);
  // an empty tile just gets the new item — same call either way, groundItems.set()
  // overwrites in place regardless of whether the key existed before.

  groundItems.set(tileKey(col, row), heldItem.type);

  const usedSlotIndex = heldItem.fromSlot;

  // if that inventory slot happens to be on the hotbar, move the
  // selection highlight to follow it — so whatever you're actively
  // placing is the one shown as "active" on the hotbar
  const hotbarIdx = hotbar.indexOf(usedSlotIndex);
  if (hotbarIdx !== -1) selectedHotbarIndex = hotbarIdx;

  const slot = inventory[usedSlotIndex];
  if (slot) {
    slot.count -= 1;
    if (slot.count <= 0) inventory[usedSlotIndex] = null;
  }

  // stop holding once the stack runs out; otherwise keep placing more
  if (!inventory[usedSlotIndex]) {
    heldItem = null;
  }

  saveGame(); // save right away on the most important action, not just on the timer

  renderHotbar();
  renderInventory();
}

// Called once from main.js after the canvas exists — converts a click on
// the game canvas into a tile position and attempts to place the held item.
function setupPlacementClickHandler() {
  view.addEventListener("click", (e) => {
    if (!heldItem) return;
    const rect = view.getBoundingClientRect();
    const scaleX = view.width / rect.width;
    const scaleY = view.height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    // screen px -> world px -> tile col/row (camX/camY/zoom come from camera.js)
    const worldX = camX + sx / zoom;
    const worldY = camY + sy / zoom;
    const col = Math.floor(worldX / TILE);
    const row = Math.floor(worldY / TILE);

    placeHeldItemAt(col, row);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancelHeldItem();
  });
}

/* ---------------- UI: hotbar ---------------- */

const hotbarEl = document.getElementById("hotbar");

function renderHotbar() {
  hotbarEl.innerHTML = "";
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const invIndex = hotbar[i];
    const slot = invIndex !== null ? inventory[invIndex] : null;
    const box = document.createElement("div");
    box.className = "hotbar-slot";
    if (i === selectedHotbarIndex) box.classList.add("selected");
    if (heldItem && invIndex !== null && heldItem.fromSlot === invIndex) box.classList.add("held");

    const number = document.createElement("span");
    number.className = "slot-number";
    number.textContent = i + 1;
    box.appendChild(number);

    if (slot) {
      const img = document.createElement("img");
      img.src = itemDefs[slot.type].icon.src;
      img.alt = itemDefs[slot.type].name;
      box.appendChild(img);

      const count = document.createElement("span");
      count.className = "slot-count";
      count.textContent = slot.count;
      box.appendChild(count);
    }

    // hotbar slots are for quick reuse — click just holds directly,
    // it doesn't open the assign menu (that's only in the full inventory)
    box.addEventListener("click", () => {
      selectedHotbarIndex = i;
      if (slot) holdSlot(invIndex);
      else renderHotbar();
    });

    hotbarEl.appendChild(box);
  }
}

/* ---------------- UI: inventory panel ---------------- */

const inventoryOverlayEl = document.getElementById("inventory-overlay");
const inventoryGridEl = document.getElementById("inventory-grid");

function renderInventory() {
  inventoryGridEl.innerHTML = "";
  inventoryGridEl.style.gridTemplateColumns = `repeat(${INVENTORY_COLS}, 1fr)`;

  for (let i = 0; i < inventory.length; i++) {
    const slot = inventory[i];
    const box = document.createElement("div");
    box.className = "inv-slot";
    if (heldItem && heldItem.fromSlot === i) box.classList.add("held");

    if (slot) {
      const img = document.createElement("img");
      img.src = itemDefs[slot.type].icon.src;
      img.alt = itemDefs[slot.type].name;
      box.appendChild(img);

      const count = document.createElement("span");
      count.className = "slot-count";
      count.textContent = slot.count;
      box.appendChild(count);

      // left click holds it directly (same as clicking a hotbar slot);
      // right click opens the Hold / assign-to-1-7 menu instead
      box.addEventListener("click", () => holdSlot(i));
      box.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openItemActionMenu(i, box);
      });
    }

    inventoryGridEl.appendChild(box);
  }
}

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  inventoryOverlayEl.classList.toggle("hidden", !inventoryOpen);
  closeItemActionMenu();
}

/* ---------------- UI: item action menu (Hold / assign to 1-7) ---------------- */

const actionMenuEl = document.getElementById("item-action-menu");

function closeItemActionMenu() {
  actionMenuEl.classList.add("hidden");
  actionMenuEl.innerHTML = "";
}

function openItemActionMenu(slotIndex, anchorEl) {
  const slot = inventory[slotIndex];
  if (!slot) return;

  actionMenuEl.innerHTML = "";

  const label = document.createElement("div");
  label.className = "action-menu-label";
  label.textContent = itemDefs[slot.type].name;
  actionMenuEl.appendChild(label);

  const holdBtn = document.createElement("button");
  holdBtn.className = "action-menu-hold";
  holdBtn.textContent = "Hold";
  holdBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    holdSlot(slotIndex);
    closeItemActionMenu();
  });
  actionMenuEl.appendChild(holdBtn);

  const hotkeyRow = document.createElement("div");
  hotkeyRow.className = "action-menu-hotkeys";
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.title = "Assign to hotkey " + (i + 1);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      hotbar[i] = slotIndex;
      selectedHotbarIndex = i;
      closeItemActionMenu();
      renderHotbar();
    });
    hotkeyRow.appendChild(btn);
  }
  actionMenuEl.appendChild(hotkeyRow);

  // position it right next to the slot that was clicked
  const rect = anchorEl.getBoundingClientRect();
  actionMenuEl.style.left = rect.right + 8 + "px";
  actionMenuEl.style.top = rect.top + "px";
  actionMenuEl.classList.remove("hidden");
}

// close the menu if you click anywhere outside it. Opening happens on
// "contextmenu" (right click), a different event from "click", so a
// regular left click never needs to be excluded here — clicking any
// slot (which holds it directly) should also dismiss a stray open menu.
document.addEventListener("click", (e) => {
  if (actionMenuEl.classList.contains("hidden")) return;
  if (e.target === actionMenuEl || actionMenuEl.contains(e.target)) return;
  closeItemActionMenu();
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "b") toggleInventory();

  const num = Number(e.key);
  if (num >= 1 && num <= HOTBAR_SIZE) {
    selectedHotbarIndex = num - 1;
    const invIndex = hotbar[selectedHotbarIndex];
    const slot = invIndex !== null ? inventory[invIndex] : null;
    if (slot) holdSlot(invIndex);
    else renderHotbar();
  }
});

renderHotbar();
renderInventory();
