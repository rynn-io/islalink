/* Inline SVG icon set — one source of truth, no icon dependency. */

const S = ({ children, size = 18, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)

export const IconFish = (p) => (
  <S {...p}>
    <path d="M2.5 12s3.6-5.5 8.5-5.5S19.5 12 19.5 12s-3.6 5.5-8.5 5.5S2.5 12 2.5 12Z" />
    <path d="M19.5 12c1.3 0 2.2-.9 2.2-.9s-.9-1.6-2.2-1.6" />
    <circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />
  </S>
)

export const IconMarket = (p) => (
  <S {...p}>
    <path d="M3 9.5 5 4h14l2 5.5" />
    <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 12v8h14v-8" />
    <path d="M10 20v-5h4v5" />
  </S>
)

export const IconTrend = (p) => (
  <S {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </S>
)

export const IconBox = (p) => (
  <S {...p}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5" />
    <path d="M12 13v8" />
  </S>
)

export const IconSnow = (p) => (
  <S {...p}>
    <path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5 4.2 17.5" />
    <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  </S>
)

export const IconQr = (p) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.4" />
    <rect x="14" y="3" width="7" height="7" rx="1.4" />
    <rect x="3" y="14" width="7" height="7" rx="1.4" />
    <path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 19h3" />
  </S>
)

export const IconBoat = (p) => (
  <S {...p}>
    <path d="M3 16h18l-2.5 4H5.5L3 16Z" />
    <path d="M6 16V9l6-4 6 4v7" />
    <path d="M12 16v-4" />
  </S>
)

export const IconIce = (p) => (
  <S {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M9 9h6v6H9z" />
  </S>
)

export const IconTruck = (p) => (
  <S {...p}>
    <path d="M2 7h11v10H2z" />
    <path d="M13 10h4l3 3v4h-7" />
    <circle cx="6" cy="18.5" r="1.7" />
    <circle cx="17" cy="18.5" r="1.7" />
  </S>
)

export const IconCheck = (p) => (
  <S {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </S>
)

export const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
)

export const IconScan = (p) => (
  <S {...p}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <path d="M4 12h16" />
  </S>
)

export const IconSearch = (p) => (
  <S {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </S>
)

export const IconClock = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </S>
)

export const IconAlert = (p) => (
  <S {...p}>
    <path d="M12 3.5 2.8 20h18.4L12 3.5Z" />
    <path d="M12 9v4.5M12 16.8v.2" />
  </S>
)

export const IconPin = (p) => (
  <S {...p}>
    <path d="M12 21s6.5-6.2 6.5-11a6.5 6.5 0 0 0-13 0C5.5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="10" r="2.4" />
  </S>
)

export const ICONS = {
  boat: IconBoat,
  ice: IconIce,
  cold: IconSnow,
  truck: IconTruck,
  market: IconMarket,
  check: IconCheck,
}
