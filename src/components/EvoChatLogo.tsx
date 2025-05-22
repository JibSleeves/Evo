
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function EvoChatLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      {...props}
      className={cn(props.className)} // Ensure className is applied
    >
      <defs>
        <linearGradient id="logoGradientMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
         <filter id="logoGlow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Outer angular shape - with gradient and glow */}
      <path 
        d="M10 50 L30 20 L70 20 L90 50 L70 80 L30 80 Z" 
        stroke="url(#logoGradientMain)" 
        filter="url(#logoGlow)"
        className="animate-pulse-custom [animation-duration:3s]"
      />
      {/* Inner "E" like structure */}
      <path d="M35 40 L55 40" stroke="hsl(var(--primary))" opacity="0.8" />
      <path d="M35 50 L60 50 M45 50 L45 60" stroke="hsl(var(--primary))" opacity="0.8" />
      <path d="M35 60 L55 60" stroke="hsl(var(--primary))" opacity="0.8" />
      {/* Orbiting dot - enhanced with animation and glow */}
      <circle cx="75" cy="35" r="4" fill="hsl(var(--accent))" className="animate-pulse-custom [animation-duration:1.5s]">
         <animateMotion dur="6s" repeatCount="indefinite" path="M0,0 C10,-15 -10,-15 0,0 Z" />
      </circle>
    </svg>
  );
}

