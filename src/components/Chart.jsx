import { useLayoutEffect, useRef, useState } from 'react'

/** Track an element's content width so SVG charts can draw in real pixels. */
export function useWidth(initial = 680) {
  const ref = useRef(null)
  const [w, setW] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width))
    ro.observe(el)
    setW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, Math.max(260, w)]
}

const pad = (arr) => {
  const lo = Math.min(...arr)
  const hi = Math.max(...arr)
  const span = hi - lo || 1
  return [lo - span * 0.18, hi + span * 0.18]
}

/**
 * Price chart: solid history line + dashed forecast with a widening band.
 * history/forecast: [{ date, price, low?, high? }]
 */
export default function PriceChart({ history, forecast, height = 208, accent = 'var(--money)' }) {
  const [ref, width] = useWidth()
  const all = [...history.map((d) => d.price), ...forecast.map((d) => d.price)]
  const lows = forecast.map((d) => d.low ?? d.price)
  const highs = forecast.map((d) => d.high ?? d.price)
  const [min, max] = pad([...all, ...lows, ...highs])

  const P = { l: 46, r: 14, t: 16, b: 26 }
  const iw = width - P.l - P.r
  const ih = height - P.t - P.b
  const n = history.length + forecast.length - 1
  const X = (i) => P.l + (i / Math.max(1, n)) * iw
  const Y = (v) => P.t + ih - ((v - min) / (max - min)) * ih

  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')

  const histPts = history.map((d, i) => ({ i, v: d.price }))
  const fcPts = forecast.map((d, j) => ({ i: history.length - 1 + j, v: d.price }))
  const bandTop = forecast.map((d, j) => ({ i: history.length - 1 + j, v: d.high ?? d.price }))
  const bandBot = forecast.map((d, j) => ({ i: history.length - 1 + j, v: d.low ?? d.price }))
  const bandPath =
    line(bandTop) +
    ' ' +
    [...bandBot].reverse().map((p) => `L${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ') +
    ' Z'

  const ticks = 4
  const gridVals = Array.from({ length: ticks + 1 }, (_, k) => min + ((max - min) * k) / ticks)
  const splitX = X(history.length - 1)
  const fcEnd = fcPts[fcPts.length - 1]

  const labelEvery = Math.ceil((history.length + forecast.length) / (width < 420 ? 4 : 6))

  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={height} role="img" aria-label="Price history and forecast chart">
        <defs>
          <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridVals.map((v, k) => (
          <g key={k}>
            <line className="chart-grid" x1={P.l} x2={width - P.r} y1={Y(v)} y2={Y(v)} strokeWidth="1" />
            <text className="chart-label mono" x={P.l - 8} y={Y(v) + 3.5} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* forecast band */}
        <path d={bandPath} fill={accent} opacity="0.14" />
        {/* history area */}
        <path d={`${line(histPts)} L${X(history.length - 1)},${P.t + ih} L${X(0)},${P.t + ih} Z`} fill="url(#histFill)" />

        {/* today divider */}
        <line className="chart-today" x1={splitX} x2={splitX} y1={P.t - 4} y2={P.t + ih} strokeDasharray="3 3" strokeWidth="1" />
        <text className="chart-today-label" x={splitX + 4} y={P.t + 6}>
          TODAY
        </text>

        <path d={line(histPts)} fill="none" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(fcPts)} fill="none" stroke={accent} strokeWidth="2.4" strokeDasharray="5 4" opacity="0.85" strokeLinecap="round" />
        <circle cx={X(0)} cy={Y(histPts[0].v)} r="2.6" fill={accent} />
        <circle className="chart-dot-ring" cx={fcEnd ? X(fcEnd.i) : splitX} cy={fcEnd ? Y(fcEnd.v) : 0} r="3.6" fill={accent} strokeWidth="1.6" />

        {/* x labels */}
        {[...history, ...forecast].map((d, i) =>
          i % labelEvery === 0 || i === history.length + forecast.length - 1 ? (
            <text className="chart-label" key={d.date + i} x={X(i)} y={height - 8} textAnchor="middle">
              {d.date.slice(5).replace('-', '/')}
            </text>
          ) : null
        )}
      </svg>
    </div>
  )
}

/** Tiny trend line for cards. */
export function Spark({ values, width = 74, height = 24, tone = 'var(--mist)' }) {
  if (!values || values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={tone} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
