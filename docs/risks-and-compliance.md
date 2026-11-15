# IsdaLink — Risks and compliance

This is not legal advice. Every item marked **[lawyer]** needs a Philippine lawyer to confirm it before launch. Budget ₱15,000–₱30,000 for a one-time review of the privacy notice, terms, and the seller-of-record setup.

## 1. Data Privacy Act (RA 10173) and the NPC

The National Privacy Commission (NPC) enforces the Data Privacy Act. IsdaLink is a **personal information controller** (it decides what fisher data is collected and why).

What we hold and how sensitive it is:

| Data | Sensitivity | Where |
|---|---|---|
| Name, mobile number, landing site | Personal | `person`, `fisher` |
| FishR number, BoatR, pond permit, ID photos | Personal; **government IDs are *sensitive personal information* under the Act** | `kyc_verification`, private storage bucket |
| GCash number, payout history, income | Personal, financially sensitive | `fisher`, `payout`, `ledger_entry` |
| Pond and landing locations | Personal when tied to a named person | `fish_farm`, `catch_record` |
| SMS content | Personal | `sms_message` |

**What we do:**
1. **Consent per purpose,** recorded in `consent` with the wording version and channel. Paper consent at the coop desk is valid if the form is kept and the encoder logs it (`channel = 'paper_form'`). The privacy notice is in Filipino and in the local language (Pangasinan or Ilocano for Dagupan), **read aloud at sign-up** for members who need it.
2. **The public trace page shows a first name and last initial only** ("Nestor D."), plus the barangay, never the phone or exact pond location. The full name shows only if the fisher opted in (`traceability_public_name`). The demo shows full names ("Nestor Dela Cruz"); the real page must not by default.
3. **Least access.** Buyers see the seller coop and the fisher's public name, never the phone. Coop managers see their own members only. KYC photos are visible to admins only, through short-lived signed links.
4. **Retention.** KYC photos: deleted 30 days after approval (keep the decision and document number). SMS bodies: 12 months. Ledger and trace records: 10 years (tax and food-safety records). Erasure requests anonymise the `person` row (`erased_at`) but keep lots and ledger rows, which the Act allows for legal obligations **[lawyer: confirm the basis]**.
5. **Analytics and data reports** (a revenue line) use only aggregated data: at least 5 fishers per cell, no single-coop breakdowns without the coop's written OK. Selling individual fisher data is off the table.
6. **NPC registration.** Appoint a Data Protection Officer (Ryn, at first) and register with the NPC if the registration thresholds are met. Processing sensitive personal information (government IDs) is one of the triggers **[lawyer: confirm whether IsdaLink must register at pilot size]**. Either way, do the privacy impact assessment: it is a one-page table and makes the rest easier.
7. **Breach plan.** NPC rules require notifying the Commission and affected people within **72 hours** of finding out about a serious breach. Write down who to call and keep a breach log. The breach most likely to happen here is a lost desk tablet: device revocation (`device.revoked_at`) plus a PIN lock on the PWA.
8. **Processors.** Neon, Cloudflare, Semaphore and Sentry process our data. Sign or accept their data processing agreements, and **turn off PII capture in Sentry**.
9. **Data stays where we can account for it.** Neon is a non-Philippine cloud processor: choose the deployment region deliberately, record it in the privacy impact assessment, and cover the cross-border transfer in the consent wording and DPA **[lawyer]**. Confirm the actual project region in the Neon console before storing KYC data.
10. **Vendor lock-in stays bounded.** The database and `schema.sql` are plain Postgres, so data can move; Neon Functions, Managed Better Auth and Object Storage are the replaceable adapters, and using their managed interfaces is the deliberate convenience trade-off.

## 2. BFAR, DA and LGU requirements

