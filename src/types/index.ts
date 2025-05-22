
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

export type ChatbotPersona = {
  responseStyle: 'neutral' | 'formal' | 'casual' | 'glitchy' | 'analytical' | 'concise' | 'detailed';
  uiVariant: 'default' | 'pulsing_glow' | 'minimal_glitch' | 'intense_holographic' | 'calm_focus';
  // Future: memoryFocus?: string; // e.g., "focus on user's last 3 questions"
  // Future: preferredTopics?: string[];
};

// Data for system messages related to evolution
export type EvolutionData = {
  evolutionaryInsight?: string;
  analysisSummary?: string; // from summarizeInteraction
  personaBefore?: ChatbotPersona;
  personaAfter?: ChatbotPersona;
  uiModification?: string; // description of UI change
};
