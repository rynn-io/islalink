-- IsdaLink — Postgres schema (target: Postgres 15+, hosted on Neon)
-- Source of truth for docs/domain-model.md. Every table here is described there.
--
-- Conventions
--   * Money is stored as whole pesos in integer columns ending in _php (matches the demo's ₱ format).
--     Rounding happens once, when an order line is created (half-up), and never again.
--   * Weights are kilograms, numeric(10,2). Prices are ₱ per kg, integer.
--   * All timestamps are timestamptz, stored in UTC, displayed in PHT (UTC+8) by the client.
--   * Status fields use text + CHECK instead of Postgres ENUM types: adding a value is one
--     ALTER of a constraint instead of an enum migration. Trade-off: no type-level reuse.
--   * Ids are uuid. Rows created offline get a client-generated UUIDv7 (time-ordered) so the
--     same row can be synced twice without duplicating. Server-created rows use the default.
--   * Soft delete (deleted_at) only on "directory" tables people edit: person, buyer_org,
--     vessel, fish_farm, service_provider. Facts (lots, trace events, ledger, prices) are never
--     deleted; listings and orders end through status, not deletion.

-- ---------------------------------------------------------------- people & access

CREATE TABLE person (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name          text NOT NULL,
  phone_e164         text,                      -- +639XXXXXXXXX; the login identity (SMS OTP)
  preferred_language text NOT NULL DEFAULT 'fil'
                     CHECK (preferred_language IN ('fil', 'en', 'ilo', 'pag', 'ceb', 'hil')),
  low_literacy_mode  boolean NOT NULL DEFAULT false,  -- icons + voice + SMS-first UI for this person
  feature_phone_only boolean NOT NULL DEFAULT false,  -- no smartphone: SMS channel only
  created_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,                -- soft delete (account closed)
  erased_at          timestamptz,                -- Data Privacy Act erasure: name/phone anonymised, row kept
  CONSTRAINT person_phone_format CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+639[0-9]{9}$'),
  CONSTRAINT person_erased_has_no_phone CHECK (erased_at IS NULL OR phone_e164 IS NULL)
);
-- One active account per phone; a closed account frees the number.
CREATE UNIQUE INDEX person_phone_active_uq ON person (phone_e164) WHERE deleted_at IS NULL;

CREATE TABLE consent (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES person (id),
  purpose        text NOT NULL CHECK (purpose IN (
                   'account', 'traceability_public_name', 'price_sms',
                   'aggregate_analytics', 'marketing')),
  policy_version text NOT NULL,                 -- which privacy notice wording they agreed to
  channel        text NOT NULL CHECK (channel IN ('app', 'sms', 'paper_form')),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  withdrawn_at   timestamptz,
  CONSTRAINT consent_withdraw_after_grant CHECK (withdrawn_at IS NULL OR withdrawn_at >= granted_at)
);
CREATE INDEX consent_person_idx ON consent (person_id, purpose);

CREATE TABLE cooperative (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  cda_reg_no      text UNIQUE,                  -- Cooperative Development Authority registration
  home_site_id    text,                         -- FK added below (landing_site defined later)
  fee_share_pct   numeric(4,2) NOT NULL DEFAULT 0 CHECK (fee_share_pct BETWEEN 0 AND 100),
                                                -- share of IsdaLink's transaction fee paid to the coop
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE buyer_org (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('restaurant', 'wholesaler', 'public_market_stall',
                                              'retailer', 'institution', 'consumer')),
  city          text NOT NULL,
  tin           text,                           -- BIR tax id, needed for official receipts
  credit_limit_php integer NOT NULL DEFAULT 0 CHECK (credit_limit_php >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE service_provider (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('ice_plant', 'cold_storage', 'courier')),
  site_id      text,                            -- nearest landing site; FK added below
  has_reefer   boolean NOT NULL DEFAULT false,  -- courier: refrigerated vehicle
  certified    boolean NOT NULL DEFAULT false,  -- cold storage: has a valid accreditation on file
  price_note   text,                            -- e.g. '₱55/block', '₱180 base + ₱22/km'; quoted manually in Phase 0
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TABLE role_assignment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           uuid NOT NULL REFERENCES person (id),
  role                text NOT NULL CHECK (role IN (
                        'fisher', 'buyer_staff', 'coop_encoder', 'coop_manager',
                        'provider_staff', 'admin')),
  cooperative_id      uuid REFERENCES cooperative (id),
  buyer_org_id        uuid REFERENCES buyer_org (id),
  service_provider_id uuid REFERENCES service_provider (id),
  granted_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  -- Each role is scoped to exactly the kind of organisation it belongs to.
  CONSTRAINT role_scope CHECK (
    (role IN ('coop_encoder', 'coop_manager') AND cooperative_id IS NOT NULL
       AND buyer_org_id IS NULL AND service_provider_id IS NULL)
    OR (role = 'buyer_staff' AND buyer_org_id IS NOT NULL
       AND cooperative_id IS NULL AND service_provider_id IS NULL)
    OR (role = 'provider_staff' AND service_provider_id IS NOT NULL
       AND cooperative_id IS NULL AND buyer_org_id IS NULL)
    OR (role IN ('fisher', 'admin') AND cooperative_id IS NULL
       AND buyer_org_id IS NULL AND service_provider_id IS NULL)
  )
);
CREATE INDEX role_assignment_person_idx ON role_assignment (person_id) WHERE revoked_at IS NULL;

CREATE TABLE kyc_verification (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid REFERENCES person (id),
  buyer_org_id   uuid REFERENCES buyer_org (id),
  doc_type       text NOT NULL CHECK (doc_type IN (
                   'fishr_id', 'boatr_cert', 'fla_or_pond_permit', 'philsys_id', 'other_gov_id',
                   'business_permit', 'dti_or_sec_reg', 'bir_2303', 'coop_endorsement')),
  doc_storage_key text,                         -- object-storage path of the photo; never public
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by    uuid REFERENCES person (id),
  reviewed_at    timestamptz,
  expires_on     date,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_one_subject CHECK (num_nonnulls(person_id, buyer_org_id) = 1),
  CONSTRAINT kyc_review_complete CHECK (status = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX kyc_person_idx ON kyc_verification (person_id) WHERE person_id IS NOT NULL;
CREATE INDEX kyc_buyer_idx ON kyc_verification (buyer_org_id) WHERE buyer_org_id IS NOT NULL;

-- ---------------------------------------------------------------- places, species, producers

CREATE TABLE landing_site (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),  -- slug, matches demo PORTS ids: 'navotas', 'dagupan', ...
  name        text NOT NULL,                    -- 'Dagupan Landing'
  region      text NOT NULL,                    -- 'Pangasinan'
  lat         numeric(8,5) NOT NULL,
  lng         numeric(8,5) NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('fish_port', 'municipal_landing', 'pond_cluster')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cooperative      ADD CONSTRAINT cooperative_home_site_fk FOREIGN KEY (home_site_id) REFERENCES landing_site (id);
ALTER TABLE service_provider ADD CONSTRAINT service_provider_site_fk FOREIGN KEY (site_id) REFERENCES landing_site (id);

CREATE TABLE species (
  id                   text PRIMARY KEY CHECK (id ~ '^[a-z]+$'),  -- demo SPECIES ids: 'bangus', 'lapulapu', ...
  code                 char(3) NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{3}$'),  -- lot-id segment: 'BAN', 'LAP'
  name_en              text NOT NULL,
  name_local           text NOT NULL,
  reference_size_class text NOT NULL,           -- size every price is normalised to, e.g. 'bangus:3-4pcs/kg'
  forecastable         boolean NOT NULL DEFAULT false,  -- true only after the data thresholds in forecast-pipeline.md
  shelf_life_hours_on_ice integer NOT NULL CHECK (shelf_life_hours_on_ice > 0)
);

CREATE TABLE fisher (
  person_id       uuid PRIMARY KEY REFERENCES person (id),
  kind            text NOT NULL CHECK (kind IN ('capture', 'aquaculture', 'both')),
  fishr_no        text UNIQUE,                  -- BFAR FishR registration number
  home_site_id    text NOT NULL REFERENCES landing_site (id),
  gcash_number    text CHECK (gcash_number IS NULL OR gcash_number ~ '^\+639[0-9]{9}$'),  -- payout destination
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cooperative_membership (
  cooperative_id  uuid NOT NULL REFERENCES cooperative (id),
  fisher_id       uuid NOT NULL REFERENCES fisher (person_id),
  joined_on       date NOT NULL,
  left_on         date,
  PRIMARY KEY (cooperative_id, fisher_id, joined_on),
  CONSTRAINT membership_dates CHECK (left_on IS NULL OR left_on >= joined_on)
);
-- A fisher sells through at most one cooperative at a time (seller-of-record rule).
CREATE UNIQUE INDEX membership_one_active_uq ON cooperative_membership (fisher_id) WHERE left_on IS NULL;

CREATE TABLE vessel (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,                 -- 'F/B Sta. Clara 3'
  boatr_no       text UNIQUE,                   -- BFAR BoatR registration (municipal boats)
  gross_tonnage  numeric(6,2) CHECK (gross_tonnage > 0),
  class          text NOT NULL CHECK (class IN ('municipal', 'commercial_small', 'commercial_medium', 'commercial_large')),
                                                -- municipal = 3 GT or less, fishes municipal waters
  owner_id       uuid NOT NULL REFERENCES fisher (person_id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE INDEX vessel_owner_idx ON vessel (owner_id) WHERE deleted_at IS NULL;

CREATE TABLE fish_farm (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,                 -- 'Pond harvest · Brgy. Sta. Maria'
  kind           text NOT NULL CHECK (kind IN ('brackish_pond', 'freshwater_pond', 'fish_cage', 'fish_pen', 'mussel_raft')),
  permit_no      text,                          -- FLA (Fishpond Lease Agreement) or LGU permit
  area_ha        numeric(8,2) CHECK (area_ha > 0),
  barangay       text NOT NULL,
  nearest_site_id text NOT NULL REFERENCES landing_site (id),
  operator_id    uuid NOT NULL REFERENCES fisher (person_id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE INDEX fish_farm_operator_idx ON fish_farm (operator_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------- offline sync plumbing

CREATE TABLE device (
  id            uuid PRIMARY KEY,               -- generated by the PWA on first install
  person_id     uuid NOT NULL REFERENCES person (id),
  label         text,                           -- 'Dagupan coop desk tablet'
  last_sync_at  timestamptz,
  revoked_at    timestamptz,                    -- lost/stolen: server rejects its future pushes
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Lot numbers are handed out in fixed blocks of 50 so a device can print final QR labels while offline.
-- Block k of a week+species owns numbers k*50+1 .. k*50+50 (k = 0..198, so the 4-digit NNNN never overflows).
CREATE TABLE lot_number_block (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     uuid NOT NULL REFERENCES device (id),
  yyww          char(4) NOT NULL CHECK (yyww ~ '^[0-9]{4}$'),  -- ISO year-week, same as lot id
  species_code  char(3) NOT NULL REFERENCES species (code),
  block_no      smallint NOT NULL CHECK (block_no BETWEEN 0 AND 198),
  first_no      integer GENERATED ALWAYS AS (block_no * 50 + 1) STORED,
  last_no       integer GENERATED ALWAYS AS (block_no * 50 + 50) STORED,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (yyww, species_code, block_no)         -- two devices can never hold the same numbers
);

-- Idempotency log: every offline operation carries a client_op_id; replays return the stored result.
CREATE TABLE sync_receipt (
  device_id     uuid NOT NULL REFERENCES device (id),
  client_op_id  uuid NOT NULL,
  op_type       text NOT NULL,                  -- 'catch.create', 'trace.append', 'order.request', ...
  result        text NOT NULL CHECK (result IN ('applied', 'rejected', 'merged')),
  detail        jsonb,                          -- rejection reason shown to the user on the device
  received_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, client_op_id)
);

-- ---------------------------------------------------------------- catch, lots, inventory

CREATE TABLE catch_record (
  id             uuid PRIMARY KEY,              -- client UUIDv7 (usually created offline at the desk)
  source_kind    text NOT NULL CHECK (source_kind IN ('trip', 'harvest')),
  fisher_id      uuid NOT NULL REFERENCES fisher (person_id),
  vessel_id      uuid REFERENCES vessel (id),
  fish_farm_id   uuid REFERENCES fish_farm (id),
  landing_site_id text NOT NULL REFERENCES landing_site (id),
  landed_at      timestamptz NOT NULL,          -- boat landed / pond harvest finished
  recorded_by    uuid NOT NULL REFERENCES person (id),  -- usually the coop encoder, not the fisher
  device_id      uuid REFERENCES device (id),
  recorded_at    timestamptz NOT NULL,          -- device clock when entered
  synced_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catch_source_matches CHECK (
    (source_kind = 'trip' AND vessel_id IS NOT NULL AND fish_farm_id IS NULL)
    OR (source_kind = 'harvest' AND fish_farm_id IS NOT NULL AND vessel_id IS NULL)),
  CONSTRAINT catch_recorded_after_landing CHECK (recorded_at >= landed_at - interval '15 minutes')
                                                -- 15 min tolerance for phone clock drift
);
CREATE INDEX catch_fisher_idx ON catch_record (fisher_id, landed_at DESC);
CREATE INDEX catch_site_day_idx ON catch_record (landing_site_id, landed_at);

CREATE TABLE lot (
  id              uuid PRIMARY KEY,             -- client UUIDv7
  lot_code        text NOT NULL UNIQUE
                  CHECK (lot_code ~ '^ISL-[0-9]{4}-[A-Z]{3}-[0-9]{4}$'),  -- ISL-<YYWW>-<SP3>-<NNNN>, printed on the QR
  catch_record_id uuid NOT NULL REFERENCES catch_record (id),
  parent_lot_id   uuid REFERENCES lot (id),     -- set when a lot is split or repacked; QR of child shows parent chain
  species_id      text NOT NULL REFERENCES species (id),
  size_class      text NOT NULL,                -- e.g. 'bangus:2-3pcs/kg'; see species.reference_size_class
  weight_kg       numeric(10,2) NOT NULL CHECK (weight_kg > 0),  -- weighed at the desk
  landed_at       timestamptz NOT NULL,         -- copied from catch_record so constraints/indexes need no join
  status          text NOT NULL DEFAULT 'on_ice'
                  CHECK (status IN ('on_ice', 'in_cold_storage', 'in_transit', 'sold_out', 'spoiled', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot_not_own_parent CHECK (parent_lot_id IS NULL OR parent_lot_id <> id)
);
CREATE INDEX lot_catch_idx ON lot (catch_record_id);
CREATE INDEX lot_species_landed_idx ON lot (species_id, landed_at DESC);
CREATE INDEX lot_open_idx ON lot (status) WHERE status IN ('on_ice', 'in_cold_storage', 'in_transit');

-- Keep lot.landed_at identical to its catch record, and the code's species segment honest.
CREATE FUNCTION lot_check_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_landed timestamptz;
  sp_code  char(3);
BEGIN
  SELECT landed_at INTO c_landed FROM catch_record WHERE id = NEW.catch_record_id;
  IF NEW.landed_at <> c_landed THEN
    RAISE EXCEPTION 'lot % landed_at must equal its catch_record landed_at', NEW.lot_code;
  END IF;
  SELECT code INTO sp_code FROM species WHERE id = NEW.species_id;
  IF substr(NEW.lot_code, 10, 3) <> sp_code THEN
    RAISE EXCEPTION 'lot code % does not carry species code %', NEW.lot_code, sp_code;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lot_consistency BEFORE INSERT OR UPDATE OF landed_at, catch_record_id, species_id, lot_code
  ON lot FOR EACH ROW EXECUTE FUNCTION lot_check_consistency();

-- ---------------------------------------------------------------- marketplace

CREATE TABLE listing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref       text NOT NULL UNIQUE CHECK (public_ref ~ '^L-[0-9]+$'),  -- 'L-1041', as in the demo
  lot_id           uuid NOT NULL REFERENCES lot (id),
  seller_coop_id   uuid NOT NULL REFERENCES cooperative (id),  -- seller of record (see domain-model.md)
  price_per_kg_php integer NOT NULL CHECK (price_per_kg_php > 0),
  qty_listed_kg    numeric(10,2) NOT NULL CHECK (qty_listed_kg > 0),
  qty_available_kg numeric(10,2) NOT NULL,      -- decremented inside the order transaction
  min_order_kg     numeric(10,2) NOT NULL DEFAULT 5 CHECK (min_order_kg > 0),
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'paused', 'sold_out', 'expired', 'withdrawn')),
  expires_at       timestamptz NOT NULL,        -- default landed_at + species shelf life; stale fish is not sellable
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_no_oversell CHECK (qty_available_kg >= 0 AND qty_available_kg <= qty_listed_kg)
);
CREATE INDEX listing_open_idx ON listing (status, expires_at) WHERE status = 'open';
CREATE INDEX listing_lot_idx ON listing (lot_id);
CREATE SEQUENCE listing_ref_seq START 1050;   -- demo uses L-1041..L-1048

CREATE TABLE offer (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid NOT NULL REFERENCES listing (id),
  buyer_org_id     uuid NOT NULL REFERENCES buyer_org (id),
  made_by          uuid NOT NULL REFERENCES person (id),
  direction        text NOT NULL CHECK (direction IN ('bid', 'counter')),  -- bid = buyer, counter = seller side
  parent_offer_id  uuid REFERENCES offer (id),  -- the bid this counter answers
  price_per_kg_php integer NOT NULL CHECK (price_per_kg_php > 0),
  qty_kg           numeric(10,2) NOT NULL CHECK (qty_kg > 0),
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'accepted', 'rejected', 'expired', 'superseded')),
  expires_at       timestamptz NOT NULL,        -- bids die fast: default 2 hours
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_has_parent CHECK (direction = 'bid' OR parent_offer_id IS NOT NULL)
);
CREATE INDEX offer_listing_idx ON offer (listing_id, status);

CREATE TABLE "order" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref       text NOT NULL UNIQUE CHECK (public_ref ~ '^ORD-[0-9]+$'),  -- 'ORD-3312'
  buyer_org_id     uuid NOT NULL REFERENCES buyer_org (id),
  placed_by        uuid NOT NULL REFERENCES person (id),
  seller_coop_id   uuid NOT NULL REFERENCES cooperative (id),
  accepted_offer_id uuid REFERENCES offer (id), -- set when the order came from a negotiated bid
  status           text NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'confirmed', 'packed', 'dispatched',
                                     'delivered', 'completed', 'cancelled', 'disputed')),
  fulfilment       text NOT NULL CHECK (fulfilment IN ('pickup_at_landing', 'delivery')),
  goods_total_php  integer NOT NULL DEFAULT 0 CHECK (goods_total_php >= 0),
  platform_fee_php integer NOT NULL DEFAULT 0 CHECK (platform_fee_php >= 0),  -- 3% buyer-side, as in demo OrderSheet
  delivery_fee_php integer NOT NULL DEFAULT 0 CHECK (delivery_fee_php >= 0),
  buyer_note       text,                        -- 'Deboned if possible. Delivery before 2pm.'
  placed_at        timestamptz NOT NULL DEFAULT now(),
  confirmed_at     timestamptz,
  cancelled_at     timestamptz,
  CONSTRAINT order_confirm_after_place CHECK (confirmed_at IS NULL OR confirmed_at >= placed_at),
  CONSTRAINT order_cancel_has_time CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);
CREATE INDEX order_buyer_idx ON "order" (buyer_org_id, placed_at DESC);
CREATE INDEX order_seller_open_idx ON "order" (seller_coop_id, status) WHERE status NOT IN ('completed', 'cancelled');
CREATE SEQUENCE order_ref_seq START 3400;     -- demo uses ORD-3312..ORD-3314

CREATE TABLE order_line (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES "order" (id),
  listing_id        uuid NOT NULL REFERENCES listing (id),
  lot_id            uuid NOT NULL REFERENCES lot (id),  -- copied from listing; the traceability link for this buyer
  qty_kg            numeric(10,2) NOT NULL CHECK (qty_kg > 0),
  unit_price_php    integer NOT NULL CHECK (unit_price_php > 0),  -- frozen at order time
  line_total_php    integer NOT NULL CHECK (line_total_php >= 0), -- round(qty_kg * unit_price_php), half-up, once
  delivered_qty_kg  numeric(10,2) CHECK (delivered_qty_kg >= 0),  -- re-weighed at handover; may differ (shrinkage)
  CONSTRAINT line_total_matches CHECK (line_total_php = round(qty_kg * unit_price_php)),
  UNIQUE (order_id, listing_id)
);
CREATE INDEX order_line_lot_idx ON order_line (lot_id);

-- ---------------------------------------------------------------- cold chain & delivery

CREATE TABLE delivery (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL UNIQUE REFERENCES "order" (id),  -- one delivery per order in v1
  provider_id        uuid REFERENCES service_provider (id),        -- null until dispatcher assigns
  pickup_site_id     text NOT NULL REFERENCES landing_site (id),
  dropoff_address    text NOT NULL,
  cold_required      boolean NOT NULL DEFAULT true,
  quoted_fee_php     integer CHECK (quoted_fee_php >= 0),
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled')),
  picked_up_at       timestamptz,
  delivered_at       timestamptz,
  proof_photo_key    text,                       -- object-storage path of handover photo
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_times_ordered CHECK (delivered_at IS NULL OR picked_up_at IS NULL OR delivered_at >= picked_up_at),
  CONSTRAINT delivery_delivered_has_time CHECK (status <> 'delivered' OR delivered_at IS NOT NULL),
  CONSTRAINT delivery_assigned_has_provider CHECK (status IN ('pending', 'cancelled') OR provider_id IS NOT NULL)
);
-- "cold_required needs a reefer or ice-box courier" is checked in the API at assignment time,
-- because it depends on service_provider.has_reefer and the order size (tricycle + ice box is fine for 25 kg).
CREATE INDEX delivery_open_idx ON delivery (status) WHERE status IN ('pending', 'assigned', 'picked_up');

-- Invariant: no lot in a delivery can have landed after that delivery was picked up or delivered.
CREATE FUNCTION delivery_check_landing_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  latest_landing timestamptz;
BEGIN
  SELECT max(l.landed_at) INTO latest_landing
    FROM order_line ol JOIN lot l ON l.id = ol.lot_id
   WHERE ol.order_id = NEW.order_id;
  IF latest_landing IS NOT NULL AND (
       (NEW.picked_up_at IS NOT NULL AND NEW.picked_up_at < latest_landing)
    OR (NEW.delivered_at IS NOT NULL AND NEW.delivered_at < latest_landing)) THEN
    RAISE EXCEPTION 'delivery % is timed before a lot in it was landed (%)', NEW.id, latest_landing;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER delivery_landing_order BEFORE INSERT OR UPDATE OF picked_up_at, delivered_at, order_id
  ON delivery FOR EACH ROW EXECUTE FUNCTION delivery_check_landing_order();

CREATE TABLE cold_chain_reading (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id         uuid REFERENCES lot (id),
  delivery_id    uuid REFERENCES delivery (id),
  storage_provider_id uuid REFERENCES service_provider (id),  -- when the reading came from a cold room
  source         text NOT NULL CHECK (source IN ('manual_probe', 'bluetooth_logger', 'provider_feed')),
  temp_c         numeric(4,1) NOT NULL CHECK (temp_c BETWEEN -40 AND 60),
  measured_at    timestamptz NOT NULL,
  recorded_by    uuid REFERENCES person (id),
  device_id      uuid REFERENCES device (id),
  client_id      uuid UNIQUE,                   -- offline dedupe key
  photo_key      text,                          -- photo of the thermometer for manual probes
  CONSTRAINT reading_has_subject CHECK (num_nonnulls(lot_id, delivery_id, storage_provider_id) >= 1)
);
CREATE INDEX reading_lot_time_idx ON cold_chain_reading (lot_id, measured_at) WHERE lot_id IS NOT NULL;
CREATE INDEX reading_delivery_time_idx ON cold_chain_reading (delivery_id, measured_at) WHERE delivery_id IS NOT NULL;

-- ---------------------------------------------------------------- traceability (append-only)

CREATE TABLE trace_event (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id          uuid NOT NULL REFERENCES lot (id),
  seq             integer NOT NULL,             -- server receive order per lot; set by trigger
  client_id       uuid NOT NULL UNIQUE,         -- offline dedupe key from the device
  event_type      text NOT NULL CHECK (event_type IN (
                    'landed', 'iced', 'cold_storage_in', 'cold_storage_out', 'qa_check',
                    'dispatched', 'handed_over', 'buyer_scan', 'split', 'loss', 'correction')),
                                                -- maps to demo icons: boat, ice, cold, check, truck, market
  occurred_at     timestamptz NOT NULL,         -- when it happened (device clock); display order
  recorded_at     timestamptz NOT NULL DEFAULT now(),  -- when the server stored it
  actor_person_id uuid REFERENCES person (id),
  actor_label     text NOT NULL,                -- what the public trace page shows: 'Ice crew', 'Driver · J. Ramos'
  place_label     text NOT NULL,                -- 'Dagupan Landing', 'BluCold Facility, Navotas'
  landing_site_id text REFERENCES landing_site (id),
  provider_id     uuid REFERENCES service_provider (id),
  delivery_id     uuid REFERENCES delivery (id),
  temp_c          numeric(4,1),                 -- spot temperature if one was taken at this step
  qty_kg          numeric(10,2) CHECK (qty_kg IS NULL OR qty_kg > 0),  -- required for 'loss' and 'split'
  corrects_event_id bigint REFERENCES trace_event (id),  -- for 'correction': the event being amended
  note            text,
  prev_hash       bytea,                        -- hash of the previous event in this lot's chain
  hash            bytea NOT NULL,               -- sha256(prev_hash || canonical row text); set by trigger
  UNIQUE (lot_id, seq),
  CONSTRAINT loss_has_qty CHECK (event_type NOT IN ('loss', 'split') OR qty_kg IS NOT NULL),
  CONSTRAINT correction_has_target CHECK ((event_type = 'correction') = (corrects_event_id IS NOT NULL))
);
CREATE INDEX trace_lot_time_idx ON trace_event (lot_id, occurred_at);

-- Assign seq + hash chain on insert. Locks the lot row so two concurrent inserts cannot share a seq.
CREATE FUNCTION trace_event_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  last_seq  integer;
  last_hash bytea;
BEGIN
  PERFORM 1 FROM lot WHERE id = NEW.lot_id FOR UPDATE;
  SELECT seq, hash INTO last_seq, last_hash
    FROM trace_event WHERE lot_id = NEW.lot_id ORDER BY seq DESC LIMIT 1;
  NEW.seq := coalesce(last_seq, 0) + 1;
  NEW.prev_hash := last_hash;
  -- occurred_at is hashed as epoch seconds so the hash never depends on the session's TimeZone setting.
  NEW.hash := sha256(coalesce(last_hash, ''::bytea) || convert_to(concat_ws('|',
                NEW.lot_id, NEW.seq, NEW.client_id, NEW.event_type, extract(epoch FROM NEW.occurred_at),
                NEW.actor_label, NEW.place_label, NEW.temp_c, NEW.qty_kg, NEW.corrects_event_id, NEW.note), 'UTF8'));
  RETURN NEW;
END $$;
CREATE TRIGGER trace_event_chain BEFORE INSERT ON trace_event
  FOR EACH ROW EXECUTE FUNCTION trace_event_chain();

-- Append-only: mistakes are fixed with a 'correction' event, never by editing history.
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP;
END $$;
CREATE TRIGGER trace_event_append_only BEFORE UPDATE OR DELETE ON trace_event
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER trace_event_no_truncate BEFORE TRUNCATE ON trace_event
  FOR EACH STATEMENT EXECUTE FUNCTION reject_mutation();

-- Inventory = weighed kg minus sold kg minus recorded loss. A view, not a stored number,
-- so it can never drift from the facts it is built from.
CREATE VIEW lot_stock AS
SELECT l.id AS lot_id,
       l.lot_code,
       l.weight_kg,
       coalesce(s.sold_kg, 0) AS sold_kg,
       coalesce(x.lost_kg, 0) AS lost_kg,
       l.weight_kg - coalesce(s.sold_kg, 0) - coalesce(x.lost_kg, 0) AS on_hand_kg
  FROM lot l
  LEFT JOIN (SELECT ol.lot_id, sum(ol.qty_kg) AS sold_kg
               FROM order_line ol JOIN "order" o ON o.id = ol.order_id
              WHERE o.status <> 'cancelled' GROUP BY ol.lot_id) s ON s.lot_id = l.id
  LEFT JOIN (SELECT lot_id, sum(qty_kg) AS lost_kg
               FROM trace_event WHERE event_type = 'loss' GROUP BY lot_id) x ON x.lot_id = l.id;

-- ---------------------------------------------------------------- prices & forecasting

CREATE TABLE price_observation (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id        text NOT NULL REFERENCES species (id),
  landing_site_id   text REFERENCES landing_site (id),  -- null for national/regional public series
  observed_on       date NOT NULL,              -- PHT calendar day
  price_level       text NOT NULL CHECK (price_level IN ('ex_vessel', 'farmgate', 'wholesale', 'retail')),
                                                -- the ML label is ex_vessel/farmgate only
  source            text NOT NULL CHECK (source IN (
                      'platform_sale', 'coop_desk_survey', 'coop_logbook_backfill',
                      'psa_openstat', 'da_bantay_presyo', 'pfda_port_report')),
  size_class        text,                       -- raw size as observed, e.g. 'bangus:2-3pcs/kg'
  price_per_kg_php  integer NOT NULL CHECK (price_per_kg_php > 0),        -- raw observed price
  normalised_php    integer CHECK (normalised_php > 0),  -- converted to species.reference_size_class
  volume_kg         numeric(12,2) CHECK (volume_kg >= 0),  -- weight traded at that price, if known
  order_line_id     uuid REFERENCES order_line (id),       -- when source = platform_sale
  recorded_by       uuid REFERENCES person (id),
  quality_flag      text NOT NULL DEFAULT 'ok' CHECK (quality_flag IN ('ok', 'outlier', 'suspect', 'excluded')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_sale_links_line CHECK ((source = 'platform_sale') = (order_line_id IS NOT NULL))
);
CREATE INDEX price_obs_label_idx ON price_observation (species_id, landing_site_id, observed_on)
  WHERE price_level IN ('ex_vessel', 'farmgate') AND quality_flag = 'ok';

-- Non-price inputs to the model: fuel, weather, calendar, closed seasons, imports.
CREATE TABLE external_signal (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN (
                  'diesel_price', 'tropical_cyclone_signal', 'gale_warning', 'wave_height',
                  'holiday', 'fiesta', 'liturgical', 'closed_season', 'import_arrival', 'payday')),
  region        text,                           -- null = national
  landing_site_id text REFERENCES landing_site (id),
  species_id    text REFERENCES species (id),   -- for closed seasons / imports that hit one species
  valid_from    date NOT NULL,
  valid_to      date NOT NULL,
  value_num     numeric,                        -- ₱/L for diesel, signal number 1-5, metres for waves
  label         text,                           -- 'Holy Week', 'Bangus Festival', 'Visayan Sea tamban closed season'
  source        text NOT NULL,                  -- 'doe_oil_monitor', 'pagasa', 'open_meteo_marine', 'manual'
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_dates CHECK (valid_to >= valid_from)
);
CREATE INDEX external_signal_lookup_idx ON external_signal (kind, valid_from, valid_to);

CREATE TABLE model_version (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                -- 'seasonal-naive-v1', 'xgb-quantile-v3'
  species_id      text REFERENCES species (id), -- null = one model covers every species
  algorithm       text NOT NULL CHECK (algorithm IN ('seasonal_naive', 'rolling_median_calendar', 'ets', 'xgboost_quantile')),
  code_ref        text NOT NULL,                -- git commit of the training code
  feature_set     text NOT NULL,                -- e.g. 'fs-2027-01'; documented in forecast-pipeline.md
  trained_from    date,
  trained_to      date,
  artifact_key    text,                         -- object-storage path of the model file
  status          text NOT NULL DEFAULT 'candidate'
                  CHECK (status IN ('candidate', 'champion', 'retired')),
  backtest_mape   jsonb,                        -- {"bangus|dagupan|h7": 0.071, ...}
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- One champion (the model whose forecasts get published) per species; '*' = the all-species model.
-- The simple model can be champion for tamban while XGBoost is champion for bangus.
CREATE UNIQUE INDEX model_one_champion_uq ON model_version ((coalesce(species_id, '*'))) WHERE status = 'champion';

CREATE TABLE model_run (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id uuid NOT NULL REFERENCES model_version (id),
  run_type         text NOT NULL CHECK (run_type IN ('train', 'backtest', 'forecast')),
  as_of_date       date NOT NULL,               -- data cutoff: nothing after this day was visible
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  status           text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
  metrics          jsonb,
  log_url          text,                        -- GitHub Actions run URL
  CONSTRAINT run_finish_after_start CHECK (finished_at IS NULL OR finished_at >= started_at)
);
CREATE INDEX model_run_recent_idx ON model_run (run_type, as_of_date DESC);

CREATE TABLE forecast (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model_run_id     uuid NOT NULL REFERENCES model_run (id),
  species_id       text NOT NULL REFERENCES species (id),
  landing_site_id  text NOT NULL REFERENCES landing_site (id),
  target_date      date NOT NULL,
  horizon_days     smallint NOT NULL CHECK (horizon_days BETWEEN 1 AND 14),
  p10_php          integer NOT NULL CHECK (p10_php > 0),   -- low end of band
  p50_php          integer NOT NULL,                       -- middle estimate
  p90_php          integer NOT NULL,                       -- high end of band
  verdict          text CHECK (verdict IN ('hold', 'sell', 'sell-now')),  -- same values as demo recommendation
  publish_state    text NOT NULL DEFAULT 'draft'
                   CHECK (publish_state IN ('draft', 'published', 'suppressed', 'overridden')),
  suppressed_reason text,                       -- 'below data threshold', 'band outside 90-day range', ...
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT band_ordered CHECK (p10_php <= p50_php AND p50_php <= p90_php),
  CONSTRAINT suppressed_has_reason CHECK (publish_state <> 'suppressed' OR suppressed_reason IS NOT NULL),
  UNIQUE (model_run_id, species_id, landing_site_id, target_date)
);
CREATE INDEX forecast_serving_idx ON forecast (species_id, landing_site_id, target_date)
  WHERE publish_state IN ('published', 'overridden');

CREATE TABLE forecast_override (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id    bigint NOT NULL UNIQUE REFERENCES forecast (id),
  overridden_by  uuid NOT NULL REFERENCES person (id),  -- coop_manager or admin
  p10_php        integer,                       -- null = suppress entirely
  p50_php        integer,
  p90_php        integer,
  verdict        text CHECK (verdict IN ('hold', 'sell', 'sell-now')),
  reason         text NOT NULL,                 -- 'imported galunggong arrived Navotas today'
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT override_band CHECK (
    (p10_php IS NULL AND p50_php IS NULL AND p90_php IS NULL)
    OR (p10_php > 0 AND p10_php <= p50_php AND p50_php <= p90_php))
);

-- ---------------------------------------------------------------- money

-- Double-entry ledger: every money movement is a journal of >= 2 rows summing to zero.
-- Positive = debit, negative = credit. Append-only, same as trace_event.
CREATE TABLE ledger_entry (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id      uuid NOT NULL,
  account         text NOT NULL CHECK (account IN (
                    'buyer_receivable', 'coop_payable', 'fisher_payable', 'provider_payable',
                    'platform_fee_revenue', 'delivery_fee_revenue', 'coop_fee_share_payable',
                    'cash_collection', 'cash_payout', 'write_off')),
  amount_php      bigint NOT NULL CHECK (amount_php <> 0),
  order_id        uuid REFERENCES "order" (id),
  payout_id       uuid,                         -- FK added after payout table
  fisher_id       uuid REFERENCES fisher (person_id),
  cooperative_id  uuid REFERENCES cooperative (id),
  buyer_org_id    uuid REFERENCES buyer_org (id),
  provider_id     uuid REFERENCES service_provider (id),
  memo            text NOT NULL,
  created_by      uuid REFERENCES person (id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_journal_idx ON ledger_entry (journal_id);
CREATE INDEX ledger_order_idx ON ledger_entry (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX ledger_fisher_idx ON ledger_entry (fisher_id, created_at) WHERE fisher_id IS NOT NULL;

CREATE FUNCTION ledger_journal_balances() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  total bigint;
  n     integer;
BEGIN
  SELECT sum(amount_php), count(*) INTO total, n FROM ledger_entry WHERE journal_id = NEW.journal_id;
  IF total <> 0 OR n < 2 THEN
    RAISE EXCEPTION 'journal % is unbalanced (sum %, % rows)', NEW.journal_id, total, n;
  END IF;
  RETURN NULL;
END $$;
-- Deferred: checked at COMMIT, after all rows of the journal are inserted.
CREATE CONSTRAINT TRIGGER ledger_balanced AFTER INSERT ON ledger_entry
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_journal_balances();
CREATE TRIGGER ledger_append_only BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE payout (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fisher_id        uuid REFERENCES fisher (person_id),
  cooperative_id   uuid REFERENCES cooperative (id),
  provider_id      uuid REFERENCES service_provider (id),
  amount_php       integer NOT NULL CHECK (amount_php > 0),
  method           text NOT NULL CHECK (method IN ('gcash', 'maya', 'bank', 'cash_at_desk')),
  destination      text,                        -- masked account/number at time of payout
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  external_ref     text,                        -- GCash reference no. or gateway transfer id
  sent_by          uuid REFERENCES person (id),
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_one_payee CHECK (num_nonnulls(fisher_id, cooperative_id, provider_id) = 1),
  CONSTRAINT payout_sent_has_ref CHECK (status NOT IN ('sent', 'confirmed') OR (external_ref IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE INDEX payout_fisher_idx ON payout (fisher_id, created_at DESC) WHERE fisher_id IS NOT NULL;
ALTER TABLE ledger_entry ADD CONSTRAINT ledger_payout_fk FOREIGN KEY (payout_id) REFERENCES payout (id);

-- ---------------------------------------------------------------- messaging

CREATE TABLE notification (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES person (id),
  channel        text NOT NULL CHECK (channel IN ('in_app', 'web_push', 'sms')),
  template       text NOT NULL,                 -- 'order.new', 'lot.shelf_warning', 'price.daily', 'typhoon.alert'
  payload        jsonb NOT NULL DEFAULT '{}',
  dedupe_key     text,                          -- e.g. 'lot.shelf_warning:<lot_id>:24h' so alerts fire once
  status         text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'read')),
  send_after     timestamptz NOT NULL DEFAULT now(),  -- quiet hours: no SMS 22:00-04:00 PHT unless urgent
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notification_dedupe_uq ON notification (person_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notification_queue_idx ON notification (send_after) WHERE status = 'queued';

CREATE TABLE sms_message (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  direction        text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_e164       text NOT NULL,
  person_id        uuid REFERENCES person (id), -- null if number is unknown
  body             text NOT NULL,
  parsed_command   text,                        -- inbound: 'PRESYO', 'BENTA', 'OO', 'HINDI', 'TULONG', 'STOP'
  notification_id  uuid REFERENCES notification (id),  -- outbound: which notification it delivered
  gateway_ref      text,                        -- SMS provider message id
  gateway_status   text,
  cost_php         numeric(6,2),                -- actual SMS cost, for the per-user cost metric
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sms_phone_idx ON sms_message (phone_e164, created_at DESC);

-- ---------------------------------------------------------------- background jobs

-- Tiny Postgres-backed job queue, drained by the API's 1-minute cron. Avoids paying for a queue service.
CREATE TABLE job (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind          text NOT NULL,                  -- 'notify.send', 'listing.expire', 'forecast.publish', ...
  payload       jsonb NOT NULL DEFAULT '{}',
  run_after     timestamptz NOT NULL DEFAULT now(),
  attempts      smallint NOT NULL DEFAULT 0,
  max_attempts  smallint NOT NULL DEFAULT 5,
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'dead')),
  locked_until  timestamptz,                    -- worker lease; expired lease = job is retried
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_ready_idx ON job (run_after) WHERE status = 'queued';

-- ---------------------------------------------------------------- reference data (same ids as the demo)

-- Ports: ids, names and coordinates from src/data/market.js PORTS.
INSERT INTO landing_site (id, name, region, lat, lng, kind) VALUES
  ('navotas',  'Navotas Fish Port',        'Metro Manila',   14.65720, 120.94890, 'fish_port'),
  ('dagupan',  'Dagupan Landing',          'Pangasinan',     16.04320, 120.33310, 'municipal_landing'),
  ('batangas', 'Batangas Bay Landing',     'Batangas',       13.75650, 121.05830, 'municipal_landing'),
  ('roxas',    'Roxas City Port',          'Capiz',          11.58530, 122.75110, 'fish_port'),
  ('gensan',   'General Santos Fish Port', 'South Cotabato',  6.11220, 125.17160, 'fish_port');

-- Species: ids from src/lib/forecast.js SPECIES; codes from src/lib/trace.js SPECIES_CODE.
-- alimasag takes 'ALI' (as in demo listing L-1047); if alimango (mud crab) is ever added it gets 'ALG'.
-- Shelf life on ice: bangus/tilapia/galunggong from demo MY_CATCH, the rest are conservative starting values.
INSERT INTO species (id, code, name_en, name_local, reference_size_class, shelf_life_hours_on_ice, forecastable) VALUES
  ('bangus',     'BAN', 'Milkfish',     'Bangus',     'bangus:3-4pcs/kg',       36, false),
  ('tilapia',    'TIL', 'Tilapia',      'Tilapia',    'tilapia:3-4pcs/kg',      30, false),
  ('galunggong', 'GAL', 'Round scad',   'Galunggong', 'galunggong:medium',      22, false),
  ('tamban',     'TAM', 'Herring',      'Tamban',     'tamban:mixed',           20, false),
  ('lapulapu',   'LAP', 'Grouper',      'Lapu-lapu',  'lapulapu:0.5-1kg:fresh', 36, false),
  ('hipon',      'HIP', 'Shrimp',       'Hipon',      'hipon:40-50pcs/kg',      24, false),
  ('alimasag',   'ALI', 'Blue crab',    'Alimasag',   'alimasag:medium',        24, false),
  ('pusit',      'PUS', 'Squid',        'Pusit',      'pusit:8-12pcs/kg',       30, false),
  ('tahong',     'TAH', 'Green mussel', 'Tahong',     'tahong:mixed',           24, false);
