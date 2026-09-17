# RPG Prototype

A fullscreen dirt map (randomly tiled from 3 dirt variants) with a
WASD-controlled character that has idle / walk / run animations, and a
zoomable camera.

## Folder structure

```
rpg-game/
├── index.html
├── style.css
├── js/
│   ├── config.js    ← tunable constants (map size, zoom range, anim speeds…)
│   ├── assets.js    ← loads the sprite/tile/item images
│   ├── input.js     ← keyboard + mouse-wheel state, zoom value
│   ├── inventory.js  ← inventory grid, hotbar, held item, ground placement
│   ├── save.js        ← autosave/load progress via localStorage
│   ├── world.js      ← slices the 3 dirt tile variants + randomly tiles the map
│   ├── player.js     ← player state + movement/animation-state logic
│   ├── camera.js     ← canvas sizing, zoom-aware rendering, ground items, placement highlight
│   └── main.js       ← entry point: starts the game loop
└── assets/
    ├── tiles/
    │   └── dirt.png              (3 tile variants side by side, 16x16 each)
    └── sprites/
        ├── Idle_Down-Sheet.png       (4 frames)
        ├── Idle_Up-Sheet.png         (4 frames)
        ├── Idle_Side-Sheet.png       (4 frames, faces right — flipped for left)
        ├── Walk_Down-Sheet.png       (6 frames)
        ├── Walk_Up-Sheet.png         (6 frames)
        ├── Walk_Side-Sheet.png       (6 frames, faces right — flipped for left)
        ├── Run_Down-Sheet.png        (6 frames)
        ├── Run_Up-Sheet.png          (6 frames)
        ├── Run_Side-Sheet.png        (6 frames, faces right — flipped for left)
        ├── Collect_Down-Sheet.png    (8 frames, one-shot pickup/put-down)
        ├── Collect_Up-Sheet.png      (8 frames)
        ├── Collect_Side-Sheet.png    (8 frames, faces right — flipped for left)
        ├── Carry_Idle_Down-Sheet.png (4 frames)
        ├── Carry_Idle_Up-Sheet.png   (4 frames)
        ├── Carry_Idle_Side-Sheet.png (4 frames, faces right — flipped for left)
        ├── Carry_Walk_Down-Sheet.png (6 frames)
        ├── Carry_Walk_Up-Sheet.png   (6 frames)
        ├── Carry_Walk_Side-Sheet.png (6 frames, faces right — flipped for left)
        ├── Carry_Run_Down-Sheet.png  (6 frames)
        ├── Carry_Run_Up-Sheet.png    (6 frames)
        └── Carry_Run_Side-Sheet.png  (6 frames, faces right — flipped for left)
```

`index.html` loads the `js/` files in that exact order because each one
depends on the globals defined by the ones before it (plain `<script>`
tags, no bundler needed — this keeps it double-click-able with no build
step).

## How to run

**Option A — VS Code Live Server (recommended)**
1. Open the `rpg-game` folder in VS Code.
2. Install the "Live Server" extension if you don't have it.
3. Right-click `index.html` → "Open with Live Server".

**Option B — just open the file**
Double-click `index.html` to open it directly in your browser.

## Controls

- **W A S D** — walk (arrow keys also work)
- **Shift** (held while moving) — run
- **F** — collect / put down (plays a one-shot pickup animation, then
  toggles carry mode — see "Carry system" below)
- **1-7** — select/hold whatever's assigned to that hotbar slot
- **B** — open/close the full inventory panel
- **Click** an item in the full inventory panel — holds it directly
- **Right-click** an item in the full inventory panel — opens a small
  menu: **Hold** it, or assign it to hotkey **1-7** (overwrites whatever
  was on that hotkey before)
- **Click** a hotbar slot — holds its item immediately (same as clicking
  it in the inventory)
