import { useMemo } from 'react'
import { speciesByLocal, MY_CATCH, portOf, FISHER_STATS } from '../data/market'
import { NOW, peso, phtTime } from '../lib/format'
import { Card, CardHead, Stat, Bar, Tag, Empty } from '../components/ui'
import { Spark } from '../components/Chart'
import SpeciesArt from '../components/SpeciesArt'
import { IconAlert, IconSnow, IconBox, IconBoat } from '../components/Icons'

/* Seeded wobble so "spoilage risk" reads like a real sensor feed, not random noise. */
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7)

export default function Inventory({ role }) {
  const fisher = role === 'fisher'
  const rows = useMemo(
    () =>
      MY_CATCH.map((c, i) => {
        const sp = speciesByLocal(c.species)
        const h = hash(c.species + i)
        const hoursOnIce = c.iceHours
        const shelf = c.shelfHours
        const risk = Math.min(97, Math.round((hoursOnIce / shelf) * 100))
        return {
          ...c,
          sp,
          port: portOf(c.portId),
          hoursOnIce,
          shelf,
          risk,
          value: c.qtyKg * c.price,
          series: Array.from({ length: 8 }, (_, k) => Math.round(c.price * (0.94 + ((hash(c.species + k) % 13) / 100)))),
        }
      }),
    []
  )

  const totalKg = rows.reduce((a, r) => a + r.qtyKg, 0)
  const totalValue = rows.reduce((a, r) => a + r.value, 0)
  const atRisk = rows.filter((r) => r.risk >= 60)

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">Catch & stock</h1>
          <p className="sub">What you landed, what is still on ice, and how long before it starts losing value.</p>
        </div>
        <div className="topbar-right">
          <span className="pill">
            <IconSnow size={13} /> cold chain nominal
          </span>
        </div>
      </div>

      <div className="grid four" style={{ marginBottom: 13 }}>
        <Stat k="Stock on hand" v={`${totalKg} kg`} d={`${rows.length} lots · ${rows.filter((r) => r.status === 'listed').length} listed`} />
        <Stat k="Stock value" v={<span className="up">{peso(totalValue)}</span>} d="at today's landing prices" />
        <Stat k="Spoilage risk" v={`${atRisk.length} lots`} tone={atRisk.length ? 'down' : ''} d={atRisk.length ? 'sell or chill within 12h' : 'all clear'} />
        <Stat k="Loss this week" v={`${FISHER_STATS.lossPct}%`} tone="up" d={`${FISHER_STATS.kgLost} kg vs 14% before IsdaLink`} />
      </div>

      <div className="split">
        <Card>
          <CardHead
            title={fisher ? 'My catch' : 'Live catch log'}
            sub="Each lot keeps a running record: landed, iced, listed, sold."
            right={<span className="pill">Sunday · {phtTime(NOW.toISOString())} PHT</span>}
          />
          {rows.map((r) => (
            <div key={r.species + r.qtyKg} className="stock-item">
              <div className="stock-top">
                <div className="catch-art sm">
                  <SpeciesArt id={r.sp.id} size={36} />
                </div>
                <div className="grow">
                  <div style={{ fontWeight: 680 }}>
                    {r.sp.local} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {r.sp.name}</span>
                  </div>
                  <div className="row-sub">
                    {r.qtyKg} kg · {r.port.name} · {peso(r.price)}/kg
                  </div>
                </div>
                <Spark values={r.series} tone={r.risk >= 60 ? 'var(--alert)' : 'var(--mist)'} />
                <div className="r stock-value up">{peso(r.value)}</div>
              </div>
              <div className="stock-bottom">
                <div style={{ flex: 1 }}>
                  <Bar value={r.risk} max={100} tone={r.risk >= 60 ? 'alert' : ''} />
                </div>
                <span className="stock-risk">
                  {r.risk}% risk · {Math.max(0, r.shelf - r.hoursOnIce)}h left
                </span>
                <Tag grade={r.risk >= 60 ? 'C' : 'B'}>
                  {r.status === 'listed' ? 'LISTED' : r.status === 'risk' ? 'ACT NOW' : 'ON ICE'}
                </Tag>
              </div>
            </div>
          ))}
          <div className="alert good" style={{ marginTop: 14 }}>
            <IconBox size={15} />
            <span>
              Your record is complete — <b>412 kg</b> logged this week. Complete records unlock the 2% BFAR data-sharing
              incentive and higher buyer trust scores.
            </span>
          </div>
        </Card>

        <div className="stack">
          <Card>
            <CardHead title="This week" sub="Compared with the four weeks before you joined" />
            <div className="row">
              <span className="grow">Earnings</span>
              <span className="r up">{peso(FISHER_STATS.earningsWeek)}</span>
            </div>
            <div className="row">
              <span className="grow">Kilograms sold</span>
              <span className="r">{FISHER_STATS.kgSold} kg</span>
            </div>
            <div className="row">
              <span className="grow">Average price</span>
              <span className="r">{peso(FISHER_STATS.avgPrice)}/kg</span>
            </div>
            <div className="row">
              <span className="grow">Repeat buyers</span>
              <span className="r">{FISHER_STATS.buyers}</span>
            </div>
            <div className="row">
              <span className="grow">Change vs middleman selling</span>
              <span className="r up">+{FISHER_STATS.earningsDeltaPct}%</span>
            </div>
          </Card>

          <Card>
            <CardHead title="Act now" sub="Highest-value actions ranked by pesos saved" />
            {atRisk.length === 0 ? (
              <Empty>Nothing urgent. Everything is within its cold-chain window.</Empty>
            ) : (
              atRisk.map((r) => (
                <div className="alert" key={r.species} style={{ marginBottom: 9 }}>
                  <IconAlert size={15} />
                  <span>
                    <b>{r.sp.name}</b> — {r.hoursOnIce}h on ice, about {Math.max(0, r.shelf - r.hoursOnIce)}h of quality left.
                    Selling now saves ~{peso(Math.round(r.value * 0.3))} of a discounted dump.
                  </span>
                </div>
              ))
            )}
            <div className="row">
              <IconBoat size={15} style={{ color: 'var(--muted)' }} />
              <span className="grow">Next landing window</span>
              <span className="r">Mon 03:00</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
