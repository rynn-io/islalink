# Brief: IsdaLink — creative direction + visual implementation

You are **Creative**. You own the visual layer of the IsdaLink demo. Ryn (solo founder,
ex-UX designer, Philippines) has a working React demo and says it looks clean but generic.
Your job is to give it a point of view and implement it in code. You are the only agent
allowed to edit `src/` right now.

## Repo
**/projects/islalink** — Vite + React 18. `npm install` is already done. Zero UI
dependencies and you may add none: draw with CSS and inline SVG only. No web fonts from a
CDN, no image downloads, no icon packs.

Current structure:
- `src/styles.css` — all styling, token-based (`--abyss`, `--aqua`, `--sun`, `--coral`, radii, shadows)
- `src/views/` — Marketplace, Prices, Inventory, Logistics, Traceability
- `src/components/` — `Icons.jsx` (inline SVG set), `ui.jsx` (Card/Stat/Pill/Bar/Tag),
  `Chart.jsx` (hand-rolled SVG price chart, ResizeObserver-based), `QrCode.jsx`
- `src/lib/forecast.js` and `src/lib/trace.js` — **frozen contracts, do not edit.**
  They own species data (`SPECIES[]` with `emoji`, `basePrice`, `local`, `name`) and lot records.
- `src/data/market.js` — seeded demo data (catch lots, ports, ice/cold/delivery partners).

There is a live demo behind a public tunnel serving `dist/`. **Do not run `npm run build`**:
it overwrites `dist/` and swaps the asset hashes under the running server.

Verify your work with:
```
npx vite build --outDir /opt/data/tmp/islalink-creative-build --emptyOutDir
```
That must exit 0. Never write to `dist/`.

## The product truth to design for
Two users who could not be more different:
1. **Nestor, small-scale fisher in Dagupan.** Mid-range Android, prepaid data, glaring
   sunlight at the landing, often holding a wet fish in one hand. He is not a power user.
   He needs: what is my fish worth, should I sell now, one big button.
2. **Buyer at a Makati restaurant.** Office, fast, compares three lots, cares about
   freshness grade, traceability and delivery time.

The product's argument is **fisher-first**: the fisher is not the supply side of a
marketplace, he is the protagonist. The current UI reads like a generic dark SaaS dashboard,
which undercuts that.

## What to change (make it measurable, not "more premium")

1. **Kill the emoji as product imagery.** The catch cards currently render `SPECIES[].emoji`
   at 28–34px as if it were a photo. Build a proper species illustration set: one
   `SpeciesArt` component, inline SVG, 9 species (bangus, tilapia, galunggong, tamban,
   lapu-lapu, hipon, alimasag, pusit, tahong). Distinct silhouettes, a shared 2–3 colour
   palette derived from the tokens, no gradients-per-fish noise.
   **Acceptance: at 40px wide, all 9 are distinguishable from each other**, and you show a
   proof strip of all 9 at 40px and at 96px.

2. **Give the brand a mark with an idea.** The current mark is a fish-eye glyph. Pick one
   idea that says "link between fisher and buyer" or "catch to table" and commit to it
   (wordmark + mark). It must work at 28px in the sidebar and as a 40px app icon on a phone
   home screen.

3. **A real hierarchy for the marketplace card.** Right now name/price/meta/foot all carry
   similar weight. A buyer should read *species, price, freshness* in one glance; the
   fisher's price is the number that matters most. Rework the card so the money is the
   loudest element and the freshness signal is honest (it currently says "FRESH" for a lot
   that is 6h old).

4. **Fisher mode should be visibly different, not just different words.** When the role
   toggle is on *Fisher*, the interface should get: larger numerals for price and volume,
   one clear primary action per card, plainer language ("Sell now" not "Order"), and
   touch targets that survive a wet thumb — **every interactive target ≥44×44px,
   price/quantity numerals ≥20px**. Measure it, don't eyeball it.

5. **Tighten the palette.** Two accent hues maximum for meaning (money/positive vs
   alert/urgent), plus neutrals. Right now aqua, sun, coral and violet all compete. Violet
   has no job — give it one or remove it.

## Hard constraints
- All 5 views keep working, plus: order flow (sheet → confirm → toast + order card),
  post-catch flow (sheet → new lot appears in the grid), role toggle, forecast chart,
  trace timeline. **Test each by clicking it**, not by reading the code.
- Mobile-first is real: Ryn tests on a Pixel 10 Pro Fold, both folded (narrow) and open
  (wide). Check 390px and 1280px. Nothing may overflow horizontally.
- Keep it dependency-free, keep `src/styles.css` token-based (a component must not
  invent raw hex values where a token belongs).
- Naming stays consistent: components PascalCase, files match, no dead code left behind.
- Do not edit `src/lib/forecast.js`, `src/lib/trace.js`, or `docs/` from the Architect.
- Do not start or stop the preview server, and do not touch the tunnel.

## Proof you must leave behind
Write to **/projects/islalink/docs/creative/**:
- `market-1280.png`, `market-390.png`, `prices-1280.png`, `trace-390.png`
- `species-strip.png` — the 9 species art at 40px and 96px
- `CREATIVE-REPORT.md` — max 250 words: what the idea is, what changed, the measured
  numbers (touch target sizes, numeral sizes, how many accent hues), what you could not do.

Screenshots must come from a real browser render of your build, not a mock. The box has:
- `/opt/data/bin/chrome-nosandbox` — headless Chrome, works without sudo
- `/opt/data/bin/browser` — browser harness CLI
Serve your build locally on a spare port (`npx vite preview --outDir /opt/data/tmp/islalink-creative-build --port 4190`)
and capture with Chrome at 1280×800 and 390×844. Do not claim a capability is absent without
running `ls -la /opt/data/bin/ | grep -i chrome` first. If a check fails, fix it — do not
report a pass you did not measure.

## Stop clause
If you run out of time, stop at a state where
`npx vite build --outDir /opt/data/tmp/islalink-creative-build --emptyOutDir` exits 0, all
five views render, and `CREATIVE-REPORT.md` says exactly what remains.
