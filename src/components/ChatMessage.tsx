"use client";

import type { Message, EvolutionStage } from '@/types';
import { cn } from '@/lib/utils';
import { User, Cpu } from 'lucide-react';
import { EvoBotBaseIcon } from './icons/EvoBotBaseIcon';
import { EvoBotStage1Icon } from './icons/EvoBotStage1Icon';
import { EvoBotStage2Icon } from './icons/EvoBotStage2Icon';
import { EvoBotStage3Icon } from './icons/EvoBotStage3Icon';
import { EvoBotStage4Icon } from './icons/EvoBotStage4Icon';

interface ChatMessageProps {
  message: Message;
  evolutionStage: EvolutionStage;
}

const botIcons: Record<EvolutionStage, React.FC<{ className?: string }>> = {
  0: EvoBotBaseIcon,
  1: EvoBotStage1Icon,
  2: EvoBotStage2Icon,
  3: EvoBotStage3Icon,
  4: EvoBotStage4Icon,
};

export function ChatMessage({ message, evolutionStage }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const BotIconComponent = botIcons[evolutionStage] || EvoBotBaseIcon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg mb-3 max-w-[85%]",
        isUser ? "ml-auto bg-primary/20" : "mr-auto bg-card",
        isBot && evolutionStage >=1 && "border border-primary/50 box-glow-primary",
        isSystem && "bg-muted/50 w-full max-w-full text-center justify-center text-muted-foreground text-sm"
      )}
    >
      {isBot && <BotIconComponent className={cn("mt-1 shrink-0", evolutionStage >=2 && "holographic-text")} />}
      {isUser && <User className="h-6 w-6 text-primary mt-1 shrink-0" />}
      {isSystem && <Cpu className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
      
      <div className="flex flex-col min-w-0"> {/* Added min-w-0 for text wrapping */}
        <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words", // Added break-words
            isUser ? "text-primary-foreground" : "text-card-foreground",
            isBot && evolutionStage >=3 && "holographic-text",
            isBot && evolutionStage >=4 && "animate-glitch-subtle",
            isSystem && "italic"
          )}
        >
          {message.text}
        </p>
        <span className="text-xs text-muted-foreground mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        {isBot && message.data?.analysis && (
          <div className="mt-2 p-2 border-l-2 border-accent text-xs text-accent/80">
            <strong>Analysis:</strong> {message.data.analysis}
          </div>
        )}
      </div>
    </div>
  );
}
