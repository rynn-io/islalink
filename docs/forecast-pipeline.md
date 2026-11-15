# IsdaLink — Forecast pipeline

This replaces the stand-in `src/lib/forecast.js` (seeded random numbers) with a real price model. The output keeps the `getForecast()` shape so the Prices screen does not change much.

Words used below:
- **Label**: the true answer the model learns to predict. Here: the price actually paid.
- **Feature**: an input the model uses to guess the label (day of week, diesel price, typhoon signal…).
- **Ex-vessel price**: what the first buyer pays the fisher at the landing, before any middleman markup. For ponds the same idea is called **farmgate price**.
- **MAPE (Mean Absolute Percentage Error)**: on average, how far off the middle forecast was, in percent. A MAPE of 8% on a ₱200 fish means typically ₱16 off.
- **Quantile / p10, p50, p90**: p50 is the middle guess. The real price should land below p10 only 1 day in 10, and above p90 only 1 day in 10. The band p10–p90 is what we show as "likely range".
- **Backtest**: pretend it is a past date, forecast with only the data available then, and score against what really happened.
- **Drift**: the world changes so the model's past patterns stop matching.

## 1. What we predict

**One number per species × landing site × PHT day: the ex-vessel (or farmgate) price in whole ₱/kg, normalised to that species' reference size.**

- Horizons: day +1 to day +7. The demo allows 30 days; **real forecasts stop at 7.** Beyond a week, weather and supply are unknowable at a landing site, and a 30-day band would be honest only by being uselessly wide.
- Published: p10, p50, p90 plus a verdict (`hold`, `sell`, `sell-now`, the same values as the demo).
- Why ex-vessel and not retail: the fisher's decision is "sell now at the landing, or hold on ice". Retail prices (DA Bantay Presyo) are a **feature**, not the label; they lag and include 30–80% middleman markup.

### Building the daily label from raw observations
1. Take `price_observation` rows with `price_level` in (`ex_vessel`, `farmgate`) and `quality_flag = 'ok'` for that species, site and day.
2. Convert each to the reference size (next section) → `normalised_php`.
3. Label = **volume-weighted median** of `normalised_php`. A median ignores one crazy trade; volume weighting stops a 2 kg sale outweighing a 300 kg one. Observations with no volume count as 10 kg.
4. A day needs **at least 3 observations from at least 2 different buyers or traders**; otherwise the label is missing for that day. Days with no label are not filled in; the model just skips them.
5. Outlier flag: more than 3 MADs (median absolute deviation, a robust "typical spread") away from the 14-day median gets `quality_flag = 'outlier'` and is left out, but kept in the table.

### Normalising grade and size
Fish price depends heavily on size: bangus at 2–3 pieces per kg sells well above 5–6 pcs/kg. Every observation records `size_class` as text like `bangus:3-4pcs/kg`.

| Species | Reference size (`species.reference_size_class`) | How size is recorded at the desk |
|---|---|---|
| bangus | 3–4 pcs/kg | pieces per kg |
| tilapia | 3–4 pcs/kg | pieces per kg |
| galunggong | 10–12 pcs/kg ("medium") | small / medium / large |
| tamban | mixed | not graded |
| lapulapu | 500 g–1 kg per piece, live or fresh-dead | weight per piece + live flag |
| hipon | 40–50 pcs/kg | pieces per kg |
| alimasag | medium (4–6 pcs/kg) | small / medium / large |
| pusit | 8–12 pcs/kg | pieces per kg |
| tahong | mixed, in shell | not graded |

The conversion factor is a ratio table per species and size class: the median price of that class divided by the median price of the reference class, on days when both were traded at the same site. It is **re-estimated monthly**, and starts from values the coop desk writes down in week 1 ("large is usually ₱20–30 above medium"). Until 30 paired days exist, observations not in the reference class are kept but not used as labels. **Trade-off:** fewer labels early, but no made-up conversions poisoning the model.

Live versus dead (lapulapu, alimasag) is a separate size class, not a conversion; the price gap is too large to rescale.

## 2. Features

