import { useMemo, useState } from 'react'
import { SPECIES, getForecast, getMarketSummary, getDemandHeat } from '../lib/forecast'
import { TODAY, peso, pct } from '../lib/format'
import { Card, CardHead, Stat, Tag, Bar } from '../components/ui'
import PriceChart from '../components/Chart'
import SpeciesArt from '../components/SpeciesArt'
import { IconTrend, IconAlert, IconCheck } from '../components/Icons'

const verdictTone = { hold: 'info', sell: 'good', 'sell-now': 'good' }

export default function Prices({ role }) {
  const fisher = role === 'fisher'
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
          <h1 className="h1">{fisher ? 'What is my fish worth?' : 'Price intelligence'}</h1>
          <p className="sub">
            {fisher
              ? 'Today’s landing price and where it is heading this week — so you know when to sell.'
              : 'Seven-day outlook per species, blended from historical landings, supply volume, season and fuel costs.'}
          </p>
        </div>
        <div className="topbar-right">
          <span className="pill">
            <IconTrend size={13} /> model v2.4 · XGBoost
          </span>
        </div>
      </div>

      <div className="toolbar">
        {SPECIES.map((s) => (
          <button key={s.id} className={`chip ${s.id === id ? 'on' : ''}`} onClick={() => setId(s.id)}>
            <SpeciesArt id={s.id} size={fisher ? 28 : 22} /> {s.local}
          </button>
        ))}
      </div>

      <div className="grid three" style={{ marginBottom: 13 }}>
        <Stat k={`${sp.local} · today`} v={<span className="up">{peso(todayPrice)}</span>} d={<><Tag grade="n">{sp.name}</Tag> per kilo at the landing</>} />
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
            <span><i />recorded</span>
            <span><i className="dash" />forecast</span>
            <span><i className="band" />confidence band</span>
          </div>
        </Card>

        <div className="stack">
          <Card>
            <CardHead title={fisher ? 'Should I sell now?' : 'What to do'} sub="IsdaLink's call for the next 72 hours" />
            <div className={`alert ${verdictTone[f.recommendation.verdict] || ''}`} style={{ marginBottom: 12 }}>
              {f.recommendation.verdict === 'hold' ? <IconAlert size={15} /> : <IconCheck size={15} />}
              <div>
                <div className="alert-head">{f.recommendation.headline}</div>
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
                  <div className="row-sub">{d.note}</div>
                </div>
                <div style={{ width: 64 }}>
                  <Bar value={Math.round((d.weight || 0) * 100)} max={100} tone={d.impact === 'down' ? 'alert' : d.impact === 'up' ? 'money' : ''} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid two">
        <Card>
          <CardHead title="Demand this week" sub="Buyer search + order volume, normalised 0–100" />
          <div className="demand">
            {heat.map((d) => (
              <div key={d.day} className="demand-col">
                <div className="num">{d.score}</div>
                <div className={`demand-bar ${d.score > 70 ? 'peak' : ''}`} style={{ height: `${Math.max(8, d.score)}%` }} />
                <div>{d.day}</div>
              </div>
            ))}
          </div>
          <p className="card-sub" style={{ marginTop: 12 }}>
            Weekends peak — restaurants restock Friday and Saturday for Sunday service.
          </p>
        </Card>

        <Card>
          <CardHead title="Market pulse" sub={summary.note} right={<span className="pill">avg {pct(summary.avgDeltaPct)}</span>} />
          <div className="section-k">Risers</div>
          {summary.risers.map((r) => (
            <div className="row" key={r.id}>
              <span className="grow">
                {r.local} <span style={{ color: 'var(--muted)' }}>· {r.name}</span>
              </span>
              <span className="r up">▲ {r.deltaPct.toFixed(1)}%</span>
            </div>
          ))}
          <div className="section-k" style={{ marginTop: 14 }}>Fallers</div>
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