- **Click** the game world while holding an item — place it on that tile
  (if it's a valid tile — see "Inventory & placement" below)
- **Esc** — cancel the currently held item
- **Mouse wheel** — zoom in / out
- **Q / E** — zoom out / in (keyboard alternative to the wheel)

## Inventory & placement

- The inventory is an 8-row × 9-column grid (72 slots) — press **B** to
  open/close it.
- The hotbar (always visible, bottom of screen) is a set of 7 *pointers*
  into the inventory, not fixed to the first row — **any** inventory item
  can be put on **any** of the 7 hotkeys. Right-click an item in the
  inventory panel to bring up the Hold / 1-7 menu, then click a number to
  assign it there. By default, hotkeys 1-7 point at inventory slots 0-6
  (Grass, then the Top-Left/Top/Top-Right/Left/Inner/Right tileset pieces).
- Slot 0 (top-left of the inventory) starts with 99 Grass — the icon you
  first attached. Slots 1-9 hold a 3×3 grass tile set (top-left/top/
  top-right, left/inner/right, bottom-left/bottom/bottom-right) —
  placing these next to each other builds a grass patch with clean
  edges, instead of scattering single grass tufts around.
- Clicking **Hold** (or a hotbar slot) picks up that item. While holding
  an item, every tile within **5 tiles** of the character (in every
  direction — a square range, not a circle) is outlined:
  - **light/white border** — empty, valid to place on
  - **amber/gold border** — already has a *different* item there — placing
    will replace it
  - **red border** — already has the exact same item there — nothing to do
  The highlighted area is recalculated every frame around your *current*
  position, so it moves with you while you're still holding the item.
- Clicking a highlighted tile places the held item there and uses up 1
  from the stack; once the stack hits 0 the slot empties and you stop
  holding. If the item you're placing happens to be on the hotbar, the
  hotbar's highlighted/selected slot follows along automatically. **Esc**
  cancels holding without placing anything.
- This is a general-purpose system, not grass-specific — see
  `itemDefs` in `js/inventory.js` to register more item types later (each
  just needs a `name` and an `icon` — an entry in `assets.js`).

## Saving

Your progress — placed items, inventory counts, hotbar assignments, and
where your character is standing — autosaves to your browser's
`localStorage` every couple of seconds, and right before the tab closes.
Reopening `index.html` restores it automatically, so whatever you build
stays there instead of resetting each time.

The top-right toolbar also has:
- **💾 Save** — saves immediately (autosave already covers this, but this
  gives an explicit "definitely saved right now" moment).
- **⬇ Export** — downloads your current save as `rpg-save.json`.
- **⬆ Import** — loads a previously exported `rpg-save.json` (from this
  browser or a different PC) and makes it the active save here.

This is per-browser, local to your computer only — Export/Import is how
you move a save between different browsers or computers. To wipe it and
start over from the defaults without a file, open the browser console
and run `clearSave()`.

## Carry system

Pressing **F** plays the `Collect` animation once (locks movement while it
plays), then:
- If you weren't carrying anything, you now are — idle/walk/run switch to
  the `Carry_Idle` / `Carry_Walk` / `Carry_Run` sheets instead.
- If you were already carrying something, pressing F again plays the same
  animation and puts it down, switching back to the normal sheets.

There's no actual item/object to pick up yet in this prototype — **F**
just toggles the state directly so the animations and carry-mode switch
can be previewed. `player.mode` (`"normal"` / `"carrying"`) and
`player.action` (`null` / `"collect"`) in `js/player.js` are the two
pieces of state driving this; wiring an actual pickup trigger later just
means setting `collectRequested = true` (from `js/input.js`) when the
player is near a real item, instead of on every F press.

## What changed this round

- **Random ground tiles.** `dirt.png` is a strip of 3 different 16x16 dirt
  variants. `world.js` slices out all 3 and picks a random one for every
  tile across the whole map (seeded, so the layout is stable across
  reloads) instead of repeating a single tile.
- **Idle / Walk / Run animations.** The player now has a real `anim` state
  (`idle`, `walk`, `run`) in `player.js`. It's idle when standing still,
  walks when moving, and runs when moving with Shift held — each state
  uses its own sheet and its own frame count/speed (idle: 4 frames @ 4fps,
  walk: 6 frames @ 8fps, run: 6 frames @ 12fps — see `config.js`).
- **Left-facing, still via flip.** All three *Side sheets face right; for
  every state (idle, walk, run), facing left reuses that same sheet and
  flips it horizontally at draw time (`ctx.scale(-1, 1)` in
  `camera.js`) rather than needing separate left-facing art. This is now
  consistent across all three animations, which is what was missing
  before (only walk had it).
- **Removed the smoothing on the character.** Turning `imageSmoothingEnabled`
  on for the sprite (from the previous round) was what made it look soft /
  blurry — bilinear smoothing softens edges. It's now drawn with the same
  crisp, no-smoothing setting as the ground tiles, which is the correct,
  sharp look for pixel art at this resolution. Worth knowing: the source
  art itself is a small 64×64 frame, so at 4–6x zoom you're always going to
  see the individual pixels rather than smooth curves — that's inherent to
  the resolution of the art, not something scaling settings can fix. Crisp
  visible pixels (current setting) reads as "clear pixel art"; smoothing
  it instead reads as "blurry," which is why it's off.

- **Diagonal movement now faces left/right.** Moving diagonally (top-left,
  top-right, bottom-left, bottom-right) now shows the left/right side
  sprite instead of sometimes snapping to up/down — the logic in
  `player.js` picks left/right whenever there's any horizontal input at
  all, and only falls back to up/down for purely vertical movement (since
  there's no separate diagonal artwork).

- **Character-shaped shadow, not a blob.** The shadow is built from the
  actual sprite frame that's currently playing — `buildSilhouette()` in
  `camera.js` draws the current frame onto a scratch canvas and tints
  every opaque pixel a soft dark tone, so the shadow keeps the real head/
  arms/body/legs shape instead of being a plain circle or ellipse.
- **Feet glued to feet — properly this time.** The shadow is drawn
  upside-down (mirrored vertically) and flattened, like a real cast
  shadow. It's anchored using `SPRITE_FEET_FRACTION` in `config.js` — a
  value measured directly from the sprite sheets (the feet pixels sit at
  ~75% down the 64px frame, not at the very bottom edge — there's empty
  padding baked into the art). The earlier version guessed a rough
  fraction and anchored too low, which is why the shadow looked far away;
  anchoring at the *measured* feet row fixes that gap. Since that row is
  essentially the same across every idle/walk/run frame (47–48px out of
  64, checked across all sheets), the shadow no longer visibly shifts
  position as the animation plays — it always meets the feet at the same
  spot and the same angle.
- **Lighter and blurred.** The shadow's tint is a softer, lower-opacity
  dark brown instead of near-black, and `ctx.filter = "blur(3px)"` is
  applied while drawing it so the edges are soft rather than hard pixel
  edges — tweak the color/alpha in `buildSilhouette()` and the blur amount
  in `drawShadow()`, both in `camera.js`.

## Key constants — all in `js/config.js`

| Constant | Purpose |
|---|---|
| `MAP_W`, `MAP_H`, `TILE` | World size and ground tile size |
| `DRAW_SIZE` | Character size in world px (scales with zoom automatically) |
| `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_STEP` | Camera zoom range and sensitivity |
| `FRAME_COUNTS`, `ANIM_FPS` | Frame count and playback speed per animation state |
| `SPRITE_FEET_FRACTION` | How far down the 64px sprite frame the feet sit — anchors the shadow |
| `SHADOW_OFFSET_X` | Shifts the shadow left/right relative to the feet (world px; negative = left, positive = right) |
| `SHADOW_LEAN` | Which side the shadow always leans/slants toward — fixed, doesn't change with facing (positive = left, negative = right) |

`squashY` (how flat the shadow is) lives directly in `drawShadow()` in
`js/camera.js`. The pose mirror (`ctx.scale(-1, 1)` when facing left) is
separate from `SHADOW_LEAN` — it only flips the silhouette's arms/legs to
match a left-facing pose, it does not change which side the shadow leans.

`player.speed` / `player.runMult` (walk vs. run speed) live in `player.js`.
