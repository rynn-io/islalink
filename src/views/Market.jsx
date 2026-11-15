import { useMemo, useState } from 'react'
import { SPECIES } from '../lib/forecast'
import { speciesByLocal, portOf } from '../data/market'
import { NOW, peso, phtTime, relHours, hoursBetween } from '../lib/format'
import { Card, CardHead, Stat, Chips, Tag, Empty } from '../components/ui'
import { Spark } from '../components/Chart'
import { IconSearch, IconPin, IconPlus, IconQr, IconCheck, IconClock } from '../components/Icons'

const freshness = (landedAt) => {
  const h = hoursBetween(landedAt, NOW)
  if (h <= 6) return { label: 'Just landed', grade: 'A', tone: 'good' }
  if (h <= 14) return { label: `${Math.round(h)}h on ice`, grade: 'B', tone: 'warn' }
  return { label: `${Math.round(h)}h — sell today`, grade: 'C', tone: 'bad' }
}

function CatchCard({ listing, onOrder, onTrace, role }) {
  const sp = speciesByLocal(listing.species)
  const port = portOf(listing.portId)
  const f = freshness(listing.landedAt)
  const up = listing.trendPct >= 0

  return (
    <article className="catch">
      <div className="catch-media">
        <span aria-hidden="true">{sp.emoji}</span>
        <span className="catch-badge">{f.grade === 'A' ? 'FRESH' : f.grade === 'B' ? 'ICE' : 'SELL TODAY'}</span>
        <span className="catch-fresh">{relHours(listing.landedAt)}</span>
      </div>
      <div className="catch-body">
        <div>
          <div className="catch-name">
            {sp.local} {listing.verified && <span title="Verified lot" style={{ color: 'var(--aqua)', fontSize: 11 }}>✓</span>}
          </div>
          <div className="catch-local">
            {sp.name} · {listing.fisher}
          </div>
        </div>

        <div className="catch-price">
          {peso(listing.price)}
          <span> /kg</span>{' '}
          <span style={{ color: up ? 'var(--aqua)' : 'var(--coral)', fontWeight: 700 }}>
            {up ? '▲' : '▼'} {Math.abs(listing.trendPct).toFixed(1)}%
          </span>
        </div>

        <div className="catch-meta">
          <span>
            <b>{listing.qtyKg}</b> kg
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <IconPin size={12} /> {port.name.replace(' Complex', '')}
          </span>
        </div>

        <div className="catch-foot">
          {role === 'buyer' ? (
            <>
              <button className="btn primary sm" style={{ flex: 1 }} onClick={() => onOrder(listing)}>
                Order
              </button>
              <button className="btn ghost sm" onClick={() => onTrace(listing)} title="View traceability">
                <IconQr size={14} />
              </button>
            </>
          ) : (
            <>
              <span className={`tag ${f.grade === 'A' ? 'a' : f.grade === 'B' ? 'b' : 'c'}`}>{f.label}</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => onTrace(listing)}>
                Lot
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

function OrderSheet({ listing, onClose, onConfirm }) {
  const sp = speciesByLocal(listing.species)
  const [qty, setQty] = useState(Math.min(20, listing.qtyKg))
  const [cold, setCold] = useState(true)
  const total = qty * listing.price
  const delivery = cold ? 180 + Math.round(qty * 3.2) : 90
  const fee = Math.round(total * 0.03)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fadein" onClick={(e) => e.stopPropagation()}>
        <CardHead
          title={`Order ${sp.local}`}
          sub={`${listing.fisher} · ${portOf(listing.portId).name} · ${peso(listing.price)}/kg`}
        />
        <div className="field">
          <label>Quantity (available {listing.qtyKg} kg)</label>
          <input
            type="range"
            min="5"
            max={listing.qtyKg}
            step="5"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{ accentColor: 'var(--aqua)' }}
          />
          <div style={{ fontWeight: 700, fontSize: 18 }}>{qty} kg</div>
        </div>

        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: 11,
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'rgba(0,0,0,.22)',
            marginBottom: 13,
            cursor: 'pointer',
            fontSize: 12.5,
          }}
        >
          <input type="checkbox" checked={cold} onChange={(e) => setCold(e.target.checked)} style={{ accentColor: 'var(--aqua)' }} />
          <span>
            Cold-chain delivery <span style={{ color: 'var(--muted)' }}>— reefer van + ice, {peso(delivery)}</span>
          </span>
        </label>

        <div className="row">
          <span className="grow">Catch subtotal</span>
          <span className="r">{peso(total)}</span>
        </div>
        <div className="row">
          <span className="grow">Logistics</span>
          <span className="r">{peso(delivery)}</span>
        </div>
        <div className="row">
          <span className="grow">IsdaLink fee (3%)</span>
          <span className="r">{peso(fee)}</span>
        </div>
        <div className="row" style={{ borderBottom: 0, fontSize: 15, fontWeight: 700 }}>
          <span className="grow">Total</span>
          <span className="r" style={{ color: 'var(--aqua)' }}>
            {peso(total + delivery + fee)}
          </span>
        </div>

        <div className="alert good" style={{ marginBottom: 14 }}>
          <IconQr size={15} />
          <span>
            You will get lot <b className="mono">{listing.lotId}</b> with a trace QR — landing time, boat, cold-chain temps, all
            on the label.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost full" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary full" onClick={() => onConfirm(listing, qty, total + delivery + fee)}>
            Place order
          </button>
        </div>
      </div>
    </div>
  )
}

