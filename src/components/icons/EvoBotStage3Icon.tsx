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
        <linearGradient id="stage3grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <path 
        d="M12 2L2 7L12 12L22 7L12 2Z" 
        stroke="url(#stage3grad)" 
        strokeWidth="1.5" 
        className="animate-glitch-subtle"
      />
      <path d="M2 17L12 22L22 17" stroke="url(#stage3grad)" strokeWidth="1.5" />
      <path d="M2 7L2 17" stroke="url(#stage3grad)" strokeWidth="1.5" />
      <path d="M22 7L22 17" stroke="url(#stage3grad)" strokeWidth="1.5" />
      <path d="M12 12L12 22" stroke="url(#stage3grad)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="hsl(var(--accent))" className="animate-pulse-custom" />
    </svg>
  );
}
