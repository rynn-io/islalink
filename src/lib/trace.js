/**
 * IsdaLink — deterministic seafood traceability + QR-pattern generator.
 * Zero deps, no Math.random()/Date.now(): every field comes from a 32-bit FNV-1a hash of the
 * lot id, so identical inputs give identical output and verifyLot() always agrees with the
 * record makeLot() built for that id.
 */

const DEFAULTS = { species: 'Bangus', boat: 'F/B Sta. Clara 3', fisher: 'Nestor Dela Cruz', lbs: 'Navotas Fish Port', landedAt: '2026-11-15T04:20:00+08:00' };

const SPECIES_CODE = {
  bangus: 'BAN', galunggong: 'GAL', tilapia: 'TIL', tanigue: 'TAN', 'lapu-lapu': 'LAP', lapulapu: 'LAP',
  alumahan: 'ALU', tamban: 'TAM', dilis: 'DIL', pusit: 'PUS', hipon: 'HIP', alimango: 'ALI', sugpo: 'SUG',
  mayamaya: 'MAY', bisugo: 'BIS', tulingan: 'TUL', matambaka: 'MAT',
};
const COLD_ROOMS = ['Balintawak Cold Storage, Quezon City', 'BluCold Facility, Navotas', 'Harbor Cold Chain, Manila North Harbor', 'Southgate Cold Room, Parañaque'];
const MARKETS = ['Divisoria Seafood Market, Manila', 'Pasig Mega Market', 'Bulungan Fish Market, Taguig', 'Muntinlupa Public Market', 'Marikina Public Market'];

/** FNV-1a 32-bit hash. @param {string} s @returns {number} */
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded PRNG. @param {number} seed @returns {() => number} values in [0,1) */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const addHours = (iso, h) => new Date(Date.parse(iso) + h * 3600000).toISOString();
const hoursBetween = (fromIso, toIso) => (Date.parse(toIso) - Date.parse(fromIso)) / 3600000;

/** 3-letter uppercase species code, e.g. Bangus -> BAN. @param {string} species @returns {string} */
function speciesCode(species) {
  const key = String(species).toLowerCase().replace(/[^a-z-]/g, '');
  return SPECIES_CODE[key] || (key.replace(/-/g, '').slice(0, 3) || 'FIS').toUpperCase().padEnd(3, 'X');
}

/** YYWW ISO-week stamp from the literal date part of an ISO string. @param {string} iso @returns {string} */
function isoYearWeek(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  const d = new Date(iso);
  const t = Date.UTC(m ? +m[1] : d.getUTCFullYear(), m ? +m[2] - 1 : d.getUTCMonth(), m ? +m[3] : d.getUTCDate());
  const thursday = new Date(t + (4 - (new Date(t).getUTCDay() || 7)) * 86400000);
  const week = Math.floor((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 604800000) + 1;
  return `${String(thursday.getUTCFullYear() % 100).padStart(2, '0')}${String(week).padStart(2, '0')}`;
}

/** Lot id: ISL-<YYWW>-<CODE>-<4 digits>, derived from species + boat + landedAt. */
function deriveLotId({ species, boat, landedAt }) {
  const h = hashString(`${species}|${boat}|${landedAt}`);
  return `ISL-${isoYearWeek(landedAt)}-${speciesCode(species)}-${String((h % 9999) + 1).padStart(4, '0')}`;
}

/** Cold-chain probe summary, derived from lotId only so verifyLot() can re-check it. */
function coldChainFor(lotId) {
  const r = mulberry32(hashString(`${lotId}#cold`));
  const minC = round1(-2 + r() * 3);
  const maxC = round1(0.4 + r() * 5.4);
  const breach = maxC > 4;
  const out = { minC, maxC, breach };
  if (breach) out.breachNote = `Probe logged ${maxC}°C for ~${round1(0.5 + r() * 2)}h (safe limit 4°C) — re-ice before sale.`;
  return out;
}

/** 25x25 QR-like demo module: 3 finders, separators, timing rows, alignment, seeded data. */
function buildQr(lotId) {
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const used = Array.from({ length: size }, () => Array(size).fill(false));
  const put = (r, c, v) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    matrix[r][c] = v;
    used[r][c] = true;
  };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inBox = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const ring = !r || r === 6 || !c || c === 6;
        put(r0 + r, c0 + c, inBox && (ring || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) put(18 + r, 18 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
  }
  for (let i = 8; i < size - 8; i++) {
    put(6, i, !(i % 2));
    put(i, 6, !(i % 2));
  }
  put(17, 8, true); // dark module
  const rng = mulberry32(hashString(`${lotId}#qr`));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (!used[r][c]) matrix[r][c] = rng() < 0.5;
  }
  return { size, matrix };
}

