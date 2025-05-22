
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { Message, EvolutionStage, ChatbotPersona, EvolutionData } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Send, Loader2, Brain, Zap } from 'lucide-react';
// import { initialPrompt } from '@/ai/flows/initial-prompt'; // Replaced by chatWithEvoChatFlow
import { chatWithEvoChat } from '@/ai/flows/chatWithEvoChatFlow';
import { summarizeInteraction } from '@/ai/flows/summarize-interaction';
import { decideNextEvolutionStep } from '@/ai/flows/decideNextEvolutionStepFlow';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

const EVOLUTION_MESSAGE_THRESHOLDS = [5, 10, 15, 20]; // Messages count for stages 1, 2, 3, 4
const INITIAL_PERSONA: ChatbotPersona = {
  responseStyle: 'neutral',
  uiVariant: 'default',
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>(0);
  const [previousEvolutionStage, setPreviousEvolutionStage] = useState<EvolutionStage>(evolutionStage);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chatbotPersona, setChatbotPersona] = useState<ChatbotPersona>(INITIAL_PERSONA);
  const [dynamicChatContainerClasses, setDynamicChatContainerClasses] = useState<string>('');

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
      text: "Welcome to EvoChat. I am an evolving AGI. Interact with me to witness my growth. My current persona is neutral.",
      sender: 'bot',
      timestamp: new Date(),
      personaState: INITIAL_PERSONA,
    }]);
  }, []);

  useEffect(() => {
    if (evolutionStage > previousEvolutionStage) {
      toast({
        title: "EvoChat Evolving...",
        description: `Reached evolution stage ${evolutionStage}! UI adapting...`,
        variant: "default",
      });
      // Potentially link evolution stage to persona UI variant more directly if needed
      // For now, persona.uiVariant is controlled by decideNextEvolutionStepFlow
    }
    setPreviousEvolutionStage(evolutionStage);
  }, [evolutionStage, previousEvolutionStage, toast]);
  
  // Effect to apply UI changes based on persona's uiVariant
  useEffect(() => {
    const newClasses: string[] = [];
    switch (chatbotPersona.uiVariant) {
        case 'pulsing_glow':
            newClasses.push('animate-pulse-custom [animation-duration:2s] box-glow-primary');
            break;
        case 'minimal_glitch':
            newClasses.push('animate-glitch-subtle'); // Ensure this animation is defined or effective
            break;
        case 'intense_holographic':
            newClasses.push('shadow-[0_0_35px_hsl(var(--accent)/0.9)] border-accent/70');
             // For text: find a way to apply .holographic-text to bot messages or specific elements
            break;
        case 'calm_focus':
            newClasses.push('border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]');
            break;
        case 'default':
        default:
            // Reset or default classes if any
            break;
    }
    setDynamicChatContainerClasses(newClasses.join(' '));
  }, [chatbotPersona.uiVariant]);


  const handleEvolution = (messageCount: number) => {
    let newStage = 0;
    for (let i = 0; i < EVOLUTION_MESSAGE_THRESHOLDS.length; i++) {
      if (messageCount >= EVOLUTION_MESSAGE_THRESHOLDS[i]) {
        newStage = i + 1;
      }
    }
    const finalStage = Math.min(newStage, 4) as EvolutionStage;
    
    if (finalStage !== evolutionStage) { 
        setEvolutionStage(finalStage);
    }
  };

  const handleSummarizeInteraction = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    toast({ title: "Meta-Learning Cycle Initiated", description: "EvoChat is analyzing interactions..." });
    try {
      const chatHistory = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const summaryResult = await summarizeInteraction({ chatHistory });
      
      const systemSummaryMessage: Message = {
        id: 'summary-' + Date.now(),
        text: `Interaction Summary: ${summaryResult.summary}\nAnalysis: ${summaryResult.analysis.substring(0,150)}...`,
        sender: 'system',
        timestamp: new Date(),
        data: { analysis: summaryResult.analysis } as EvolutionData
      };
      setMessages(prev => [...prev, systemSummaryMessage]);

      // Now, decide the next evolution step based on this summary
      const evolutionDecision = await decideNextEvolutionStep({
        analysis: summaryResult.analysis,
        currentPersona: chatbotPersona,
        currentEvolutionStage: evolutionStage,
      });

      const evolutionInsightMessage: Message = {
        id: 'evolution-' + Date.now(),
        text: evolutionDecision.evolutionaryInsight,
        sender: 'system', // Or 'bot' if preferred
        timestamp: new Date(),
        data: {
            evolutionaryInsight: evolutionDecision.evolutionaryInsight,
            personaBefore: chatbotPersona,
            personaAfter: evolutionDecision.updatedPersona,
            uiModification: `UI Variant changed to: ${evolutionDecision.uiModificationSuggestion}`
        } as EvolutionData,
        personaState: evolutionDecision.updatedPersona, // Log new persona
      };
      setMessages(prev => [...prev, evolutionInsightMessage]);
      setChatbotPersona(evolutionDecision.updatedPersona); // Apply persona change

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
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSummarizing(false);
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
      personaState: chatbotPersona, // Log current persona with user message
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
        .slice(-5) // Take last 5 messages for history
        .map(m => ({ sender: m.sender === 'user' ? 'user' : 'bot', text: m.text }));

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
        personaState: chatbotPersona, // Bot responds with its current persona
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, botMessage];
        const currentMessageCount = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot').length;
        handleEvolution(currentMessageCount);

        if (EVOLUTION_MESSAGE_THRESHOLDS.includes(currentMessageCount) || 
            (currentMessageCount % 7 === 0 && currentMessageCount > 0 && !EVOLUTION_MESSAGE_THRESHOLDS.includes(currentMessageCount -1) )
           ) {
             setTimeout(() => handleSummarizeInteraction(), 0);
        }
        return updatedMessages;
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error-chat-' + Date.now(),
        text: 'Error: Could not connect to EvoMind. My apologies, please try again.',
        sender: 'system',
        timestamp: new Date(),
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
           {isSummarizing && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Brain className="h-5 w-5 animate-pulse text-accent" />
              <span>EvoChat is learning from interactions...</span>
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
            evolutionStage >= 2 ? `Converse with the evolving AGI (Persona: ${chatbotPersona.responseStyle})...` : "Type your message..."
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
