import { useMemo, useState } from 'react'
import { SPECIES } from '../lib/forecast'
import { makeLot } from '../lib/trace'
import { speciesByLocal, portOf } from '../data/market'
import { NOW, peso, phtTime } from '../lib/format'
import { Card, CardHead, Stat, Chips, Empty } from '../components/ui'
import SpeciesArt from '../components/SpeciesArt'
import { IconSearch, IconPin, IconPlus, IconQr, IconCheck, IconClock, IconTruck, IconAlert } from '../components/Icons'

const ME = 'Nestor Dela Cruz'

/* Reefer van estimates from each landing to Makati (demo figures). */
const ETA_TO_MAKATI = { navotas: '1h 20m', dagupan: '4h 30m', batangas: '2h 50m', roxas: 'next day, air', gensan: 'next day, air' }

/* Honest freshness: same record the Traceability view shows (hours since landing,
   shelf life, cold-chain breaches). No "FRESH" label on a lot that is hours old. */
function freshnessOf(listing) {
  const lot = makeLot({
    species: speciesByLocal(listing.species).local,
    boat: listing.boat,
    fisher: listing.fisher,
    lbs: portOf(listing.portId).name,
    landedAt: listing.landedAt,
    lotId: listing.lotId,
    now: NOW.toISOString(),
  })
  const f = lot.freshness
  const h = f.hoursSinceLanding
  return {
    grade: f.grade,
    score: f.score,
    ago: h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h)}h`,
    left: Math.max(0, Math.round(f.shelfLifeHours - h)),
    breach: lot.coldChain.breach,
  }
}

function Trend({ pct }) {
  const up = pct >= 0
  return (
    <span className={`trend ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function Freshness({ f, plain }) {
  const c = f.grade === 'C' || f.breach ? 'c' : ''
  return (
    <div className="fresh">
      <div className="fresh-top">
        <span className={`grade ${c}`}>Grade {f.grade}</span>
        <span className="num">
          {plain ? 'Caught' : 'Landed'} <b>{f.ago} ago</b>
        </span>
        <span className="num" style={{ marginLeft: 'auto' }}>
          {f.left}h left
        </span>
      </div>
      <div className={`fresh-meter ${c ? 'alerting' : ''}`} title={`Freshness score ${f.score}/100`}>
        <i style={{ width: `${f.score}%` }} />
      </div>
      {f.breach && (
        <div className="fresh-top down">
          <IconAlert size={13} /> Cold-chain spike logged
        </div>
      )}
    </div>
  )
}

function CatchCard({ listing, fresh, role, order, onOrder, onTrace, onSellMine, onAccept }) {
  const sp = speciesByLocal(listing.species)
  const port = portOf(listing.portId).name.replace(' Complex', '')
  const fisher = role === 'fisher'
  const mine = listing.fisher === ME

  return (
    <article className="catch">
      <div className="catch-head">
        <div className="catch-art">
          <SpeciesArt id={sp.id} size={fisher ? 52 : 48} />
        </div>
        <div className="catch-id">
          <div className="catch-name">
            {sp.local}
            {listing.verified && (
              <span className="verified" title="Verified lot">
                <IconCheck size={14} />
              </span>
            )}
          </div>
          <div className="catch-local">
            {fisher ? (mine ? 'Your catch' : `${listing.fisher.split(' ')[0]} · ${port}`) : `${sp.name} · ${listing.fisher}`}
          </div>
        </div>
      </div>

      <div className="catch-price">
        <span className="amount num">{peso(listing.price)}</span>
        <span className="unit">/kg</span>
        <Trend pct={listing.trendPct} />
      </div>

      <Freshness f={fresh} plain={fisher} />

      {fisher ? (
        <div className="catch-volume num">
          {listing.qtyKg}
          <small>kg {mine ? 'left to sell' : 'on sale'}</small>
        </div>
      ) : (
        <div className="catch-meta">
          <span>
            <b className="num">{listing.qtyKg}</b> kg
          </span>
          <span>
            <IconPin size={12} /> {port}
          </span>
          <span>
            <IconTruck size={12} /> {ETA_TO_MAKATI[listing.portId] || '—'}
          </span>
        </div>
      )}

      <div className="catch-foot">
        {!fisher && (
          <>
            <button className="btn solid" style={{ flex: 1 }} onClick={() => onOrder(listing)}>
              Order
            </button>
            <button className="btn icon" onClick={() => onTrace(listing)} title="View traceability" aria-label="View traceability">
              <IconQr size={16} />
            </button>
          </>
        )}
        {fisher && mine && order && (
          <button className="btn primary big full" onClick={() => onAccept(order)}>
            Sell now · {order.qtyKg} kg
          </button>
        )}
        {fisher && mine && !order && (
          <button className="btn big full" onClick={() => onTrace(listing)}>
            <IconQr size={18} /> Show my QR label
          </button>
        )}
        {fisher && !mine && (
          <button className="btn big full" onClick={() => onSellMine(listing)}>
            Sell mine at {peso(listing.price)}
          </button>
        )}
      </div>
    </article>
  )
}