| Requirement | Who it applies to | What the product does |
|---|---|---|
| **FishR** (fisherfolk registration, BFAR) | Every fisher and fish farmer | Requested at KYC. Fishers without one get help registering via the coop. The "Source registered" check needs it. |
| **BoatR** (municipal boat registration, BFAR with the LGU) | Boats 3 GT or less | Required for capture lots in Phase 1. No vessel = no capture listing. |
| **Fishing permit / municipal licence** (LGU, under the Fisheries Code RA 8550 as amended by RA 10654) | Municipal fishers | Recorded in KYC. Not checked automatically; the coop vouches. |
| **Fishpond Lease Agreement (FLA)** or LGU pond permit | Bangus/tilapia ponds | `fish_farm.permit_no`. Required for Phase 0 lots. |
| **Closed seasons and protected species** (BFAR administrative orders) | Everyone | Species × area × date blocks in `external_signal` (`closed_season`). **The API refuses a listing** for a closed species in its closed area. Protected species are not in `species` at all. |
| **Shellfish bans** (BFAR red-tide bulletins) | `tahong` | Listing refused for the banned area while the ban is active. |
| **Mayor's / business permit, BIR registration** | The seller of record | That's the cooperative. IsdaLink needs its own for fee income. |
| **Official receipts** | Seller to buyer | Issued by the cooperative. IsdaLink issues receipts for its own fees. |
| **Fish transport / auxiliary invoice** (where the LGU or BFAR requires one for moving fish between municipalities) | Deliveries out of the city | The desk prints one from the order when needed **[check with the Dagupan City Agriculture Office]**. |
| **Courier / delivery** | Third-party couriers | Couriers are independent businesses. IsdaLink coordinates and does not employ drivers. |

**IUU (illegal, unreported, unregulated) fishing:** a traceability platform that accepts unregistered boats becomes a laundering service for illegal catch. A lot from an unregistered source can still be sold through the coop, but its trace page says **"Source not registered"** and the lot gets no "verified" badge.

## 3. Food safety and traceability claims

This is the risk most likely to cause real harm and real liability. The demo makes claims the real system can only make with evidence.

**The rule: the trace page states only what we have a record for.** No record means we say "no record", never "OK".

| Claim | Allowed only when | Otherwise show |
|---|---|---|
| "Cold chain intact" / "Kept at 0–4°C" | A temperature reading at **every custody change** (landing, ice, cold room in/out, dispatch, handover), none above 4°C, no gap longer than 4 hours | "Temperature not monitored for part of this trip" (grey, not red, not green) |
| Freshness grade A/B/C | Time since landing **and** at least one reading after landing | Hours since harvest only; no letter grade |
| "Verified" badge | Approved KYC + FishR + boat or pond permit | No badge |
| "Landed at Dagupan at 05:10" | A desk-recorded catch | "Reported by seller" |
| Anything like "safe to eat", "fresh", "chemical-free", "formalin-free", "sustainably caught", "organic" | **Never.** We have no lab tests or certification. | — |

The demo's `freshness.advice` ("Prime condition — keep at 0–2°C, sell or cook within 18h") is the kind of statement that must be backed by readings. Without them, the real system shows a neutral time-since-harvest line.

**Formalin** (formaldehyde used illegally to make fish look fresh) is a recurring Philippine issue. IsdaLink cannot detect it and must not imply it can. If a buyer reports suspected formalin, the lot is frozen (no more sales), the coop and BFAR are informed, and the `order_line → lot` link gives us the recall list in one query.

**Recall drill:** before launch, run one. Pick a lot, list every buyer who received any part of it (including split child lots), and message them. Target: under 15 minutes.

The Food Safety Act (RA 10611) places primary responsibility for food safety on food business operators. That's the coop as seller and the buyers as handlers. IsdaLink keeps the records. The terms must say this plainly **[lawyer]**.

## 4. Middleman and cooperative politics

Most small fishers sell to a *suki* trader or a *consignacion* agent who often also **lends them money** for fuel, ice, nets or pond inputs, to be repaid from the catch. This is the real competitor, and it is a relationship, not just a price.

