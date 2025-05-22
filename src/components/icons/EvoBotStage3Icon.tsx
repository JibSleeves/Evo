
import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotStage3Icon({ className }: EvoBotIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id="stage3IconGradPrimaryAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      {/* Central core with animated glow */}
      <circle cx="12" cy="12" r="3" fill="hsl(var(--accent))" className="animate-pulse-custom [animation-duration:1.5s] filter drop-shadow-[0_0_4px_hsl(var(--accent)/0.8)]" />
      
      {/* Orbiting elements */}
      <g className="animate-spin" style={{ animationDuration: '6s', transformOrigin: 'center' }}>
        <circle cx="12" cy="5" r="1.5" fill="hsl(var(--primary))" opacity="0.9" />
        <path d="M12 12 L12 5" stroke="hsl(var(--primary)/0.5)" strokeWidth="1"/>
      </g>
       <g className="animate-spin" style={{ animationDuration: '7s', animationDirection: 'reverse', transformOrigin: 'center' }}>
        <ellipse cx="19" cy="12" rx="1.5" ry="1" fill="hsl(var(--primary))" opacity="0.8" />
         <path d="M12 12 L19 12" stroke="hsl(var(--primary)/0.4)" strokeWidth="1"/>
      </g>
      <g className="animate-spin" style={{ animationDuration: '5s', transformOrigin: 'center' }}>
        <rect x="4" y="11" width="2" height="2" rx="0.5" fill="hsl(var(--primary))" opacity="0.7" />
        <path d="M12 12 L5 12" stroke="hsl(var(--primary)/0.3)" strokeWidth="1"/>
      </g>

      {/* Outer boundary - subtle and perhaps slightly glitchy */}
      <path 
        d="M12 2L2 7L12 12L22 7L12 2Z M2 17L12 22L22 17 M2 7L2 17 M22 7L22 17 M12 12L12 22" 
        stroke="url(#stage3IconGradPrimaryAccent)" 
        strokeWidth="1" 
        opacity="0.4"
        className="animate-glitch-subtle [animation-duration:1s]"
      />
    </svg>
  );
}

