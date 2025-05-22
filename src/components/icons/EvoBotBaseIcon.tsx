import { Bot } from 'lucide-react';
import type { EvoBotIconProps } from '@/types';
import { cn } from '@/lib/utils';

export function EvoBotBaseIcon({ className }: EvoBotIconProps) {
  return <Bot className={cn("h-8 w-8 text-primary", className)} />;
}
