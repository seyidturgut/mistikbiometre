"use client";

interface Props {
  className?: string;
}

/**
 * Open-palm silhouette guide — 5 fingers + thumb + palm.
 * Composed from rounded rect/ellipse strokes; no fill.
 */
export function HandOutline({ className }: Props) {
  return (
    <svg
      viewBox="0 0 240 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="palm-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4af0d4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a574ff" stopOpacity="0.7" />
        </linearGradient>
        <filter id="hand-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        stroke="url(#palm-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#hand-glow)"
      >
        {/* Palm */}
        <rect x="58" y="140" width="124" height="148" rx="48" />

        {/* Thumb (angled, on the left) */}
        <ellipse
          cx="48"
          cy="172"
          rx="22"
          ry="40"
          transform="rotate(-22 48 172)"
        />

        {/* Index finger */}
        <rect x="66" y="48" width="26" height="108" rx="13" />
        {/* Middle finger (longest) */}
        <rect x="100" y="28" width="26" height="128" rx="13" />
        {/* Ring finger */}
        <rect x="134" y="40" width="26" height="116" rx="13" />
        {/* Pinky */}
        <rect x="166" y="62" width="26" height="94" rx="13" />
      </g>

      {/* Fingertip dots */}
      <g fill="#4af0d4" opacity="0.95">
        <circle cx="79" cy="50" r="2.5" />
        <circle cx="113" cy="30" r="2.5" />
        <circle cx="147" cy="42" r="2.5" />
        <circle cx="179" cy="64" r="2.5" />
        <circle cx="38" cy="138" r="2.5" />
      </g>
    </svg>
  );
}
