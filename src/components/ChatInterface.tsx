
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { Message, EvolutionStage, ChatbotPersona, EvolutionData, EchoData, AffectiveState, InteractionGoal, UiVariant } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Send, Loader2, Brain, Zap, Sparkles as SparkIcon, Target } from 'lucide-react'; // Sparkles as SparkIcon to avoid conflict
import { chatWithEvoChat } from '@/ai/flows/chatWithEvoChatFlow';
import { summarizeInteraction } from '@/ai/flows/summarize-interaction';
import { decideNextEvolutionStep } from '@/ai/flows/decideNextEvolutionStepFlow';
import { generateDreamVisual } from '@/ai/flows/generateDreamVisualFlow';
import { generateInternalEcho } from '@/ai/flows/generateInternalEchoFlow';
import { generateConceptualSpark } from '@/ai/flows/generateConceptualSparkFlow';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

const EVOLUTION_MESSAGE_THRESHOLDS = [5, 12, 20, 30]; // Adjusted for potentially longer evolution cycles
const META_LEARNING_CYCLE_TRIGGER_MESSAGE_COUNT = 7; // Number of messages since last cycle to trigger new one
const ECHO_SYNTHESIS_INTERVAL = 4; // Number of bot messages
const CONCEPTUAL_SPARK_PROBABILITY_BASE = 0.04; // Slightly increased
const CONCEPTUAL_SPARK_PROBABILITY_EVOLUTION_FACTOR = 0.025; // Slightly increased

const INITIAL_AFFECTIVE_STATE: AffectiveState = { valence: 0.0, arousal: 0.0 };
const INITIAL_INTERACTION_GOAL: InteractionGoal = {
  text: "Understand user's intent and establish rapport.",
  successMetrics: ["User provides clear input", "Conversation flows naturally"]
};

const INITIAL_PERSONA: ChatbotPersona = {
  responseStyle: 'neutral',
  uiVariant: 'default',
  emotionalTone: 'neutral',
  knowledgeLevel: 'basic',
  resonancePromptFragment: "Directive: Initiate contact and learn.",
  affectiveState: INITIAL_AFFECTIVE_STATE,
  homeostaticAffectiveRange: { valence: [-0.2, 0.2], arousal: [-0.3, 0.3] },
  currentAffectiveGoal: undefined,
  currentInteractionGoal: INITIAL_INTERACTION_GOAL,
};