All features must be known **before** the forecast is made, at 18:30 PHT the day before the target date. Anything learned later (like the next day's actual landings) cannot be used. Breaking this rule is called **leakage** and makes backtests look great and real use bad.

| Group | Feature | Source | Notes |
|---|---|---|---|
| Recent price | label lags 1, 2, 3, 7, 14 days; 7- and 28-day rolling median | `price_observation` | Strongest features by far. |
| Recent price | same species at the nearest other site, lag 1 | `price_observation` | Navotas leads Dagupan for galunggong by about a day. |
| Supply | kg landed of this species at the site, last 1, 3 and 7 days | `catch_record` + `lot` | Only covers coop-recorded landings, so it is used as a **ratio to its own 28-day median**, not as total market supply. |
| Supply | count of boats landing yesterday | `catch_record` | Proxy for fishing effort. |
| Supply | planned pond harvests in the next 7 days (kg) | coop harvest calendar, entered manually | **The best bangus/tilapia feature.** Pond harvests are scheduled; a glut is visible a week ahead. |
| Weather | PAGASA tropical cyclone wind signal over the site's province (0–5), today and forecast +1/+2 | PAGASA bulletins, entered or scraped into `external_signal` | Signal 1 or higher usually means no fishing trips for municipal boats. |
| Weather | gale warning in effect for the site's coastline | PAGASA gale warning | |
| Weather | forecast wave height and wind, +1 to +3 days | Open-Meteo marine API (free) | Sea state is what actually stops small boats. |
| Weather | days since the last signal ended | derived | Post-typhoon catch is often a glut. |
| Fuel | diesel pump price ₱/L, weekly | DOE Oil Monitor | Matters for municipal boats: fuel is the biggest trip cost. Use the weekly change, not the level. |
| Calendar | day of week, PHT | derived | Saturday is the big palengke (wet market) day (demo `getDemandHeat`). |
| Calendar | payday flag (15th and 30th, ±1 day) | derived | Payday weekends lift demand for premium species. |
| Calendar | Lent Fridays, Holy Week day offset (−9 to +1 from Easter) | derived (the demo's `easterIndex` is correct and reusable) | Holy Week is the year's biggest seafood-demand spike. |
| Calendar | Christmas season (Dec 16–Jan 1), Noche Buena (Dec 24), New Year's Eve | derived | |
| Calendar | regular and special non-working holidays | official Proclamation each year, entered in `external_signal` | Moves every year, so it cannot be hard-coded. |
| Calendar | local fiesta within 30 km (e.g. Dagupan Bangus Festival, late April to early May) | manual, per site | Small effect nationally, large locally. |
| Calendar | school opening and closing weeks | DepEd calendar | Changes household budgets. |
| Supply shock | BFAR closed season active (e.g. sardine/herring closures in Visayan Sea and Zamboanga, Nov–Feb) | BFAR administrative orders, manual | Hits tamban hard. |
| Supply shock | fish kill / red tide (shellfish ban) advisory in the area | BFAR shellfish bulletin, manual | Tahong: a red-tide ban means a price of zero locally. **Suppress the forecast** instead of predicting. |
| Imports | imported galunggong or other frozen arrival announced | DA/BFAR import notices, news, manual | Galunggong prices drop when imports land. |
| Retail | DA Bantay Presyo NCR retail price, latest available | DA | A lagging demand signal; the gap between retail and ex-vessel helps. |
| Season | day of year as sine and cosine | derived | Lets the model learn yearly patterns smoothly. |

Manual features (harvest calendar, fiestas, closed seasons, imports) are entered by the coop manager or Ryn in a 5-minute weekly admin form. **Trade-off:** human effort, but these are the features no public API provides and they matter most.

## 3. Models: start simple, earn complexity

Four candidates, all producing p10/p50/p90:

| # | Model | How it works | When it wins |
|---|---|---|---|
| 1 | **Seasonal naive** | Tomorrow = same weekday last week, adjusted by the last 7-day trend. Band = past 60 days of its own errors at that horizon. | Always the baseline. Hard to beat at day +1 for stable farmed species. |
| 2 | **Rolling median + calendar** | 28-day median × a multiplier for the weekday and each calendar event, learned from history. | Species with strong calendar effects but little data (pusit, lapulapu). Fully explainable: "Holy Week usually +18%". |
| 3 | **ETS** (exponential smoothing, a classic forecasting method that weights recent prices more) | Per species × site. | Long, clean series with steady seasonality. |
| 4 | **XGBoost quantile regression** | One gradient-boosted tree model per quantile (p10, p50, p90), **pooled across all species and sites**, with species and site as features. | Once there is about a year of data across several sites; it learns typhoon and supply effects that the simple models miss. |

**XGBoost** builds many small decision trees, each one correcting the previous ones' errors. It handles mixed features (numbers, categories, missing values) well and trains in seconds on our data size. It beats deep learning on small tabular data.

**Decision rule, checked in every weekly backtest, per species:** XGBoost becomes champion for a species only if its 28-day rolling MAPE at horizon +1 beats the best simple model by **at least 10% relative** (e.g. 9.0% vs 10.0%) **and** its p10–p90 band holds 75–85% of actual prices. Otherwise the simple model stays champion.

The simple model will win when:
- the series is short (under 1 year): XGBoost has nothing to learn from;
- the species is farmed and harvests are scheduled (bangus, tilapia, tahong): price is smooth and lag-1 says almost everything;
- a regime change just happened (new import policy, new buyer entering): simple models adapt within a week, trees keep the old pattern until retrained;
- right after a typhoon: few training examples of typhoons per site.

Our expectation: **seasonal naive or rolling median is champion for every species for the first 6–9 months.** That is fine. A boring forecast that is right beats a clever one that is wrong.

## 4. Cold start and data thresholds

A species × site gets `species.forecastable = true` (and the site gets forecasts) only when:

| Level | Needs | Shows the fisher |
|---|---|---|
| **0: No data** | under 20 labelled days | Nothing for this site. If another site has data: "Navotas yesterday: ₱180–₱195 (not your port)". |
| **1: Range only** | 20+ labelled days in the last 60 | "Last 2 weeks at Dagupan: usually ₱180–₱205." No forecast, no verdict. |
| **2: Forecast, no advice** | 60+ labelled days, and backtest band coverage 70–90% | p10/p50/p90 band for days +1 to +3. No sell/hold verdict. |
| **3: Full** | 120+ labelled days, horizon-1 MAPE within target (below), coverage 75–85% | Bands to day +7 and the verdict. |

**New site with no history:** borrow from the nearest site that has the same species (Dagupan bangus → a new Pangasinan landing), shifted by the median price gap measured over the new site's first 20 days. Until the borrowed forecast passes its own backtest, label it "estimated from Dagupan".

**Back-filling history:** cooperative logbooks and trader notebooks (*listahan*) often hold 1–3 years of prices. Paying a student encoder ₱5,000 to type up two years of a coop's notebooks gets a site from level 0 to level 3 in one month. Those rows are tagged `source = 'coop_logbook_backfill'` so they can be excluded if they turn out unreliable. **This is the cheapest data in the whole project.**

## 5. Accuracy targets (MAPE of p50, horizon +1 and +7)

Targets reflect how volatile each species is (demo `volatility` values give the ordering). Not hitting a target at a level means the species stays at the lower level. It does not mean we publish anyway.

| Species | Kind | Target MAPE, +1 day | Target MAPE, +7 days |
|---|---|---|---|
| bangus | farmed | ≤ 6% | ≤ 10% |
| tilapia | farmed | ≤ 6% | ≤ 10% |
| tahong | farmed | ≤ 8% | ≤ 12% |
| lapulapu | capture, premium | ≤ 9% | ≤ 14% |
| galunggong | capture | ≤ 10% | ≤ 16% |
| pusit | capture | ≤ 11% | ≤ 17% |
| alimasag | capture | ≤ 11% | ≤ 17% |
| tamban | capture, very volatile | ≤ 12% | ≤ 18% |
| hipon | mixed, very volatile | ≤ 12% | ≤ 18% |

Band coverage target for every species: **75–85% of actual prices inside p10–p90.** Under 75% means we are overconfident (dangerous). Over 85% means the band is too wide to be useful.

## 6. Backtest protocol

- **Rolling origin:** for every day D in the test window, train on data up to D−1 at 18:30 PHT, forecast D+1..D+7, score against real labels.
- **As-of data only:** each feature is read as it was known at that time (`external_signal.created_at`, `price_observation.created_at` ≤ cutoff). Late-synced observations do not leak backwards.
- **Windows:** last 90 days for weekly champion selection; plus the whole of last year's June–November (typhoon season) and the 6 weeks around Holy Week, scored separately. A model that is good on average but bad in Holy Week loses, because that is when fishers make the most money.
- **Scores per species × site × horizon:** MAPE, band coverage, and **verdict regret**: for each day the model said `hold`, how many ₱/kg did the fisher gain or lose versus selling that day? A verdict with negative average regret over 60 days gets switched off for that species.
- Results go into `model_run.metrics` and `model_version.backtest_mape`.

## 7. Retraining, drift, serving

**Cadence.**
- Simple models: refit nightly as part of the forecast job (seconds).
- XGBoost: retrain weekly, Sunday 22:00 PHT, plus on demand after a typhoon (signal 3 or higher hit a pilot site).
- Champion selection: weekly, automatic by the rule in section 3, logged. Ryn gets a one-line email when a champion changes.

**Drift monitoring (daily, after labels arrive).**
- Rolling 14-day MAPE per species × site greater than 1.5× its backtest MAPE → **automatic demotion one level** (full → forecast-only → range-only) and an email to Ryn.
- Band coverage under 65% over 14 days → same.
- Feature drift: today's landed kg, or today's diesel price, outside anything seen in training → that day's forecast for the affected site is `suppressed` with reason "unusual conditions".
- Label volume drops (fewer than 3 observations for 3 days in a row) → the site falls back a level; usually means the desk stopped surveying, which is an ops problem, not a model problem.

**Serving.**
- Forecasts are precomputed nightly into the `forecast` table. The app reads rows by index: under 50 ms, effectively ₱0.
- No model server. The XGBoost model file lives in Neon Object Storage; only the GitHub Actions job loads it.
- Compute: about 9 species × 5 sites × 7 horizons × 3 quantiles is tiny. Nightly run under 3 minutes; weekly retrain with backtest under 15 minutes. That is inside GitHub's free minutes.
- Libraries: Python 3.12, pandas, xgboost, statsforecast (for ETS), psycopg. Pinned versions; the git commit goes into `model_version.code_ref`.

## 8. Guardrails

These run after the model and before anything is published. A forecast that fails one is stored as `suppressed` with a reason, never silently dropped.

1. **Never publish a band the market cannot bear.** Clamp: p10 is never below the 90-day 5th-percentile label, and p90 is never above the 90-day 95th-percentile label × 1.10. If the model's p50 lands outside the 90-day range entirely, **suppress** it. A model that predicts a record price is more likely broken than right, and a fisher holding fish for a price that never comes loses the whole catch.
2. **Never recommend holding past shelf life.** `hold` is only allowed if the lot's remaining shelf life on ice is more than 24 hours and cold storage is available nearby. Otherwise the verdict becomes `sell`. The demo says "Holding cold stock another two to three days" for galunggong, which has about a day on ice. That is unsafe advice and must not ship.
3. **No verdict in a typhoon window.** When PAGASA signal 2 or higher covers the site today or tomorrow, publish the band only, with the note "Bagyo: hindi tiyak ang presyo" ("Typhoon: price uncertain").
4. **Verdict needs a real move.** `hold` or `sell-now` requires the p50 move to exceed the species' 60-day median daily change and the band not to straddle today's price. Otherwise the verdict is `sell` ("sell at today's price"), which is the safe default.
5. **Max daily change of the published p50:** 15% from yesterday's published p50, unless a typhoon or closed season flag is active. Stops a data glitch from swinging the advice.
6. **Shellfish ban, fish kill, or closed season** → suppress for the affected species and site.
7. **Human override.** Between 18:30 and 19:15 PHT the coop manager sees tomorrow's numbers on one screen with yesterday's actual price beside them. One tap accepts; editing the band or suppressing requires a reason (`forecast_override`). If nobody acts, the forecast publishes as is. Every override is scored in the backtest like a model, so we learn whether the human or the model is usually right.
8. **Kill switch.** One admin toggle sets every forecast to range-only (level 1) across the platform.

## 9. How a low-literacy fisher sees it

The Prices screen today shows a chart with a confidence cone, a percentage, and a paragraph. That is right for a buyer and wrong for many fishers. Fisher mode (and SMS) shows:

- **One big price range in pesos**, not a percentage: `₱180 – ₱195` per kilo, tomorrow.
- **One of three verdicts as a colour, an icon and one word in Filipino:** green arrow up + **HINTAY** (wait), blue check + **IBENTA** (sell), orange alarm + **IBENTA NA** (sell now). Never a chart by default.
- **One reason, in plain words, from the top driver:** "Maraming ani sa susunod na linggo" ("Many pond harvests next week").
- **A voice button** that reads all of it aloud in Filipino (pre-recorded clips for each phrase, not text-to-speech, so it works offline and sounds natural).
- **No confidence percentage.** Instead, when the band is wide: "Hindi sigurado" ("Not sure").
- The coop desk reads it aloud at the morning landing for people who don't use the app. In practice this is the main channel at first.

SMS form (under 160 characters, no `₱` symbol because it breaks SMS encoding):
`ISDALINK Bangus Dagupan bukas P180-P195/kg. Payo: IBENTA NA. Hindi garantiya ang presyo. TULONG=tawag`

## 10. Liability wording

This exact text, translated by a native speaker and checked by a lawyer before launch, is shown on the Prices screen, sent once in the onboarding SMS, and linked from every forecast SMS as "Hindi garantiya ang presyo" ("Price not guaranteed"):

> **English:** IsdaLink price ranges are estimates based on past prices, landings, weather and the calendar. They are not an offer to buy, not a promise of any price, and not financial advice. Markets can move outside the range. You decide when and at what price to sell. IsdaLink is not responsible for losses from decisions made using these estimates.
>
> **Filipino:** Ang presyo sa IsdaLink ay tantiya lamang batay sa dating presyo, huli, panahon at kalendaryo. Hindi ito alok na bumili, hindi pangako ng presyo, at hindi payong pinansyal. Maaaring lumabas ang presyo sa saklaw. Ikaw ang magpapasya kung kailan at magkano ibebenta. Hindi mananagot ang IsdaLink sa pagkalugi mula sa pagpapasyang batay sa tantiyang ito.

Two product rules back up the wording:
- **Never call it a "prediction" or "AI price" in fisher-facing text.** Use "tantiya" (estimate). The word "AI" makes people trust it more than it deserves.
- **Never show a forecast on a listing as if it were the price a buyer will pay.** The listing shows the fisher's price; the forecast only pre-fills it.

## 11. Mapping to the demo's `getForecast()` shape

| Demo field | Real value |
|---|---|
| `history[]` | Last 14 days of the daily label (missing days omitted, not invented). |
| `forecast[].price/low/high` | p50 / p10 / p90 from `forecast` (or `forecast_override`). Max 7 entries. |
| `deltaPct` | (p50 at the last horizon − last label) / last label, 1 decimal place. |
| `confidence` | Band hit rate over the last 60 backtest days, %. |
| `recommendation.verdict` | The guarded verdict, or `null` when the level is below 3. |
| `recommendation.headline/detail` | From fixed Filipino/English templates, not free text. |
| `drivers[]` | Top 4 feature groups by contribution (XGBoost SHAP values, or the calendar multipliers for the simple model), with the demo's labels: Season, Supply & weather, Fuel & transport, Demand (fiestas & holidays). |
| new: `level` | 0–3 from section 4. |
| new: `site` | The landing site id. |
| new: `suppressedReason` | When suppressed. |

SHAP values are a standard way to say how much each feature pushed a tree model's answer up or down.
