import { useMemo } from 'react'
import { verifyLot } from '../lib/trace'
import { phtStamp, phtTime, NOW } from '../lib/format'
import { Card, CardHead, Stat, Tag, Bar } from '../components/ui'
import QrCode from '../components/QrCode'
import SpeciesArt from '../components/SpeciesArt'
import { speciesByLocal } from '../data/market'
import { ICONS, IconCheck, IconAlert, IconScan, IconQr } from '../components/Icons'

const iconFor = (name) => ICONS[name] || IconCheck

export default function Trace({ lots, activeId, onSelect, toast }) {
  const lot = useMemo(() => lots.find((l) => l.lotId === activeId) || lots[0], [lots, activeId])
  const audit = useMemo(() => (lot ? verifyLot(lot.lotId) : null), [lot])

  if (!lot) return null
  const f = lot.freshness
  const cc = lot.coldChain
  const passed = (audit?.checks || []).filter((c) => c.ok).length

  return (
    <div className="view fadein">
      <div className="topbar">
        <div>
          <h1 className="h1">Traceability</h1>
          <p className="sub">
            Scan a printed QR at the stall or on the box. Buyers see exactly which boat landed it, when, and how cold it has
            stayed.
          </p>
        </div>
        <div className="topbar-right">
          <button className="btn" onClick={() => toast(`Scanned ${lot.lotId} — chain verified ${passed}/${audit?.checks.length || 0}`)}>
            <IconScan size={14} style={{ marginRight: 5, verticalAlign: -2 }} /> Simulate scan
          </button>
        </div>
      </div>

      <div className="toolbar">
        {lots.map((l) => (
          <button key={l.lotId} className={`chip ${l.lotId === lot.lotId ? 'on' : ''}`} onClick={() => onSelect(l.lotId)}>
            <SpeciesArt id={speciesByLocal(l.species).id} size={22} />
            {l.species} · {l.lotId.slice(-4)}
          </button>
        ))}
      </div>

      <div className="grid four" style={{ marginBottom: 13 }}>
        <Stat k="Lot" v={<span className="mono" style={{ fontSize: 15 }}>{lot.lotId}</span>} d={`${lot.species} · ${lot.fisher}`} />
        <Stat k="Freshness" v={`Grade ${f.grade}`} tone={f.grade === 'A' ? 'up' : f.grade === 'C' ? 'down' : ''} d={`${f.hoursSinceLanding}h since landing`} />
        <Stat
          k="Cold chain"
          v={cc.breach ? 'Breach' : 'Intact'}
          tone={cc.breach ? 'down' : 'up'}
          d={`${cc.minC}°C to ${cc.maxC}°C recorded`}
        />
        <Stat k="Audit" v={`${passed}/${audit?.checks.length || 0}`} tone={passed === (audit?.checks.length || 0) ? 'up' : 'down'} d="checks passed" />
      </div>

      <div className="trace-split">
        <div style={{ display: 'grid', gap: 13 }}>
          <Card>
            <CardHead title="Lot QR" sub="One label, full history." right={<Tag grade="A">VERIFIED</Tag>} />
            <QrCode matrix={lot.qr?.matrix} size={196} label={lot.lotId} />
            <div className="mono trace-url">{lot.traceUrl}</div>
            <button className="btn full" style={{ marginTop: 12 }}>
              <IconQr size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Print label
            </button>
          </Card>

          <Card>
            <CardHead title="Lot details" />
            <div className="row"><span className="grow">Species</span><span className="r">{lot.species}</span></div>
            <div className="row"><span className="grow">Fisher</span><span className="r">{lot.fisher}</span></div>
            <div className="row"><span className="grow">Vessel</span><span className="r" style={{ fontSize: 11.5 }}>{lot.boat}</span></div>
            <div className="row"><span className="grow">Landing site</span><span className="r" style={{ fontSize: 11.5 }}>{lot.lbs}</span></div>
            <div className="row"><span className="grow">Landed</span><span className="r" style={{ fontSize: 11.5 }}>{phtStamp(lot.landedAt)}</span></div>
            <div className="row"><span className="grow">Shelf life</span><span className="r">{f.shelfLifeHours}h</span></div>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 13 }}>
          <Card>
            <CardHead
              title="Handling record"
              sub="Every hand that touched this fish, timestamped in PHT."
              right={<span className="pill">{lot.events.length} events</span>}
            />
            <div className="timeline">
              {lot.events.map((e, i) => {
                const Ico = iconFor(e.icon)
                const pending = new Date(e.at) > NOW
                return (
                  <div className={`tl-item ${pending ? 'pending' : ''}`} key={i}>
                    <div className={`tl-dot ${typeof e.tempC === 'number' && e.tempC > 4 ? 'breach' : ''}`}>
                      <Ico size={12} />
                    </div>
                    <div className="tl-head">
                      <span className="tl-t">{e.label}</span>
                      {pending && <Tag grade="n">SCHEDULED</Tag>}
                      {typeof e.tempC === 'number' && (
                        <span className={`tl-temp ${e.tempC > 4 ? 'hot' : ''}`}>{e.tempC}°C</span>
                      )}
                      <span className="tl-time">{phtTime(e.at)}</span>
                    </div>
                    <div className="tl-m">
                      {e.place} · {e.actor}
                      {e.note ? ` · ${e.note}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="grid two">
            <Card>
              <CardHead title="Freshness" sub={f.advice} />
              <div className="score">
                <div className={`score-v num ${f.grade === 'C' ? 'c' : ''}`}>{f.score}</div>
                <div style={{ flex: 1 }}>
                  <Bar value={f.score} tone={f.grade === 'C' ? 'alert' : ''} />
                  <div className="row-sub" style={{ marginTop: 7 }}>
                    {f.hoursSinceLanding}h since landing · {f.shelfLifeHours}h shelf life
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Buyer checks" sub="Independent audit of the lot record." />
              {(audit?.checks || []).map((c) => (
                <div className="row" key={c.label} style={{ padding: '7px 0' }}>
                  {c.ok ? (
                    <IconCheck size={14} style={{ color: 'var(--mist)' }} />
                  ) : (
                    <IconAlert size={14} style={{ color: 'var(--alert)' }} />
                  )}
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: 11.5 }}>{c.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {cc.breach && (
            <div className="alert">
              <IconAlert size={15} />
              <span>
                <b>Cold-chain breach detected.</b> {cc.breachNote || 'Temperature rose above the 4°C limit.'} Downgrade the
                lot price or reject it — the record is permanent.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