| Risk | What happens | Countermeasure |
|---|---|---|
| Trader-financier pressure | A fisher in debt to a trader cannot sell elsewhere without trouble | Don't force exclusivity. Pilot members sell **part** of a harvest through IsdaLink (target 25%). Phase 2: sales history as proof of income for Landbank or coop credit, which replaces the trader's lending role. |
| Traders boycott pilot members | Traders refuse to buy from members who use IsdaLink | Line up enough buyers before the first sale that the coop can sell a full harvest without traders. Start with ponds, where harvest timing is planned. |
| **Traders join as buyers** | — | **Allow it.** A trader who buys on the platform at a visible price is a win: price transparency is the product. |
| Coop leadership capture | A coop officer favours relatives' lots, skims payouts, or is also a trader | Payouts go to each fisher's own GCash, not through the coop treasurer (Phase 0 default). Every member can text `BAYAD` and see their own payouts. Coop fee share goes to the coop account, not a person. |
| Coop politics after an election | New officers drop the platform | Agreement signed by the coop as an organisation, approved at a general assembly, not by one manager. |
| LGU politics | Platform is seen as one official's project | Keep BFAR (national) and the LGU both involved. Don't brand it as anyone's programme. |
| Price data used against fishers | Traders read the forecast and lower their offers | Forecasts are shown to logged-in members and buyers only, not publicly. Treat this as a known trade-off: buyers seeing a fair range usually helps sellers more than it hurts them. |

## 5. Cold-chain liability

**Who is responsible when fish spoils in transit?** Decide before the first order, and put it in the terms:

1. **Seller (coop)** is responsible until handover to the courier, proved by the `dispatched` event with temperature and photo.
2. **Courier** is responsible from pickup to handover, proved by the pickup and `handed_over` readings. Couriers agree to this in their provider terms. Small couriers will not have insurance, so the realistic remedy is not paying the delivery fee plus removal from the list.
3. **Buyer** is responsible after they tap "received". They have **2 hours** to open a dispute with photos.
4. **IsdaLink** coordinates and does not take custody of fish. It is not the carrier **[lawyer: confirm the terms make IsdaLink a coordinator, not a common carrier]**.

Disputes in Phase 0 are decided by Ryn using the readings and photos. Refunds come from whoever the evidence points to. Where there is no evidence, it's split 50/50 between seller and courier, and the platform waives its fee. **That's why the readings at each custody change matter: without them, every dispute is a coin flip.**

**Platform exposure cap:** until there's insurance, IsdaLink's own payment in any dispute is capped at its fee on that order. Keep a small dispute reserve: 0.5% of GMV, held as a ledger account.

## 6. Seasonal cash flow

**For fishers:** typhoon season (June–November) and the northeast monsoon (*amihan*, roughly November–March, rough seas in some areas) cut capture trips; ponds can flood in typhoons. Fishers need cash fast.
- Payouts within 24 hours of delivery confirmation in Phase 0. Fishers who switch from a trader who pays cash on the spot will not wait 7 days.
- That means **IsdaLink fronts payouts** before the buyer pays only if the buyer has prepaid. **Phase 0 rule: buyers prepay. No credit terms.** Some restaurants will refuse this; we lose them for now. **Trade-off:** fewer buyers, but no bad debt that we'd have to cover out of Ryn's pocket.

**For IsdaLink:**
- Revenue follows volume, and volume dips in typhoon months and peaks around Christmas and Holy Week. Plan the runway on the low months, not the average.
- Fixed tech costs are small (about ₱1,860/month at the pilot assumptions, mostly SMS; Neon itself is ₱0 on Free). The encoder is the biggest cost. Try to get a grant to fund 12 months of the encoder before launch.
- **Never hold buyer money longer than needed.** Prepayments sit in a separate business account and get paid out daily. Holding float for other people starts to look like e-money or payment service activity regulated by the BSP (central bank) **[lawyer: confirm the Phase 0 manual setup does not need BSP registration, and when a licensed gateway becomes mandatory]**.

