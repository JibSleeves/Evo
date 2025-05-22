
"use client";

import type { Message, EvolutionStage, ChatbotPersona, EvolutionData, EchoData } from '@/types';
import { cn } from '@/lib/utils';
import { User, Cpu, Info, Sparkles, Lightbulb, Zap, Image as ImageIcon } from 'lucide-react'; // Added Zap, ImageIcon
import Image from 'next/image'; // For Dream Weaving
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
  0: EvoBotBaseIcon, 1: EvoBotStage1Icon, 2: EvoBotStage2Icon, 3: EvoBotStage3Icon, 4: EvoBotStage4Icon,
};

export function ChatMessage({ message, evolutionStage, currentPersona }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const BotIconComponent = botIcons[isBot ? evolutionStage : 0] || EvoBotBaseIcon;
  
  // Type guards for data
  const messageEvolutionData = message.data && 'isEcho' in message.data && message.data.isEcho === false ? message.data as EvolutionData : 
                               message.data && !('isEcho' in message.data) ? message.data as EvolutionData : undefined;

  const messageEchoData = message.data && 'isEcho' in message.data && message.data.isEcho === true ? message.data as EchoData : undefined;


  const effectivePersona = message.personaState || currentPersona;
  const { uiVariant: personaUiVariant, responseStyle: personaResponseStyle, emotionalTone, knowledgeLevel, resonancePromptFragment } = effectivePersona;

  const getSystemIcon = () => {
    if (messageEchoData?.isEcho) return <Zap className="h-5 w-5 text-secondary mt-0.5 shrink-0 animate-pulse-custom [animation-duration:0.8s]" />;
    if (messageEvolutionData?.dreamDataUri) return <ImageIcon className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (messageEvolutionData?.evolutionaryInsight) return <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (messageEvolutionData?.summary || messageEvolutionData?.analysis) return <Lightbulb className="h-5 w-5 text-primary/80 mt-0.5 shrink-0" />;
    return <Cpu className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />;
  };
  
  const formatPersonaState = (persona: ChatbotPersona | undefined): string => {
    if (!persona) return '';
    return `(Style: ${persona.responseStyle}, UI: ${persona.uiVariant}, Tone: ${persona.emotionalTone}, Knowledge: ${persona.knowledgeLevel}, Resonance: "${persona.resonancePromptFragment.substring(0,30)}...")`;
  };

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
        isSystem && "text-muted-foreground",
        messageEchoData?.isEcho && "border-secondary/50 opacity-80 max-w-[60%] ml-auto mr-auto"
      )}
    >
      {isBot && <BotIconComponent className={cn("mt-1 shrink-0 h-7 w-7 md:h-8 md:w-8", evolutionStage >=2 && "holographic-text", (personaUiVariant === 'pulsing_glow' || evolutionStage === 4) && 'animate-pulse-custom')} />}
      {isUser && <User className="h-6 w-6 text-primary mt-1 shrink-0" />}
      {isSystem && getSystemIcon()}
      
      <div className={cn("flex flex-col min-w-0", messageEchoData?.isEcho && "w-full items-center")}> 
        <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words", 
            isUser ? "text-primary-foreground" : isBot ? "text-card-foreground" : "text-muted-foreground",
            isBot && personaUiVariant === 'intense_holographic' && "holographic-text",
            isBot && (personaResponseStyle === 'glitchy' || personaUiVariant === 'minimal_glitch') && "animate-glitch-subtle",
            messageEchoData?.isEcho ? "italic text-center text-secondary-foreground text-xs" : isSystem && "italic",
            messageEvolutionData?.evolutionaryInsight && "font-semibold text-accent/90"
          )}
        >
          {message.text}
        </p>
        
        {messageEvolutionData?.dreamDataUri && messageEvolutionData.dreamDataUri.startsWith('data:image') && (
          <div className="mt-2 border border-accent/30 p-1 rounded-md max-w-xs overflow-hidden box-glow-accent">
            <Image 
              src={messageEvolutionData.dreamDataUri} 
              alt="EvoChat's Dream Visual" 
              width={200} 
              height={200} 
              className="rounded object-contain"
              data-ai-hint="abstract cyberpunk"
            />
          </div>
        )}

        <span className="text-xs text-muted-foreground/80 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
          {(!messageEchoData && (isBot || (isSystem && message.personaState))) && ` ${formatPersonaState(message.personaState)}`}
        </span>
        
        {isSystem && messageEvolutionData && (messageEvolutionData.summary || messageEvolutionData.analysis || messageEvolutionData.evolutionaryInsight) && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground/80 flex items-center gap-1">
              <Info size={14}/> System Log Details
            </summary>
            <div className="mt-1 p-2 border-l-2 border-primary/50 text-muted-foreground/90 bg-background/50 rounded-r-md space-y-1">
              {messageEvolutionData.summary && <p><strong>Summary:</strong> {messageEvolutionData.summary}</p>}
              {messageEvolutionData.analysis && <p><strong>Analysis:</strong> {messageEvolutionData.analysis.length > 200 ? messageEvolutionData.analysis.substring(0,200) + "..." : messageEvolutionData.analysis}</p>}
              {messageEvolutionData.personaBefore && <p className="mt-1"><strong>Persona Before:</strong> {formatPersonaState(messageEvolutionData.personaBefore)}</p>}
              {messageEvolutionData.personaAfter && <p><strong>Persona After:</strong> {formatPersonaState(messageEvolutionData.personaAfter)}</p>}
              {messageEvolutionData.uiModificationSuggestion && <p><strong>UI Suggestion:</strong> {messageEvolutionData.uiModificationSuggestion}</p>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