function OrderSheet({ listing, fresh, onClose, onConfirm }) {
  const sp = speciesByLocal(listing.species)
  const [qty, setQty] = useState(Math.min(20, listing.qtyKg))
  const [cold, setCold] = useState(true)
  const total = qty * listing.price
  const delivery = cold ? 180 + Math.round(qty * 3.2) : 90
  const fee = Math.round(total * 0.03)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fadein" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Order ${sp.local}`}>
        <div className="sheet-head">
          <div className="catch-art">
            <SpeciesArt id={sp.id} size={48} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="card-title">Order {sp.local}</h3>
            <p className="card-sub">
              {listing.fisher} · {portOf(listing.portId).name} · {peso(listing.price)}/kg · Grade {fresh.grade}, landed {fresh.ago} ago
            </p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="order-qty">Quantity (available {listing.qtyKg} kg)</label>
          <input
            id="order-qty"
            type="range"
            min="5"
            max={listing.qtyKg}
            step="5"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <div className="qty-readout num">{qty} kg</div>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={cold} onChange={(e) => setCold(e.target.checked)} />
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
        <div className="row row-total">
          <span className="grow">Total</span>
          <span className="r up">{peso(total + delivery + fee)}</span>
        </div>

        <div className="alert info" style={{ marginBottom: 14 }}>
          <IconQr size={15} />
          <span>
            You will get lot <b className="mono">{listing.lotId}</b> with a trace QR — landing time, boat, cold-chain temps, all
            on the label.
          </span>
        </div>

        <div className="sheet-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onConfirm(listing, qty, total + delivery + fee)}>
            Place order
          </button>
        </div>
      </div>
    </div>
  )
}

function PostCatchSheet({ preset, onClose, onPost }) {
  const first = preset ? speciesByLocal(preset.species) : SPECIES[0]
  const [form, setForm] = useState({
    species: first.local,
    qtyKg: 60,
    price: preset ? preset.price : first.basePrice,
    portId: 'dagupan',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const sp = speciesByLocal(form.species)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fadein" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Sell my catch">
        <div className="sheet-head">
          <div className="catch-art">
            <SpeciesArt id={sp.id} size={52} />
          </div>
          <div>
            <h3 className="card-title">Sell my catch</h3>
            <p className="card-sub">Buyers see it right away. Your lot gets a QR label.</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="post-species">What fish?</label>
          <select id="post-species" value={form.species} onChange={set('species')}>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.local}>
                {s.local} · {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid two">
          <div className="field">
            <label htmlFor="post-kg">How many kg?</label>
            <input id="post-kg" type="number" inputMode="numeric" value={form.qtyKg} onChange={set('qtyKg')} min="1" />
          </div>
          <div className="field">
            <label htmlFor="post-price">Price per kg (₱)</label>
            <input id="post-price" type="number" inputMode="numeric" value={form.price} onChange={set('price')} min="1" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="post-port">Where did you land?</label>
          <select id="post-port" value={form.portId} onChange={set('portId')}>
            <option value="dagupan">Dagupan Landing</option>
            <option value="navotas">Navotas Fish Port</option>
            <option value="batangas">Batangas Bay Landing</option>
            <option value="roxas">Roxas City Port</option>
            <option value="gensan">General Santos Fish Port</option>
          </select>
        </div>
        <div className="alert good" style={{ marginBottom: 14 }}>
          <IconClock size={15} />
          <span>
            Fair price today is <b className="num">{peso(sp.basePrice)}/kg</b>. You are asking{' '}
            <b className="num">{peso(Number(form.price) || 0)}</b>.
          </span>
        </div>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onPost(form)}>
            Put it on sale
          </button>
        </div>
      </div>
    </div>
  )
}

