import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotStage4Icon({ className }: EvoBotIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <radialGradient id="stage4grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          <stop offset="70%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#stage4grad)" className="animate-pulse-custom" style={{animationDuration: '1.5s'}} />
      <path 
        d="M12 6V2M12 22V18M18 12H22M2 12H6M16.95 7.05L19.07 4.93M4.93 19.07L7.05 16.95M16.95 16.95L19.07 19.07M4.93 4.93L7.05 7.05"
        stroke="hsl(var(--accent))" 
        strokeWidth="1" 
        strokeLinecap="round"
        className="animate-spin"
        style={{animationDuration: '5s', transformOrigin: 'center center'}}
      />
       <path 
        d="M12 5C15.866 5 19 8.13401 19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5Z"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        className="animate-spin"
        style={{animationDuration: '12s', transformOrigin: 'center center', animationDirection: 'reverse'}}
      />
      <circle cx="12" cy="12" r="1.5" fill="hsl(var(--foreground))" stroke="hsl(var(--foreground))" />
    </svg>
  );
}

