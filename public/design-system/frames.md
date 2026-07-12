# Frames

Reusable border containers for the ranking system's pages (Cadastro de
jogadores, Ranking, Listagem de jogos). 28 variants exist so far, across
9 room-sheet themes. Every sheet's full tile grid has been scanned (not
just the first row/cluster — see "Lesson" below for why that matters).

## How to use

```html
<link rel="stylesheet" href="design-system/frames.css">

<div class="frame frame-brick">
  ...page content...
</div>
```

Always combine the base `.frame` class with exactly one variant class.
`.frame` sets up the box model, pixel-art rendering, and inner padding
(20px) — the variant class only swaps in the border art and background.

## Variants

| Class | Look | Notes |
|---|---|---|
| `frame-brick` | Stone/brick, brown fill | No cropping needed, used as supplied |
| `frame-library` | Bookshelf trim, wood floor | Sheet has 6 tiles, all visually identical — verified, not a miss |
| `frame-chest` | Riveted wood-beam vault, plain | |
| `frame-chest-torch` | Same vault + wall torches/gems | |
| `frame-chest-chains` | Same vault + hanging chains | |
| `frame-arcade` | Dark stone, plain | Sheet's other 3 tiles have arcade-machine/item props — skipped |
| `frame-cathedral` | Blue gothic stone, 1 torch | **Visual quirk — see below** |
| `frame-cathedral-candles` | Same stone + candles + floor decal | **Same quirk** |
| `frame-cathedral-skulls` | Same stone + small skulls | **Same quirk** |
| `frame-dank-depths` | Near-black cave, plain | |
| `frame-dank-depths-b` | Same cave, subtle crack variant | |
| `frame-dank-depths-skulls` | Same cave + skull/bone trim | |
| `frame-dank-depths-cracks` | Same cave + white lightning cracks | |
| `frame-dank-depths-cracks-b` | Same cracks + small skull icon | |
| `frame-isaacs-room` | Cream-trimmed wood | |
| `frame-isaacs-room-b` | Plain wood trim (no cream) | |
| `frame-isaacs-room-cobweb` | Cream trim + cobwebs | |
| `frame-isaacs-room-cobweb-b` | Plain trim + cobwebs | |
| `frame-scarred-womb` | Fleshy pink, rocky trim | |
| `frame-scarred-womb-cracks` | Same flesh + white scribble cracks | |
| `frame-scarred-womb-veiny` | Same flesh + red veiny/organic trim | |
| `frame-shop` | Wood shelf trim, empty | |
| `frame-shop-light` | Same shelf, lightly stocked | |
| `frame-shop-stocked` | Same shelf, fully stocked | Sheet had 3 near-identical fully-stocked tiles — only one registered |
| `frame-utero` | Deep red flesh, claw marks | Coordinates found manually (see Provenance) |
| `frame-utero-purple` | Same flesh + purple blob decoration | |
| `frame-utero-dark` | Same flesh + dark blob decoration | |

## Picking one

No hard rule yet — match the frame to the room/theme it represents if
the page has one, otherwise default to whichever a neighboring page
already uses. Ask before introducing a frame to a brand-new page.

## Known issue: `frame-cathedral*` (all 3)

The source tile has a genuinely transparent notch near its inner
corner (verified — it's `alpha: 0` in the sprite, not a bug in our
pipeline). Mirrored into a symmetric frame, it shows up as a small
white/see-through gap in the middle of the top and bottom edges
(rendered against whatever is behind the `.frame`, not necessarily
white — the white in our previews is just how the image viewer shows
transparency). Usable, but check it against the actual page background
before shipping a page with one of these. Fixing it properly would
mean patching those transparent pixels with a matched fill color — not
done yet.

## Skipped variants (not registered)

Several sheets pack multiple tile variants together in the same grid,
and not all of them make sense as a border — some have one-off scene
props tied to a *specific character or object* (an arcade cabinet, a
shopkeeper NPC) that would look wrong repeated at all 4 mirrored
corners. Ambient stock/clutter (stocked shelves, scattered debris,
cobwebs, cracks) is fine and got registered as its own variant instead.
If a skipped scene-prop variant turns out to be wanted later (e.g. for
a themed one-off page rather than a tileable border), it can still be
pulled from the original sheet — check `assets/manifest.js` or ask to
re-open a specific sheet.

Skipped, with reason:
- `rooms-arcade.png`: 3 of 4 tiles have arcade-machine/item props
- `rooms-shop.png`: 1 of 6 tiles has a shopkeeper NPC; 2 of the 3 fully-stocked tiles are near-duplicates of the one registered
- `rooms-isaacs-room.png`: 2 of 8 tiles are near-duplicates of already-registered plain variants
- `rooms-utero.png`: 2 of 6 tiles are near-duplicates of the plain claw-mark variant
- `rooms-cathedral.png`: 1 of 4 tiles is a near-duplicate of `frame-cathedral`
- `rooms-isaacs-room.png` also has a small 3rd cluster of item icons (torn map, cloth) — not room-corner tiles at all, different asset type
- `rooms-scarred-womb.png`: only rows 1-2 were split into individual tiles; row 3 didn't separate cleanly from row 2 (no gutter dip found) and wasn't pursued further — may still have an unexplored variant

