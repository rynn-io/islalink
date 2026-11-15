/* IsdaLink brand — the fishhook is the "i".
   The tittle is the hook's eye (where the line ties on: the link), the stem
   curls right into a barbed hook, the way a lowercase i grows a foot.
   The fisher is literally the first letter of the name. */

const Hook = () => (
  <>
    <circle className="hook-eye" cx="12.6" cy="7.4" r="2.8" />
    <path className="hook-line" d="M12.6 12.6V19.6a4.9 4.9 0 0 0 9.8 0v-3.9l-3.3 3" />
  </>
)

/** App-icon tile. Works from 28px (sidebar) to 40px+ (home screen). */
export function BrandMark({ size = 28 }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect className="brand-tile" width="32" height="32" rx="8" />
      <Hook />
    </svg>
  )
}

/** Wordmark: hook-i + "sda" + light "link". */
export function Wordmark() {
  return (
    <span className="wordmark" aria-label="IsdaLink">
      <svg className="wordmark-i" viewBox="9 4 15.5 22" aria-hidden="true">
        <Hook />
      </svg>
      <span aria-hidden="true">
        sda<span className="wordmark-link">link</span>
      </span>
    </span>
  )
}
