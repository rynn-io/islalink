/* Species illustration set — one silhouette per SPECIES id, inline SVG.
   Shared 3-tone palette from tokens: body (--art-body), fin (--art-fin),
   cut-outs (--art-cut). Silhouettes are built to stay distinct at 40px. */

const ART = {
  // Milkfish: long torpedo, deep forked tail, tiny eye.
  bangus: (
    <>
      <path className="sa-f" d="M47 32 61 20l-4.5 13L61 46 47 34Z" />
      <path className="sa-f" d="M24 26.5 30 19l2 7.5Z" />
      <path className="sa-f" d="M28 39l5 5 1-5.5Z" />
      <path className="sa-b" d="M3 33c6-7 23-8.5 41-4l5 2v4l-5 2c-18 4.5-35 3-41-4Z" />
      <path className="sa-c-line" d="M14 28.5q2 4.5 0 9" />
      <circle className="sa-c" cx="9.5" cy="31.6" r="1.6" />
    </>
  ),
  // Tilapia: deep oval, spiny dorsal, square tail, vertical bars.
  tilapia: (
    <>
      <path className="sa-f" d="M12 27 14 15l3 7 3-10 3 8 3-9 3 8 3-8 3 8 3-6 3 8 3-4 2 12Z" />
      <path className="sa-f" d="M46 35 59 25q2.5 10 0 20Z" />
      <path className="sa-f" d="M30 47l6 9 8-12Z" />
      <path className="sa-b" d="M7 35c0-10 10-16 22-16s18 8 19 16c-1 8-8 14-19 14S7 45 7 35Z" />
      <path className="sa-c-bar" d="M22 25v19M30 22.5v23M38 24v19" />
      <circle className="sa-c" cx="14.5" cy="31" r="2.2" />
    </>
  ),
  // Round scad: compact spindle, huge eye ring, scute lateral line.
  galunggong: (
    <>
      <path className="sa-f" d="M46 34 57 23l-3 11 3 11Z" />
      <path className="sa-f" d="M19 26.5 23.5 19l4 6.5ZM30 25.5l3-5L43 27Z" />
      <path className="sa-b" d="M5 34c4-7 15-9.5 28-8.5 8 .5 13 4 15 7.5v2c-2 3.5-7 6.5-15 7-13 1-24-2-28-8Z" />
      <path className="sa-c-line" d="M19 35q13-2 27-1M38 32.5v3.5M41.5 32.5v3.5M45 33v3" />
      <circle className="sa-c" cx="13" cy="32.5" r="4.2" />
      <circle className="sa-b" cx="13" cy="32.5" r="1.9" />
    </>
  ),
  // Herring/sardine: sold by the heap — a school of three.
  tamban: (
    <>
      {[
        [4, 9],
        [21, 26],
        [8, 43],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(1.25)`}>
          <path className="sa-f" d="M25 4 31-.5 30 4l1 4.5Z" />
          <path className="sa-b" d="M0 4c4-4 16-4.5 24-1.5L27 4l-3 1.5C16 8.5 4 8 0 4Z" />
          <circle className="sa-c" cx="4" cy="3.6" r="1.1" />
        </g>
      ))}
    </>
  ),
  // Grouper: big head, jutting jaw, round fan tail, spotted.
  lapulapu: (
    <>
      <path className="sa-f" d="M48 33c4-7 10-10 13-8 2 5 2 12 0 17-3 2-9-1-13-8Z" />
      <path className="sa-f" d="M16 22c6-8 22-9 30 2Z" />
      <path className="sa-b" d="M7 29c4-7 13-11 25-10.5 11 .5 17 7.5 18 14.5-1 8-8 14-19 14.5-12 .5-22-4.5-27-12.5l8-2.5Z" />
      <g className="sa-c">
        <circle cx="23" cy="27" r="2" />
        <circle cx="31" cy="24.5" r="1.8" />
        <circle cx="39" cy="27.5" r="2" />
        <circle cx="29" cy="33.5" r="2" />
        <circle cx="37" cy="35.5" r="2.1" />
        <circle cx="44.5" cy="32" r="1.7" />
        <circle cx="24" cy="40.5" r="1.8" />
        <circle cx="32.5" cy="42" r="1.8" />
        <circle cx="41" cy="40.5" r="1.6" />
        <circle cx="15" cy="27.5" r="2.1" />
      </g>
    </>
  ),
  // Shrimp: curled C, segmented, long antennae, tail fan.
  hipon: (
    <>
      <path className="sa-f-line" d="M9 22c-5 8-6 18-3 30M11 20c3-12 15-16 29-16" />
      <path className="sa-f" d="M38 46 26 41l2 6-2 6Z" />
      <path className="sa-f-line" d="M23 30l2 7M29 26l2 7M35 25l1 7" />
      <path className="sa-b-tube" d="M18 22c4-11 24-12 31 2 5 11-2 22-13 23" />
      <ellipse className="sa-b" cx="16" cy="25" rx="8" ry="6.5" transform="rotate(-30 16 25)" />
      <path className="sa-b" d="M10 21 2 15l7 4.5Z" />
      <path className="sa-c-line" d="M26.5 10l1.5 10M35 9v10.5M43 12.5l-2.5 9M49 21l-5 5.5M51.5 32 45 33M49 41l-5.5-2.5" />
      <circle className="sa-c" cx="12.5" cy="23" r="1.4" />
    </>
  ),
  // Blue crab: wide spined carapace, two claws, legs + paddles.
  alimasag: (
    <>
      <path className="sa-f-leg" d="M18 33 9 40M21 35l-8 9M25 36.5 19 47M46 33l9 7M43 35l8 9M39 36.5 45 47" />
      <path className="sa-f" d="M28 37l-4 9c2 4 6 3 6 0ZM36 37l4 9c-2 4-6 3-6 0Z" />
      <path className="sa-b-arm" d="M20 25 13 15M44 25l7-10" />
      <path className="sa-b" d="M13 15c-5-2-5-9 0-11l2 5 2-4c3 4 1 9-4 10ZM51 15c5-2 5-9 0-11l-2 5-2-4c-3 4-1 9 4 10Z" />
      <path className="sa-b" d="M5 30l11-5c8-5 24-5 32 0l11 5-11 3c-6 6-26 6-32 0Z" />
      <path className="sa-c-line" d="M22 29q10 4 20 0" />
      <circle className="sa-c" cx="28" cy="24.5" r="1.3" />
      <circle className="sa-c" cx="36" cy="24.5" r="1.3" />
    </>
  ),
  // Squid: diamond-finned mantle, small head, trailing tentacles.
  pusit: (
    <>
      <path className="sa-f" d="M46 32 57 22l4 10-4 10Z" />
      <path className="sa-b-tentacle" d="M15 29c-5-2-8 0-12-3M15 31c-5 0-8 1-13 .5M15 33c-5 1-8 0-12 3M15 35c-4 2-7 3-10 6M15 30c-6-8-9-10-12-13" />
      <path className="sa-b" d="M22 32c2-6 16-7 30-3l6 3-6 3c-14 4-28 3-30-3Z" />
      <ellipse className="sa-b" cx="18.5" cy="32" rx="5" ry="4.5" />
      <circle className="sa-c" cx="19" cy="31" r="1.6" />
    </>
  ),
  // Green mussel: long blade shell with pointed hinge, open lip, byssus threads.
  tahong: (
    <>
      <path className="sa-f-line" d="M10 52 4 58M11 54l-3 7M13 54.5l1 6" />
      <path className="sa-f" d="M10 53C8 40 18 22 34 12c9-5.5 18-6 21-2 3 5-3 15-13 25C30 47 18 55 10 53Z" />
      <path className="sa-b" d="M10 53C6 42 14 24 30 13c8-5.5 16-6.5 19-3 3 4.5-2 13-11 22C27 44 17 54 10 53Z" />
      <path className="sa-c-line" d="M13 49c3-10 12-23 30-35M17 50c6-9 14-18 25-26" />
    </>
  ),
}

export const SPECIES_ART_IDS = Object.keys(ART)

/** Species illustration. `id` is a SPECIES[].id from lib/forecast. */
export default function SpeciesArt({ id, size = 48, title, className = '' }) {
  const art = ART[id]
  if (!art) return null
  return (
    <svg
      className={`species-art ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {art}
    </svg>
  )
}
