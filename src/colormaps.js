import data from './data/palettes.json'

export const { versions, categoryOrder, named } = data

export const COLORMAPS = data.colormaps
export const MPL_COLORMAPS = COLORMAPS.filter((c) => c.source === 'matplotlib')
export const SNS_COLORMAPS = COLORMAPS.filter((c) => c.source === 'seaborn')

export const byName = (source, name) =>
  COLORMAPS.find((c) => c.source === source && c.name === name)

// Continuous maps ship as one flat hex string of cmap.n entries.
const lutAt = (cmap, i) => '#' + cmap.lut.slice(i * 6, i * 6 + 6)

/** Color at position t (0..1) along a colormap, honouring `reversed`. */
export const sampleAt = (cmap, t, reversed = false) => {
  const u = Math.min(1, Math.max(0, reversed ? 1 - t : t))
  if (cmap.kind === 'qualitative') {
    const n = cmap.colors.length
    return cmap.colors[Math.min(n - 1, Math.floor(u * n))]
  }
  // matplotlib maps x in [0, 1] onto its table with floor(x * N), clamped.
  return lutAt(cmap, Math.min(cmap.n - 1, Math.floor(u * cmap.n)))
}

/**
 * Split a colormap into n colors the way matplotlib does it —
 * `cmap(np.linspace(0, 1, n))` — i.e. endpoints included.
 * Qualitative maps just hand back their own colors.
 */
export const discretize = (cmap, n, reversed = false) => {
  if (cmap.kind === 'qualitative') {
    const colors = cmap.colors.slice(0, Math.min(n, cmap.colors.length))
    return reversed ? [...colors].reverse() : colors
  }
  if (n === 1) return [sampleAt(cmap, 0.5, reversed)]
  return Array.from({ length: n }, (_, i) => sampleAt(cmap, i / (n - 1), reversed))
}

/** A CSS gradient for previews — cheap 17-stop approximation of the LUT. */
export const gradientCss = (cmap, reversed = false) => {
  if (cmap.kind === 'qualitative') {
    const colors = reversed ? [...cmap.colors].reverse() : cmap.colors
    const n = colors.length
    const stops = colors
      .map((c, i) => `${c} ${(i / n) * 100}%, ${c} ${((i + 1) / n) * 100}%`)
      .join(', ')
    return `linear-gradient(to right, ${stops})`
  }
  const steps = 16
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    return `${sampleAt(cmap, t, reversed)} ${t * 100}%`
  })
  return `linear-gradient(to right, ${stops.join(', ')})`
}

/** Hard-edged gradient for the n-color discrete view. */
export const blocksCss = (colors) => {
  const n = colors.length
  const stops = colors
    .map((c, i) => `${c} ${(i / n) * 100}%, ${c} ${((i + 1) / n) * 100}%`)
    .join(', ')
  return `linear-gradient(to right, ${stops})`
}

/** How many distinct colors a continuous map actually holds. */
export const lutSteps = (cmap) => (cmap.kind === 'qualitative' ? cmap.colors.length : cmap.n)

export const maxSteps = (cmap) => (cmap.kind === 'qualitative' ? cmap.colors.length : 24)
