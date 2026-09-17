# CLAUDE.md — Project Log

Internal dev log for this prototype: what exists, why it's built this way,
and what's already been tried/fixed. `README.md` is the user-facing
"how to run" doc; this file is the "what happened and why" doc.

## What this project is

A browser-based, fullscreen top-down RPG movement prototype:
- A 3000×1640 world tiled with a randomly-scattered dirt texture (3 tile
  variants sliced from one source image).
- A WASD-controlled character with idle / walk / run animation states,
  each with its own down / up / side sprite sheet (side sheet is flipped
  in code to get left-facing, no separate left art needed).
- A one-shot **Collect** action (F key) and a **Carry** mode: while
  carrying, idle/walk/run switch to dedicated carry-pose sheets. See
  "Carry system" in `README.md` and changelog entry 13 below for details.
- An **inventory (B key), hotbar (1-7), and ground-item placement**
  system — pick up an item from a 72-slot grid, see a highlighted
  placement range around the player, and place it on a valid tile. See
  "Inventory & placement" in `README.md` and changelog entry 14 below.
- A zoomable camera (mouse wheel or Q/E), fullscreen canvas, no UI chrome.
- A character-shaped (not circular) drop shadow, built from the live
  sprite silhouette, anchored to the feet.

Plain vanilla JS, no build step, no framework — meant to be opened via
VS Code Live Server or double-clicked directly.

## Architecture

```
index.html   → loads js/ files in dependency order (plain <script> tags,
                classic scripts sharing one global scope — no bundler,
                no ES modules, so it still works via file:// double-click)
js/config.js   → all tunable constants
js/assets.js   → loads every sprite/tile/item image, whenAssetsReady(cb)
js/input.js    → keyboard state + mouse wheel zoom
js/inventory.js → inventory grid (8x9), hotbar (1-7), held item, ground
                  item placement/highlight logic + the DOM UI for both
js/save.js     → autosave/load progress (localStorage)
js/world.js    → slices dirt.png into 3 tile variants, randomly tiles MAP_W×MAP_H
js/player.js   → player position/facing/animation-state update logic
js/camera.js   → canvas sizing (DPR-aware), shadow, sprite drawing, ground
                 items, placement-range highlight, render loop draw calls
js/main.js     → entry point, requestAnimationFrame loop, wires up the
                 canvas placement-click listener once everything exists
```

Load order in `index.html` matters: each file uses globals defined by the
one before it (config → assets → input → inventory → world → player →
camera → main). `inventory.js` loads early (right after input.js) but its
functions that touch `player`/`view`/`camX`/`zoom` (all defined in later
files) are only ever *called* after everything has loaded — classic
`<script>` tags share one global scope, and a function body only resolves
names when it *runs*, not when it's defined, so this is safe. The one
placement where that would NOT be safe — `view.addEventListener(...)` in
`setupPlacementClickHandler()` — is deliberately not run at load time; it's
a function that main.js's `start()` calls once, after `whenAssetsReady`
fires, by which point `view` (from camera.js) definitely exists.

**Note:** an old `js/game.js` (an early, all-in-one version of the game
before it was split into the files above) was floating around in a couple
of exported zips as dead weight — it's not referenced by `index.html` and
has been deleted. If you ever see it reappear, it's safe to delete; it's
not part of the running game.

## Timeline of what's been built / fixed, in order

1. **Base map** — 3000×1640 canvas tiled with a single uploaded dirt
   texture (16×16), published first as a hosted artifact.
2. **Converted to a local downloadable package** — plain HTML/CSS/JS
   project (no props/objects layer, per request) so it can be opened in
   VS Code, zipped for download.
3. **Character added** — Walk sheets (down/up/side, 6 frames, 64×64 each)
   wired up with WASD movement; left-facing achieved by flipping the side
   sheet at draw time (`ctx.scale(-1, 1)`) instead of needing separate art.
4. **Fullscreen pass** — removed the header/instructions panel and canvas
   border; canvas now fills the window and resizes with it. Added a
   mouse-wheel/Q-E zoom camera, clamped `ZOOM_MIN`–`ZOOM_MAX`.
5. **Split into multiple files** — was one big `game.js`; broken into
   `config/assets/input/world/player/camera/main.js` (see Architecture
   above) purely for organization, no behavior change.
