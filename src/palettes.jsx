import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  MPL_COLORMAPS,
  SNS_COLORMAPS,
  named,
  versions,
  categoryOrder,
  sampleAt,
  discretize,
  gradientCss,
  blocksCss,
  maxSteps,
  lutSteps,
} from './colormaps.js'
import { copyText } from './color.js'

function CopyButton({ label, value, title }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn--sm"
      title={title || value}
      onClick={() => {
        copyText(value).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        })
      }}
    >
      {done ? 'Copied' : label}
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * 1. matplotlib's fixed named colors
 * ------------------------------------------------------------------ */

/**
 * matplotlib's named-colors table is filled column by column, so the reading
 * order is top-to-bottom then left-to-right. Rows have to be counted in JS
 * because the column count depends on how wide the panel is.
 */
function useColumns(preferred) {
  const ref = useRef(null)
  const [cols, setCols] = useState(preferred)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = () =>
      setCols(Math.max(1, Math.min(preferred, Math.floor(el.clientWidth / 185))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [preferred])

  return [ref, cols]
}

function NamedColors({ onPick }) {
  const [group, setGroup] = useState('Tableau')
  const [query, setQuery] = useState('')
  const active = named.find((g) => g.name === group)
  const [gridRef, cols] = useColumns(active.columns || 4)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return active.colors
    return active.colors.filter(
      (c) => c.name.toLowerCase().includes(q) || c.hex.includes(q)
    )
  }, [active, query])

  return (
    <div className="pal">
      <div className="pal__bar">
        <div className="chips">
          {named.map((g) => (
            <button
              key={g.name}
              type="button"
              className={`chip${g.name === group ? ' is-on' : ''}`}
              onClick={() => {
                setGroup(g.name)
                setQuery('')
              }}
            >
              {g.name} <span className="chip__count">{g.colors.length}</span>
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder={`Filter ${active.name} colors…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        className="named"
        ref={gridRef}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${Math.ceil(shown.length / cols)}, auto)`,
        }}
      >
        {shown.map((c) => (
          <button
            key={c.name}
            type="button"
            className="named__item"
            title={`${c.name} · ${c.hex}`}
            onClick={() => onPick(c.hex)}
          >
            <span className="named__swatch" style={{ background: c.hex }} />
            <span className="named__name">{c.name}</span>
          </button>
        ))}
        {shown.length === 0 && <p className="empty">No color matches “{query}”.</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 2 & 3. colormap explorer — sweep, discretise, sweep the bins
 * ------------------------------------------------------------------ */

const colorOf = (cmap, ui) =>
  ui.discrete
    ? discretize(cmap, ui.steps, ui.reversed)[Math.min(ui.bin, ui.steps - 1)]
    : sampleAt(cmap, ui.pos, ui.reversed)

function pythonSnippet(cmap, ui) {
  const n = ui.steps
  if (cmap.source === 'seaborn') {
    if (cmap.kind === 'qualitative') return `sns.color_palette("${cmap.name}", ${n})`
    return `sns.color_palette("${cmap.name}${ui.reversed ? '_r' : ''}", ${n})`
  }
  const name = `${cmap.name}${ui.reversed ? '_r' : ''}`
  if (!ui.discrete) return `mpl.colormaps["${name}"]`
  return `mpl.colormaps["${name}"](np.linspace(0, 1, ${n}))`
}

function ColormapExplorer({ maps, intro, preferred, onPick }) {
  const [ui, setUi] = useState(() => {
    const first = maps.find((m) => m.name === preferred) || maps[0]
    return {
      name: first.name,
      reversed: false,
      discrete: first.kind === 'qualitative',
      steps: first.kind === 'qualitative' ? first.colors.length : 8,
      pos: 0.5,
      bin: 0,
    }
  })
  const [query, setQuery] = useState('')

  const cmap = maps.find((c) => c.name === ui.name) || maps[0]

  const update = (patch) => {
    const next = { ...ui, ...patch }
    const target = maps.find((c) => c.name === next.name) || cmap
    const cap = maxSteps(target)
    next.steps = Math.max(1, Math.min(cap, next.steps))
    next.bin = Math.max(0, Math.min(next.steps - 1, next.bin))
    setUi(next)
    onPick(colorOf(target, next))
  }

  const selectMap = (m) =>
    update({
      name: m.name,
      discrete: m.kind === 'qualitative' ? true : ui.discrete,
      steps: m.kind === 'qualitative' ? m.colors.length : ui.steps,
    })

  const swatches = discretize(cmap, ui.steps, ui.reversed)
  const current = colorOf(cmap, ui)
  const handlePct = ui.discrete
    ? ((ui.bin + 0.5) / ui.steps) * 100
    : ui.pos * 100

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hits = q ? maps.filter((m) => m.name.toLowerCase().includes(q)) : maps
    return categoryOrder
      .map((cat) => ({ cat, items: hits.filter((m) => m.category === cat) }))
      .filter((g) => g.items.length)
  }, [maps, query])

  return (
    <div className="pal">
      {intro && <p className="pal__intro">{intro}</p>}
      <div className="cmap">
        <div className="cmap__list">
          <input
            className="search"
            placeholder={`Search ${maps.length} colormaps…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="cmap__scroll">
            {groups.map((g) => (
              <div key={g.cat} className="cmap__group">
                <h4>{g.cat}</h4>
                {g.items.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    className={`cmap__row${m.name === cmap.name ? ' is-on' : ''}`}
                    onClick={() => selectMap(m)}
                  >
                    <span className="cmap__name">{m.name}</span>
                    <span
                      className="cmap__strip"
                      style={{ backgroundImage: gradientCss(m) }}
                    />
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && <p className="empty">Nothing matches “{query}”.</p>}
          </div>
        </div>

        <div className="cmap__detail">
          <div className="cmap__head">
            <h3>
              {cmap.name}
              {ui.reversed ? '_r' : ''}
            </h3>
            <span className="cmap__meta">
              {cmap.category} ·{' '}
              {cmap.kind === 'qualitative'
                ? `${cmap.colors.length} colors`
                : 'continuous'}
            </span>
          </div>

          <div className="sweep">
            <div
              className="sweep__bar"
              style={{
                backgroundImage: ui.discrete
                  ? blocksCss(swatches)
                  : gradientCss(cmap, ui.reversed),
              }}
            />
            <div
              className="sweep__handle"
              style={{ left: `${handlePct}%`, background: current }}
              aria-hidden="true"
            />
            {ui.discrete ? (
              <input
                className="sweep__input"
                type="range"
                min={0}
                max={Math.max(0, ui.steps - 1)}
                step={1}
                value={ui.bin}
                aria-label="Sweep across the discrete colors"
                onChange={(e) => update({ bin: Number(e.target.value) })}
              />
            ) : (
              // One slider step per entry in the colormap's own table, so the
              // arrow keys always move to a genuinely different color.
              <input
                className="sweep__input"
                type="range"
                min={0}
                max={lutSteps(cmap) - 1}
                step={1}
                value={Math.round(ui.pos * (lutSteps(cmap) - 1))}
                aria-label="Sweep across the colormap"
                onChange={(e) =>
                  update({ pos: Number(e.target.value) / (lutSteps(cmap) - 1) })
                }
              />
            )}
          </div>

          <div className="sweep__readout">
            <span className="sweep__chip" style={{ background: current }} />
            <code>{current.toUpperCase()}</code>
            <span className="sweep__pos">
              {ui.discrete
                ? `color ${ui.bin + 1} of ${ui.steps}`
                : `position ${ui.pos.toFixed(3)}`}
            </span>
          </div>

          <div className="cmap__controls">
            <label className="check">
              <input
                type="checkbox"
                checked={ui.reversed}
                onChange={(e) => update({ reversed: e.target.checked })}
              />
              Reversed <code>_r</code>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={ui.discrete}
                disabled={cmap.kind === 'qualitative'}
                onChange={(e) => update({ discrete: e.target.checked })}
              />
              Discrete
            </label>

            <div className={`stepper${ui.discrete ? '' : ' is-off'}`}>
              <button type="button" onClick={() => update({ steps: ui.steps - 1 })}>
                −
              </button>
              <input
                type="number"
                min={1}
                max={maxSteps(cmap)}
                value={ui.steps}
                aria-label="Number of discrete colors"
                onChange={(e) => update({ steps: Number(e.target.value) || 1 })}
              />
              <button type="button" onClick={() => update({ steps: ui.steps + 1 })}>
                +
              </button>
            </div>

            <CopyButton
              label="Copy hex"
              value={JSON.stringify(swatches.map((c) => c.toUpperCase()))}
              title="Copy the discrete colors as a list"
            />
            <CopyButton label="Copy Python" value={pythonSnippet(cmap, ui)} />
          </div>

          <div className="cmap__swatches">
            {swatches.map((hex, i) => (
              <button
                key={`${hex}-${i}`}
                type="button"
                className={`cmap__swatch${ui.discrete && i === ui.bin ? ' is-on' : ''}`}
                style={{ background: hex }}
                title={hex.toUpperCase()}
                onClick={() => update({ discrete: true, bin: i })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'named', label: 'matplotlib colors' },
  { id: 'mpl', label: 'matplotlib colormaps' },
  { id: 'sns', label: 'seaborn palettes' },
]

export default function Palettes({ onPick }) {
  const [tab, setTab] = useState('named')

  return (
    <section className="panel">
      <div className="panel__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="panel__versions">
          matplotlib {versions.matplotlib} · seaborn {versions.seaborn}
        </span>
      </div>

      {tab === 'named' && <NamedColors onPick={onPick} />}
      {tab === 'mpl' && (
        <ColormapExplorer
          key="mpl"
          maps={MPL_COLORMAPS}
          preferred="viridis"
          onPick={onPick}
          intro="Every colormap matplotlib ships. Drag the handle to sweep — the pickers below follow."
        />
      )}
      {tab === 'sns' && (
        <ColormapExplorer
          key="sns"
          maps={SNS_COLORMAPS}
          preferred="rocket"
          onPick={onPick}
          intro="Only the palettes seaborn adds on top of matplotlib: its perceptually uniform maps, its qualitative sets, and the circular hls / husl spaces."
        />
      )}
    </section>
  )
}
