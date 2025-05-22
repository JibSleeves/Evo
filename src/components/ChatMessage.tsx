
"use client";

import type { Message, EvolutionStage, ChatbotPersona, EvolutionData, EchoData, AffectiveState } from '@/types';
import { cn } from '@/lib/utils';
import { User, Cpu, Info, Sparkles, Lightbulb, Zap, Image as ImageIcon, Brain, BookOpen, Wand2 } from 'lucide-react'; // Added Brain, BookOpen, Wand2
import Image from 'next/image';
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

// Function to generate CSS filter based on affective state
const getAffectiveStyle = (affectiveState?: AffectiveState) => {
  if (!affectiveState) return {};
  const { valence, arousal } = affectiveState; // valence: -1 to 1, arousal: -1 to 1

  // Hue shift based on valence (e.g., warmer for positive, cooler for negative)
  const hueRotate = valence * 20; // Max +/- 20deg shift
  // Saturation based on arousal (more intense arousal = more saturated)
  const saturate = 1 + arousal * 0.3; // Max 1.3x saturation
  // Brightness based on valence (brighter for positive)
  const brightness = 1 + valence * 0.15; // Max 1.15x brightness
  // Slight scale based on arousal
  const scale = 1 + Math.abs(arousal) * 0.03; // Max 3% scale

  return {
    filter: `hue-rotate(${hueRotate}deg) saturate(${saturate}) brightness(${brightness})`,
    transform: `scale(${scale})`,
    transition: 'filter 0.5s ease-out, transform 0.5s ease-out',
  };
};


export function ChatMessage({ message, evolutionStage, currentPersona }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const effectivePersona = message.personaState || currentPersona;
  const { uiVariant: personaUiVariant, responseStyle: personaResponseStyle, affectiveState } = effectivePersona;

  const BotIconComponent = botIcons[isBot ? evolutionStage : 0] || EvoBotBaseIcon;
  const botIconStyle = isBot ? getAffectiveStyle(affectiveState) : {};
  
  const messageData = message.data as EvolutionData | undefined; // Cast for easier access, ensure to check fields

  const getSystemIcon = () => {
    if (messageData?.isEcho) return <Zap className="h-5 w-5 text-secondary mt-0.5 shrink-0 animate-pulse-custom [animation-duration:0.8s]" />;
    if (messageData?.conceptualSpark) return <Wand2 className="h-5 w-5 text-purple-400 mt-0.5 shrink-0 animate-pulse-custom [animation-duration:1.2s]" />;
    if (messageData?.keyLearnings && messageData.keyLearnings.length > 0) return <BookOpen className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />;
    if (messageData?.dreamDataUri) return <ImageIcon className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (messageData?.evolutionaryInsight) return <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (messageData?.summary || messageData?.analysis) return <Lightbulb className="h-5 w-5 text-primary/80 mt-0.5 shrink-0" />;
    return <Cpu className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />;
  };
  
  const formatPersonaState = (persona: ChatbotPersona | undefined): string => {
    if (!persona) return '';
    return `(Style: ${persona.responseStyle}, UI: ${persona.uiVariant}, Tone: ${persona.emotionalTone}, Know: ${persona.knowledgeLevel}, V: ${persona.affectiveState.valence.toFixed(1)}, A: ${persona.affectiveState.arousal.toFixed(1)}, Res: "${persona.resonancePromptFragment.substring(0,20)}...")`;
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
        messageData?.isEcho && "border-secondary/50 opacity-80 max-w-[60%] ml-auto mr-auto",
        messageData?.conceptualSpark && "border-purple-400/50 bg-purple-900/20 max-w-[75%] ml-auto mr-auto",
        messageData?.keyLearnings && "border-blue-400/50 bg-blue-900/20 max-w-[75%] text-xs"
      )}
    >
      {isBot && <BotIconComponent style={botIconStyle} className={cn("mt-1 shrink-0 h-7 w-7 md:h-8 md:w-8", evolutionStage >=2 && "holographic-text", (personaUiVariant === 'pulsing_glow' || evolutionStage === 4) && 'animate-pulse-custom')} />}
      {isUser && <User className="h-6 w-6 text-primary mt-1 shrink-0" />}
      {isSystem && getSystemIcon()}
      
      <div className={cn("flex flex-col min-w-0", messageData?.isEcho && "w-full items-center")}> 
        <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words", 
            isUser ? "text-primary-foreground" : isBot ? "text-card-foreground" : "text-muted-foreground",
            isBot && personaUiVariant === 'intense_holographic' && "holographic-text",
            isBot && (personaResponseStyle === 'glitchy' || personaUiVariant === 'minimal_glitch') && "animate-glitch-subtle",
            messageData?.isEcho ? "italic text-center text-secondary-foreground text-xs" : isSystem && "italic",
            messageData?.evolutionaryInsight && "font-semibold text-accent/90",
            messageData?.conceptualSpark && "text-purple-300 font-medium",
            messageData?.keyLearnings && "text-blue-300"
          )}
        >
          {message.text}
        </p>
        
        {messageData?.dreamDataUri && messageData.dreamDataUri.startsWith('data:image') && (
          <div className="mt-2 border border-accent/30 p-1 rounded-md max-w-xs overflow-hidden box-glow-accent">
            <Image 
              src={messageData.dreamDataUri} 
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
          {(!messageData?.isEcho && (isBot || (isSystem && message.personaState && !messageData?.keyLearnings && !messageData?.conceptualSpark))) && ` ${formatPersonaState(message.personaState)}`}
        </span>
        
        {isSystem && messageData && (messageData.summary || messageData.analysis || messageData.evolutionaryInsight) && (
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
