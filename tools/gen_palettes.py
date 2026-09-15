"""Dump every matplotlib + seaborn palette this environment knows about to JSON.

Run it whenever matplotlib or seaborn is upgraded:

    python tools/gen_palettes.py && npm run build

Continuous colormaps are stored as their own internal lookup table (cmap.N
entries, usually 256), flattened into one hex string with no separators to keep
the payload small — sampling that table by index is exactly what matplotlib does
internally, so the page reproduces its colors bit for bit. Qualitative colormaps
keep their own list of colors instead.
"""

import json
from pathlib import Path

import matplotlib as mpl
from matplotlib.colors import ListedColormap

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "palettes.json"

CATEGORIES = {
    "Perceptually uniform": "viridis plasma inferno magma cividis",
    "Sequential": (
        "Greys Purples Blues Greens Oranges Reds YlOrBr YlOrRd OrRd PuRd RdPu "
        "BuPu GnBu PuBu YlGnBu PuBuGn BuGn YlGn"
    ),
    "Sequential (2)": (
        "binary gist_yarg gist_gray gray bone pink spring summer autumn winter "
        "cool Wistia hot afmhot gist_heat copper"
    ),
    "Diverging": (
        "PiYG PRGn BrBG PuOr RdGy RdBu RdYlBu RdYlGn Spectral coolwarm bwr "
        "seismic berlin managua vanimo"
    ),
    "Cyclic": "twilight twilight_shifted hsv",
    "Qualitative": (
        "Pastel1 Pastel2 Paired Accent Dark2 Set1 Set2 Set3 tab10 tab20 tab20b tab20c"
    ),
    "Miscellaneous": (
        "flag prism ocean gist_earth terrain gist_stern gnuplot gnuplot2 CMRmap "
        "cubehelix brg gist_rainbow rainbow jet turbo nipy_spectral gist_ncar"
    ),
}
CATEGORY_OF = {
    name: cat for cat, names in CATEGORIES.items() for name in names.split()
}
CATEGORY_ORDER = list(CATEGORIES) + ["Other"]


def hex_of(rgba):
    r, g, b = (int(round(c * 255)) for c in rgba[:3])
    return f"{r:02x}{g:02x}{b:02x}"


def describe(name, cmap, source):
    """A colormap entry: discrete colors for qualitative maps, a LUT otherwise."""
    qualitative = isinstance(cmap, ListedColormap) and cmap.N <= 24
    entry = {
        "name": name,
        "source": source,
        "category": CATEGORY_OF.get(name, "Qualitative" if qualitative else "Other"),
    }
    if qualitative:
        entry["kind"] = "qualitative"
        entry["colors"] = ["#" + hex_of(cmap(i)) for i in range(cmap.N)]
    else:
        # Integer arguments index the colormap's own table, so this is its
        # exact internal LUT rather than a resampling of it.
        entry["kind"] = "continuous"
        entry["n"] = cmap.N
        entry["lut"] = "".join(hex_of(cmap(i)) for i in range(cmap.N))
    return entry


# Snapshot matplotlib's registry before seaborn adds rocket/mako/flare/crest/...
mpl_names = {n for n in mpl.colormaps if not n.endswith("_r")}

import seaborn as sns  # noqa: E402  (must come after the snapshot)

sns_names = {n for n in mpl.colormaps if not n.endswith("_r")} - mpl_names

colormaps = [describe(n, mpl.colormaps[n], "matplotlib") for n in sorted(mpl_names)]
colormaps += [describe(n, mpl.colormaps[n], "seaborn") for n in sorted(sns_names)]

# Seaborn's own qualitative palettes have no colormap registration.
for name in ["deep", "muted", "pastel", "bright", "dark", "colorblind"]:
    colormaps.append(
        {
            "name": name,
            "source": "seaborn",
            "category": "Qualitative",
            "kind": "qualitative",
            "colors": [mpl.colors.to_hex(c) for c in sns.color_palette(name, 10)],
        }
    )

# ...and its circular hls / husl spaces, which are continuous.
for name in ["hls", "husl"]:
    colors = sns.color_palette(name, 256)
    colormaps.append(
        {
            "name": name,
            "source": "seaborn",
            "category": "Cyclic",
            "kind": "continuous",
            "n": 256,
            "lut": "".join(hex_of(c) for c in colors),
        }
    )

# Same ordering and column counts as matplotlib's "List of named colors"
# gallery example: base and tableau keep dict order, CSS4 is sorted by HSV, and
# every table is filled column by column.
def hsv_key(item):
    return tuple(mpl.colors.rgb_to_hsv(mpl.colors.to_rgb(item[1])))


named = [
    {"name": "Base", "columns": 3, "colors": [
        {"name": k, "hex": mpl.colors.to_hex(v)}
        for k, v in mpl.colors.BASE_COLORS.items()
    ]},
    {"name": "Tableau", "columns": 2, "colors": [
        {"name": k, "hex": v.lower()} for k, v in mpl.colors.TABLEAU_COLORS.items()
    ]},
    {"name": "CSS4", "columns": 4, "colors": [
        {"name": k, "hex": v.lower()}
        for k, v in sorted(mpl.colors.CSS4_COLORS.items(), key=hsv_key)
    ]},
]

payload = {
    "versions": {"matplotlib": mpl.__version__, "seaborn": sns.__version__},
    "categoryOrder": CATEGORY_ORDER,
    "named": named,
    "colormaps": colormaps,
}

OUT.write_text(json.dumps(payload, separators=(",", ":")))
counts = {}
for c in colormaps:
    counts[c["source"]] = counts.get(c["source"], 0) + 1
print(f"{OUT}  {OUT.stat().st_size / 1024:.0f} kB")
print(f"matplotlib {counts.get('matplotlib', 0)}  seaborn {counts.get('seaborn', 0)}"
      f"  named {sum(len(g['colors']) for g in named)}")
