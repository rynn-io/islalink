/* Shared primitives — Card, Stat, Pill, Bar, Tag, Toolbar. */

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardHead({ title, sub, right }) {
  return (
    <div className="card-head">
      <div>
        <h3 className="card-title">{title}</h3>
        {sub && <p className="card-sub">{sub}</p>}
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  )
}

export function Stat({ k, v, d, tone }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className="stat-v">{v}</div>
      {d && <div className={`stat-d ${tone || ''}`}>{d}</div>}
    </div>
  )
}

export function Pill({ children, tone = '', title }) {
  return (
    <span className={`pill ${tone}`} title={title}>
      {children}
    </span>
  )
}

/** tone: '' (neutral) | 'money' | 'alert' — the only two meaning colours. */
export function Bar({ value, max = 100, tone = '' }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={tone ? `bar bar-${tone}` : 'bar'}>
      <i style={{ width: `${w}%` }} />
    </div>
  )
}

export function Tag({ grade, children }) {
  const cls = grade === 'A' ? 'a' : grade === 'B' ? 'b' : grade === 'C' ? 'c' : 'n'
  return <span className={`tag ${cls}`}>{children}</span>
}

export function Chips({ items, value, onChange }) {
  return (
    <div className="toolbar">
      {items.map((it) => {
        const id = it.id ?? it
        const label = it.label ?? it
        return (
          <button
            key={id}
            className={`chip ${value === id ? 'on' : ''}`}
            onClick={() => onChange(id)}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Empty({ children }) {
  return <p style={{ color: 'var(--muted)', fontSize: 12.5, padding: '18px 0' }}>{children}</p>
}
