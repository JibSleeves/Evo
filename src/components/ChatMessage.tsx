
"use client";

import type { Message, EvolutionStage, ChatbotPersona, EvolutionData, EchoData, AffectiveState, InteractionGoal } from '@/types';
import { cn } from '@/lib/utils';
import { User, Cpu, Info, Sparkles, Lightbulb, Zap, Image as ImageIcon, Brain, BookOpen, Wand2, Target, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { EvoBotBaseIcon } from './icons/EvoBotBaseIcon';
import { EvoBotStage1Icon } from './icons/EvoBotStage1Icon';
import { EvoBotStage2Icon } from './icons/EvoBotStage2Icon';
import { EvoBotStage3Icon } from './icons/EvoBotStage3Icon';
import { EvoBotStage4Icon } from './icons/EvoBotStage4Icon';

interface ChatMessageProps {
  message: Message;
  evolutionStage: EvolutionStage;
  currentPersona: ChatbotPersona; // Fallback if message.personaState is missing
}

const botIcons: Record<EvolutionStage, React.FC<EvoBotIconProps>> = {
  0: EvoBotBaseIcon, 1: EvoBotStage1Icon, 2: EvoBotStage2Icon, 3: EvoBotStage3Icon, 4: EvoBotStage4Icon,
};

const getAffectiveStyle = (affectiveState?: AffectiveState) => {
  if (!affectiveState) return {};
  const { valence, arousal } = affectiveState;
  // More pronounced visual changes
  const hueRotate = valence * 30; // Increased range for hue rotation
  const saturate = 1 + arousal * 0.5; // Increased range for saturation
  const brightness = 1 + valence * 0.2; // Increased range for brightness
  const scale = 1 + Math.abs(arousal) * 0.05; // Increased range for scale
  return {
    filter: `hue-rotate(${hueRotate}deg) saturate(${saturate}) brightness(${brightness})`,
    transform: `scale(${scale})`,
    transition: 'filter 0.7s ease-out, transform 0.7s ease-out',
  };
};

export function ChatMessage({ message, evolutionStage, currentPersona }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  const effectivePersona = message.personaState || currentPersona;
  const { uiVariant: personaUiVariant, responseStyle: personaResponseStyle, affectiveState, currentAffectiveGoal, currentInteractionGoal, resonancePromptFragment, homeostaticAffectiveRange } = effectivePersona;

  const BotIconComponent = botIcons[isBot ? evolutionStage : 0] || EvoBotBaseIcon;
  const botIconStyle = isBot ? getAffectiveStyle(affectiveState) : {};

  const messageData = message.data as EvolutionData | EchoData | undefined;
  const isEcho = !!(messageData && 'isEcho' in messageData && messageData.isEcho);
  const evolutionData = (messageData && !isEcho) ? messageData as EvolutionData : undefined;


  const getSystemIcon = () => {
    if (isEcho) return <Zap className="h-5 w-5 text-secondary mt-0.5 shrink-0 animate-pulse-custom [animation-duration:0.8s]" />;
    if (evolutionData?.conceptualSpark) return <Wand2 className="h-5 w-5 text-purple-400 mt-0.5 shrink-0 animate-pulse-custom [animation-duration:1.2s]" />;
    if (evolutionData?.keyLearnings && evolutionData.keyLearnings.length > 0) return <BookOpen className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />;
    if (evolutionData?.dreamDataUri) return <ImageIcon className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (evolutionData?.evolutionaryInsight) return <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />;
    if (evolutionData?.updatedInteractionGoal) return <Target className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />;
    if (evolutionData?.goalSuccessEvaluation) {
      const evalText = evolutionData.goalSuccessEvaluation.toLowerCase();
      if (evalText.includes("met") || evalText.includes("achieved") || evalText.includes("success")) return <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />;
      if (evalText.includes("not met") || evalText.includes("failed")) return <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />;
      return <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />; // For partial/unclear
    }
    if (evolutionData?.summary || evolutionData?.analysis) return <Lightbulb className="h-5 w-5 text-primary/80 mt-0.5 shrink-0" />;
    if (message.text.toLowerCase().startsWith('error:')) return <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />;
    return <Cpu className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />;
  };

  const formatPersonaState = (persona?: ChatbotPersona): string[] => {
    if (!persona) return ['Persona state unavailable.'];
    const parts: string[] = [];
    parts.push(`Style: ${persona.responseStyle}, UI: ${persona.uiVariant}, Tone: ${persona.emotionalTone}, Know: ${persona.knowledgeLevel}`);
    parts.push(`Affective State: V:${persona.affectiveState.valence.toFixed(1)}, A:${persona.affectiveState.arousal.toFixed(1)}`);
    if (persona.homeostaticAffectiveRange) {
      parts.push(`Homeostasis: V[${persona.homeostaticAffectiveRange.valence.join(',')}] A[${persona.homeostaticAffectiveRange.arousal.join(',')}]`);
    }
    if (persona.currentAffectiveGoal) {
      parts.push(`Affective Goal: V:${persona.currentAffectiveGoal.valence.toFixed(1)}, A:${persona.currentAffectiveGoal.arousal.toFixed(1)}`);
    }
    parts.push(`Resonance: "${persona.resonancePromptFragment.substring(0,30)}${persona.resonancePromptFragment.length > 30 ? '...' : ''}"`);
    if (persona.currentInteractionGoal) {
      parts.push(`Focus: "${persona.currentInteractionGoal.text.substring(0,30)}${persona.currentInteractionGoal.text.length > 30 ? '...' : ''}" (Metrics: ${persona.currentInteractionGoal.successMetrics.join(', ').substring(0,30)}${persona.currentInteractionGoal.successMetrics.join(', ').length > 30 ? '...' : ''})`);
    }
    return parts;
  };
  
  const renderInteractionGoal = (goal?: InteractionGoal) => {
    if (!goal) return null;
    return (
      <div>
        <p><strong>New Interaction Focus:</strong> {goal.text}</p>
        {goal.successMetrics && goal.successMetrics.length > 0 && (
          <p className="text-xs"><strong>Success Metrics:</strong> {goal.successMetrics.join('; ')}</p>
        )}
      </div>
    );
  };


  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 md:p-4 rounded-lg mb-3 shadow-md transition-all duration-500",
        isUser ? "ml-auto bg-primary/20 border border-primary/30 max-w-[85%]"
               : isBot ? "mr-auto bg-card border border-card-foreground/20 max-w-[85%]"
               : "mr-auto bg-muted/30 border border-muted-foreground/20 w-full max-w-full text-sm", // System messages full width
        isBot && evolutionStage >=1 && "box-glow-primary",
        isBot && (personaUiVariant === 'intense_holographic' || evolutionStage >= 3) && "box-glow-accent border-accent/50",
        isBot && personaUiVariant === 'minimal_glitch' && "overflow-hidden",
        isSystem && "text-muted-foreground",
        isEcho && "border-secondary/50 opacity-80 max-w-[60%] ml-auto mr-auto italic text-center",
        evolutionData?.conceptualSpark && "border-purple-400/50 bg-purple-950/30 max-w-[75%] ml-auto mr-auto",
        evolutionData?.keyLearnings && "border-blue-400/50 bg-blue-950/30 max-w-[85%]",
        evolutionData?.updatedInteractionGoal && "border-green-400/50 bg-green-950/30"
      )}
    >
      {isBot && <BotIconComponent style={botIconStyle} className={cn("mt-1 shrink-0 h-7 w-7 md:h-8 md:w-8", evolutionStage >=2 && "holographic-text", (personaUiVariant === 'pulsing_glow' || evolutionStage === 4) && 'animate-pulse-custom')} />}
      {isUser && <User className="h-6 w-6 text-primary mt-1 shrink-0" />}
      {isSystem && getSystemIcon()}

      <div className={cn("flex flex-col min-w-0 flex-1", isEcho && "w-full items-center")}>
        <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser ? "text-primary-foreground" : isBot ? "text-card-foreground" : "text-muted-foreground",
            isBot && personaUiVariant === 'intense_holographic' && "holographic-text",
            isBot && (personaResponseStyle === 'glitchy' || personaUiVariant === 'minimal_glitch') && "animate-glitch-subtle",
            isEcho ? "text-secondary-foreground text-xs" : isSystem && "italic",
            evolutionData?.evolutionaryInsight && "font-semibold text-accent/90",
            evolutionData?.conceptualSpark && "text-purple-300 font-medium",
            evolutionData?.keyLearnings && "text-blue-300",
            evolutionData?.updatedInteractionGoal && "text-green-300 font-medium"
          )}
        >
          {message.text}
        </p>

        {evolutionData?.dreamDataUri && evolutionData.dreamDataUri.startsWith('data:image') && (
          <div className="mt-2 border border-accent/30 p-1 rounded-md max-w-xs sm:max-w-sm md:max-w-md overflow-hidden box-glow-accent self-start">
            <Image
              src={evolutionData.dreamDataUri}
              alt="EvoChat's Dream Visual"
              width={300} 
              height={300}
              className="rounded object-contain w-full h-auto" // Responsive image
              data-ai-hint="abstract cyberpunk"
            />
          </div>
        )}

        <span className="text-xs text-muted-foreground/70 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString()}
          {(!isEcho && (isBot || (isSystem && message.personaState && !evolutionData?.keyLearnings && !evolutionData?.conceptualSpark && !evolutionData?.updatedInteractionGoal))) && 
           ` | S${evolutionStage} | ${effectivePersona?.affectiveState.valence.toFixed(1)}V, ${effectivePersona?.affectiveState.arousal.toFixed(1)}A`
          }
        </span>

        {isSystem && evolutionData && (evolutionData.summary || evolutionData.analysis || evolutionData.evolutionaryInsight || evolutionData.affectiveModulationStrategy || evolutionData.updatedInteractionGoal || evolutionData.goalSuccessEvaluation || evolutionData.cognitiveDissonancePoint || evolutionData.inferredUserSentiment) && (
          <details className="mt-2 text-xs w-full">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground/80 flex items-center gap-1">
              <Info size={14}/> System Log & Evolution Details
            </summary>
            <div className="mt-1 p-2 border-l-2 border-primary/50 text-muted-foreground/90 bg-background/30 rounded-r-md space-y-1.5 text-[0.7rem] leading-snug">
              {evolutionData.summary && <p><strong>Summary:</strong> {evolutionData.summary}</p>}
              {evolutionData.analysis && <p><strong>Analysis:</strong> {evolutionData.analysis}</p>}
              {evolutionData.inferredUserSentiment && <p><strong>User Sentiment:</strong> {evolutionData.inferredUserSentiment}</p>}
              {evolutionData.cognitiveDissonancePoint && <p><strong>Cognitive Dissonance:</strong> {evolutionData.cognitiveDissonancePoint}</p>}
              {evolutionData.goalSuccessEvaluation && <p><strong>Prev. Goal Eval:</strong> {evolutionData.goalSuccessEvaluation}</p>}
              
              {evolutionData.personaBefore && (
                <div><strong>Persona Before:</strong><ul className="list-disc list-inside pl-2">{formatPersonaState(evolutionData.personaBefore).map((s, i) => <li key={`pb-${i}`}>{s}</li>)}</ul></div>
              )}
              {evolutionData.personaAfter && (
                 <div><strong>Persona After:</strong><ul className="list-disc list-inside pl-2">{formatPersonaState(evolutionData.personaAfter).map((s, i) => <li key={`pa-${i}`}>{s}</li>)}</ul></div>
              )}
              {evolutionData.uiModificationSuggestion && <p><strong>UI Suggestion:</strong> {evolutionData.uiModificationSuggestion}</p>}
              {evolutionData.affectiveModulationStrategy && <p><strong>Affective Strategy:</strong> {evolutionData.affectiveModulationStrategy}</p>}
              {evolutionData.updatedInteractionGoal && renderInteractionGoal(evolutionData.updatedInteractionGoal)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
