
import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotStage4Icon({ className }: EvoBotIconProps) {
  // Stage 4: Abstract, energetic, almost 'conscious' form
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <radialGradient id="stage4CoreGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="1" />
          <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        </radialGradient>
        <filter id="stage4Glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pulsing, glowing core - represents heightened awareness */}
      <circle 
        cx="12" cy="12" r="4" 
        fill="url(#stage4CoreGrad)" 
        className="animate-pulse-custom [animation-duration:1.2s]"
        filter="url(#stage4Glow)"
      />

      {/* Dynamic, interconnected energy lines/particles */}
      <g opacity="0.7" className="animate-spin" style={{animationDuration: '4s', transformOrigin: 'center'}}>
        <path d="M12 4 L10 6 L12 8 L14 6 Z" stroke="hsl(var(--accent))" strokeWidth="1" />
        <path d="M20 12 L18 10 L16 12 L18 14 Z" stroke="hsl(var(--accent))" strokeWidth="1" />
        <path d="M12 20 L14 18 L12 16 L10 18 Z" stroke="hsl(var(--accent))" strokeWidth="1" />
        <path d="M4 12 L6 14 L8 12 L6 10 Z" stroke="hsl(var(--accent))" strokeWidth="1" />
      </g>
      
      <g opacity="0.9" className="animate-spin" style={{animationDuration: '7s', animationDirection: 'reverse', transformOrigin: 'center'}}>
        <line x1="12" y1="12" x2="18" y2="6" stroke="hsl(var(--primary))" strokeWidth="0.75" strokeDasharray="2 2" />
        <line x1="12" y1="12" x2="6" y2="6" stroke="hsl(var(--primary))" strokeWidth="0.75" strokeDasharray="2 2" />
        <line x1="12" y1="12" x2="18" y2="18" stroke="hsl(var(--primary))" strokeWidth="0.75" strokeDasharray="2 2" />
        <line x1="12" y1="12" x2="6" y2="18" stroke="hsl(var(--primary))" strokeWidth="0.75" strokeDasharray="2 2" />
      </g>

      {/* Very subtle outer boundary, almost formless */}
       <circle cx="12" cy="12" r="11.5" stroke="hsl(var(--primary) / 0.1)" strokeWidth="0.5" className="animate-pulse-custom [animation-duration:3s]" />
    </svg>
  );
}