**Lesson learned** (from `rooms-shop.png` first, confirmed again on
`rooms-dank-depths.png`, `rooms-isaacs-room.png`, `rooms-scarred-womb.png`,
`rooms-utero.png`): a first pass that only scans the first row or the
first visible cluster will miss real variants — most of these sheets
stack 2-3 rows, or (for `rooms-isaacs-room.png`) two full 2×2 clusters
stacked vertically. Always scan the sheet's *entire* tile grid, and
view each sheet's full image first to count rows/clusters before
picking a bounding box.

## Provenance (only needed if redoing a crop)

All frames except `frame-brick` were built the same way: crop one
corner tile out of a ripped room sheet, mirror it into all 4 quadrants
with `assets/mirror-frame.js`, then sample a small interior patch for
the tiled floor background.

Tile boundaries are found by scanning pixel brightness for the black
gutter between tiles (`assets/scan-room-tiles.js` — treats near-black,
magenta chroma-key, *and* fully-transparent pixels as "gutter"). This
works automatically for most sheets via `assets/process-room-sheet.js
<sheet> <x0,y0,x1,y1> <outDir>`, given a bounding box around the
corner-tile grid (has to exclude other content on the same sheet —
checkerboard floor swatches, loose wall pieces, credit-text blocks —
which aren't separated from the tile grid by a clean gutter).

Some sheets have decorative debris (skulls, cracks, dust) that crosses
the gutter itself, breaking the automatic split — those needed the
bounding box narrowed to just the row/column in question, or (for
`frame-utero` and some `frame-dank-depths`/`frame-scarred-womb`
variants) fully manual coordinates found by sampling pixel brightness
by hand at the expected boundary.

Per-sheet coordinates, for reference:

- `frame-library`: `assets/sheets/rooms-library.png`, tile `x=11,y=11,w=226,h=148`, floor sample `x=90,y=90,w=60,h=40`
- `frame-chest` / `-torch` / `-chains`: `assets/sheets/rooms-the-chest.png`, tiles at `x=12,y=12` / `x=246,y=12` / `x=246,y=168` (all `w=225,h=147` or `w=215,h=147`)
- `frame-arcade`: `assets/sheets/rooms-arcade.png`, tile `x=5,y=7,w=229,h=149`
- `frame-cathedral` / `-candles` / `-skulls`: `assets/sheets/rooms-cathedral.png`, tiles at `x=12,y=12` / `x=246,y=3` / `x=246,y=168`
- `frame-dank-depths` / `-b`: `assets/sheets/rooms-dank-depths.png`, tiles `x=10,y=10,w=227,h=149` / `x=243,y=10,w=228,h=149`
- `frame-dank-depths-skulls` / `-cracks`: same sheet, row 2, `x=10,y=166,w=227,h=149` / `x=244,y=166,w=227,h=149`
- `frame-dank-depths-cracks-b`: same sheet, row 3 (only 1 tile in this row — col 2 is occupied by a checkerboard floor swatch, not another corner tile), manual `x=10,y=326,w=224,h=145`
- `frame-isaacs-room` / `-b`: `assets/sheets/rooms-isaacs-room.png`, cluster 1, tiles `x=8,y=9,w=229,h=150` / `x=8,y=165,w=229,h=136`
- `frame-isaacs-room-cobweb` / `-cobweb-b`: same sheet, cluster 2 (this sheet has 2 stacked 2×2 clusters), `x=244,y=474,w=279,h=156` / `x=244,y=637,w=227,h=124`
- `frame-scarred-womb`: `assets/sheets/rooms-scarred-womb.png`, row 1, tile `x=7,y=7,w=230,h=152`
- `frame-scarred-womb-cracks` / `-veiny`: same sheet, row 2, manual `x=7,y=168,w=230,h=155` / `x=239,y=168,w=230,h=155`
- `frame-shop` / `-light` / `-stocked`: `assets/sheets/rooms-shop.png`, tiles at `x=12,y=12` (row 1) / `x=12,y=168` (row 2) / `x=12,y=324` (row 3), all `w=225,h=~146`
- `frame-utero`: `assets/sheets/rooms-utero.png`, row 1, manual `x=10,y=10,w=224,h=146`
- `frame-utero-purple` / `-dark`: same sheet, row 2, manual `x=10,y=165,w=224,h=146` / `x=246,y=165,w=224,h=146`