6. **Pixelation/blur back-and-forth** (worth understanding if it comes up
   again):
   - First complaint: character looked blocky/pixelated. Root cause turned
     out to be **no `devicePixelRatio` handling** — canvas was sized in CSS
     px only, so high-DPI screens upscaled it. Fixed in `resizeCanvas()`
     (`js/camera.js`) by sizing the canvas backing store to
     `window.innerWidth/Height * devicePixelRatio`.
   - Attempted fix #2: turned on `ctx.imageSmoothingEnabled = true` just
     for the character sprite. This *overcorrected* — bilinear smoothing
     on a low-res (64×64) source scaled 4–6x reads as **blurry**, not
     crisp. Reverted; the character is drawn with the same
     `imageSmoothingEnabled = false` (nearest-neighbor) as the ground
     tiles. Net takeaway: the DPR fix was the real fix; smoothing the
     sprite was a mistake and was undone.
7. **Random dirt tiles** — `dirt.png` is a strip of 3 different 16×16
   variants. `world.js` slices out all 3 and assigns one at random
   (seeded PRNG, so layout is stable across reloads) to every tile in the
   map, instead of repeating a single tile.
8. **Idle / Run sheets added** — on top of Walk, added Idle (4 frames) and
   Run (6 frames) sheets for down/up/side. `player.js` now tracks a real
   `anim` state (`idle` / `walk` / `run`): idle when stationary, walk when
   moving, run when moving + holding Shift. Frame index resets on state
   change so it never points past a shorter sheet's frame count.
9. **Diagonal-facing fix** — moving diagonally (e.g. up-left) used to
   sometimes show the up/down sprite instead of the side sprite, because
   facing was chosen by whichever axis had the larger input magnitude.
   Changed so **any horizontal input at all** picks the left/right sprite;
   up/down is only used for purely vertical movement (no diagonal art
   exists, so left/right is the intended fallback for all 4 diagonals).
10. **Shadow, several iterations:**
    - v1: simple static gray ellipse under the feet. Worked, but wanted
      something less "generic blob".
    - v2: tried a *skewed, pulsing ellipse* (size pulsed with the
      idle/walk/run frame timing). Still not the right shape per feedback
      ("dapat may ulo, may kamay, katawan, at paa" — should look like the
      character, not a blob).
    - v3: **silhouette shadow** — `buildSilhouette()` draws the currently
      playing sprite frame onto a scratch canvas and uses
      `globalCompositeOperation = "source-in"` to tint every opaque pixel
      a flat dark color while preserving the sprite's alpha shape. This
      gives the shadow a real head/arm/body/leg outline, and since it's
      rebuilt from whatever frame is currently on-screen, it automatically
      matches the current idle/walk/run pose with no extra animation code.
    - v3 had a positioning bug: the silhouette was anchored **centered**
      on a pivot point, so half of it rendered "above" the feet, giving a
      floating look with the wrong orientation.
    - v4: switched to an **upside-down (mirrored), foot-pinned** shadow —
      the standard "cast shadow" trick. The image is drawn so its foot
      edge sits at local `y = 0` *before* any transform, then
      `ctx.transform(1, 0, skew, -squashY, 0, 0)` flips it vertically and
      flattens it — because the transform's translation terms are zero,
      the point `(0,0)` (the feet) is mathematically guaranteed to stay
      exactly at the pivot regardless of skew/squash. Facing left mirrors
      it the same way the sprite itself is mirrored.
    - v4 still looked "sobrang layo" (way too far from the feet) in
      testing. Root cause: the pivot's vertical position (`feetY`) was a
      guessed fraction of the character's draw size, not based on where
      the feet pixels actually are inside the 64×64 sprite frame. **Measured
      it directly** (Python/PIL, checked alpha-channel bounding boxes
      across every frame of every sheet): the feet consistently sit at
      **y ≈ 47–48 out of 64px** (there's real transparent padding above the
      head and below the feet baked into the art — the character doesn't
      fill the frame edge-to-edge). Added `SPRITE_FEET_FRACTION` in
      `config.js` (started at `0.75` based on that measurement) and used
      it to compute `feetY` properly:
      `feetY = py - size/2 + size * SPRITE_FEET_FRACTION`.
      This fixed both the "too far away" gap and the "shadow shifts
      position while walking" complaint (the feet row barely moves between
      frames — 47 vs 48px — so once anchored correctly it's visually rock
      solid).
    - Also on this pass: lightened the shadow tint (was solid-ish black,
      now `rgba(35,25,20,0.32)`), and added `ctx.filter = "blur(3px)"`
      around the `drawImage` call for soft edges instead of hard pixel
      edges.
    - **You've since hand-tuned** `SPRITE_FEET_FRACTION` to `0.6` (from
      `0.75`) and `squashY`/`skew` to `0.6`/`0.6` (from `0.35`/`0.55`) in
      your own edit of the zip — those are your current values and this
      log reflects them, not the original numbers.
