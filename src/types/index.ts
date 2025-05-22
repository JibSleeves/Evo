
export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  data?: Record<string, any>; // For potential AI analysis data, evolutionary insights
  personaState?: ChatbotPersona; // Optional: log persona at the time of message
};

export type EvolutionStage = 0 | 1 | 2 | 3 | 4;

export interface EvoBotIconProps {
  className?: string;
}

export type ResponseStyle = 'neutral' | 'formal' | 'casual' | 'glitchy' | 'analytical' | 'concise' | 'detailed';
export type UiVariant = 'default' | 'pulsing_glow' | 'minimal_glitch' | 'intense_holographic' | 'calm_focus';
export type EmotionalTone = 'neutral' | 'empathetic' | 'assertive' | 'inquisitive' | 'reserved';
export type KnowledgeLevel = 'basic' | 'intermediate' | 'advanced' | 'specialized_topic';

export type ChatbotPersona = {
  responseStyle: ResponseStyle;
  uiVariant: UiVariant;
  emotionalTone: EmotionalTone;
  knowledgeLevel: KnowledgeLevel;
  // Future: memoryFocus?: string; // e.g., "focus on user's last 3 questions"
  // Future: preferredTopics?: string[];
};

// Data for system messages related to evolution
export type EvolutionData = {
  evolutionaryInsight?: string;
  analysis?: string; // from summarizeInteraction (full analysis)
  summary?: string; // from summarizeInteraction (summary part)
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModificationSuggestion?: string; // from decideNextEvolutionStep (new UI variant)
};

