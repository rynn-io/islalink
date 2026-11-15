import { useMemo, useState } from 'react'
import { ICE_SUPPLIERS, COLD_STORES, COURIERS, portOf } from '../data/market'
import { peso } from '../lib/format'
import { Card, CardHead, Stat, Tag, Bar } from '../components/ui'
import { IconIce, IconSnow, IconTruck, IconCheck, IconPin } from '../components/Icons'

export default function Logistics({ toast }) {
  const [iceId, setIceId] = useState(ICE_SUPPLIERS[0].id)
  const [blocks, setBlocks] = useState(20)
  const [storeId, setStoreId] = useState(COLD_STORES[1].id)
  const [courierId, setCourierId] = useState(COURIERS[0].id)
  const [kg, setKg] = useState(120)
  const [booked, setBooked] = useState(null)

  const ice = ICE_SUPPLIERS.find((i) => i.id === iceId)
  const store = COLD_STORES.find((s) => s.id === storeId)
  const courier = COURIERS.find((c) => c.id === courierId)

  const cost = useMemo(() => {
    const iceCost = blocks * ice.perBlock
    const storeCost = kg * store.perKgDay
    const haul = courier.base + Math.round(courier.perKm * 14)
    return { iceCost, storeCost, haul, total: iceCost + storeCost + haul }
  }, [blocks, ice, kg, store, courier])

  const hmm = (n) => `${n} kg`

  const book = () => {
    setBooked({ ice: ice.name, store: store.name, courier: courier.name, at: '11:20', save: 3120 })
    toast(`Cold chain booked · ice + ${store.name} · ${courier.eta} to buyer`)
  }

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">Cold chain & delivery</h1>
          <p className="sub">
            The part ordinary marketplaces skip. Ice, cold storage and a reefer ride, booked in one screen.
          </p>
        </div>
        <div className="topbar-right">
          <span className="pill live">
            <IconSnow size={13} /> 2 cold hubs within 3 km
          </span>
        </div>
      </div>

      <div className="grid four" style={{ marginBottom: 13 }}>
        <Stat k="Post-harvest loss" v="2.1%" d="vs ~14% national average" tone="up" />
        <Stat k="Ice blocks available" v={ICE_SUPPLIERS.reduce((a, i) => a + i.blocksAvailable, 0)} d="across 3 suppliers nearby" />
        <Stat k="Cold slots free" v={`${COLD_STORES.reduce((a, s) => a + s.freeKg, 0).toLocaleString('en-PH')} kg`} d="3 facilities · 1 uncertified" />
        <Stat k="Avg. delivery time" v="1h 40m" d="reefer van, Navotas → Makati" />
      </div>

      {booked && (
        <div className="alert good" style={{ marginBottom: 13 }}>
          <IconCheck size={15} />
          <span>
            Booked at {booked.at}. <b>{booked.ice}</b> dispatching {blocks} blocks, <b>{booked.store}</b> holding {kg} kg, and{' '}
            <b>{booked.courier}</b> picking up. Estimated spoilage avoided: <b>{peso(booked.save)}</b>.
          </span>
        </div>
      )}

      <div className="split">
        <div style={{ display: 'grid', gap: 13 }}>
          <Card>
            <CardHead title="1 · Ice" sub="Blocks are 25 kg. Price includes drop-off at the landing." right={<span className="pill"><IconIce size={12} /> {blocks} blocks</span>} />
            {ICE_SUPPLIERS.map((s) => (
              <label
                key={s.id}
                className="row"
                style={{ cursor: 'pointer', opacity: iceId === s.id ? 1 : 0.72 }}
              >
                <input type="radio" name="ice" checked={iceId === s.id} onChange={() => setIceId(s.id)} style={{ accentColor: 'var(--aqua)' }} />
                <div className="grow">
                  <div style={{ fontWeight: 640 }}>
                    {s.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {s.distanceKm} km</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {s.blocksAvailable} blocks · arrives {s.eta} · ★ {s.rating}
                  </div>
                </div>
                <span className="r">{peso(s.perBlock)}</span>
              </label>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Blocks</span>
              <input
                type="range"
                min="4"
                max="120"
                step="4"
                value={blocks}
                onChange={(e) => setBlocks(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--aqua)' }}
              />
              <span className="mono">{blocks}</span>
            </div>
          </Card>

          <Card>
            <CardHead title="2 · Cold storage" sub="Keep the lot saleable while you negotiate a better price." />
            {COLD_STORES.map((s) => (
              <label key={s.id} className="row" style={{ cursor: 'pointer', opacity: storeId === s.id ? 1 : 0.72 }}>
                <input type="radio" name="cs" checked={storeId === s.id} onChange={() => setStoreId(s.id)} style={{ accentColor: 'var(--aqua)' }} />
                <div className="grow">
                  <div style={{ fontWeight: 640 }}>
                    {s.name} <Tag grade={s.certified ? 'A' : 'B'}>{s.certified ? 'CERTIFIED' : 'UNCERTIFIED'}</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {s.tempC}°C · {s.freeKg} kg free · {s.distanceKm} km
                  </div>
                </div>
                <span className="r">{peso(s.perKgDay, 1)}<span style={{ color: 'var(--muted)', fontWeight: 400 }}>/kg</span></span>
              </label>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Lot size</span>
              <input type="range" min="20" max="400" step="10" value={kg} onChange={(e) => setKg(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--aqua)' }} />
              <span className="mono">{hmm(kg)}</span>
            </div>
          </Card>

          <Card>
            <CardHead title="3 · Delivery" sub="Reefer vehicles keep the chain unbroken; the tricycle is for short local hops." />
            {COURIERS.map((c) => (
              <label key={c.id} className="row" style={{ cursor: 'pointer', opacity: courierId === c.id ? 1 : 0.72 }}>
                <input type="radio" name="co" checked={courierId === c.id} onChange={() => setCourierId(c.id)} style={{ accentColor: 'var(--aqua)' }} />
                <div className="grow">
                  <div style={{ fontWeight: 640 }}>
                    {c.name} <Tag grade={c.cold ? 'A' : 'B'}>{c.cold ? 'COLD' : 'AMBIENT'}</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    up to {c.maxKg} kg · ETA {c.eta} · {peso(c.perKm)}/km + {peso(c.base)}
                  </div>
                </div>
                <span className="r">{peso(c.base + c.perKm * 14)}</span>
              </label>
            ))}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 13 }}>
          <Card>
            <CardHead title="Booking summary" sub="One tap, three partners coordinated." />
            <div className="row">
              <span className="grow">Ice · {blocks} blocks</span>
              <span className="r">{peso(cost.iceCost)}</span>
            </div>
            <div className="row">
              <span className="grow">Storage · {kg} kg × 1 day</span>
              <span className="r">{peso(Math.round(cost.storeCost))}</span>
            </div>
            <div className="row">
              <span className="grow">Haul · Navotas → Makati</span>
              <span className="r">{peso(cost.haul)}</span>
            </div>
            <div className="row" style={{ borderBottom: 0, fontSize: 15, fontWeight: 720 }}>
              <span className="grow">Total</span>
              <span className="r" style={{ color: 'var(--aqua)' }}>{peso(cost.total)}</span>
            </div>
            <button className="btn primary full" style={{ marginTop: 12 }} onClick={book}>
              Book cold chain
            </button>
            <p className="card-sub" style={{ marginTop: 10 }}>
              Cheaper than the {peso(Math.round(kg * 42))} you would lose dumping a spoiled {kg} kg lot.
            </p>
          </Card>

          <Card>
            <CardHead title="Route" sub="Navotas Fish Port → Casa Marisol, Makati" />
            <div style={{ display: 'grid', gap: 0 }}>
              {[
                { t: 'Landing', p: portOf('navotas').name, d: 'Picked up 04:20', icon: IconPin },
                { t: 'Ice plant', p: ice.name, d: `Glazed · ${ice.eta}`, icon: IconIce },
                { t: 'Cold hub', p: store.name, d: `${store.tempC}°C holding`, icon: IconSnow },
                { t: 'Buyer', p: 'Casa Marisol Resto, Makati', d: `ETA ${courier.eta}`, icon: IconTruck },
              ].map((s, i) => (
                <div key={s.t} className="row" style={{ borderBottom: i === 3 ? 0 : '1px solid var(--line)' }}>
                  <s.icon size={15} style={{ color: 'var(--aqua)' }} />
                  <div className="grow">
                    <div style={{ fontWeight: 620 }}>{s.t}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.p}</div>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.d}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                <span>Chain integrity</span>
                <span style={{ color: 'var(--aqua)' }}>98%</span>
              </div>
              <Bar value={98} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
