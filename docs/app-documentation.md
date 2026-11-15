# IsdaLink — app documentation

Reference for the React demo: what each screen does, where every number comes from, and how
to change things without breaking the contracts. For the production system (services, schema,
ML pipeline) see the other files in this folder — this document is about the code in `src/`.

- **Stack:** React 18 + Vite 5. No UI libraries, no chart library, no icon pack.
- **Size:** ~3,400 lines across 18 source files.
- **State:** in-memory only. No backend, no persistence, no auth.
- **Clock:** fixed at 2026-11-15, 09:35 PHT (a Sunday). See [Time and determinism](#time-and-determinism).

---

## 1. Running it

```bash
npm install
npm run dev       # dev server on :4180
npm run build     # production bundle → dist/
npm run preview   # serve dist/ on :4180
```

Ports and tunnel hosts are set in `vite.config.js`. `server.allowedHosts` includes
`.trycloudflare.com` so the build can be shared before it has a real domain.

---

## 2. Shell and navigation

`src/App.jsx` is the whole shell: sidebar on desktop, bottom nav under 860px, role toggle in
both.

Five views, registered in one `VIEWS` array:

| id | Label | Mobile label | File |
| --- | --- | --- | --- |
| `market` | Marketplace | Market | `views/Market.jsx` |
| `prices` | Price intelligence | Prices | `views/Prices.jsx` |
| `inventory` | Catch & stock | Stock | `views/Inventory.jsx` |
| `logistics` | Cold chain | Cold | `views/Logistics.jsx` |
| `trace` | Traceability | Trace | `views/Trace.jsx` |

### State model

All state lives in `App.jsx`. No context, no store, no props drilling beyond one level.

| State | Type | Purpose / who mutates it |
| --- | --- | --- |
| `role` | `'buyer' \| 'fisher'` | Drives copy, the `.fisher` theme and which actions exist. Set by the role toggle. |
| `view` | view id | Which screen renders. |
| `listings` | `Listing[]` | The marketplace. Seeded from `data/market.js`, decreased by `placeOrder`, prepended by `postCatch`. |
| `orders` | `Order[]` | The fisher's order inbox. Seeded, filtered by accept/pass. |
| `lots` | `Lot[]` | Five lots derived from the first five listings via `makeLot`, memoised once. |
| `extraLots` | `Lot[]` | Lots opened from the marketplace that weren't in the seed set. |
| `lotId` | `string \| null` | Which lot the traceability screen shows. |
| `toastMsg` | `{ msg, id } \| null` | Transient confirmation, auto-cleared after 3.2s. |

Event flow, the whole cross-screen story:

```
Marketplace "Order" ──▶ placeOrder(listing, qty)
                          └─▶ listings[i].qtyKg -= qty        (stock drops on the market)
Marketplace "Lot"/QR ─▶ openTrace(listing)
                          ├─▶ makeLot({...listing})           (consistent lot for that catch)
                          ├─▶ extraLots.unshift(lot)
                          └─▶ view = 'trace', lotId = lot.lotId
Fisher "Post catch" ──▶ postCatch(form)
                          └─▶ listings.unshift(newLot)        (appears for buyers immediately)
Fisher "Accept/Pass" ─▶ orders.filter(...)                    (badge count follows)
```

---

## 3. Screen reference

### 3.1 Marketplace — `views/Market.jsx`

The only screen that renders differently by role.

**Buyer:** search box, species chips, catch grid, optional "Your orders" card.
**Fisher:** three headline stats, same grid, then an incoming-orders list with Accept/Pass.

Every card shows the species illustration, Filipino name, English name + fisher, price per kilo
with a trend arrow, volume, landing port, and a freshness line taken from **the same lot record
the Traceability view shows**:

```js
freshnessOf(listing)            // builds the lot with makeLot({...listing, now: NOW})
  → { grade, score, ago, left, breach }
    ago   = hours (or minutes) since landing
    left  = shelfLifeHours − hoursSinceLanding
    breach= coldChain.breach      // a warm lot says so on the card
```

That indirection matters: there is no separate freshness rule in the marketplace. If the trace
record says a lot has 31h left, the card says 31h left, and a cold-chain breach surfaces on the
card before the buyer opens the lot.

Two sheets (modal, bottom-sheet on mobile):

- **Order sheet** — quantity slider bounded by available stock, cold-chain delivery checkbox,
  then `subtotal + logistics + 3% IsdaLink fee`. Logistics is `₱180 + ₱3.2/kg` with cold chain,
  a flat ₱90 without. Confirming calls `placeOrder` and pushes a card with the lot ID.
- **Post-catch sheet** — species, volume, price, landing site. Shows the engine's base price as
  a sanity check before posting.

Filters: `species` chip (`'all'` or a Filipino species name) and a free-text query matched
against species names, fisher and port.

### 3.2 Price intelligence — `views/Prices.jsx`

One species at a time, chosen from nine chips. Everything comes from `lib/forecast.js`.

- **Three stats:** today's price, 7-day direction (`deltaPct`), model confidence.
- **`PriceChart`:** 14 recorded days (solid, filled) and 7 forecast days (dashed) with a
  widening confidence band, a `TODAY` divider between them.
- **Verdict card:** `recommendation.headline` / `.detail`, plus a three-row comparison of
  holding two days versus selling today versus the cost of ice and storage.
- **Drivers:** each with a weight bar and an up/down/flat arrow.
- **Demand heat:** seven bars, weekend peaks.
- **Market pulse:** top three risers and fallers across all species.

### 3.3 Catch & stock — `views/Inventory.jsx`

Nestor's own lots (`MY_CATCH` in `data/market.js`). Each row:

```
risk = round(iceHours / shelfHours × 100)        // capped at 97
hours left = shelfHours − iceHours
```

Risk drives the bar colour and the tag colour (`risk ≥ 60` → `alert`/grade C, otherwise
neutral/grade B). The tag **label** comes from the lot's own `status` — `listed` → LISTED,
`risk` → ACT NOW, `cold` → ON ICE — so the wording follows the record rather than being
re-derived from a threshold.

Typical values: bangus 14% risk, tilapia 40%, galunggong 86% — a spread, not a wall of red.

The "Act now" card lists lots with `risk ≥ 60` and estimates the pesos saved by selling instead
of dumping at a discount (30% of lot value).

### 3.4 Cold chain — `views/Logistics.jsx`

Three stacked choices, all live: ice supplier + block count, cold storage facility + lot size,
courier. `cost` recomputes on every change:

```
ice     = blocks × supplier.perBlock
storage = kg × store.perKgDay
haul    = courier.base + courier.perKm × 14        // 14 km, Navotas → Makati
total   = ice + storage + haul
```

Booking swaps the button for a confirmation band with the avoided-spoilage figure
(`kg × ₱42/kg`, the dump price). The route card is static and follows the current selections.

### 3.5 Traceability — `views/Trace.jsx`

Lot chips across the top, then four stats (lot ID, freshness grade, cold chain intact/breach,
audit checks passed).

- **QR + lot details:** the matrix from `lot.qr`, the `traceUrl`, species, fisher, vessel,
  landing site, landing time, shelf life.
- **Handling record:** the ordered `events[]` timeline. Events later than `NOW` are dimmed and
  tagged **SCHEDULED** — a lot is often mid-journey, so the record shows what has happened and
  what is booked.
- **Freshness:** score, bar, hours since landing, shelf life, advice.
- **Buyer checks:** `verifyLot(lotId).checks` — five independent claims about the record, and
  some lots genuinely fail one (a temperature probe over 4°C, for example). A breach banner
  appears when `coldChain.breach` is true.

---

## 4. Component reference

All in `src/components/`. Nothing here fetches or mutates state; they take props and render.

| Component | Props | Notes |
| --- | --- | --- |
| `Card` | `children, className, ...rest` | Surface + border + shadow. |
| `CardHead` | `title, sub?, right?` | `right` is the trailing slot (pill, button). |
| `Stat` | `k, v, d?, tone?` | Label, value, detail line. `tone` is `up` / `down`. |
| `Pill` | `children, tone?, title?` | Small rounded label. |
| `Bar` | `value, max = 100, tone?` | Progress bar; used for risk and drivers. |
| `Tag` | `grade, children` | `A` mint, `B` amber, `C` coral, anything else neutral. |
| `Chips` | `items, value, onChange` | `items` is `{id, label}[]`; single-select. |
| `Empty` | `children` | Empty-state paragraph. |
| `PriceChart` | `history, forecast, height = 208, accent = 'var(--money)'` | SVG, measures its own container width with a `ResizeObserver`. `history` items need `date` + `price`; `forecast` items need `date`, `price`, and optionally `low`/`high` for the band. |
| `Spark` | `values, width = 74, height = 24, tone = 'var(--mist)'` | Tiny inline trend line. |
| `QrCode` | `matrix, size = 190, label?` | Renders `boolean[][]` as a CSS grid. Not a scannable QR. |
| `BrandMark` | `size = 28` | The hook-i. |
| `Wordmark` | — | Mark plus "IsdaLink". |
| `SpeciesArt` | `id, size = 48, title?, className?` | Inline SVG silhouette. `SPECIES_ART_IDS` lists the valid ids. |
| `Icon*` | `size = 18` | Inline SVG set; `ICONS` maps `boat/ice/cold/truck/market/check` for event icons. |

---

## 5. Engine contracts

These two modules are the demo's data layer. They are **frozen contracts** — views read them,
nothing else writes them, and both are deterministic.

### `lib/forecast.js`

```js
SPECIES = [{ id, name, local, emoji, basePrice, volatility, seasonality: { amplitude, peakMonths } }]
// 9 species: bangus, tilapia, galunggong, tamban, lapulapu, hipon, alimasag, pusit, tahong
// `local` is the Filipino name used in the UI. `basePrice` is ₱/kg.

getForecast(speciesId, { days = 7, today = '2026-11-15' }) → {
  species, today,
  history:  [{ date, price }],              // 14 days BEFORE today, ascending
  forecast: [{ date, price, low, high }],   // `days` entries starting today
  deltaPct,                                  // last forecast vs last recorded, 1dp
  confidence,                                // 0–100, falls with volatility
  recommendation: { verdict, headline, detail },   // 'hold' | 'sell' | 'sell-now'
  drivers: [{ label, impact, weight, note }]       // impact: 'up' | 'down' | 'flat'
}

getMarketSummary(today) → { avgDeltaPct, risers: [3], fallers: [3], note }
getDemandHeat(today)    → [{ day, score }]   // 7 entries from today
```

Price = `basePrice` × (seasonal wave + typhoon supply + diesel drift + calendar demand + seeded
jitter), each term centred so a normal week lands back on `basePrice`. The verdict is computed
from `deltaPct` against a volatility-scaled threshold — choppier species need a bigger move
before the model says "hold".

An unknown species id **throws** with the valid ids listed, rather than returning `NaN`.

### `lib/trace.js`

```js
makeLot({ species, boat, fisher, lbs, landedAt, lotId?, now? }) → {
  lotId,          // ISL-<YYWW>-<SP3>-<NNNN>
  traceUrl,       // https://isla.link/t/<lotId>
  species, boat, fisher, lbs, landedAt,
  qr: { size: 25, matrix: boolean[][] },
  events: [{ at, label, place, actor, icon, tempC?, note? }],   // 5–7, chronological
  freshness: { score, grade, hoursSinceLanding, shelfLifeHours, advice },
  coldChain: { minC, maxC, breach, breachNote? }
}

makeLots(n = 6, now) → Lot[]        // 1–12 varied preset lots
verifyLot(lotId) → { verified, lotId, checks: [{ label, ok, detail }] }   // 5 checks
```

`lotId` is derived from species + boat + landedAt unless passed in. Passing one pins it, which
is how the marketplace and the trace screen stay consistent for the same catch. `now` defaults
to `landedAt + 9h`, so freshness is a function of the arguments, never of the wall clock.

### `lib/format.js`

`peso(n, decimals = 0)`, `kg(n)`, `pct(n)`, `phtTime(iso)`, `phtDate(iso)`, `phtStamp(iso)`,
`hoursBetween(a, b)`, `relHours(iso, now)`, plus the demo clock:

```js
NOW   = new Date('2026-11-15T09:35:00+08:00')   // a Sunday morning
TODAY = '2026-11-15'
```

All times are rendered in PHT (UTC+8) regardless of the reader's timezone.

### `data/market.js`

Seeded demo content: `PORTS` (Navotas, Dagupan, Batangas, Roxas, GenSan), `LISTINGS` (8 lots),
`MY_CATCH` (3 lots with `iceHours` / `shelfHours`), `INCOMING_ORDERS` (3), `ICE_SUPPLIERS`,
`COLD_STORES`, `COURIERS`, `FISHER_STATS`, `NOTIFICATIONS`. `speciesByLocal(name)` resolves a
Filipino name to its `SPECIES` entry, case- and hyphen-insensitive, so data files stay readable.

---

## 6. Time and determinism

Nothing reads `Date.now()`, `new Date()` with no argument, or `Math.random()`. Randomness is a
`mulberry32` PRNG seeded from an FNV-1a hash of the inputs. Two consequences:

1. The same lot ID always yields the same QR matrix, the same event timestamps and the same
   cold-chain readings — on any device, any day.
2. Time-dependent values take `now` as a parameter. To see the demo on another day, change
   `NOW` and `TODAY` in `lib/format.js` and pass the new date; do not introduce a clock read.

This is what makes the screens verifiable: a screenshot can be compared against a claim.

---

## 7. Styling

One stylesheet, `src/styles.css`, tokens first.

**Two meaning colours, by design:**

| Token | Means |
| --- | --- |
| `--money` / `--money-dim` / `--money-line` | prices, earnings, the primary action |
| `--alert` / `--alert-dim` / `--alert-line` | spoilage, breach, falling prices, urgent |

Neutrals (`--ink`, `--surface`, `--paper`, `--mist`) carry everything else.

**Two themes on the same tokens:**

- Default (`:root`) — deep-sea dark, for buyers at a desk.
- `.app.fisher` — daylight sand, built for glare at a landing. Also raises the type scale
  (`.fisher .h1 { font-size: 30px }`, price numerals to 40px) and enforces `--tap` (44px)
  minimums on buttons, chips, rows, radio inputs and range sliders.

Breakpoints: **860px** (sidebar → bottom nav, grids collapse) and phone-specific tweaks below.
`.role-inline` is the role toggle that only appears when the sidebar is hidden.

---

## 8. Extending the demo

**Add a species.** Append to `SPECIES` in `lib/forecast.js` (give it a real `basePrice` and
`volatility`), add a silhouette in `SpeciesArt.jsx` keyed by the same `id`, then use its
`local` name in `data/market.js`. Nothing else needs to know.

**Add a screen.** Create `views/Thing.jsx`, add an entry to `VIEWS` in `App.jsx` with `id`,
`label`, `short` and an icon, then render it in the same conditional block. The nav, mobile nav
and badge logic pick it up automatically.

**Change the demo day.** Edit `NOW` and `TODAY` in `lib/format.js`. Prices, freshness, lot event
schedules and demand heat all shift with them.

**Change the fee or logistics pricing.** Order maths lives in `OrderSheet` inside
`views/Market.jsx`; the 3% is one expression, logistics is one ternary.

---

## 9. Verified state, and known gaps

Measured against the production build in a headless browser, not eyeballed:

- Build: `vite build` exits 0, 46 modules, ~213 KB JS / ~23 KB CSS.
- Marketplace at 390px: 29 interactive elements, **0 under 44×44px**, no horizontal overflow.
- Marketplace at 1280px: no horizontal overflow.
- Flows exercised end to end: order (stock 120 → 100 kg, order card, toast), post-catch
  (8 → 9 lots), accept/pass, role toggle, species switching in Prices, cold-chain booking,
  trace chips and lot switching.

Known gaps, stated plainly:

- **No tests.** There is no runner in this repo; verification was browser-driven and its
  captures are in `docs/creative/`.
- **No persistence.** Refresh resets everything.
- **QR is decorative** — deterministic, but not a scannable payload.
- **Desktop buyer buttons are 38–40px.** The 44px floor is enforced for the fisher theme only.
- **Bangus and galunggong are the closest pair** of illustrations at 40px.
- **No routing.** Views are state, not URLs, so you can't link to a screen.