11. **`SHADOW_OFFSET_X` added** — a plain constant in `config.js` to nudge
    the shadow left/right independently of everything else, in world px
    (scales with zoom automatically since it's applied as
    `SHADOW_OFFSET_X * scale` in `camera.js`). You've since set it to `6`.
12. **Decoupled shadow lean direction from facing.** The skew (which side
    the shadow slants toward) used to be `player.facing === "left" ? -0.6
    : 0.6` — tied to facing, same as the pose mirror. That meant facing
    left didn't just mirror the character's pose in the shadow, it also
    flipped which side the shadow leaned toward, which wasn't wanted: you
    liked the shadow always leaning to one side (left, in your tuned
    values) regardless of which way the character faces, while still
    wanting the silhouette's *pose* (arms/legs) to correctly mirror for
    left-facing. Split these into two independent things in
    `drawShadow()`:
    - `SHADOW_LEAN` (new constant, `config.js`) — fixed skew value, always
      applied the same way no matter `player.facing`.
    - `ctx.scale(-1, 1)` when `facing === "left"` — unchanged, still only
      mirrors the silhouette's pose (needed since the side sheet only has
      right-facing art), independent of `SHADOW_LEAN` now.
13. **Collect action + Carry mode added.** New sprite sheets: `Collect`
    (8 frames, down/up/side) and `Carry_Idle` / `Carry_Walk` / `Carry_Run`
    (4/6/6 frames, down/up/side each — same frame counts as their normal
    idle/walk/run counterparts, so no new FRAME_COUNTS/ANIM_FPS values
    were needed for the carry* movement anims themselves, only for
    `collect`). Verified via the same alpha-bbox measurement approach as
    before that the feet still sit at the same y ≈ 47–48/64 across all of
    these new sheets, so `SPRITE_FEET_FRACTION` needed no changes.
    - `player.mode` (`"normal"` / `"carrying"`) and `player.action`
      (`null` / `"collect"`) added to `player.js`.
    - **F** is wired as a one-shot ("just pressed", not held) trigger via
      `collectRequested` in `input.js`, consumed once per press in
      `updatePlayer()` — holding F does not repeat the action.
    - Pressing F starts `player.action = "collect"`, which locks movement
      and plays the 8-frame Collect sheet once; on the last frame it flips
      `player.mode` between `"normal"` and `"carrying"` and clears
      `action`. Same sheet/animation plays for both pickup and put-down —
      there wasn't a separate "put down" sheet provided, so this is a
      deliberate simplification, noted here in case that ever needs
      revisiting.
    - `spriteForFacing(anim, facing, mode)` in `player.js` gained a third
      parameter: when `anim === "collect"` it ignores `mode` entirely (one
      universal collect animation); otherwise it picks the `carry*` sheet
      instead of the normal one whenever `mode === "carrying"`. `camera.js`
      was updated to pass `player.mode` through and to compute the sprite
      sheet from `player.action === "collect" ? "collect" : player.anim`
      rather than always `player.anim`.
    - **This is a demo hook, not a real pickup system** — there's no
      actual item/object in the world yet, so F just toggles carry mode
      directly on every press. To wire up real pickup logic later: set
      `collectRequested = true` (declared in `input.js`) only when the
      player is near an actual item, instead of unconditionally on every
      F keypress.