const EVENT_PLAN = [
  { h: 0, icon: 'boat', label: 'Landed, weighed & tagged', where: 'port', actor: 'fisher' },
  { h: 0.4, icon: 'ice', label: 'Iced in insulated totes', where: 'port', actor: 'Ice crew', tempC: 1.2 },
  { h: 1.8, icon: 'cold', label: 'Cold storage intake scan', where: 'cold', actor: 'Cold room ops', tempC: 1.6 },
  { h: 6.2, icon: 'check', label: 'Quality & weight re-check', where: 'cold', actor: 'QA inspector', tempC: 2.1, optional: true },
  { h: 9.0, icon: 'truck', label: 'Reefer van dispatch', where: 'route', actor: 'Driver · J. Ramos', tempC: 2.0 },
  { h: 11.2, icon: 'market', label: 'Turned over to buyer', where: 'market', actor: 'Buyer' },
  { h: 11.6, icon: 'check', label: 'Buyer QR verification', where: 'market', actor: 'Buyer app', optional: true },
];

/** 5-7 chronological handling events: landing -> ice -> cold storage -> truck -> buyer. */
function eventsFor(lotId, ctx) {
  const r = mulberry32(hashString(`${lotId}#events`));
  const target = 5 + Math.floor(r() * 3);
  const coldRoom = pick(r, COLD_ROOMS);
  const market = pick(r, MARKETS);
  // The 5 core steps always run; the two optional audit steps are woven in by time.
  const core = EVENT_PLAN.filter((e) => !e.optional);
  const extra = EVENT_PLAN.filter((e) => e.optional).sort((a, b) => a.h - b.h);
  return [...core, ...extra.slice(0, target - core.length)].sort((a, b) => a.h - b.h).map((e, i) => {
    const place = e.where === 'port' ? ctx.lbs : e.where === 'cold' ? coldRoom
      : e.where === 'route' ? 'EDSA–C5 reefer route, Metro Manila' : market;
    const ev = { at: addHours(ctx.landedAt, e.h), label: e.label, place, actor: e.actor === 'fisher' ? ctx.fisher : e.actor, icon: e.icon };
    if (e.tempC !== undefined) ev.tempC = ctx.cold.breach && e.icon === 'truck' ? round1(ctx.cold.maxC) : e.tempC;
    if (ctx.cold.breach && e.icon === 'truck') ev.note = 'Probe spike during dispatch — see cold chain log.';
    if (i === 0) ev.note = `Lot ${lotId} · ${ctx.boat}`;
    return ev;
  });
}

/**
 * Build one deterministic traceability record.
 * @param {{species?: string, boat?: string, fisher?: string, lbs?: string, landedAt?: string,
 *   lotId?: string, now?: string}} opts
 * @returns {{lotId: string, traceUrl: string, species: string, boat: string, fisher: string, lbs: string,
 *   landedAt: string, qr: {size: number, matrix: boolean[][]}, events: Array<{at: string, label: string,
 *   place: string, actor: string, icon: 'boat'|'ice'|'cold'|'truck'|'market'|'check', tempC?: number, note?: string}>,
 *   freshness: {score: number, grade: 'A'|'B'|'C', hoursSinceLanding: number, shelfLifeHours: number, advice: string},
 *   coldChain: {minC: number, maxC: number, breach: boolean, breachNote?: string}}}
 */
export function makeLot(opts = {}) {
  const species = opts.species || DEFAULTS.species;
  const boat = opts.boat || DEFAULTS.boat;
  const fisher = opts.fisher || DEFAULTS.fisher;
  const lbs = opts.lbs || DEFAULTS.lbs;
  const source = opts.landedAt || DEFAULTS.landedAt;
  const landedAt = new Date(source).toISOString();
  const lotId = opts.lotId ? String(opts.lotId).trim().toUpperCase() : deriveLotId({ species, boat, landedAt: source });
  const nowIso = new Date(opts.now || addHours(landedAt, 9)).toISOString();

  const coldChain = coldChainFor(lotId);
  const shelfLifeHours = 30 + (hashString(`${lotId}#shelf`) % 15);
  const hoursSinceLanding = round1(Math.max(0, hoursBetween(landedAt, nowIso)));
  let score = Math.round(97 - clamp(hoursSinceLanding / shelfLifeHours, 0, 1.4) * 62);
  if (coldChain.breach) score -= Math.round(8 + (coldChain.maxC - 4) * 3);
  score = clamp(score, 3, 99);
  const grade = score >= 80 ? 'A' : score >= 55 ? 'B' : 'C';
  const left = Math.max(0, Math.round(shelfLifeHours - hoursSinceLanding));
  const advice = coldChain.breach
    ? `${grade}-grade after a cold-chain spike — re-ice to 0–2°C and sell within ${Math.min(left, 8)}h.`
    : grade === 'A'
      ? `Prime condition — keep at 0–2°C, sell or cook within ${left}h.`
      : grade === 'B'
        ? `Good but ageing — display today, sell within ${left}h, check gills before sale.`
        : 'Past its best — discount for quick sale, do not hold overnight.';

  return {
    lotId, traceUrl: `https://isla.link/t/${lotId}`, species, boat, fisher, lbs, landedAt,
    qr: buildQr(lotId),
    events: eventsFor(lotId, { landedAt, boat, fisher, lbs, cold: coldChain }),
    freshness: { score, grade, hoursSinceLanding, shelfLifeHours, advice },
    coldChain,
  };
}

