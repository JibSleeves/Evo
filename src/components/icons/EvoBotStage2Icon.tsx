
import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotStage2Icon({ className }: EvoBotIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      strokeWidth="1.5" 
      className={cn("h-8 w-8 text-primary filter drop-shadow-[0_0_3px_hsl(var(--primary))]", className)}
    >
      <defs>
        <linearGradient id="stage2IconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      {/* More complex head shape */}
      <path d="M12 2 L14 5 L12 8 L10 5 Z" stroke="url(#stage2IconGrad)" />
      {/* Body */}
      <rect width="10" height="8" x="7" y="8" rx="1.5" stroke="hsl(var(--primary))" />
      {/* Limbs/connections */}
      <path d="M7 12 L5 15" stroke="hsl(var(--primary))" />
      <path d="M17 12 L19 15" stroke="hsl(var(--primary))" />
      {/* Inner "eye" or core, pulsing */}
      <circle cx="12" cy="11" r="1.5" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" className="animate-pulse-custom [animation-duration:1.8s]" />
      {/* Subtle animated aura/ring */}
      <circle cx="12" cy="12" r="10" stroke="hsl(var(--primary) / 0.3)" strokeDasharray="3 3" className="animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }}/>
    </svg>
  );
}

