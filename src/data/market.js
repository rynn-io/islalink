/* Demo seed data — everything a fisher or buyer sees in the app.
   Species metadata lives in lib/forecast.js; we resolve by local name so the
   dataset stays readable and DRY. */

import { SPECIES } from '../lib/forecast'

const norm = (s) => String(s).toLowerCase().replace(/[-_\s]/g, '')

export function speciesByLocal(local) {
  return SPECIES.find((s) => norm(s.local) === norm(local)) || SPECIES[0]
}

/* ---------------------------------------------------------------- ports */
export const PORTS = [
  { id: 'navotas', name: 'Navotas Fish Port', region: 'Metro Manila', lat: 14.6572, lng: 120.9489 },
  { id: 'dagupan', name: 'Dagupan Landing', region: 'Pangasinan', lat: 16.0432, lng: 120.3331 },
  { id: 'batangas', name: 'Batangas Bay Landing', region: 'Batangas', lat: 13.7565, lng: 121.0583 },
  { id: 'roxas', name: 'Roxas City Port', region: 'Capiz', lat: 11.5853, lng: 122.7511 },
  { id: 'gensan', name: 'General Santos Fish Port', region: 'South Cotabato', lat: 6.1122, lng: 125.1716 },
]

export const portOf = (id) => PORTS.find((p) => p.id === id) || PORTS[0]

/* ------------------------------------------------------------ listings */
export const LISTINGS = [
  {
    id: 'L-1041',
    species: 'Bangus',
    qtyKg: 120,
    price: 205,
    portId: 'dagupan',
    fisher: 'Nestor Dela Cruz',
    boat: 'F/B Sta. Clara 3',
    landedAt: '2026-11-15T04:20:00+08:00',
    trendPct: 4.2,
    verified: true,
    lotId: 'ISL-2646-BNG-0142',
  },
  {
    id: 'L-1042',
    species: 'Galunggong',
    qtyKg: 340,
    price: 186,
    portId: 'navotas',
    fisher: 'Marilou Santos',
    boat: 'F/B Maria Lourdes',
    landedAt: '2026-11-15T03:05:00+08:00',
    trendPct: -2.8,
    verified: true,
    lotId: 'ISL-2646-GAL-0157',
  },
  {
    id: 'L-1043',
    species: 'Hipon',
    qtyKg: 85,
    price: 395,
    portId: 'roxas',
    fisher: 'Danilo Reyes',
    boat: 'F/B San Isidro',
    landedAt: '2026-11-15T05:40:00+08:00',
    trendPct: 6.1,
    verified: true,
    lotId: 'ISL-2646-HIP-0163',
  },
  {
    id: 'L-1044',
    species: 'Lapu-lapu',
    qtyKg: 42,
    price: 465,
    portId: 'batangas',
    fisher: 'Rico Bautista',
    boat: 'F/B Sto. Niño',
    landedAt: '2026-11-15T02:15:00+08:00',
    trendPct: 1.4,
    verified: true,
    lotId: 'ISL-2646-LAP-0171',
  },
  {
    id: 'L-1045',
    species: 'Tilapia',
    qtyKg: 210,
    price: 132,
    portId: 'batangas',
    fisher: 'Aurea Villamor',
    boat: 'Pond harvest · Brgy. Sta. Maria',
    landedAt: '2026-11-15T06:10:00+08:00',
    trendPct: -1.1,
    verified: true,
    lotId: 'ISL-2646-TIL-0184',
  },
  {
    id: 'L-1046',
    species: 'Pusit',
    qtyKg: 60,
    price: 320,
    portId: 'gensan',
    fisher: 'Jomar Aquino',
    boat: 'F/B Lady Grace',
    landedAt: '2026-11-14T21:45:00+08:00',
    trendPct: 3.3,
    verified: false,
    lotId: 'ISL-2646-PUS-0190',
  },
  {
    id: 'L-1047',
    species: 'Alimasag',
    qtyKg: 38,
    price: 355,
    portId: 'navotas',
    fisher: 'Editha Lim',
    boat: 'F/B Twins',
    landedAt: '2026-11-15T01:30:00+08:00',
    trendPct: 2.0,
    verified: true,
    lotId: 'ISL-2646-ALI-0204',
  },
  {
    id: 'L-1048',
    species: 'Tamban',
    qtyKg: 480,
    price: 98,
    portId: 'gensan',
    fisher: 'Fidel Marquez',
    boat: 'F/B Pacifica 2',
    landedAt: '2026-11-15T00:50:00+08:00',
    trendPct: -3.6,
    verified: true,
    lotId: 'ISL-2646-TAM-0219',
  },
]

