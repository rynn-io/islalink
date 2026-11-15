import { useMemo, useState } from 'react'
import { SPECIES, getForecast, getMarketSummary, getDemandHeat } from '../lib/forecast'
import { TODAY, peso, pct } from '../lib/format'
import { Card, CardHead, Stat, Tag, Bar } from '../components/ui'
import PriceChart from '../components/Chart'
import { IconTrend, IconAlert, IconCheck } from '../components/Icons'

const verdictTone = { hold: 'warn', sell: 'good', 'sell-now': 'good' }

export default function Prices({ role }) {
  const [id, setId] = useState(SPECIES[0].id)
  const f = useMemo(() => getForecast(id, { today: TODAY, days: 7 }), [id])
  const summary = useMemo(() => getMarketSummary(TODAY), [])
  const heat = useMemo(() => getDemandHeat(TODAY), [])
  const sp = f.species

  const todayPrice = f.forecast[0].price
  const band = f.forecast[3] || f.forecast[f.forecast.length - 1]

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">Price intelligence</h1>
          <p className="sub">
            Seven-day outlook per species, blended from historical landings, supply volume, season and fuel costs.
          </p>
        </div>
        <div className="topbar-right">
          <span className="pill live">
            <IconTrend size={13} /> model v2.4 · XGBoost
          </span>
        </div>
      </div>

      <div className="toolbar">
        {SPECIES.map((s) => (
          <button key={s.id} className={`chip ${s.id === id ? 'on' : ''}`} onClick={() => setId(s.id)}>
            {s.emoji} {s.local}
          </button>
        ))}
      </div>

      <div className="grid three" style={{ marginBottom: 13 }}>
        <Stat k={`${sp.local} · today`} v={peso(todayPrice)} d={<><Tag grade="n">{sp.name}</Tag> per kilo at the landing</>} />
        <Stat
          k="7-day direction"
          v={pct(f.deltaPct)}
          tone={f.deltaPct >= 0 ? 'up' : 'down'}
          d={f.deltaPct >= 0 ? 'Rising — buyers are short' : 'Softening — supply is heavy'}
        />
        <Stat k="Model confidence" v={`${f.confidence}%`} d={`Typical range ${peso(band.low)}–${peso(band.high)}`} />
      </div>

      <div className="split" style={{ marginBottom: 13 }}>
        <Card>
          <CardHead
            title={`${sp.local} — 14 days of landings + 7-day forecast`}
            sub="Solid line is recorded ex-vessel price. Shaded cone is the model's confidence band."
            right={<span className="pill">{peso(sp.basePrice)} base</span>}
          />
          <PriceChart history={f.history} forecast={f.forecast} />
          <div className="legend">
            <span><i style={{ background: 'var(--aqua)' }} />recorded</span>
            <span><i style={{ background: 'var(--aqua)', opacity: 0.5 }} />forecast</span>
            <span><i style={{ background: 'rgba(53,214,192,.25)' }} />confidence band</span>
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 13 }}>
          <Card>
            <CardHead title="What to do" sub="IsdaLink's call for the next 72 hours" />
            <div className={`alert ${verdictTone[f.recommendation.verdict] || ''}`} style={{ marginBottom: 12 }}>
              {f.recommendation.verdict === 'hold' ? <IconAlert size={15} /> : <IconCheck size={15} />}
              <div>
                <div style={{ fontWeight: 720, fontSize: 13.5, marginBottom: 3 }}>{f.recommendation.headline}</div>
                <div>{f.recommendation.detail}</div>
              </div>
            </div>
            <div className="row">
              <span className="grow">Hold 2 days, sell Thursday</span>
              <span className="r up">{peso(Math.round(todayPrice * 1.045))}</span>
            </div>
            <div className="row">
              <span className="grow">Sell everything today</span>
              <span className="r">{peso(todayPrice)}</span>
            </div>
            <div className="row">
              <span className="grow">Ice + storage for 2 days</span>
              <span className="r down">−{peso(Math.round(todayPrice * 0.02))}</span>
            </div>
          </Card>

          <Card>
            <CardHead title="Price drivers" sub="What moved this forecast" />
            {f.drivers.map((d) => (
              <div key={d.label} className="row">
                <div className="grow">
                  <div style={{ fontWeight: 620, marginBottom: 4 }}>
                    {d.label}{' '}
                    <span className={d.impact === 'up' ? 'up' : d.impact === 'down' ? 'down' : 'flat'}>
                      {d.impact === 'up' ? '↑' : d.impact === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.note}</div>
                </div>
                <div style={{ width: 64 }}>
                  <Bar value={Math.round((d.weight || 0) * 100)} max={100} color={d.impact === 'down' ? 'var(--coral)' : undefined} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid two">
        <Card>
          <CardHead title="Demand this week" sub="Buyer search + order volume, normalised 0–100" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 108, marginTop: 6 }}>
            {heat.map((d) => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.score}</div>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(8, d.score)}%`,
                    borderRadius: 6,
                    background: d.score > 70 ? 'linear-gradient(180deg,var(--sun),#c98f22)' : 'linear-gradient(180deg,var(--aqua),#12a08f)',
                    opacity: d.score > 70 ? 1 : 0.75,
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.day}</div>
              </div>
            ))}
          </div>
          <p className="card-sub" style={{ marginTop: 12 }}>
            Weekends peak — restaurants restock Friday and Saturday for Sunday service.
          </p>
        </Card>

        <Card>
          <CardHead title="Market pulse" sub={summary.note} right={<span className="pill">avg {pct(summary.avgDeltaPct)}</span>} />
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', marginBottom: 4 }}>
            Risers
          </div>
          {summary.risers.map((r) => (
            <div className="row" key={r.id}>
              <span className="grow">
                {r.local} <span style={{ color: 'var(--muted)' }}>· {r.name}</span>
              </span>
              <span className="r up">▲ {r.deltaPct.toFixed(1)}%</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', margin: '14px 0 4px' }}>
            Fallers
          </div>
          {summary.fallers.map((r) => (
            <div className="row" key={r.id}>
              <span className="grow">
                {r.local} <span style={{ color: 'var(--muted)' }}>· {r.name}</span>
              </span>
              <span className="r down">▼ {Math.abs(r.deltaPct).toFixed(1)}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
