import type { SVGProps } from 'react';

export function EvoChatLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Outer angular shape */}
      <path d="M10 50 L30 20 L70 20 L90 50 L70 80 L30 80 Z" stroke="url(#logoGradient)" />
      {/* Inner "E" like structure */}
      <path d="M35 40 L55 40" stroke="hsl(var(--primary))" />
      <path d="M35 50 L60 50 M45 50 L45 60" stroke="hsl(var(--primary))" />
      <path d="M35 60 L55 60" stroke="hsl(var(--primary))" />
      {/* Orbiting dot - conceptual, actual animation would be CSS */}
      <circle cx="75" cy="35" r="3" fill="hsl(var(--accent))" className="animate-pulse-custom" />
    </svg>
  );
}
