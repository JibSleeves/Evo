
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
  style?: React.CSSProperties; // Added for dynamic styling like affective state
}

export type ResponseStyle = 'neutral' | 'formal' | 'casual' | 'glitchy' | 'analytical' | 'concise' | 'detailed';
export type UiVariant = 'default' | 'pulsing_glow' | 'minimal_glitch' | 'intense_holographic' | 'calm_focus';
export type EmotionalTone = 'neutral' | 'empathetic' | 'assertive' | 'inquisitive' | 'reserved';
export type KnowledgeLevel = 'basic' | 'intermediate' | 'advanced' | 'specialized_topic';

export type AffectiveState = {
  /** Ranges from -1 (very negative/unpleasant) to 1 (very positive/pleasant) */
  valence: number;
  /** Ranges from -1 (very calm/passive) to 1 (very excited/active) */
  arousal: number;
};

export type InteractionGoal = {
  text: string; // Concise description of the goal, max 20 words.
  successMetrics: string[]; // 1-2 simple, qualitative metrics, each max 10 words.
};

export type ChatbotPersona = {
  responseStyle: ResponseStyle;
  uiVariant: UiVariant;
  emotionalTone: EmotionalTone;
  knowledgeLevel: KnowledgeLevel;
  resonancePromptFragment: string; // Max 15 words, a core directive.
  affectiveState: AffectiveState;
  homeostaticAffectiveRange?: { valence: [number, number]; arousal: [number, number] };
  currentAffectiveGoal?: AffectiveState;
  currentInteractionGoal?: InteractionGoal;
};

// Data for system messages
export type EvolutionData = {
  isEcho?: false; // To distinguish from EchoData
  evolutionaryInsight?: string;
  analysis?: string;
  summary?: string;
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModificationSuggestion?: UiVariant; // Changed from string to UiVariant
  dreamDataUri?: string;
  keyLearnings?: string[]; // Each learning max 70 chars, up to 3.
  conceptualSpark?: {
    sparkText: string; // Max 30-40 words.
    sparkType: 'question' | 'speculation' | 'poem_fragment';
  };
  affectiveModulationStrategy?: string;
  updatedInteractionGoal?: InteractionGoal;
  goalSuccessEvaluation?: string;
  cognitiveDissonancePoint?: string; // Max 100 chars.
  inferredUserSentiment?: string;
  // For future features
  resolutionPath?: 'adapt' | 'reaffirm' | 'synthesize' | 'none';
};
