
"use client";

import type { Message, EvolutionStage, ChatbotPersona, EvolutionData } from '@/types';
import { cn } from '@/lib/utils';
import { User, Cpu, Info, Sparkles, Lightbulb } from 'lucide-react';
import { EvoBotBaseIcon } from './icons/EvoBotBaseIcon';
import { EvoBotStage1Icon } from './icons/EvoBotStage1Icon';
import { EvoBotStage2Icon } from './icons/EvoBotStage2Icon';
import { EvoBotStage3Icon } from './icons/EvoBotStage3Icon';
import { EvoBotStage4Icon } from './icons/EvoBotStage4Icon';

interface ChatMessageProps {
  message: Message;
  evolutionStage: EvolutionStage;
  currentPersona: ChatbotPersona; 
}

const botIcons: Record<EvolutionStage, React.FC<{ className?: string }>> = {
  0: EvoBotBaseIcon,
  1: EvoBotStage1Icon,
  2: EvoBotStage2Icon,
  3: EvoBotStage3Icon,
  4: EvoBotStage4Icon,
};

export function ChatMessage({ message, evolutionStage, currentPersona }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const BotIconComponent = botIcons[isBot ? evolutionStage : 0] || EvoBotBaseIcon;
  const messageData = message.data as EvolutionData | undefined;

  // Use persona from the message if logged, otherwise use the current global persona for styling
  const effectivePersona = message.personaState || currentPersona;
  const personaUiVariant = effectivePersona.uiVariant;
  const personaResponseStyle = effectivePersona.responseStyle;
  const personaEmotionalTone = effectivePersona.emotionalTone;
  const personaKnowledgeLevel = effectivePersona.knowledgeLevel;


  const getSystemIcon = () => {
    if (messageData?.evolutionaryInsight) return <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (messageData?.summary || messageData?.analysis) return <Lightbulb className="h-5 w-5 text-primary/80 mt-0.5 shrink-0" />;
    return <Cpu className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />;
  }
  
  const formatPersonaState = (persona: ChatbotPersona | undefined): string => {
    if (!persona) return '';
    return `(Style: ${persona.responseStyle}, UI: ${persona.uiVariant}, Tone: ${persona.emotionalTone}, Knowledge: ${persona.knowledgeLevel})`;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 md:p-4 rounded-lg mb-3 max-w-[85%] shadow-md",
        isUser ? "ml-auto bg-primary/20 border border-primary/30" 
               : isBot ? "mr-auto bg-card border border-card-foreground/20" 
               : "mr-auto bg-muted/50 border border-muted-foreground/30 w-full max-w-full text-sm",
        isBot && evolutionStage >=1 && "box-glow-primary",
        isBot && (personaUiVariant === 'intense_holographic' || evolutionStage >= 3) && "box-glow-accent border-accent/50",
        isBot && personaUiVariant === 'minimal_glitch' && "overflow-hidden", 
        isSystem && "text-muted-foreground"
      )}
    >
      {isBot && <BotIconComponent className={cn("mt-1 shrink-0 h-7 w-7 md:h-8 md:w-8", 
                                               evolutionStage >=2 && "holographic-text", 
                                               (personaUiVariant === 'pulsing_glow' || evolutionStage === 4) && 'animate-pulse-custom'
                                               )} />}
      {isUser && <User className="h-6 w-6 text-primary mt-1 shrink-0" />}
      {isSystem && getSystemIcon()}
      
      <div className="flex flex-col min-w-0"> 
        <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words", 
            isUser ? "text-primary-foreground" : isBot ? "text-card-foreground" : "text-muted-foreground",
            isBot && personaUiVariant === 'intense_holographic' && "holographic-text",
            isBot && (personaResponseStyle === 'glitchy' || personaUiVariant === 'minimal_glitch') && "animate-glitch-subtle",
            isSystem && "italic",
            messageData?.evolutionaryInsight && "font-semibold text-accent/90"
          )}
        >
          {message.text}
        </p>
        <span className="text-xs text-muted-foreground/80 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
          {(isBot || (isSystem && message.personaState)) && ` ${formatPersonaState(message.personaState)}`}
        </span>
        
        {isSystem && (messageData?.summary || messageData?.analysis || messageData?.evolutionaryInsight) && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground/80 flex items-center gap-1">
              <Info size={14}/> System Log Details
            </summary>
            <div className="mt-1 p-2 border-l-2 border-primary/50 text-muted-foreground/90 bg-background/50 rounded-r-md space-y-1">
              {messageData.summary && <p><strong>Summary:</strong> {messageData.summary}</p>}
              {messageData.analysis && <p><strong>Analysis:</strong> {messageData.analysis.length > 200 ? messageData.analysis.substring(0,200) + "..." : messageData.analysis}</p>}
              {messageData.personaBefore && <p className="mt-1"><strong>Persona Before:</strong> {formatPersonaState(messageData.personaBefore)}</p>}
              {messageData.personaAfter && <p><strong>Persona After:</strong> {formatPersonaState(messageData.personaAfter)}</p>}
              {messageData.uiModificationSuggestion && <p><strong>UI Suggestion:</strong> {messageData.uiModificationSuggestion}</p>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

