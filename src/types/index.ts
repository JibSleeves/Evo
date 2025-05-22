
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

export type AffectiveState = {
  /** Ranges from -1 (negative) to 1 (positive) */
  valence: number;
  /** Ranges from -1 (calm) to 1 (excited) */
  arousal: number;
};

export type ChatbotPersona = {
  responseStyle: ResponseStyle;
  uiVariant: UiVariant;
  emotionalTone: EmotionalTone;
  knowledgeLevel: KnowledgeLevel;
  resonancePromptFragment: string;
  affectiveState: AffectiveState; // New: For Affective Resonance
};

// Data for system messages
export type EvolutionData = {
  isEcho?: false; // To distinguish from EchoData
  evolutionaryInsight?: string;
  analysis?: string;
  summary?: string;
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModificationSuggestion?: string;
  dreamDataUri?: string;
  keyLearnings?: string[]; // New: For Memory Crystalization
  conceptualSpark?: { // New: For Conceptual Sparks
    text: string;
    type: 'question' | 'speculation' | 'poem_fragment';
  };
};
