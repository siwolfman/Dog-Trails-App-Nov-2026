/** Soft landscape band in the concept's palette. Decorative only. */
export default function Hero() {
  return (
    <svg
      viewBox="0 0 400 150"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="block h-full w-full"
    >
      <rect width="400" height="150" fill="#f1e6c8" />
      <circle cx="318" cy="46" r="26" fill="#e8b95a" />
      <path
        d="M-10 92c40-28 90-30 140-12s90 20 150-8 90-6 130 6v80H-10z"
        fill="#cfdcc0"
      />
      <rect x="0" y="84" width="170" height="7" fill="#b9d3cf" />
      <path d="M-10 112c60-22 120-14 180 2s120 8 240-10v56H-10z" fill="#a9c29b" />
      <path d="M-10 132c80-14 150-4 230 6s130 0 190-8v30H-10z" fill="#7f9f76" />
      <path
        d="M30 40c18-5 34-5 50 0M90 22c14-3 26-3 40 1"
        stroke="#fefcf5"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
    </svg>
  )
}