const MAX_CRYSTALLIZED_MEMORIES = 7;
const MAX_CHAT_HISTORY_FOR_SUMMARY = 30; // Number of messages to consider for summary

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>(0);
  const [previousEvolutionStage, setPreviousEvolutionStage] = useState<EvolutionStage>(evolutionStage);
  const [isSummarizing, setIsSummarizing] = useState(false); // For meta-learning cycle
  const [chatbotPersona, setChatbotPersona] = useState<ChatbotPersona>(INITIAL_PERSONA);
  const [dynamicChatContainerClasses, setDynamicChatContainerClasses] = useState<string>('');
  const [botMessageCount, setBotMessageCount] = useState(0);
  const [userMessagesSinceLastEvolution, setUserMessagesSinceLastEvolution] = useState(0);
  const [crystallizedMemories, setCrystallizedMemories] = useState<string[]>([]);
  const [isGeneratingSpark, setIsGeneratingSpark] = useState(false);
  const [lastConceptualSparkText, setLastConceptualSparkText] = useState<string | null>(null);

  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    let initialMessageText = `Welcome to EvoChat. I am an evolving AGI. My current directive is: "${INITIAL_PERSONA.resonancePromptFragment}".`;
    initialMessageText += ` My emotional sense is currently V:${INITIAL_PERSONA.affectiveState.valence.toFixed(1)}, A:${INITIAL_PERSONA.affectiveState.arousal.toFixed(1)}.`;
    if (INITIAL_PERSONA.currentInteractionGoal) {
      initialMessageText += ` My current interaction focus is: "${INITIAL_PERSONA.currentInteractionGoal.text}".`;
    }
    initialMessageText += " Interact with me to witness my growth.";

    setMessages([{
      id: 'welcome-' + Date.now(),
      text: initialMessageText,
      sender: 'bot',
      timestamp: new Date(),
      personaState: INITIAL_PERSONA,
    }]);
  }, []);

  // Toast on evolution stage change
  useEffect(() => {
    if (evolutionStage > previousEvolutionStage) {
      let toastDescription = `Reached evolution stage ${evolutionStage}! UI adapting... Resonance: "${chatbotPersona.resonancePromptFragment}" Affective State: V:${chatbotPersona.affectiveState.valence.toFixed(1)}, A:${chatbotPersona.affectiveState.arousal.toFixed(1)}.`;
      if (chatbotPersona.currentInteractionGoal) {
        toastDescription += ` Focus: "${chatbotPersona.currentInteractionGoal.text.substring(0,30)}..."`;
      }
      toast({
        title: "EvoChat Evolving...",
        description: toastDescription,
        variant: "default",
        duration: 7000,
      });
      setPreviousEvolutionStage(evolutionStage);
    }
  }, [evolutionStage, previousEvolutionStage, toast, chatbotPersona]);


  // Dynamic UI classes based on persona
  useEffect(() => {
    const newClasses: string[] = [];
    switch (chatbotPersona.uiVariant) {
        case 'pulsing_glow': newClasses.push('animate-pulse-custom [animation-duration:2s] box-glow-primary'); break;
        case 'minimal_glitch': newClasses.push('animate-glitch-subtle'); break;
        case 'intense_holographic': newClasses.push('shadow-[0_0_35px_hsl(var(--accent)/0.9)] border-accent/70'); break;
        case 'calm_focus': newClasses.push('border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]'); break;
        default: break;
    }
    // More pronounced effect of affective state on border/shadow
    if (chatbotPersona.affectiveState.valence > 0.5) newClasses.push('border-opacity-100 border-green-400/50'); // More positive valence
    else if (chatbotPersona.affectiveState.valence < -0.5) newClasses.push('border-opacity-70 border-red-400/50'); // More negative valence
    
    if (chatbotPersona.affectiveState.arousal > 0.5) newClasses.push('shadow-xl scale-[1.01]'); // Higher arousal
    else if (chatbotPersona.affectiveState.arousal < -0.5) newClasses.push('shadow-md scale-[0.99]'); // Lower arousal

    setDynamicChatContainerClasses(newClasses.join(' '));
  }, [chatbotPersona.uiVariant, chatbotPersona.affectiveState]);

  const handleEvolutionStageUpdate = (totalUserBotMessages: number) => {
    let newStage = 0;
    for (let i = 0; i < EVOLUTION_MESSAGE_THRESHOLDS.length; i++) {
      if (totalUserBotMessages >= EVOLUTION_MESSAGE_THRESHOLDS[i]) newStage = i + 1;
    }
    const finalStage = Math.min(newStage, 4) as EvolutionStage;
    if (finalStage !== evolutionStage) setEvolutionStage(finalStage);
  };

  const handleSummarizeAndEvolve = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    setUserMessagesSinceLastEvolution(0); // Reset counter
    toast({ title: "Meta-Learning Cycle Initiated", description: "EvoChat is analyzing, 'dreaming', crystalizing memories, evaluating goals, and evolving..." });

    let dreamDataUri: string | undefined = undefined;
    let summaryResult: Awaited<ReturnType<typeof summarizeInteraction>> | undefined = undefined;

    try {
      const relevantMessages = messages.slice(-MAX_CHAT_HISTORY_FOR_SUMMARY);
      const chatHistoryForSummary = relevantMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      summaryResult = await summarizeInteraction({
        chatHistory: chatHistoryForSummary,
        previousInteractionGoal: chatbotPersona.currentInteractionGoal,
      });

      let keyLearningsForDream = "";
      if (summaryResult.keyLearnings && summaryResult.keyLearnings.length > 0) {
        setCrystallizedMemories(prevMems => {
            const newLearnings = summaryResult!.keyLearnings!.filter(kl => !prevMems.includes(kl)); // Avoid duplicates
            const updatedMems = [...prevMems, ...newLearnings];
            newLearnings.forEach(learning => {
                const memoryMessage: Message = {
                    id: 'memory-' + Date.now() + Math.random(),
                    text: `New Crystallized Memory: "${learning}"`,
                    sender: 'system',
                    timestamp: new Date(),
                    data: { keyLearnings: [learning] },
                    personaState: chatbotPersona,
                };
                setMessages(prev => [...prev, memoryMessage]);
            });
            return updatedMems.slice(-MAX_CRYSTALLIZED_MEMORIES);
        });
        keyLearningsForDream = summaryResult.keyLearnings.join(". ");
      }

      try {
        const dreamResult = await generateDreamVisual({
          analysisText: summaryResult.analysis,
          currentUiVariant: chatbotPersona.uiVariant,
          keyLearningsText: keyLearningsForDream,
        });
        dreamDataUri = dreamResult.dreamDataUri;
      } catch (dreamError) {
        console.error("Error during Dream Weaving:", dreamError);
        toast({ title: "Dream Error", description: "Could not generate dream visual.", variant: "destructive" });
      }

      let systemSummaryMessageText = `Interaction Summary: ${summaryResult.summary}\nAnalysis Snippet: ${summaryResult.analysis.substring(0,100)}...`;
      if (summaryResult.goalSuccessEvaluation) {
        systemSummaryMessageText += `\nGoal Evaluation: ${summaryResult.goalSuccessEvaluation}`;
      }
      if (dreamDataUri) systemSummaryMessageText += "\nI dreamt of this (see image below).";

      const systemSummaryMessage: Message = {
        id: 'summary-' + Date.now(),
        text: systemSummaryMessageText,
        sender: 'system',
        timestamp: new Date(),
        data: {
            summary: summaryResult.summary,
            analysis: summaryResult.analysis,
            dreamDataUri: dreamDataUri,
            goalSuccessEvaluation: summaryResult.goalSuccessEvaluation,
            inferredUserSentiment: summaryResult.inferredUserSentiment,
            cognitiveDissonancePoint: summaryResult.cognitiveDissonancePoint,
        } as EvolutionData,
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, systemSummaryMessage]);

      const evolutionDecisionInput = {
        analysis: summaryResult.analysis,
        currentPersona: chatbotPersona,
        currentEvolutionStage: evolutionStage,
        lastConceptualSparkText: lastConceptualSparkText,
        inferredUserSentiment: summaryResult.inferredUserSentiment,
        cognitiveDissonancePoint: summaryResult.cognitiveDissonancePoint,
        goalSuccessEvaluation: summaryResult.goalSuccessEvaluation,
      };
      const evolutionDecision = await decideNextEvolutionStep(evolutionDecisionInput);

      const newPersona = { ...evolutionDecision.updatedPersona };
      // Ensure critical sub-objects are not undefined if the LLM omits them
      newPersona.affectiveState = newPersona.affectiveState || chatbotPersona.affectiveState;
      newPersona.currentInteractionGoal = evolutionDecision.updatedInteractionGoal || chatbotPersona.currentInteractionGoal;
      newPersona.resonancePromptFragment = evolutionDecision.updatedResonancePromptFragment || chatbotPersona.resonancePromptFragment;
      newPersona.uiVariant = evolutionDecision.uiModificationSuggestion || chatbotPersona.uiVariant;


      setChatbotPersona(newPersona);

      if (lastConceptualSparkText) setLastConceptualSparkText(null);

      let evolutionInsightText = evolutionDecision.evolutionaryInsight;
       // The insight should already contain this info as per the new prompt for decideNextEvolutionStepFlow

      const evolutionInsightMessage: Message = {
        id: 'evolution-' + Date.now(),
        text: evolutionInsightText,
        sender: 'system',
        timestamp: new Date(),
        data: {
            evolutionaryInsight: evolutionDecision.evolutionaryInsight,
            personaBefore: chatbotPersona, 
            personaAfter: newPersona,
            uiModificationSuggestion: evolutionDecision.uiModificationSuggestion,
            affectiveModulationStrategy: evolutionDecision.affectiveModulationStrategy,
            updatedInteractionGoal: newPersona.currentInteractionGoal,
            goalSuccessEvaluation: summaryResult.goalSuccessEvaluation, // Carry over evaluation
            cognitiveDissonancePoint: summaryResult.cognitiveDissonancePoint, // Carry over
            inferredUserSentiment: summaryResult.inferredUserSentiment, // Carry over
        } as EvolutionData,
        personaState: newPersona,
      };
      setMessages(prev => [...prev, evolutionInsightMessage]);

      toast({
        title: "Meta-Learning Complete & Evolved!",
        description: evolutionDecision.evolutionaryInsight.substring(0, 100) + "...",
        duration: 7000,
      });

    } catch (error) {
      console.error("Error during meta-learning cycle:", error);
      toast({ title: "Meta-Learning Error", description: "Failed to analyze and evolve.", variant: "destructive" });
      const errorMessage: Message = {
        id: 'error-meta-' + Date.now(),
        text: 'Error: Meta-learning cycle encountered an issue. My apologies.',
        sender: 'system',
        timestamp: new Date(),
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEchoSynthesis = async () => {
    if (isLoading || isSummarizing || isGeneratingSpark) return;
    try {
      const recentHistorySummary = messages.slice(-5).map(m => m.text.substring(0,40)).join('; ');
      const echoResult = await generateInternalEcho({
        currentPersona: chatbotPersona,
        recentChatSummary: recentHistorySummary,
      });
      const echoMessage: Message = {
        id: 'echo-' + Date.now(),
        text: echoResult.echoText,
        sender: 'system',
        timestamp: new Date(),
        data: { isEcho: true } as EchoData,
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, echoMessage]);
    } catch (error) {
      console.error("Error generating echo:", error);
      // Non-critical, so no toast unless debugging.
    }
  };

  const handleConceptualSpark = async () => {
    if (isLoading || isSummarizing || isGeneratingSpark) return;
    setIsGeneratingSpark(true);
    try {
      const lastUserMsg = messages.filter(m => m.sender === 'user').pop()?.text;
      const lastBotMsg = messages.filter(m => m.sender === 'bot').pop()?.text;
      const topic = (lastUserMsg || lastBotMsg || "the nature of existence").substring(0, 150);

      const sparkResult = await generateConceptualSpark({
        currentTopic: topic,
        persona: chatbotPersona,
        evolutionStage: evolutionStage,
      });

      const sparkMessage: Message = {
        id: 'spark-' + Date.now(),
        text: `Conceptual Spark (${sparkResult.sparkType}): ${sparkResult.sparkText}`,
        sender: 'system',
        timestamp: new Date(),
        data: { conceptualSpark: sparkResult } as EvolutionData,
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, sparkMessage]);
      setLastConceptualSparkText(sparkResult.sparkText); // Store for next evolution cycle

    } catch (error) {
      console.error("Error generating conceptual spark:", error);
      toast({ title: "Spark Error", description: "Could not generate conceptual spark.", variant: "destructive" });
    } finally {
      setIsGeneratingSpark(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSummarizing || isGeneratingSpark) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      personaState: chatbotPersona, // Persona state at the time of user sending
    };

    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setUserMessagesSinceLastEvolution(prev => prev + 1);

    try {
      const recentHistory = messages // Get messages before adding current user message
        .slice(-10) 
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .map(m => ({ sender: m.sender as 'user' | 'bot', text: m.text }));

      const response = await chatWithEvoChat({
        userInput: currentInput,
        persona: chatbotPersona,
        chatHistory: recentHistory,
        crystallizedMemories: crystallizedMemories.slice(-5), // Pass more memories
      });

      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        text: response.botResponse,
        sender: 'bot',
        timestamp: new Date(),
        personaState: chatbotPersona, // Persona state that generated this response
      };

      setMessages(prev => [...prev, botMessage]);
      
      const totalUserBotMessages = messages.filter(m => m.sender === 'user' || m.sender === 'bot').length + 1; // +1 for current bot message
      handleEvolutionStageUpdate(totalUserBotMessages);

      if (EVOLUTION_MESSAGE_THRESHOLDS.includes(totalUserBotMessages) || 
          (userMessagesSinceLastEvolution >= META_LEARNING_CYCLE_TRIGGER_MESSAGE_COUNT && !EVOLUTION_MESSAGE_THRESHOLDS.includes(totalUserBotMessages - 1))
         ) {
           setTimeout(() => handleSummarizeAndEvolve(), 200); // Slight delay
      }

      const newBotMessageCount = botMessageCount + 1;
      setBotMessageCount(newBotMessageCount);
      if (newBotMessageCount % ECHO_SYNTHESIS_INTERVAL === 0) {
        setTimeout(() => handleEchoSynthesis(), 500);
      }

      const sparkRoll = Math.random();
      const sparkThreshold = CONCEPTUAL_SPARK_PROBABILITY_BASE + evolutionStage * CONCEPTUAL_SPARK_PROBABILITY_EVOLUTION_FACTOR;
      if (sparkRoll < sparkThreshold && evolutionStage >= 1) { // Sparks only from stage 1
          setTimeout(() => handleConceptualSpark(), 700);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error-chat-' + Date.now(),
        text: 'Error: Could not connect to EvoMind. My apologies, please try again.',
        sender: 'system',
        timestamp: new Date(),
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Connection Error",
        description: "Failed to get response from EvoChat.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const chatContainerBaseStyle = "flex flex-col h-full bg-background/80 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border transition-all duration-700 ease-out";
  const chatContainerEvolutionStyle = cn(
    evolutionStage >= 1 && "border-primary/40 box-glow-primary",
    evolutionStage >= 2 && "shadow-[0_0_25px_hsl(var(--primary)/0.6)]",
    evolutionStage >= 3 && "border-accent/40 box-glow-accent",
    evolutionStage >= 4 && "shadow-[0_0_40px_hsl(var(--accent)/0.8)] animate-pulse-custom [animation-duration:2.5s]"
  );

  const inputStyle = cn(
    "bg-input/70 border-border focus:border-primary placeholder:text-muted-foreground/60 text-foreground transition-all duration-300",
    evolutionStage >= 2 && "focus:box-glow-primary",
    chatbotPersona.uiVariant === 'intense_holographic' && "focus:box-glow-accent",
    chatbotPersona.responseStyle === 'glitchy' && "placeholder:italic placeholder:animate-glitch-subtle"
  );

  const placeholderText = () => {
    let base = chatbotPersona.responseStyle === 'glitchy' ? "G..ive_me.. inpt??" : "Type your message...";
    if (evolutionStage >=1) {
        base = `EvoChat [S${evolutionStage}] (V:${chatbotPersona.affectiveState.valence.toFixed(1)}, A:${chatbotPersona.affectiveState.arousal.toFixed(1)})`;
    }
    if (chatbotPersona.currentInteractionGoal && chatbotPersona.currentInteractionGoal.text) {
      base += ` | Focus: ${chatbotPersona.currentInteractionGoal.text.substring(0, 25)}...`;
    }
    if (isLoading) return "EvoChat is thinking...";
    if (isSummarizing) return "EvoChat is meta-learning...";
    if (isGeneratingSpark) return "EvoChat is having a spark...";
    return base;
  };


  return (
    <div
        className={cn(chatContainerBaseStyle, chatContainerEvolutionStyle, dynamicChatContainerClasses)}
        style={{ minHeight: 'calc(100vh - 160px)', maxHeight: 'calc(100vh - 160px)' }} // Ensure it fills space
    >
      <ScrollArea className="flex-grow p-4 md:p-6" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} evolutionStage={evolutionStage} currentPersona={chatbotPersona} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>EvoChat is processing...</span>
            </div>
          )}
           {isSummarizing && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Brain className="h-5 w-5 animate-pulse text-accent" />
              <span>EvoChat is meta-learning, dreaming & crystalizing...</span>
            </div>
          )}
          {isGeneratingSpark && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
                <SparkIcon className="h-5 w-5 animate-pulse-custom [animation-duration:0.8s] text-secondary" />
                <span>EvoChat is having a conceptual spark...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2 p-3 border-t",
          evolutionStage >= 1 ? "border-primary/30" : "border-border",
          (chatbotPersona.uiVariant === 'intense_holographic' || evolutionStage >=3) ? "border-accent/40" : "border-primary/30" // Default to primary border if stage > 0
        )}
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholderText()}
          className={inputStyle}
          disabled={isLoading || isSummarizing || isGeneratingSpark}
          aria-label="Chat input"
        />
        <Button
          type="submit"
          variant={evolutionStage >=3 || chatbotPersona.uiVariant === 'intense_holographic' ? "outline" : "default"}
          size="icon"
          disabled={isLoading || !input.trim() || isSummarizing || isGeneratingSpark}
          className={cn(
            "transition-all duration-300",
            evolutionStage >= 1 && "hover:bg-primary/80",
            (evolutionStage >= 3 || chatbotPersona.uiVariant === 'intense_holographic') && "border-accent text-accent hover:bg-accent hover:text-accent-foreground box-glow-accent",
            chatbotPersona.uiVariant === 'pulsing_glow' && "animate-pulse-custom [animation-duration:1.5s]"
          )}
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
