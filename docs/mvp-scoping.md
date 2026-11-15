# IsdaLink — MVP scoping

The rule for this document: **if it doesn't help one cooperative sell one species to repeat buyers at a better price, it waits.**

## 1. Phase 0 pilot: Dagupan, one bangus cooperative

**Port:** Dagupan City, Pangasinan (`landing_site.id = 'dagupan'`).
**Cooperative:** one registered bangus growers' or fisherfolk cooperative in Dagupan, with 40–80 active members. We pick it with BFAR Region 1 and the Dagupan City Agriculture Office. We don't sign with the first coop that says yes (see the selection checklist below).
**Species at launch:** `bangus` only. `tilapia` is added in month 2 if the desk can handle it. Capture species later.

Why Dagupan and bangus:
- **Harvests are scheduled.** A pond harvest is planned days ahead, so lots, listings and buyers can be lined up *before* the fish comes out. Capture fishing gives you 2 hours' notice and no idea of volume. That is the hardest marketplace to run, so it is the wrong place to start.
- **The traceability story is strong and cheap.** A pond has a fixed location, a permit and an operator. "This bangus came from pond X in Barangay Y, harvested at 5 am" is easy to prove.
- **Forecasting is winnable.** Farmed bangus is the least volatile species in the catalogue (demo volatility 5.5%), and coop harvest calendars give us the best supply feature for free.
- **It is the "Bangus Capital".** The Bangus Festival (late April to early May) gives a natural launch moment and LGU attention.
- **Close enough to the buyers.** About 4–5 hours by road to Metro Manila, with bangus trucks already running daily. Plus Pangasinan, La Union and Baguio restaurants are nearer.
- **The demo already lives there.** Nestor Dela Cruz, the demo fisher, is in Dagupan, and the Inventory screen is set there.

Why not the others:
- **Navotas**: the country's biggest fish port. Run by PFDA (Philippine Fisheries Development Authority), dominated by commercial boats and established *consignacion* (consignment) traders. A startup has no leverage there yet, and our core user, the small fisher, is a minority.
- **GenSan**: tuna, export, large commercial players; not our species list.
- **Batangas and Roxas**: good Phase 2 capture-fishery sites, once the app works for scheduled supply.

**Coop selection checklist (all must be true):**
1. CDA-registered and in good standing; the manager can issue official receipts.
2. Has a physical desk or office at or near the landing/pond cluster, with power.
3. The manager uses a smartphone daily and has run a group chat with members.
4. Is **not** owned by, or deeply in debt to, a single trader (*suki* or financier). If it is, that trader will kill the pilot.
5. At least 20 members harvesting in the 90-day window.
6. Agrees to share prices from their logbooks for back-filling.

## 2. What ships in 90 days

Three 30-day blocks. Each ends with something the coop uses for real.

**Days 1–30: Desk and data.** No buyers yet.
- Neon project: plain Postgres schema, Neon Functions, and Managed Better Auth phone OTP via Semaphore.
- **Desk mode** (offline PWA on a ₱8,000 Android tablet): register members, ponds and vessels; record harvest/catch; weigh and create lots; print QR stickers (Bluetooth thermal printer, about ₱3,000); log `iced` events with probe temperature; daily price survey (3–5 trader prices).
- Back-fill 1–2 years of coop price logbooks (student encoder).
- Public trace page `/t/ISL-…` with real events.
- **Success gate:** 95% of harvests recorded, every lot stickered.

**Days 31–60: Sell.**
- Buyer onboarding (manual KYC review), listings, fixed-price orders, one coop per order.
- Order notifications by SMS and in-app; fisher accepts with `OO 3312` by SMS or a tap.
- Pickup at landing, plus "IsdaLink arranges delivery" (manual dispatch, section 4).
- Ledger + manual payment matching + manual GCash payouts.
- 10–15 buyers onboarded by hand: Dagupan and Pangasinan restaurants, 2–3 Baguio/La Union restos, 3–5 Metro Manila buyers on an existing bangus truck route.
- **Success gate:** 30 completed orders, zero payout errors.

