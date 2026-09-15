import tinycolor from 'tinycolor2'

// react-color hands back { hex, rgb, hsl, hsv, ... } on every change; we keep a
// color in that same shape so it can be fed straight back into any picker.
export const toColor = (input) => {
  const tc = tinycolor(input)
  return { hex: tc.toHexString(), rgb: tc.toRgb(), hsl: tc.toHsl(), hsv: tc.toHsv() }
}

export const round = (n) => Math.round(n * 100) / 100

export const rgbString = ({ r, g, b, a }) =>
  a === undefined || a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${round(a)})`

export const hslString = ({ h, s, l, a }) => {
  const parts = `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
  return a === undefined || a >= 1 ? `hsl(${parts})` : `hsla(${parts}, ${round(a)})`
}

export const cssColor = (color) => rgbString(color.rgb)

export const copyText = (value) => {
  if (navigator.clipboard) return navigator.clipboard.writeText(value).catch(() => {})
  const el = document.createElement('textarea')
  el.value = value
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}