function PostCatchSheet({ onClose, onPost }) {
  const [form, setForm] = useState({ species: SPECIES[0].local, qtyKg: 60, price: SPECIES[0].basePrice, portId: 'dagupan' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const sp = speciesByLocal(form.species)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fadein" onClick={(e) => e.stopPropagation()}>
        <CardHead title="Post a catch" sub="Goes live on the marketplace immediately, with a trace lot attached." />
        <div className="field">
          <label>Species</label>
          <select value={form.species} onChange={set('species')}>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.local}>
                {s.name} · {s.local}
              </option>
            ))}
          </select>
        </div>
        <div className="grid two">
          <div className="field">
            <label>Volume (kg)</label>
            <input type="number" value={form.qtyKg} onChange={set('qtyKg')} min="1" />
          </div>
          <div className="field">
            <label>Price (₱/kg)</label>
            <input type="number" value={form.price} onChange={set('price')} min="1" />
          </div>
        </div>
        <div className="field">
          <label>Landing site</label>
          <select value={form.portId} onChange={set('portId')}>
            <option value="dagupan">Dagupan Landing</option>
            <option value="navotas">Navotas Fish Port</option>
            <option value="batangas">Batangas Bay Landing</option>
            <option value="roxas">Roxas City Port</option>
            <option value="gensan">General Santos Fish Port</option>
          </select>
        </div>
        <div className="alert warn" style={{ marginBottom: 14 }}>
          <IconClock size={15} />
          <span>
            Suggested price today is <b>{peso(sp.basePrice)}/kg</b>. You are listing at{' '}
            <b>{peso(Number(form.price) || 0)}</b>.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost full" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary full" onClick={() => onPost(form)}>
            Post catch
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Market({ role, onRole, listings, orders, onOrder, onAccept, onDecline, onPost, onTrace, toast }) {
  const [species, setSpecies] = useState('all')
  const [q, setQ] = useState('')
  const [sheet, setSheet] = useState(null) // listing | 'post'
  const [placed, setPlaced] = useState([])

  const chips = useMemo(
    () => [
      { id: 'all', label: 'Everything' },
      ...SPECIES.slice(0, 6).map((s) => ({ id: s.local, label: `${s.emoji} ${s.local}` })),
    ],
    []
  )

  const shown = listings.filter((l) => {
    const sp = speciesByLocal(l.species)
    const hitSpecies = species === 'all' || sp.local === species
    const hitQ = !q || `${sp.name} ${sp.local} ${l.fisher} ${portOf(l.portId).name}`.toLowerCase().includes(q.toLowerCase())
    return hitSpecies && hitQ
  })

  const totalKg = shown.reduce((a, l) => a + l.qtyKg, 0)
  const avgPrice = shown.length ? Math.round(shown.reduce((a, l) => a + l.price, 0) / shown.length) : 0

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">{role === 'buyer' ? 'Fresh from the landing' : 'Your catch, your price'}</h1>
          <p className="sub">
            {role === 'buyer'
              ? 'Buy straight from small-scale fishers. Every lot is traceable back to a boat and a landing time.'
              : 'List what you landed today. Buyers see it instantly — no middleman setting your price.'}
          </p>
        </div>
        <div className="topbar-right">
          {onRole && (
            <div className="role-inline" role="group" aria-label="Switch role">
              <button className={`role-btn ${role === 'buyer' ? 'on' : ''}`} onClick={() => onRole('buyer')}>
                Buyer
              </button>
              <button className={`role-btn ${role === 'fisher' ? 'on' : ''}`} onClick={() => onRole('fisher')}>
                Fisher
              </button>
            </div>
          )}
          {role === 'fisher' && (
            <button className="btn primary" onClick={() => setSheet('post')}>
              <IconPlus size={14} style={{ marginRight: 5, verticalAlign: -2 }} /> Post catch
            </button>
          )}
          <span className="pill live">
            <i className="dot pulse" /> {listings.length} lots live
          </span>
        </div>
      </div>

      {role === 'fisher' && (
        <div className="grid three" style={{ marginBottom: 13 }}>
          <Stat k="Orders waiting" v={orders.length} d={orders.length ? 'Respond within 2h' : 'All caught up'} tone={orders.length ? 'up' : ''} />
          <Stat k="On the market" v={`${listings.reduce((a, l) => a + l.qtyKg, 0)} kg`} d={`${listings.length} active lots`} />
          <Stat k="Avg. price today" v={peso(avgPrice)} d="vs ₱189 last Sunday" tone="up" />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr', marginBottom: 15 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search">
            <IconSearch size={15} />
            <input placeholder="Search species, fisher, port…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="pill">
            {shown.length} lots · {totalKg.toLocaleString('en-PH')} kg
          </span>
          <span className="pill">
            avg {peso(avgPrice)}/kg
          </span>
        </div>
      </div>

      <Chips items={chips} value={species} onChange={setSpecies} />

      {shown.length === 0 ? (
        <Empty>No lots match that filter yet.</Empty>
      ) : (
        <div className="catch-grid" style={{ marginBottom: 20 }}>
          {shown.map((l) => (
            <CatchCard key={l.id} listing={l} role={role} onOrder={setSheet} onTrace={onTrace} />
          ))}
        </div>
      )}

      {role === 'fisher' && (
        <Card>
          <CardHead
            title="Incoming orders"
            sub="Accept to lock the lot and schedule pickup. Declining puts the stock back on the market."
            right={<span className="pill">{orders.length} open</span>}
          />
          {orders.length === 0 ? (
            <Empty>No open orders. Buyers get notified the moment you post.</Empty>
          ) : (
            orders.map((o) => (
              <div className="row" key={o.id}>
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>
                    {o.buyer} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {o.type}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                    {o.qtyKg} kg {o.species} at {peso(o.price)}/kg · {phtTime(o.placedAt)} · {o.note}
                  </div>
                </div>
                <span className="r">{peso(o.qtyKg * o.price)}</span>
                <button className="btn sm" onClick={() => onDecline(o)}>
                  Pass
                </button>
                <button className="btn primary sm" onClick={() => onAccept(o)}>
                  Accept
                </button>
              </div>
            ))
          )}
        </Card>
      )}

      {role === 'buyer' && placed.length > 0 && (
        <Card style={{ marginTop: 13 }}>
          <CardHead title="Your orders" sub="Confirmed lots with cold-chain delivery scheduled." />
          {placed.map((p) => (
            <div className="row" key={p.id}>
              <IconCheck size={15} style={{ color: 'var(--aqua)' }} />
              <div className="grow">
                <div style={{ fontWeight: 650 }}>
                  {p.qtyKg} kg {p.species} · {p.fisher}
                </div>
                <div className="mono" style={{ color: 'var(--muted)', marginTop: 2 }}>
                  {p.lotId} · delivering 2–4pm
                </div>
              </div>
              <span className="r">{peso(p.total)}</span>
            </div>
          ))}
        </Card>
      )}

      {sheet && sheet !== 'post' && (
        <OrderSheet
          listing={sheet}
          onClose={() => setSheet(null)}
          onConfirm={(l, qtyKg, total) => {
            const order = { ...l, qtyKg, total, id: `ORD-${3400 + placed.length}` }
            setPlaced((p) => [...p, order])
            onOrder(l, qtyKg)
            setSheet(null)
            toast(`Order placed · ${qtyKg} kg ${speciesByLocal(l.species).local} — trace QR ready`)
          }}
        />
      )}

      {sheet === 'post' && (
        <PostCatchSheet
          onClose={() => setSheet(null)}
          onPost={(form) => {
            onPost(form)
            setSheet(null)
            toast(`${form.qtyKg} kg ${form.species} is live on the marketplace`)
          }}
        />
      )}
    </div>
  )
}