## 7. The bypass problem: buyers going direct after first contact

**The failure mode:** a restaurant buys bangus through IsdaLink once, gets the fisher's number from the delivery, and texts him directly next week. Both save the 3% fee. IsdaLink paid to find the match and earns nothing after. This is *disintermediation*, and it kills most B2B marketplaces in markets built on personal *suki* relationships.

**Accept the part we can't stop.** If the only value is introductions, bypass will happen and should. The design goal is for staying on the platform to be **clearly better for both sides than leaving**.

**Countermeasures, built into the design:**

| # | Countermeasure | How it works in the system |
|---|---|---|
| 1 | **The coop is the seller, not the fisher.** | The buyer's relationship is with the cooperative (`listing.seller_coop_id`), not with Nestor's phone. Going direct means losing the coop's official receipts, its pooled volume (one coop fills a 300 kg order; one fisher can't), and its guarantee. |
| 2 | **No phone numbers shared.** | Buyer and fisher message through the order (in-app or relayed SMS). Couriers see a pickup point and a desk contact, not a fisher's number. |
| 3 | **Traceability only exists on the platform.** | The QR page, the cold-chain record and the "verified" badge, which restaurants show *their* customers, exist only for platform orders. A restaurant marketing "traceable Dagupan bangus" needs us. |
| 4 | **Receipts and records for buyers.** | Official receipts from the coop, monthly purchase statements, and a BIR-ready export. Restaurants and institutions need these; a fisher's text message doesn't give them. |
| 5 | **Fee falls with loyalty.** | 3% for the first orders, falling to 2% for buyers with 4+ orders in 30 days. Going direct saves less than it costs in hassle. |
| 6 | **Fishers benefit from staying.** | Payouts within 24 hours, no bad debt (buyers prepay), price ranges, a sales record that later unlocks credit. Going direct with a restaurant means chasing payment. |
| 7 | **Reliability and substitution.** | When Nestor has no harvest this week, the platform fills the order from another member. A direct relationship with one fisher can't do that. This is the strongest reason a restaurant stays. |
| 8 | **Watch for it.** | Weekly report: buyer-fisher pairs that traded 2+ times and then stopped while both stay active elsewhere. Ryn calls the buyer and asks why. That's a product signal, not a reason to punish anyone. |

**What we deliberately don't do:** no penalty clauses, no account bans for going direct, no hiding the coop's identity. In a small-town market everyone knows everyone, and punishing a buyer would cost us the coop's goodwill.

The coop's fee share (`fee_share_pct`) matters here too: when buyers bypass, the coop loses income, so the coop itself pushes buyers to stay on the platform.

## 8. Other risks, short list

| Risk | Likelihood | Countermeasure |
|---|---|---|
| The encoder quits, data completeness collapses | High | Second trained encoder at the coop; desk mode needs under 1 hour of training. |
| Forecasts wrong in the first typhoon, trust lost | Medium | Guardrails suppress verdicts in typhoon windows; ranges only in Phase 0; liability wording. |
| Payout made to the wrong GCash number | Medium | Number confirmed by SMS OTP when set; first payout is ₱1 test; changes take 24 h and notify the old number. |
| Ryn is the single point of failure | High | Phase 0 manual work is listed and timed (mvp-scoping.md §4). Write a runbook so a coop manager can cover a week. |
| Neon cold start after 5 minutes idle on Free | Medium | The public QR trace page is edge-cached, so repeat scans do not wait for Postgres. A scheduled keep-warm ping from 04:30–07:00 PHT absorbs the first fisher login at 5am; monitor it against the 100 CU-hour limit. Desk writes remain offline-first if either layer is slow. |
| Name "IsdaLink" vs demo trace domain `isla.link` | — | Pick one domain and register it before printing a single QR sticker. Printed QR codes are forever. |