**Days 61–90: Prices and loss.**
- Level 1 (range only) price display from back-filled and survey data; level 2 (band for +1 to +3 days) if the data threshold is met. **No sell/hold verdict in Phase 0.**
- Nightly forecast job with guardrails + coop manager override screen.
- Price SMS: `PRESYO`, plus an opt-in 19:30 SMS.
- Shelf-life warnings and `loss` recording, to measure post-harvest loss.
- **Success gate:** 50% of active members read the price at least weekly (app or SMS).

### Deferred (and why)

| Deferred | Why |
|---|---|
| Bids and counter-offers | Fixed prices are enough for 15 buyers, and negotiation over chat is how buyers already work. The `offer` table is ready. |
| Payment gateway, escrow, automatic payouts | Gateway onboarding plus handling other people's money is weeks of compliance. Manual GCash works at 2–5 orders a day. |
| Delivery marketplace, live courier tracking, ETAs | Two or three couriers on a Viber group cover it. |
| Ice and cold-storage booking | A phone call is faster. We log events, not bookings. |
| Bluetooth temperature loggers | Manual probe with photo at each custody change first. Add loggers to the busiest buyer route in Phase 1. |
| Sell/hold verdict | Needs 120+ labelled days and verdict-regret backtests. Range first. |
| Capture species, multiple ports, second coop | Phase 1 after the gates pass. |
| USSD | Needs a telco contract. SMS keywords instead. |
| Native apps | The PWA covers it. |
| Premium subscriptions, B2B procurement subscription, data reports | No one pays for these until there is volume and data. Make the transaction fee work first. |
| Consumer-facing shop | Restaurants and wholesalers buy in volume and repeat. Consumers buy 1 kg once. |

## 3. Success metrics

Measured weekly from the database, compared to a **baseline taken in weeks 1–4** (desk survey of what members got paid before selling through IsdaLink, by trader and size).

| Metric | Definition | 90-day target | Why this number |
|---|---|---|---|
| **Income lift** | Median ₱/kg (normalised size) received by members on IsdaLink orders ÷ median ₱/kg the same members got from traders in the same week, minus 1 | **+8%** | Middleman margins on bangus are usually far above 8%, so this is reachable. Below +5% the fisher has no reason to switch. |
| **Post-harvest loss** | kg in `loss` events ÷ kg landed in lots, for lots sold on the platform | **under 3%**, and lower than baseline | The demo shows 2.1%; a real baseline in Philippine fisheries is often much higher. Measure first, then cut. |
| **Repeat buyer rate** | Buyers with 2+ completed orders in 30 days ÷ buyers with 1+ | **≥ 50%** | One-off buyers mean we are a directory, not a marketplace. |
| **Data completeness** | Lots with: harvest record + weight + `iced` event with temperature + at least one custody temperature + buyer handover, ÷ all lots | **≥ 80%** | This is what makes the traceability claim honest and feeds the forecast. |
| **Price survey coverage** | Days with a valid label (3+ observations from 2+ traders) ÷ days | **≥ 85%** | Below this, forecasts never reach level 2. |
| **Platform share** | kg sold via IsdaLink ÷ kg landed by participating members | **≥ 25%** | Shows whether we are a real channel. |
| **Order defects** | Orders with a dispute, wrong weight or late delivery ÷ orders | **under 5%** | Restaurants leave after two bad deliveries. |

Also watch, with no target: gross merchandise value (GMV, total ₱ of goods sold), take rate, payout time from delivery to GCash.

## 4. What is manual behind the curtain

Users see a product. Behind it, in Phase 0, people do these jobs:

| Looks like | Actually | Who | Time a day |
|---|---|---|---|
| "Verified fisher" badge | Ryn reviews KYC photos in the admin screen | Ryn | 15 min |
| Buyer pays, order confirmed | Ryn matches the GCash reference to the order | Ryn | 20 min |
| "Delivery arranged" | Ryn or coop manager messages a courier on Viber, enters the result | Ryn / manager | 30 min |
| Payout sent | Ryn sends GCash in a batch at 17:00, enters reference numbers | Ryn | 20 min |
| Price data | Desk encoder asks 3–5 traders each morning | Coop encoder | 15 min |
| Harvest calendar, fiestas, closed seasons | Manager or Ryn fill a weekly form | Manager | 5 min/week |
| Forecast review | Manager checks tomorrow's numbers 18:30–19:15 | Manager | 5 min |
| Buyer onboarding | Ryn visits or calls each buyer | Ryn | — |
| Disputes | Ryn calls both sides, decides, writes a ledger adjustment | Ryn | as needed |