/* -------------------------------------------------------- fisher's own */
export const MY_CATCH = [
  { species: 'Bangus', qtyKg: 120, price: 205, portId: 'dagupan', status: 'listed', iceHours: 5, shelfHours: 36 },
  { species: 'Tilapia', qtyKg: 64, price: 132, portId: 'dagupan', status: 'cold', iceHours: 12, shelfHours: 30 },
  { species: 'Galunggong', qtyKg: 40, price: 186, portId: 'dagupan', status: 'risk', iceHours: 19, shelfHours: 22 },
]

export const INCOMING_ORDERS = [
  {
    id: 'ORD-3312',
    buyer: 'Casa Marisol Resto',
    type: 'Restaurant · Makati',
    species: 'Bangus',
    qtyKg: 35,
    price: 205,
    placedAt: '2026-11-15T08:48:00+08:00',
    note: 'Deboned if possible. Delivery before 2pm.',
  },
  {
    id: 'ORD-3313',
    buyer: 'Divisoria Wholesale',
    type: 'Wholesaler · Manila',
    species: 'Galunggong',
    qtyKg: 120,
    price: 182,
    placedAt: '2026-11-15T08:12:00+08:00',
    note: 'Ice-glazed, 2 styro boxes.',
  },
  {
    id: 'ORD-3314',
    buyer: 'Tindahan ni Aling Nena',
    type: 'Public market · Malabon',
    species: 'Tilapia',
    qtyKg: 25,
    price: 132,
    placedAt: '2026-11-15T07:31:00+08:00',
    note: 'Pickup at landing.',
  },
]

/* ------------------------------------------------------------ cold chain */
export const ICE_SUPPLIERS = [
  { id: 'ice-1', name: 'Navotas Ice Plant', distanceKm: 1.8, perBlock: 55, blocksAvailable: 240, eta: '35 min', rating: 4.8 },
  { id: 'ice-2', name: 'Blue Cube Cold Co.', distanceKm: 4.2, perBlock: 48, blocksAvailable: 120, eta: '1h 05m', rating: 4.5 },
  { id: 'ice-3', name: 'Dagupan Cold Stores', distanceKm: 210, perBlock: 42, blocksAvailable: 500, eta: '6h 30m', rating: 4.6 },
]

export const COLD_STORES = [
  { id: 'cs-1', name: 'Malabon Cold Storage', tempC: -18, freeKg: 1200, perKgDay: 3.5, distanceKm: 2.4, certified: true },
  { id: 'cs-2', name: 'Port Chill Hub', tempC: -2, freeKg: 380, perKgDay: 2.2, distanceKm: 0.6, certified: true },
  { id: 'cs-3', name: 'Camacho Ice & Storage', tempC: -12, freeKg: 900, perKgDay: 2.8, distanceKm: 6.1, certified: false },
]

export const COURIERS = [
  { id: 'co-1', name: 'IsdaLink Rider (reefer van)', perKm: 22, base: 180, maxKg: 250, eta: '1h 20m', cold: true },
  { id: 'co-2', name: 'Metro Cold Haul', perKm: 18, base: 260, maxKg: 600, eta: '2h 10m', cold: true },
  { id: 'co-3', name: 'Tricycle + ice box', perKm: 14, base: 90, maxKg: 60, eta: '45m', cold: false },
]

/* ------------------------------------------------------------- insight */
export const FISHER_STATS = {
  earningsWeek: 18450,
  earningsDeltaPct: 12.4,
  kgSold: 412,
  kgLost: 9,
  lossPct: 2.1,
  avgPrice: 197,
  buyers: 14,
}

export const MARKET_PULSE = [
  { label: 'Bangus', delta: 4.2 },
  { label: 'Hipon', delta: 6.1 },
  { label: 'Pusit', delta: 3.3 },
  { label: 'Tamban', delta: -3.6 },
]

export const NOTIFICATIONS = [
  { id: 'n1', tone: 'warn', text: 'Galunggong lot L-1042 hits 24h on ice at 14:00 — sell or move to cold storage.' },
  { id: 'n2', tone: 'good', text: 'Hipon demand is up 6.1% this week. 2 restaurants are looking for supply.' },
  { id: 'n3', tone: '', text: 'Typhoon signal no. 1 in Bicol — expect lower landings Tue–Wed, prices may spike.' },
]

export const BUYER_FAVS = ['Bangus', 'Hipon', 'Lapu-lapu']
