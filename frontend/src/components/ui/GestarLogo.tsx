export function GestarLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="12" fill="url(#gestar-grad)" />

      {/* Building silhouette */}
      <path
        d="M14 38V16l10-6 10 6v22"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Rooftop accent */}
      <path
        d="M18 16l6-4 6 4"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Windows row 1 */}
      <rect x="19" y="19" width="4" height="3.5" rx="0.75" fill="rgba(255,255,255,0.85)" />
      <rect x="25" y="19" width="4" height="3.5" rx="0.75" fill="rgba(255,255,255,0.85)" />
      {/* Windows row 2 */}
      <rect x="19" y="25" width="4" height="3.5" rx="0.75" fill="rgba(255,255,255,0.6)" />
      <rect x="25" y="25" width="4" height="3.5" rx="0.75" fill="rgba(255,255,255,0.6)" />
      {/* Door */}
      <rect x="21.5" y="32" width="5" height="6" rx="1" fill="rgba(255,255,255,0.95)" />
      <circle cx="25" cy="35.5" r="0.6" fill="rgba(59,130,246,0.8)" />

      {/* Star accent top-right */}
      <path
        d="M36 8l1.2 2.4 2.6.4-1.9 1.8.4 2.6L36 14l-2.3 1.2.4-2.6-1.9-1.8 2.6-.4z"
        fill="rgba(255,255,255,0.7)"
      />

      <defs>
        <linearGradient id="gestar-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GestarLogoFull({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <GestarLogo size={size} />
      <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <span className="text-blue-900">Ges</span>
        <span className="text-blue-600">tar</span>
      </span>
    </span>
  );
}
