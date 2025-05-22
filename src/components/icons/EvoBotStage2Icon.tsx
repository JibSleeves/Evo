import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotStage2Icon({ className }: EvoBotIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="hsl(var(--primary))" 
      strokeWidth="1.5" 
      className={cn("h-8 w-8 text-primary filter drop-shadow-[0_0_3px_hsl(var(--primary))]", className)}
    >
      <path d="M16.5 7.5L12 12L7.5 7.5" />
      <path d="M12 12V16.5" />
      <circle cx="12" cy="12" r="10" strokeDasharray="2 2" className="animate-spin" style={{ animationDuration: '10s' }}/>
      <circle cx="12" cy="12" r="2.5" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" className="animate-pulse-custom" />
    </svg>
  );
}
