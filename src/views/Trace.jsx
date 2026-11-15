import { useMemo } from 'react'
import { verifyLot } from '../lib/trace'
import { peso, phtStamp, phtDate, phtTime, NOW } from '../lib/format'
import { Card, CardHead, Stat, Tag } from '../components/ui'
import QrCode from '../components/QrCode'
import { ICONS, IconCheck, IconAlert, IconScan, IconPin, IconQr } from '../components/Icons'

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
            <div className="mono" style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 10, fontSize: 10.5 }}>
              {lot.traceUrl}
            </div>
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
                  <div className="tl-item" key={i} style={pending ? { opacity: 0.5 } : undefined}>
                    <div className={`tl-dot ${e.icon === 'check' ? '' : ''}`}>
                      <Ico size={11} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span className="tl-t">{e.label}</span>
                      {pending && <Tag grade="n">SCHEDULED</Tag>}
                      {typeof e.tempC === 'number' && (
                        <span className="tl-temp" style={e.tempC > 4 ? { color: 'var(--coral)' } : undefined}>
                          {e.tempC}°C
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted)' }}>{phtTime(e.at)}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 34, fontWeight: 750, letterSpacing: -1.5, color: f.grade === 'A' ? 'var(--aqua)' : f.grade === 'B' ? 'var(--sun)' : 'var(--coral)' }}>
                  {f.score}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="bar"><i style={{ width: `${f.score}%` }} /></div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7 }}>
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
                    <IconCheck size={14} style={{ color: 'var(--aqua)' }} />
                  ) : (
                    <IconAlert size={14} style={{ color: 'var(--coral)' }} />
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