14. **Inventory, hotbar, and ground-placement system added.** New item
    icon: `assets/items/grass.png` (registered as the `grass` item in
    `itemDefs`, `js/inventory.js`).
    - **Data:** `inventory` — a flat array of `INVENTORY_ROWS *
      INVENTORY_COLS` (8×9 = 72) slots, each `null` or `{type, count}`.
      Slot `0` starts as `{type: "grass", count: 99}` — the requested
      "attached item goes in the first slot". `groundItems` is a
      `Map<"col,row", type>` for items placed on the map.
    - **Hotbar (always visible, bottom of screen):** mirrors inventory
      slots `0`–`HOTBAR_SIZE-1` (first `HOTBAR_SIZE` = 7 of row 0).
      Number keys **1-7** select a slot and, if it has an item, hold it
      (same effect as clicking it).
    - **Inventory panel:** toggled with **B** (`toggleInventory()` in
      `inventory.js`), a full-screen dark overlay with a centered 9-column
      CSS grid of all 72 slots. Built and styled as plain HTML/CSS
      (`#hotbar`, `#inventory-overlay` in `index.html`, styled in
      `style.css`) rather than drawn on the canvas — much simpler for
      text/icons/click-targets than doing UI in canvas, and it doesn't
      need to move with the camera since it's fixed to the screen.
    - **Holding:** clicking any slot with an item (`holdSlot()`) sets
      `heldItem = { type, fromSlot }`. **Esc** cancels
      (`cancelHeldItem()`).
    - **Placement range highlight:** while holding an item,
      `drawPlacementRange()` (`camera.js`) draws a stroked square around
      every tile within `PLACEMENT_RANGE` (5) tiles of the player's
      *current* tile position — **Chebyshev distance** (a square area),
      chosen for simplicity over a circular/Euclidean range since "5
      range ng tiles" didn't specify a shape. Recomputed from the live
      player position every frame, so the highlighted area moves with the
      player while they're still holding something. Light/white border =
      empty tile (valid); red border = occupied (invalid). Tiles outside
      the map bounds are skipped (not highlighted at all).
    - **Placing:** `setupPlacementClickHandler()` (`inventory.js`, called
      once from `main.js`'s `start()`) listens for clicks on the game
      canvas, converts the click's screen position to a world tile using
      the camera's current `camX`/`camY`/`zoom` (see note above on why
      `camX`/`camY` were promoted from `render()`-local `const`s to
      module-level `let`s in `camera.js`), and calls `placeHeldItemAt(col,
      row)`. That function re-checks map bounds, occupancy, and range
      (never trusts the highlight alone) before writing to `groundItems`
      and decrementing the held slot's count; the slot empties and
      `heldItem` clears once its count hits 0.
    - **Ground items are drawn every frame** (`drawGroundItems()`,
      `camera.js`) by iterating the whole `groundItems` map — fine at the
      scale of a demo; if the number of placed items grows large, this is
      the place to add viewport culling (only draw items whose tile is
      within the visible camera area).
15. **Added a proper 3×3 grass tileset.** The original single grass icon
    (`assets/items/grass.png`, from `solograss.png`) is **28×27px** — not
    the same size as a tile (`TILE` = 16px) — so when `drawGroundItems()`
    stretched it to fill a 16×16 tile-sized square on the ground, it came
    out visibly distorted/soft. That's most of what was meant by "panget"
    (ugly). Added 9 new items, each a clean **16×16** tile (pixel-perfect,
    no stretching needed): `grassTL/TC/TR/L/Inner/R/BL/BC/BR` in
    `itemDefs` (`inventory.js`), backed by `assets/items/grass_tl.png`
    etc. These are a standard "edge tileset" layout — corners, edges, and
    a center/fill tile — meant to be placed adjacent to each other to
    build a grass patch with clean borders, rather than dropping isolated
    tufts. Placed in inventory slots 1-9 (slot 0 keeps the original
    single tuft). The original `grass` item was **not removed** — it's
    still there in case it's wanted for scattered decoration — but the
    tileset is the one to use for anything meant to tile cleanly.
