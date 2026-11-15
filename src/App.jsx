import { useCallback, useEffect, useMemo, useState } from 'react'
import { LISTINGS, INCOMING_ORDERS, portOf, speciesByLocal } from './data/market'
import { makeLot } from './lib/trace'

import { NOW, TODAY } from './lib/format'
import {
  IconMarket,
  IconTrend,
  IconBox,
  IconSnow,
  IconQr,
  IconCheck,
} from './components/Icons'
import { BrandMark, Wordmark } from './components/Brand'
import Market from './views/Market'
import Prices from './views/Prices'
import Inventory from './views/Inventory'
import Logistics from './views/Logistics'
import Trace from './views/Trace'

const VIEWS = [
  { id: 'market', label: 'Marketplace', short: 'Market', Icon: IconMarket },
  { id: 'prices', label: 'Price intelligence', short: 'Prices', Icon: IconTrend },
  { id: 'inventory', label: 'Catch & stock', short: 'Stock', Icon: IconBox },
  { id: 'logistics', label: 'Cold chain', short: 'Cold', Icon: IconSnow },
  { id: 'trace', label: 'Traceability', short: 'Trace', Icon: IconQr },
]

export default function App() {
  const [role, setRole] = useState('buyer')
  const [view, setView] = useState('market')
  const [listings, setListings] = useState(LISTINGS)
  const [orders, setOrders] = useState(INCOMING_ORDERS)
  const [lotId, setLotId] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const lots = useMemo(
    () =>
      LISTINGS.slice(0, 5).map((l) =>
        makeLot({
          species: speciesByLocal(l.species).local,
          boat: l.boat,
          fisher: l.fisher,
          lbs: portOf(l.portId).name,
          landedAt: l.landedAt,
          lotId: l.lotId,
          now: NOW.toISOString(),
        })
      ),
    []
  )
  const [extraLots, setExtraLots] = useState([])
  const allLots = useMemo(() => [...extraLots, ...lots], [extraLots, lots])

  const toast = useCallback((msg) => setToastMsg({ msg, id: Date.now() }), [])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3200)
    return () => clearTimeout(t)
  }, [toastMsg])

  const openTrace = useCallback(
    (listing) => {
      const sp = speciesByLocal(listing.species)
      const lot = makeLot({
        species: sp.local,
        boat: listing.boat,
        fisher: listing.fisher,
        lbs: portOf(listing.portId).name,
        landedAt: listing.landedAt,
        lotId: listing.lotId,
        now: NOW.toISOString(),
      })
      setExtraLots((prev) => (prev.some((p) => p.lotId === lot.lotId) ? prev : [lot, ...prev]))
      setLotId(lot.lotId)
      setView('trace')
      toast(`Lot ${lot.lotId} opened — full handling record`)
    },
    [toast]
  )

  const placeOrder = useCallback((listing, qtyKg) => {
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, qtyKg: Math.max(0, l.qtyKg - qtyKg) } : l))
    )
  }, [])

  const postCatch = useCallback(
    (form) => {
      const sp = speciesByLocal(form.species)
      const n = listings.length + 1
      setListings((prev) => [
        {
          id: `L-${1050 + n}`,
          species: sp.local,
          qtyKg: Number(form.qtyKg),
          price: Number(form.price),
          portId: form.portId,
          fisher: 'Nestor Dela Cruz',
          boat: 'F/B Sta. Clara 3',
          landedAt: NOW.toISOString(),
          trendPct: 1.8,
          verified: true,
          lotId: `ISL-2646-${sp.local.slice(0, 3).toUpperCase()}-${1000 + n}`,
        },
        ...prev,
      ])
    },
    [listings.length]
  )

  return (
    <div className={`app ${role}`}>
      <aside className="sidebar">
        <div className="brand">
          <BrandMark size={28} />
          <div>
            <Wordmark />
            <div className="brand-sub">Fisher-first seafood</div>
          </div>
        </div>

        <nav className="nav">
          {VIEWS.map(({ id, label, Icon }) => (
            <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
              <span className="nav-ico">
                <Icon size={17} />
              </span>
              {label}
              {id === 'market' && role === 'fisher' && orders.length > 0 && <span className="nav-badge">{orders.length}</span>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <div className="role-card">
            <div className="role-label">Viewing as</div>
            <div className="role-toggle">
              <button className={`role-btn ${role === 'buyer' ? 'on' : ''}`} onClick={() => setRole('buyer')}>
                Buyer
              </button>
              <button className={`role-btn ${role === 'fisher' ? 'on' : ''}`} onClick={() => setRole('fisher')}>
                Fisher
              </button>
            </div>
            <div className="role-who">
              {role === 'buyer' ? 'Resto / wholesaler buying direct.' : 'Nestor, small-scale fisher, Dagupan.'}
            </div>
          </div>
          <div className="side-note">
            Demo · {new Date(TODAY).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })} · data is
            simulated
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-brand">
          <BrandMark size={32} />
          <Wordmark />
          <div className="role-inline" role="group" aria-label="Switch role">
            <button className={`role-btn ${role === 'buyer' ? 'on' : ''}`} onClick={() => setRole('buyer')}>
              Buyer
            </button>
            <button className={`role-btn ${role === 'fisher' ? 'on' : ''}`} onClick={() => setRole('fisher')}>
              Fisher
            </button>
          </div>
        </div>
        {view === 'market' && (
          <Market
            role={role}
            listings={listings}
            orders={orders}
            toast={toast}
            onOrder={placeOrder}
            onTrace={openTrace}
            onPost={postCatch}
            onAccept={(o) => {
              setOrders((prev) => prev.filter((x) => x.id !== o.id))
              toast(`Order ${o.id} accepted · ${o.qtyKg} kg ${o.species} to ${o.buyer}`)
            }}
            onDecline={(o) => {
              setOrders((prev) => prev.filter((x) => x.id !== o.id))
              toast(`Order ${o.id} passed · stock is back on the market`)
            }}
          />
        )}
        {view === 'prices' && <Prices role={role} />}
        {view === 'inventory' && <Inventory role={role} />}
        {view === 'logistics' && <Logistics role={role} toast={toast} />}
        {view === 'trace' && (
          <Trace lots={allLots} activeId={lotId} onSelect={setLotId} toast={toast} />
        )}
      </main>

      <nav className="mobile-nav">
        {VIEWS.map(({ id, label, short, Icon }) => (
          <button key={id} className={`mnav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
            <Icon size={20} />
            {short || label.split(' ')[0]}
          </button>
        ))}
      </nav>

      {toastMsg && (
        <div className="toast" key={toastMsg.id}>
          <IconCheck size={16} />
          {toastMsg.msg}
        </div>
      )}
    </div>
  )
}
