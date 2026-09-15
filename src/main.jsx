import React, { useCallback, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import tinycolor from 'tinycolor2'
import { PICKERS } from './pickers.jsx'
import Palettes from './palettes.jsx'
import { toColor, rgbString, hslString, cssColor, copyText } from './color.js'

const START = '#2E7D9A'

function Copyable({ label, value }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  const copy = () =>
    copyText(value).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1200)
    })

  return (
    <button type="button" className="copyable" onClick={copy} title={`Copy ${value}`}>
      <span className="copyable__label">{label}</span>
      <span className="copyable__value">{value}</span>
      <span className={`copyable__hint${copied ? ' is-copied' : ''}`}>
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  )
}

function HexField({ color, onCommit }) {
  const [draft, setDraft] = useState(null)
  const shown = draft === null ? color.hex.replace('#', '').toUpperCase() : draft

  const commit = (raw) => {
    const tc = tinycolor(raw)
    if (tc.isValid()) onCommit(toColor({ ...tc.toRgb(), a: color.rgb.a }))
    setDraft(null)
  }

  return (
    <label className="hexfield">
      <span className="hexfield__hash">#</span>
      <input
        value={shown}
        spellCheck={false}
        aria-label="Hex value"
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 8)
          setDraft(next)
          const tc = tinycolor(`#${next}`)
          if ((next.length === 3 || next.length === 6) && tc.isValid()) {
            onCommit(toColor({ ...tc.toRgb(), a: color.rgb.a }))
          }
        }}
        onBlur={(e) => commit(`#${e.target.value}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setDraft(null)
        }}
      />
    </label>
  )
}

function Ramp({ color, onPick }) {
  const steps = useMemo(() => {
    const { h, s } = tinycolor(color.rgb).toHsl()
    return [0.92, 0.8, 0.66, 0.52, 0.4, 0.28, 0.16].map((l) =>
      tinycolor({ h, s, l }).toHexString()
    )
  }, [color.hex])

  return (
    <div className="ramp" role="group" aria-label="Tints and shades">
      {steps.map((hex) => (
        <button
          key={hex}
          type="button"
          className="ramp__step"
          style={{ background: hex }}
          title={hex.toUpperCase()}
          onClick={() => onPick(toColor(hex))}
        />
      ))}
    </div>
  )
}

function PickerCard({ spec, color, synced, onChange, onApply, onRevert }) {
  const { Component, props } = spec
  const extra = typeof props === 'function' ? props({ apply: onApply, revert: onRevert }) : props

  return (
    <section className={`card${spec.full ? ' card--full' : ''}${spec.wide ? ' card--wide' : ''}`}>
      <header className="card__head" title={spec.blurb}>
        <h2>{spec.name}</h2>
        {!synced && (
          <button type="button" className="card__apply" onClick={onApply}>
            apply to all
          </button>
        )}
      </header>
      <div className="card__picker">
        <Component color={color.rgb} onChange={onChange} {...extra} />
      </div>
    </section>
  )
}

function App() {
  const [color, setColor] = useState(() => toColor(START))
  const [synced, setSynced] = useState(true)
  const [local, setLocal] = useState({})
  const [history, setHistory] = useState([START.toUpperCase()])

  const setGlobal = useCallback((next) => {
    setColor(next)
    const hex = next.hex.toUpperCase()
    setHistory((prev) => [hex, ...prev.filter((h) => h !== hex)].slice(0, 16))
  }, [])

  const pickHex = useCallback((hex) => setGlobal(toColor(hex)), [setGlobal])

  const handleChange = useCallback(
    (id, next) => {
      if (synced) setGlobal(next)
      else setLocal((prev) => ({ ...prev, [id]: next }))
    },
    [synced, setGlobal]
  )

  const colorFor = (id) => (synced ? color : local[id] || color)

  const toggleSync = () => {
    // Turning sync back on pulls every card onto the shared color.
    if (!synced) setLocal({})
    setSynced((s) => !s)
  }

  const contrastWhite = tinycolor.readability(color.rgb, '#ffffff')
  const contrastBlack = tinycolor.readability(color.rgb, '#111111')
  const onLight = contrastBlack >= contrastWhite

  return (
    <React.Fragment>
      <header className="masthead">
        <div className="masthead__inner">
          <div className="masthead__title">
            <h1>Color pickers</h1>
            <p>
              Every picker from <code>react-color</code>, plus the matplotlib and seaborn
              palettes. Drag anything — the rest follow.
            </p>
          </div>
          <div className="masthead__actions">
            <label className="switch">
              <input type="checkbox" checked={synced} onChange={toggleSync} />
              <span className="switch__track" aria-hidden="true">
                <span className="switch__knob" />
              </span>
              <span className="switch__text">Sync all pickers</span>
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => setGlobal(toColor(tinycolor.random().toHexString()))}
            >
              Random
            </button>
            <button type="button" className="btn" onClick={() => setGlobal(toColor(START))}>
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="summary" style={{ '--picked': cssColor(color) }}>
        <div className="summary__inner">
          <div className="summary__chip" style={{ background: cssColor(color) }}>
            <span style={{ color: onLight ? '#111' : '#fff' }}>{color.hex.toUpperCase()}</span>
          </div>
          <div className="summary__values">
            <HexField color={color} onCommit={setGlobal} />
            <Copyable label="RGB" value={rgbString(color.rgb)} />
            <Copyable label="HSL" value={hslString(color.hsl)} />
            <span className="summary__contrast" title="WCAG contrast ratio">
              <b>{contrastWhite.toFixed(1)}:1</b> on white · <b>{contrastBlack.toFixed(1)}:1</b> on
              black
            </span>
          </div>
          <Ramp color={color} onPick={setGlobal} />
        </div>
        {history.length > 1 && (
          <div className="summary__history">
            <span>Recent</span>
            {history.map((hex) => (
              <button
                key={hex}
                type="button"
                className="history__swatch"
                style={{ background: hex }}
                title={hex}
                onClick={() => pickHex(hex)}
              />
            ))}
          </div>
        )}
      </div>

      <main className="page">
        <Palettes onPick={pickHex} />

        <div className="grid">
          {PICKERS.map((spec) => (
            <PickerCard
              key={spec.id}
              spec={spec}
              synced={synced}
              color={colorFor(spec.id)}
              onChange={(next) => handleChange(spec.id, next)}
              onApply={() => setGlobal(colorFor(spec.id))}
              onRevert={() => setLocal((prev) => ({ ...prev, [spec.id]: color }))}
            />
          ))}
        </div>
      </main>

      <footer className="footer">
        Pickers by <a href="https://github.com/casesandberg/react-color">react-color</a>. Palette
        data generated from matplotlib and seaborn.
      </footer>
    </React.Fragment>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