function IncomingOrder({ o, onAccept, onDecline }) {
  return (
    <div className="row order-row">
      <div className="grow">
        <div style={{ fontWeight: 680 }}>
          {o.buyer} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {o.type}</span>
        </div>
        <div className="row-sub">
          {o.species} · ordered {phtTime(o.placedAt)} · {o.note}
        </div>
      </div>
      <div className="order-figs">
        <span className="r">{o.qtyKg} kg</span>
        <span className="r up">{peso(o.qtyKg * o.price)}</span>
      </div>
      <div className="order-actions">
        <button className="btn" onClick={() => onDecline(o)}>
          Pass
        </button>
        <button className="btn primary" onClick={() => onAccept(o)}>
          Accept
        </button>
      </div>
    </div>
  )
}

export default function Market({ role, listings, orders, onOrder, onAccept, onDecline, onPost, onTrace, toast }) {
  const [species, setSpecies] = useState('all')
  const [q, setQ] = useState('')
  const [sheet, setSheet] = useState(null) // { kind: 'order', listing } | { kind: 'post', preset? }
  const [placed, setPlaced] = useState([])
  const fisher = role === 'fisher'

  const freshById = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, freshnessOf(l)])), [listings])

  const chips = useMemo(
    () => [
      { id: 'all', label: fisher ? 'All fish' : 'Everything' },
      ...SPECIES.slice(0, 6).map((s) => ({
        id: s.local,
        label: (
          <>
            <SpeciesArt id={s.id} size={fisher ? 28 : 22} />
            {s.local}
          </>
        ),
      })),
    ],
    [fisher]
  )

  const shown = listings
    .filter((l) => {
      const sp = speciesByLocal(l.species)
      const hitSpecies = species === 'all' || sp.local === species
      const hitQ = !q || `${sp.name} ${sp.local} ${l.fisher} ${portOf(l.portId).name}`.toLowerCase().includes(q.toLowerCase())
      return hitSpecies && hitQ
    })
    // Fisher sees his own lots first: he is the protagonist, not the supply side.
    .sort((a, b) => (fisher ? (b.fisher === ME) - (a.fisher === ME) : 0))

  const totalKg = shown.reduce((a, l) => a + l.qtyKg, 0)
  const avgPrice = shown.length ? Math.round(shown.reduce((a, l) => a + l.price, 0) / shown.length) : 0
  const orderFor = (l) => (l.fisher === ME ? orders.find((o) => speciesByLocal(o.species).local === speciesByLocal(l.species).local) : null)
  const myKg = listings.filter((l) => l.fisher === ME).reduce((a, l) => a + l.qtyKg, 0)
  const myLots = listings.filter((l) => l.fisher === ME).length
  const waitingValue = orders.reduce((a, o) => a + o.qtyKg * o.price, 0)

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">{fisher ? 'Your catch, your price' : 'Fresh from the landing'}</h1>
          <p className="sub">
            {fisher
              ? 'What your fish is worth today, and who wants it. No middleman setting your price.'
              : 'Buy straight from small-scale fishers. Every lot is traceable back to a boat and a landing time.'}
          </p>
        </div>
        <div className="topbar-right">
          {fisher ? (
            <button className="btn primary big" onClick={() => setSheet({ kind: 'post' })}>
              <IconPlus size={20} /> Sell my catch
            </button>
          ) : (
            <span className="pill live">
              <i className="dot pulse" /> {listings.length} lots live
            </span>
          )}
        </div>
      </div>

      {fisher && (
        <div className="grid three" style={{ marginBottom: 13 }}>
          <Stat k="Buyers waiting" v={<span className="up">{peso(waitingValue)}</span>} d={`${orders.length} orders · answer within 2h`} />
          <Stat k="Your fish on sale" v={`${myKg} kg`} d={`${myLots} ${myLots === 1 ? 'lot' : 'lots'}`} />
          <Stat k="Avg. price today" v={peso(avgPrice)} d="₱189 last Sunday" tone="up" />
        </div>
      )}

      {fisher && orders.length > 0 && (
        <Card style={{ marginBottom: 13 }}>
          <CardHead title="Buyers want your fish" sub="Accept to lock the sale and book pickup. Pass puts it back on sale." />
          {orders.map((o) => (
            <IncomingOrder key={o.id} o={o} onAccept={onAccept} onDecline={onDecline} />
          ))}
        </Card>
      )}

      {!fisher && (
        <div className="filters">
          <div className="search">
            <IconSearch size={15} />
            <input placeholder="Search species, fisher, port…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="pill num">
            {shown.length} lots · {totalKg.toLocaleString('en-PH')} kg
          </span>
          <span className="pill num">avg {peso(avgPrice)}/kg</span>
        </div>
      )}

      <Chips items={chips} value={species} onChange={setSpecies} />

      {shown.length === 0 ? (
        <Empty>No lots match that filter yet.</Empty>
      ) : (
        <div className="catch-grid" style={{ marginBottom: 20 }}>
          {shown.map((l) => (
            <CatchCard
              key={l.id}
              listing={l}
              fresh={freshById[l.id]}
              role={role}
              order={fisher ? orderFor(l) : null}
              onOrder={(listing) => setSheet({ kind: 'order', listing })}
              onTrace={onTrace}
              onAccept={onAccept}
              onSellMine={(listing) => setSheet({ kind: 'post', preset: listing })}
            />
          ))}
        </div>
      )}

      {fisher && orders.length === 0 && (
        <Card>
          <CardHead title="Buyers want your fish" />
          <Empty>No open orders. Buyers get notified the moment you post.</Empty>
        </Card>
      )}

      {!fisher && placed.length > 0 && (
        <Card style={{ marginTop: 13 }}>
          <CardHead title="Your orders" sub="Confirmed lots with cold-chain delivery scheduled." />
          {placed.map((p) => (
            <div className="row" key={p.id}>
              <SpeciesArt id={speciesByLocal(p.species).id} size={32} />
              <div className="grow">
                <div style={{ fontWeight: 650 }}>
                  {p.qtyKg} kg {p.species} · {p.fisher}
                </div>
                <div className="mono row-sub">{p.lotId} · delivering 2–4pm</div>
              </div>
              <span className="r up">{peso(p.total)}</span>
            </div>
          ))}
        </Card>
      )}

      {sheet?.kind === 'order' && (
        <OrderSheet
          listing={sheet.listing}
          fresh={freshById[sheet.listing.id]}
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

      {sheet?.kind === 'post' && (
        <PostCatchSheet
          preset={sheet.preset}
          onClose={() => setSheet(null)}
          onPost={(form) => {
            onPost(form)
            setSheet(null)
            toast(`${form.qtyKg} kg ${form.species} is on sale now`)
          }}
        />
      )}
    </div>
  )
}
