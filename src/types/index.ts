
export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  data?: EvolutionData | EchoData; // Combined data type
  personaState?: ChatbotPersona;
};

export type EchoData = {
  isEcho: true;
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
  resonancePromptFragment: string; // New: For Resonance Tuning
};

// Data for system messages related to evolution and dreams
export type EvolutionData = {
  isEcho?: false; // To distinguish from EchoData
  evolutionaryInsight?: string;
  analysis?: string;
  summary?: string;
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModificationSuggestion?: string;
  dreamDataUri?: string; // New: For Dream Weaving
};