Budget: about **1.5 hours a day of Ryn's time**, plus a **paid coop encoder** (part-time, about ₱8,000–₱10,000 a month at the start; aim for the coop or a grant to fund it by month 4). The encoder is the most important hire. Without them, data completeness collapses.

## 5. Per-user running cost

Pilot assumptions: 1 coop, 60 fishers (15 feature-phone only), 15 buyers, about 8 orders a day by day 90.

| Item | Monthly ₱ |
|---|---|
| Neon Free: Postgres + Functions + Managed Better Auth + Object Storage | **0** |
| Cloudflare, GitHub Actions, Sentry | 0 |
| Domain | 60 |
| SMS: OTP + order alerts + price SMS (60 fishers × ~25/month) + buyer alerts | ~1,500 at ₱0.50–₱1 each (**confirm the current Semaphore rate before budgeting**) |
| Android gateway phone load | 300 |
| **Tech total** | **about ₱1,860** |
| Coop encoder | 8,000–10,000 |
| Tablet, printer, probe thermometer, stickers (one-off ₱13,000, over 12 months) | ~1,100 |
| **All-in** | **about ₱11,000–₱13,000** |

**Neon stays ₱0/month for the pilot. Move to Launch only when Postgres storage passes 1 GB or monthly compute passes 100 CU-hours; small intermittent usage then adds roughly ₱850/month ($15).** Those are the capacity triggers, not the date real money starts moving.

**Per active user (75): about ₱25 tech-only, about ₱145–₱175 all-in a month.**

Against revenue: 8 orders a day × about ₱5,000 average × 3% fee × 26 days ≈ **₱31,000 a month**, before the coop's fee share. Phase 0 can roughly cover its own running cost on fees by month 3 if volume shows up. It does not cover Ryn's time. That is what grants are for.

## 6. Grants and partners

Lead with what each one already wants. Do not pitch "AI".

| Partner | What they want | What we offer | Ask |
|---|---|---|---|
| **BFAR** (Bureau of Fisheries and Aquatic Resources), Regional Office 1 | FishR/BoatR registration coverage, traceability, post-harvest loss reduction, data on municipal fisheries | Every lot is tied to a FishR-registered fisher; an anonymised monthly landings-and-price report for the region | Endorsement letter for the coop; data-sharing agreement; introductions to post-harvest programmes (ice, insulated boxes) |
| **DA** (Department of Agriculture): AMAS (Agribusiness and Marketing Assistance Service) and regional field office | Market linkage for farmers and fisherfolk; price monitoring | A working market-linkage channel with measured income lift; price data more local than Bantay Presyo | Grant or programme funding for the encoder and equipment; listing as a market-linkage partner |
| **Dagupan City LGU** (City Agriculture Office) | Local livelihood numbers, Bangus Festival visibility | Launch at the festival; dashboards on member income | Desk space at the landing, festival booth, help choosing the coop |
| **The cooperative** | More income for members, fee revenue, less dependence on one trader | Fee share (`cooperative.fee_share_pct`, start at 20% of IsdaLink's fee), free tools, receipts | Seller-of-record role, the encoder's desk, logbook data |
| **CDA** (Cooperative Development Authority) | Healthy coops | A tool that makes coops viable businesses | Introductions to other fisherfolk coops for Phase 1 |
| **DOST** (Department of Science and Technology) and DICT startup programmes; **Landbank** | Tech-for-countryside stories; financed value chains | An operating pilot with real data | Small grants; Landbank interest in using sales history for fisher credit (Phase 2, needs consent) |

Grant timing: apply in month 2 with real early numbers, not before. A pilot with 30 completed orders is worth more than any deck.

## 7. Phase 1 entry criteria (decide at day 90)

Go to Phase 1 (second species, bids, Bluetooth loggers, second coop or Batangas capture) only if **all** of these hold:
- income lift ≥ +5% for 4 weeks in a row;
- repeat buyer rate ≥ 40%;
- data completeness ≥ 75%;
- the coop wants to continue **and** has paid (or found a grant for) at least part of the encoder.

If not, stay in Dagupan and fix the one that failed. Do not add a port to escape a problem at the first one.