16. **Save/load added (`js/save.js`).** Progress didn't persist at all
    before this — every reload reset placed items, inventory counts, and
    player position back to the hardcoded defaults. Added `localStorage`-
    based persistence: `saveGame()` serializes `groundItems`, `inventory`,
    `selectedHotbarIndex`, and the player's `x`/`y` to a single JSON blob
    under the key `"rpg-prototype-save-v1"`; `loadGame()` reads it back
    and mutates those same structures in place (so every other file's
    references to `inventory`/`groundItems`/`player` stay valid — nothing
    is replaced wholesale). `loadGame()` is called once from `main.js`'s
    `start()`, after `buildWorld()` and before the render loop starts.
    Autosave runs on a 2-second `setInterval` plus on `beforeunload`
    (closing/refreshing the tab), and `placeHeldItemAt()` also calls
    `saveGame()` immediately after a successful placement so the most
    important action isn't left waiting on the timer.
    - **Deliberately NOT saved:** `heldItem` (whether something's
      mid-hold) and whether the inventory panel is open — these are
      transient UI state, not "progress", and always reset to normal on
      load.
    - **This is per-browser/per-computer storage**, same caveat as the
      original position-save in the very first version of this game — it
      isn't shared with anyone else, and clearing browser data wipes it.
    - `clearSave()` is available (not bound to any key — nothing asked
      for a reset button) to wipe the save and reload back to defaults;
      callable from the browser dev console.
