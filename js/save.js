"use strict";

/* =================================================================
   SAVE / LOAD / EXPORT / IMPORT — persists progress in the browser's
   localStorage so whatever you do (items placed, inventory counts,
   hotbar assignments, where you are) is still there next time you open
   the game, instead of resetting. Export/Import let you move that save
   to a different PC/browser as a plain JSON file, since localStorage
   itself never leaves the browser it was written in.

   What's saved: groundItems (placed items), inventory (slot contents/
   counts), hotbar (which inventory slot each hotkey points to),
   selectedHotbarIndex, and the player's position.
   What's NOT saved (deliberately reset each load): heldItem (whether
   you're mid-hold) and whether the inventory panel/action menu is open —
   those are momentary UI state, not "progress".
================================================================= */
const SAVE_KEY = "rpg-prototype-save-v1";

function buildSaveData() {
  return {
    groundItems: Array.from(groundItems.entries()), // [[ "col,row", type ], ...]
    inventory: inventory,                            // array of null | {type, count}
    hotbar: hotbar,                                  // array of null | inventory index
    selectedHotbarIndex: selectedHotbarIndex,
    player: { x: player.x, y: player.y }
  };
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData()));
  } catch (e) {
    console.error("Failed to save game:", e);
  }
}

// Shared by loadGame() (from localStorage) and importSaveFromFile() (from
// a file) — applies a parsed save object to the live game state in place,
// so every other file's references to inventory/groundItems/hotbar/player
// stay valid (nothing gets replaced wholesale, just mutated).
function applySaveData(data) {
  if (Array.isArray(data.groundItems)) {
    groundItems.clear();
    data.groundItems.forEach(([key, type]) => groundItems.set(key, type));
  }

  if (Array.isArray(data.inventory)) {
    for (let i = 0; i < inventory.length && i < data.inventory.length; i++) {
      inventory[i] = data.inventory[i];
    }
  }

  if (Array.isArray(data.hotbar)) {
    for (let i = 0; i < hotbar.length && i < data.hotbar.length; i++) {
      hotbar[i] = data.hotbar[i];
    }
  }

  if (typeof data.selectedHotbarIndex === "number") {
    selectedHotbarIndex = data.selectedHotbarIndex;
  }

  if (data.player && typeof data.player.x === "number" && typeof data.player.y === "number") {
    player.x = data.player.x;
    player.y = data.player.y;
  }

  renderHotbar();
  renderInventory();
}

function loadGame() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    console.error("Failed to read save data:", e);
    return;
  }
  if (!raw) return; // nothing saved yet — keep the defaults as-is

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Save data was corrupt, ignoring it:", e);
    return;
  }

  applySaveData(data);
}

// Wipes the save and reloads the page back to the original defaults —
// not bound to a key on purpose (nothing asked for a "reset" button),
// but callable from the browser console: clearSave()
function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.error("Failed to clear save:", e);
  }
  location.reload();
}

/* ---------------- export / import ---------------- */

function exportSave() {
  const blob = new Blob([JSON.stringify(buildSaveData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rpg-save.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported!");
}

function importSaveFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      console.error("That file isn't valid save data:", e);
      showToast("Import failed — not a valid save file");
      return;
    }
    applySaveData(data);
    saveGame(); // persist the imported data as this browser's save too
    showToast("Imported!");
  };
  reader.onerror = () => {
    console.error("Failed to read the file:", reader.error);
    showToast("Import failed — couldn't read the file");
  };
  reader.readAsText(file);
}

/* ---------------- small "Saved!" / "Imported!" toast ---------------- */

let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById("save-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "save-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1500);
}

/* ---------------- toolbar wiring ---------------- */

document.getElementById("btn-save").addEventListener("click", () => {
  saveGame();
  showToast("Saved!");
});
document.getElementById("btn-export").addEventListener("click", exportSave);
document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-file-input").click();
});
document.getElementById("import-file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) importSaveFromFile(file);
  e.target.value = ""; // allow importing the same file again later if needed
});

// Autosave: periodically (catches player movement) and right before the
// tab/window closes or reloads (catches anything since the last tick).
setInterval(saveGame, 2000);
window.addEventListener("beforeunload", saveGame);
