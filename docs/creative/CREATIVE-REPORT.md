# IsdaLink creative report

**Idea: the fisher is the first letter.** The "i" in IsdaLink is a fishhook, and its dot is the eye where the line ties on. Amber (`--money`) only marks what the fisher earns: prices, totals, Sell.

**Changed**
- `SpeciesArt.jsx`: 9 inline-SVG silhouettes in a 3-token palette replace every emoji (`species-strip.png`, 40/96px, both themes).
- `Brand.jsx`: hook-i mark plus wordmark at 28px (sidebar) and 40px (app icon).
- Catch card: price is the loudest element (32px, 40px for the fisher). Freshness comes from the trace record (grade, hours since landing, hours left), so the "FRESH" badge on 6h-old fish is gone. Buyers see a delivery ETA.
- Fisher mode uses a daylight theme for glare. His lots and orders come first, each card has one big action ("Sell now · 35 kg"), and the copy is plainer.
- Palette: down from 4 accents to **2 accent hues**, money/amber and alert/coral, plus neutrals. Violet and aqua are removed. No raw hex outside the tokens.

**Measured in Chrome (390px, fisher, 5 views + sheets)**
- Targets under 44×44: 0. Smallest is 73×44.
- Price/qty numerals under 20px: 0 (25 measured).
- Horizontal overflow at 390 and 1280: none.
- Clicked through: order → toast → order card, post catch → new lot, accept/pass, role toggle, chart, trace chips/scan, cold-chain booking.

**Not done**
- Buyer desktop targets are still 38–40px, kept for office density.
- Bangus and galunggong are the closest pair at 40px.
- `/opt/data/tmp/islalink-proof` left over (rm blocked).