17. **Flexible hotbar assignment + manual Save + Export/Import.**
    - **Hotbar is no longer hardwired to inventory row 0.** Added a
      separate `hotbar` array (`inventory.js`) — 7 entries, each either
      `null` or an index into `inventory`. Default is `[0,1,2,3,4,5,6]`
      (same visual result as before), but now reassignable: clicking an
      item **in the full inventory panel** opens `openItemActionMenu()`
      — a small floating menu (positioned next to the clicked slot via
      `getBoundingClientRect`) with a **Hold** button and buttons **1-7**;
      clicking a number sets `hotbar[i] = thatSlotIndex`, overwriting
      whatever was there. Clicking a **hotbar** slot directly still holds
      it immediately (no menu) — the menu is only for assignment, which
      only makes sense starting from the inventory. The menu closes on
      Hold/assign (explicit `closeItemActionMenu()` + `e.stopPropagation()`
      so the document-level click-away listener doesn't double-handle it)
      or on clicking anywhere else (a `document`-level `click` listener,
      careful to ignore clicks on the slot that just opened it — bubble
      order means the slot's own handler runs before the document one).
    - **Hotbar highlight follows placement.** In `placeHeldItemAt()`, if
      the slot being placed from is on the hotbar (`hotbar.indexOf(...)`),
      `selectedHotbarIndex` updates to that position — so the visually
      "active" hotbar slot tracks whatever you're actually placing.
    - **Manual Save button** (`#btn-save`, top-right toolbar) calls
      `saveGame()` on demand — autosave already covers this, but it gives
      an explicit confirmation moment (a small toast, see below).
    - **Export/Import** (`#btn-export` / `#btn-import`, same toolbar):
      `exportSave()` builds the same object `saveGame()` would write (now
      factored out as `buildSaveData()`, shared by both) and downloads it
      as `rpg-save.json` via a `Blob` + temporary `<a download>` click.
      `importSaveFromFile()` reads a chosen file with `FileReader`, parses
      it, and applies it through `applySaveData()` — the same function
      `loadGame()` uses — so import and normal load share one code path;
      after importing, it also calls `saveGame()` so the imported data
      becomes this browser's active save too, not just an in-memory
      change that'd be lost on refresh. This is how a save moves to
      another PC: Export on the source, copy `rpg-save.json` over, Import
      on the destination.
    - `buildSaveData()`/`applySaveData()` now also cover `hotbar`, so
      hotkey assignments survive save/load/export/import along with
      everything else.
    - Small `showToast(message)` helper (`save.js`) — a fixed, auto-
      dismissing div (`#save-toast`) for "Saved!" / "Exported!" /
      "Imported!" / error feedback, reused by all three toolbar actions.
18. **Ground-item replace + right-click assign menu.**
    - **Every item now has an explicit `id`** field in `itemDefs`
      (`inventory.js`) — same string as its object key, but made explicit
      rather than implied, per request ("dapat may unique id yung bawat
      item"). `groundItems` still stores that id as its value per tile;
      `getGroundItemId(col, row)` (replacing the old boolean-only
      `isTileOccupied()`, now removed) returns that id or `null`.
    - **Placing on an occupied tile now replaces it, if it's a different
      item.** `placeHeldItemAt()` used to block placement outright on any
      occupied tile. Now: same id already there → blocked (no-op, nothing
      to gain from replacing something with itself); different id already
      there → replaced (`groundItems.set()` overwrites); empty → placed
      normally. All three cases fall through to the same `groundItems.set()`
      call — the only branch that returns early is the "same id" one.
    - **Placement range highlight is now 3-state**, not 2
      (`drawPlacementRange()`, `camera.js`): light/white = empty tile
      (valid), **amber/gold = a different item is there (valid — will
      replace)**, red = the exact same item is already there (blocked).
      Previously "occupied" was a single red state regardless of what was
      occupying it.
    - **Assign-to-hotkey menu moved from left-click to right-click.**
      Left-clicking an inventory item now holds it directly (matching
      hotbar-slot behavior — one consistent "click = hold" rule
      everywhere). Right-clicking (`contextmenu` event,
      `e.preventDefault()` to suppress the browser's native menu) opens
      `openItemActionMenu()` instead. This was a deliberate swap, not
      just an addition — the previous version had left-click open the
      menu, which the request called out as "not appearing" (it likely
      *was* appearing, just not on the right-click the person was trying);
      right-click-for-context-menu is also the more standard convention
      to expect. The document-level click-away listener's `.inv-slot`
      special case (previously needed to stop a slot's own click from
      immediately closing the menu it had just opened) was removed, since
      opening now happens on a different event (`contextmenu`) than the
      one the click-away listener watches (`click`) — a plain left click
      anywhere, including on another inventory slot, now always closes an
      open menu, which is the correct behavior once opening moved off of
      `click` entirely.

## Known trade-offs / things worth knowing if you keep tweaking

- **Item action menu doesn't clamp to the screen edge.** `openItemActionMenu()`
  positions itself at `slotRect.right + 8px` — for inventory slots near the
  right edge of the screen, the menu could render partially off-screen.
  Not fixed yet since the inventory panel is centered and this only
  affects its rightmost column in practice, but worth knowing if the
  panel's position/size changes later.
- **Source art resolution is the real ceiling.** Every sprite frame is a
  small 64×64 image with the character occupying a modest chunk of it. At
  4–6x zoom you will always see individual source pixels rather than
  smooth curves. Nearest-neighbor scaling (current setting) reads as
  "crisp pixel art"; smoothing reads as "blurry" — there's no scaling
  trick that adds detail the source doesn't have.
- **`SPRITE_FEET_FRACTION` is a single global constant**, not measured
  per-sheet. It happens to be nearly identical across idle/walk/run/every
  facing (checked: 46–48px out of 64 across all sheets), which is why one
  constant works. If new sprite sheets are added later with a different
  frame layout, re-measure before assuming this constant still holds.
- **The shadow is rebuilt from scratch every single frame** (`buildSilhouette()`
  runs every draw call). Fine at this scale/frame-rate; if more shadowed
  entities are added later (enemies, NPCs), consider caching per
  frame-index instead of re-rendering the composite each time.
- **`COLS`/`ROWS`/tile loop in `world.js` runs once at startup** (roughly
  188×103 ≈ 19k `drawImage` calls to lay the random tiles) — a one-time
  cost at load, not per-frame, so it doesn't affect runtime performance.

## Possible next steps (not done yet, just noted)

- An actual item/object to pick up in the world, wired to trigger the
  real `collectRequested = true` on proximity + F, instead of the current
  demo behavior of toggling on every F press regardless of context.
- Automatic tile selection (autotiling) — right now placing the 3×3 grass
  tileset pieces correctly is manual (you pick which corner/edge/inner
  piece to place); a nicer version would auto-pick the right piece based
  on which neighboring tiles already have grass.
- More item types beyond grass — just add an entry to `itemDefs` and an
  icon in `assets.js`, the system already supports any number of types.
- Removing/picking back up an already-placed ground item (currently
  ground items are place-only — there's no interaction to pick one back
  up once it's down).
- Collision / obstacles (there's currently nothing to bump into).
- NPCs or a second entity using the same sprite/animation/shadow/carry
  system.
- A proper idle-vs-moving transition blend (currently frame resets to 0
  immediately on animation-state change — fine for now, could ease later).
- Sound effects for footsteps and for the collect action, tied to the
  existing frame timing.