const LOT_PRESETS = [
  { species: 'Bangus', boat: 'F/B Sta. Clara 3', fisher: 'Nestor Dela Cruz', lbs: 'Navotas Fish Port', landedAt: '2026-11-15T04:20:00+08:00' },
  { species: 'Galunggong', boat: 'F/B Maria Lourdes', fisher: 'Reynaldo Santos', lbs: 'Navotas Fish Port', landedAt: '2026-11-15T03:05:00+08:00' },
  { species: 'Tilapia', boat: 'Bangka ni Aling Mila', fisher: 'Mila Reyes', lbs: 'Bulungan Fish Landing, Taguig', landedAt: '2026-11-14T23:40:00+08:00' },
  { species: 'Tanigue', boat: 'F/B San Roque', fisher: 'Danny Villamor', lbs: 'Bacoor Fish Port, Cavite', landedAt: '2026-11-14T21:15:00+08:00' },
  { species: 'Lapu-lapu', boat: 'F/B Sto. Niño', fisher: 'Jomar Aquino', lbs: 'Sual Fish Landing, Pangasinan', landedAt: '2026-11-15T02:30:00+08:00' },
  { species: 'Pusit', boat: 'F/B Malaya', fisher: 'Efren Bautista', lbs: 'Malabon Fish Landing', landedAt: '2026-11-15T01:10:00+08:00' },
  { species: 'Hipon', boat: 'F/B Perlas ng Dagat', fisher: 'Lorna Gatchalian', lbs: 'Bacoor Fish Port, Cavite', landedAt: '2026-11-14T19:50:00+08:00' },
  { species: 'Tamban', boat: 'F/B Sta. Clara 3', fisher: 'Nestor Dela Cruz', lbs: 'Navotas Fish Port', landedAt: '2026-11-15T05:00:00+08:00' },
  { species: 'Alumahan', boat: 'F/B Maria Lourdes', fisher: 'Reynaldo Santos', lbs: 'Malabon Fish Landing', landedAt: '2026-11-14T22:45:00+08:00' },
  { species: 'Dilis', boat: 'Bangka ni Aling Mila', fisher: 'Mila Reyes', lbs: 'Bulungan Fish Landing, Taguig', landedAt: '2026-11-14T20:05:00+08:00' },
  { species: 'Alimango', boat: 'F/B San Roque', fisher: 'Danny Villamor', lbs: 'Sual Fish Landing, Pangasinan', landedAt: '2026-11-15T00:20:00+08:00' },
  { species: 'Tulingan', boat: 'F/B Malaya', fisher: 'Efren Bautista', lbs: 'Navotas Fish Port', landedAt: '2026-11-14T23:05:00+08:00' },
];

/**
 * Varied demo lots, deterministic (same n + now always yields identical output).
 * @param {number} [n=6] how many lots, clamped to 1..12
 * @param {string} [now] ISO reference time for freshness; defaults to landing + 9h per lot
 * @returns {Array<ReturnType<typeof makeLot>>}
 */
export function makeLots(n = 6, now) {
  const count = clamp(Math.round(Number(n) || 1), 1, 12);
  return LOT_PRESETS.slice(0, count).map((p) => makeLot(now ? { ...p, now } : p));
}

/**
 * Audit a lot id; checks derive from the same hash as makeLot(), so they agree with the record
 * (some lots intentionally show a failed or soft check).
 * @param {string} lotId
 * @returns {{verified: true, lotId: string, checks: Array<{label: string, ok: boolean, detail: string}>}}
 */
export function verifyLot(lotId) {
  const id = String(lotId || '').trim().toUpperCase();
  const cold = coldChainFor(id);
  const r = mulberry32(hashString(`${id}#verify`));
  const roll = (p) => r() < p;
  const reg = 1000 + Math.floor(r() * 8999);
  const weight = round1(120 + r() * 380);
  const price = 180 + Math.floor(r() * 120);
  return {
    verified: true,
    lotId: id,
    checks: [
      { label: 'Source registered', ok: !roll(0.06), detail: `Boat and fisher on file with the cooperative (reg. NW-${reg}).` },
      { label: 'Landing logged', ok: !roll(0.09), detail: `Landing weight ${weight}kg signed off at the port desk.` },
      { label: 'Cold chain intact', ok: !cold.breach, detail: cold.breach ? cold.breachNote : `Probe range ${cold.minC}°C to ${cold.maxC}°C, within the 4°C limit.` },
      { label: 'No price tampering', ok: !roll(0.12), detail: `Bid history hash matches the posted ₱${price}/kg.` },
      { label: 'Trace QR matches lot', ok: !roll(0.05), detail: 'Quoted lot id resolves to the printed QR payload.' },
    ],
  };
}
