# Colors for Academic Figures

An interactive color-picking page: every picker from
[react-color](https://github.com/casesandberg/react-color) on one screen, plus
matplotlib's named colors and every matplotlib / seaborn colormap. Pick a color
anywhere — the sliders, the swatch grids, the colormap sweep — and everything
else follows.

**Live page:** https://patgcaspuenas.github.io/Colors-for-Academic-Figures/

## What's on it

- **The pickers.** Sketch, Chrome, Photoshop, Google, Slider, Swatches,
  Material, Compact, Block, GitHub, Twitter, Circle, Hue and Alpha, all wired to
  one shared color. Turn *Sync all pickers* off to give each card its own color,
  then push one back to the rest with *apply to all*.
- **matplotlib colors.** The base, Tableau and CSS4 tables, in the same order
  and layout as matplotlib's
  [List of named colors](https://matplotlib.org/stable/gallery/color/named_colors.html)
  (CSS4 sorted by HSV, filled top-to-bottom then left-to-right).
- **matplotlib colormaps.** All 90 of them, grouped the way the matplotlib docs
  group them. Drag the handle to sweep the colormap; tick *Discrete* to split it
  into *n* colors and sweep those instead. *Reversed* is the `_r` variant.
  *Copy hex* takes the swatches as a list, *Copy Python* takes the line that
  reproduces them.
- **seaborn palettes.** Only what seaborn adds on top of matplotlib: `rocket`,
  `mako`, `flare`, `crest`, `icefire`, `vlag`, the qualitative sets (`deep`,
  `muted`, `pastel`, `bright`, `dark`, `colorblind`) and the circular `hls` /
  `husl` spaces.

The color the page hands you is the color matplotlib would: colormaps are
sampled from each map's own 256-entry table with matplotlib's own indexing, so
`viridis` split into 5 gives exactly `mpl.colormaps["viridis"](np.linspace(0, 1, 5))`.

## Publishing on GitHub Pages

The built page lives in [`docs/`](docs/) and is committed, so there is no build
step to run on push. In the repository settings: **Pages → Build and deployment
→ Source: Deploy from a branch → Branch: `main`, folder: `/docs`**.

## Developing

```bash
npm install
npm run dev     # esbuild watch + a local server on http://localhost:8000
npm run build   # rebuild docs/app.js (commit it — Pages serves it directly)
```

Source lives in [`src/`](src/); `docs/index.html` and `docs/styles.css` are
hand-written, `docs/app.js` is the bundle.

## Regenerating the palette data

[`src/data/palettes.json`](src/data/palettes.json) is generated from whatever
matplotlib and seaborn are installed locally (currently 3.10.8 / 0.13.2). After
upgrading either one:

```bash
python tools/gen_palettes.py && npm run build
```
