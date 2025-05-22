
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
  /** Ranges from -1 (negative) to 1 (positive) */
  valence: number;
  /** Ranges from -1 (calm) to 1 (excited) */
  arousal: number;
};

export type InteractionGoal = {
  text: string;
  successMetrics: string[];
};

export type ChatbotPersona = {
  responseStyle: ResponseStyle;
  uiVariant: UiVariant;
  emotionalTone: EmotionalTone;
  knowledgeLevel: KnowledgeLevel;
  resonancePromptFragment: string;
  affectiveState: AffectiveState;
  homeostaticAffectiveRange?: { valence: [number, number]; arousal: [number, number] };
  currentAffectiveGoal?: AffectiveState;
  currentInteractionGoal?: InteractionGoal; // Changed from emergentGoal: string
};

// Data for system messages
export type EvolutionData = {
  isEcho?: false; // To distinguish from EchoData
  evolutionaryInsight?: string;
  analysis?: string;
  summary?: string;
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModificationSuggestion?: string; // This is VUS
  dreamDataUri?: string;
  keyLearnings?: string[];
  conceptualSpark?: {
    sparkText: string;
    sparkType: 'question' | 'speculation' | 'poem_fragment';
  };
  affectiveModulationStrategy?: string;
  updatedInteractionGoal?: InteractionGoal; // Changed from emergentGoal to match new structure
  goalSuccessEvaluation?: string; // New field for EIG-SM
  // For future features
  resolutionPath?: 'adapt' | 'reaffirm' | 'synthesize' | 'none';
};

