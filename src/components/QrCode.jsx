import { useMemo } from 'react'

/**
 * Renders a deterministic QR-style module grid.
 * Demo visual only — it is generated from the lot id, not a real QR payload.
 */
export default function QrCode({ matrix, size = 190, label }) {
  const cells = useMemo(() => {
    if (!matrix) return []
    return matrix.flatMap((row, y) => row.map((on, x) => ({ on, key: `${x}-${y}` })))
  }, [matrix])

  if (!matrix) return null
  const n = matrix.length

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <div className="qr-box" style={{ width: size, padding: 12 }}>
        <div
          className="qr-grid"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: '100%' }}
        >
          {cells.map((c) => (
            <div key={c.key} className={`qr-cell ${c.on ? 'on' : 'off'}`} />
          ))}
        </div>
      </div>
      {label && (
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 10.5, textAlign: 'center' }}>
          {label}
        </div>
      )}
    </div>
  )
}
