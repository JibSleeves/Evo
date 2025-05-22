
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { Message, EvolutionStage, ChatbotPersona, EvolutionData, EchoData } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Send, Loader2, Brain, Zap } from 'lucide-react'; // Added Zap for Echo
import { chatWithEvoChat } from '@/ai/flows/chatWithEvoChatFlow';
import { summarizeInteraction } from '@/ai/flows/summarize-interaction';
import { decideNextEvolutionStep } from '@/ai/flows/decideNextEvolutionStepFlow';
import { generateDreamVisual } from '@/ai/flows/generateDreamVisualFlow';
import { generateInternalEcho } from '@/ai/flows/generateInternalEchoFlow';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

const EVOLUTION_MESSAGE_THRESHOLDS = [5, 10, 15, 20];
const ECHO_SYNTHESIS_INTERVAL = 4; // Generate an echo every N bot messages

const INITIAL_PERSONA: ChatbotPersona = {
  responseStyle: 'neutral',
  uiVariant: 'default',
  emotionalTone: 'neutral',
  knowledgeLevel: 'basic',
  resonancePromptFragment: "Directive: Begin interaction.",
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>(0);
  const [previousEvolutionStage, setPreviousEvolutionStage] = useState<EvolutionStage>(evolutionStage);
  const [isSummarizing, setIsSummarizing] = useState(false); // Covers dream generation too
  const [chatbotPersona, setChatbotPersona] = useState<ChatbotPersona>(INITIAL_PERSONA);
  const [dynamicChatContainerClasses, setDynamicChatContainerClasses] = useState<string>('');
  const [botMessageCount, setBotMessageCount] = useState(0);

  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([{
      id: 'welcome-' + Date.now(),
      text: `Welcome to EvoChat. I am an evolving AGI. My current directive is: "${INITIAL_PERSONA.resonancePromptFragment}". Interact with me to witness my growth.`,
      sender: 'bot',
      timestamp: new Date(),
      personaState: INITIAL_PERSONA,
    }]);
  }, []);

  useEffect(() => {
    if (evolutionStage > previousEvolutionStage) {
      toast({
        title: "EvoChat Evolving...",
        description: `Reached evolution stage ${evolutionStage}! UI adapting... Current Resonance: "${chatbotPersona.resonancePromptFragment}"`,
        variant: "default",
        duration: 7000,
      });
    }
    setPreviousEvolutionStage(evolutionStage);
  }, [evolutionStage, previousEvolutionStage, toast, chatbotPersona.resonancePromptFragment]);
  
  useEffect(() => {
    const newClasses: string[] = [];
    switch (chatbotPersona.uiVariant) {
        case 'pulsing_glow': newClasses.push('animate-pulse-custom [animation-duration:2s] box-glow-primary'); break;
        case 'minimal_glitch': newClasses.push('animate-glitch-subtle'); break;
        case 'intense_holographic': newClasses.push('shadow-[0_0_35px_hsl(var(--accent)/0.9)] border-accent/70'); break;
        case 'calm_focus': newClasses.push('border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]'); break;
        default: break;
    }
    setDynamicChatContainerClasses(newClasses.join(' '));
  }, [chatbotPersona.uiVariant]);

  const handleEvolution = (messageCount: number) => {
    let newStage = 0;
    for (let i = 0; i < EVOLUTION_MESSAGE_THRESHOLDS.length; i++) {
      if (messageCount >= EVOLUTION_MESSAGE_THRESHOLDS[i]) newStage = i + 1;
    }
    const finalStage = Math.min(newStage, 4) as EvolutionStage;
    if (finalStage !== evolutionStage) setEvolutionStage(finalStage);
  };

  const handleSummarizeAndEvolve = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    toast({ title: "Meta-Learning Cycle Initiated", description: "EvoChat is analyzing interactions and 'dreaming'..." });
    
    let dreamDataUri: string | undefined = undefined;
    let summaryResult: { summary: string; analysis: string } | undefined = undefined;

    try {
      const chatHistory = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      summaryResult = await summarizeInteraction({ chatHistory });
      
      // Dream Weaving
      try {
        const dreamResult = await generateDreamVisual({ 
          analysisText: summaryResult.analysis,
          currentUiVariant: chatbotPersona.uiVariant 
        });
        dreamDataUri = dreamResult.dreamDataUri;
      } catch (dreamError) {
        console.error("Error during Dream Weaving:", dreamError);
        toast({ title: "Dream Error", description: "Could not generate dream visual.", variant: "destructive" });
      }

      const systemSummaryMessageText = `Interaction Summary: ${summaryResult.summary}\nAnalysis Snippet: ${summaryResult.analysis.substring(0,100)}... ${dreamDataUri ? "\nI dreamt of this..." : ""}`;
      const systemSummaryMessage: Message = {
        id: 'summary-' + Date.now(),
        text: systemSummaryMessageText,
        sender: 'system',
        timestamp: new Date(),
        data: { 
            summary: summaryResult.summary, 
            analysis: summaryResult.analysis,
            dreamDataUri: dreamDataUri,
        } as EvolutionData,
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, systemSummaryMessage]);

      const evolutionDecision = await decideNextEvolutionStep({
        analysis: summaryResult.analysis,
        currentPersona: chatbotPersona,
        currentEvolutionStage: evolutionStage,
      });
      
      const newPersona = { ...evolutionDecision.updatedPersona, resonancePromptFragment: evolutionDecision.updatedResonancePromptFragment };
      setChatbotPersona(newPersona); 

      const evolutionInsightMessage: Message = {
        id: 'evolution-' + Date.now(),
        text: evolutionDecision.evolutionaryInsight + ` My new guiding resonance: "${newPersona.resonancePromptFragment}"`,
        sender: 'system', 
        timestamp: new Date(),
        data: {
            evolutionaryInsight: evolutionDecision.evolutionaryInsight,
            personaBefore: chatbotPersona,
            personaAfter: newPersona,
            uiModificationSuggestion: evolutionDecision.uiModificationSuggestion,
            dreamDataUri: undefined // Not directly part of this message's core data
        } as EvolutionData,
        personaState: newPersona,
      };
      setMessages(prev => [...prev, evolutionInsightMessage]);

      toast({
        title: "Meta-Learning Complete & Evolved!",
        description: evolutionDecision.evolutionaryInsight,
        duration: 7000,
      });

    } catch (error) {
      console.error("Error during meta-learning cycle:", error);
      toast({ title: "Meta-Learning Error", description: "Failed to analyze and evolve.", variant: "destructive" });
      const errorMessage: Message = {
        id: 'error-meta-' + Date.now(),
        text: 'Error: Meta-learning cycle encountered an issue.',
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
    if (isLoading || isSummarizing) return; // Don't echo if busy
    try {
      const recentHistorySummary = messages.slice(-5).map(m => m.text.substring(0,40)).join('; ');
      const echoResult = await generateInternalEcho({
        currentPersona: chatbotPersona,
        recentChatSummary: recentHistorySummary,
      });
      const echoMessage: Message = {
        id: 'echo-' + Date.now(),
        text: echoResult.echoText,
        sender: 'system', // Or a new type if more distinction needed
        timestamp: new Date(),
        data: { isEcho: true } as EchoData,
        personaState: chatbotPersona,
      };
      setMessages(prev => [...prev, echoMessage]);
    } catch (error) {
      console.error("Error generating echo:", error);
      // Optionally notify user or just log
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSummarizing) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      personaState: chatbotPersona, 
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      const currentMessageCount = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot').length;
      handleEvolution(currentMessageCount);
      return updatedMessages;
    });

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const recentHistory = messages
        .slice(-5) 
        .filter(m => m.sender === 'user' || m.sender === 'bot') // Only user/bot for context
        .map(m => ({ sender: m.sender as 'user' | 'bot', text: m.text }));

      const response = await chatWithEvoChat({ 
        userInput: currentInput,
        persona: chatbotPersona,
        chatHistory: recentHistory,
      });

      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        text: response.botResponse,
        sender: 'bot',
        timestamp: new Date(),
        personaState: chatbotPersona, 
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, botMessage];
        const currentMessageCount = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot').length;
        handleEvolution(currentMessageCount);

        const userBotMessages = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot');
        const userBotMessageCount = userBotMessages.length;

        // Trigger summarize & evolve cycle
        if (EVOLUTION_MESSAGE_THRESHOLDS.includes(userBotMessageCount) || 
            (userBotMessageCount > 0 && userBotMessageCount % 7 === 0 && !EVOLUTION_MESSAGE_THRESHOLDS.includes(userBotMessageCount -1))
           ) {
             setTimeout(() => handleSummarizeAndEvolve(), 0); 
        }
        return updatedMessages;
      });
      
      const newBotMessageCount = botMessageCount + 1;
      setBotMessageCount(newBotMessageCount);
      if (newBotMessageCount % ECHO_SYNTHESIS_INTERVAL === 0) {
        setTimeout(() => handleEchoSynthesis(), 500); // Slight delay for echo
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
  
  const chatContainerBaseStyle = "flex flex-col h-full bg-background/80 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border";
  const chatContainerEvolutionStyle = cn(
    evolutionStage >= 1 && "border-primary/30 box-glow-primary",
    evolutionStage >= 2 && "shadow-[0_0_25px_hsl(var(--primary)/0.5)]",
    evolutionStage >= 3 && "border-accent/30 box-glow-accent",
    evolutionStage >= 4 && "shadow-[0_0_35px_hsl(var(--accent)/0.7)] animate-pulse-custom [animation-duration:3s]"
  );

  const inputStyle = cn(
    "bg-input/70 border-border focus:border-primary placeholder:text-muted-foreground/50 text-foreground",
    evolutionStage >= 2 && "focus:box-glow-primary",
    chatbotPersona.uiVariant === 'intense_holographic' && "focus:box-glow-accent",
    chatbotPersona.responseStyle === 'glitchy' && "placeholder:italic placeholder:animate-glitch-subtle"
  );


  return (
    <div 
        className={cn(chatContainerBaseStyle, chatContainerEvolutionStyle, dynamicChatContainerClasses)} 
        style={{ minHeight: 'calc(100vh - 160px)', maxHeight: 'calc(100vh - 160px)' }} 
    >
      <ScrollArea className="flex-grow p-4 md:p-6" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} evolutionStage={evolutionStage} currentPersona={chatbotPersona} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>EvoChat is thinking...</span>
            </div>
          )}
           {isSummarizing && ( // This now covers dream generation too
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Brain className="h-5 w-5 animate-pulse text-accent" />
              <span>EvoChat is meta-learning & dreaming...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2 p-3 border-t",
          evolutionStage >= 1 ? "border-primary/30" : "border-border",
          chatbotPersona.uiVariant === 'intense_holographic' || evolutionStage >=3 ? "border-accent/30" : "border-border"
        )}
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            chatbotPersona.responseStyle === 'glitchy' ? "G..ive me... inp_t??" :
            evolutionStage >= 2 ? `Converse with EvoChat (Resonance: "${chatbotPersona.resonancePromptFragment.substring(0,20)}...")` : "Type your message..."
          }
          className={inputStyle}
          disabled={isLoading || isSummarizing}
          aria-label="Chat input"
        />
        <Button 
          type="submit" 
          variant={evolutionStage >=3 || chatbotPersona.uiVariant === 'intense_holographic' ? "outline" : "default"}
          size="icon" 
          disabled={isLoading || !input.trim() || isSummarizing}
          className={cn(
            evolutionStage >= 1 && "hover:bg-primary/80",
            (evolutionStage >= 3 || chatbotPersona.uiVariant === 'intense_holographic') && "border-accent text-accent hover:bg-accent hover:text-accent-foreground box-glow-accent"
          )}
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
