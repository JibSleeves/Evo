
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { Message, EvolutionStage } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Send, Loader2, Brain } from 'lucide-react';
import { initialPrompt } from '@/ai/flows/initial-prompt';
import { summarizeInteraction } from '@/ai/flows/summarize-interaction';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

const EVOLUTION_MESSAGE_THRESHOLDS = [5, 10, 15, 20]; // Messages count for stages 1, 2, 3, 4

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>(0);
  const [previousEvolutionStage, setPreviousEvolutionStage] = useState<EvolutionStage>(evolutionStage);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Initial welcome message
    setMessages([{
      id: 'welcome-' + Date.now(),
      text: "Welcome to EvoChat. I am an evolving AGI. Interact with me to witness my growth.",
      sender: 'bot',
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    if (evolutionStage > previousEvolutionStage) {
      toast({
        title: "EvoChat Evolving...",
        description: `Reached evolution stage ${evolutionStage}! UI adapting...`,
        variant: "default",
      });
    }
    // Update previousEvolutionStage for the next comparison, regardless of whether a toast was shown
    setPreviousEvolutionStage(evolutionStage);
  }, [evolutionStage, previousEvolutionStage, toast]);

  const handleEvolution = (messageCount: number) => {
    let newStage = 0;
    for (let i = 0; i < EVOLUTION_MESSAGE_THRESHOLDS.length; i++) {
      if (messageCount >= EVOLUTION_MESSAGE_THRESHOLDS[i]) {
        newStage = i + 1;
      }
    }
    const finalStage = Math.min(newStage, 4) as EvolutionStage;
    
    // evolutionStage here is the value from the previous render's state
    if (finalStage !== evolutionStage) { 
        setEvolutionStage(finalStage); // The useEffect will handle the toast if the stage actually changed upwards
    }
  };

  const handleSummarizeInteraction = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    toast({ title: "Meta-Learning Cycle Initiated", description: "EvoChat is analyzing interactions..." });
    try {
      const chatHistory = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const summary = await summarizeInteraction({ chatHistory });
      
      const systemMessage: Message = {
        id: 'summary-' + Date.now(),
        text: `Interaction Summary: ${summary.summary}`,
        sender: 'system',
        timestamp: new Date(),
        data: { analysis: summary.analysis }
      };
      setMessages(prev => [...prev, systemMessage]);

      toast({
        title: "Meta-Learning Complete",
        description: `Analysis: ${summary.analysis.substring(0,100)}...`,
        duration: 6000,
      });

    } catch (error) {
      console.error("Error summarizing interaction:", error);
      toast({ title: "Meta-Learning Error", description: "Failed to analyze interaction.", variant: "destructive" });
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
    };
    
    // Use a functional update to ensure `messages.length` is current
    setMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      const currentMessageCount = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot').length;
      handleEvolution(currentMessageCount);
      return updatedMessages;
    });

    setInput('');
    setIsLoading(true);

    try {
      // NOTE: The initialPrompt flow might not be the correct one for ongoing chat.
      // This flow currently just acknowledges setting a personality.
      // For a real chat, you'd likely have a different flow.
      const response = await initialPrompt({ prompt: userMessage.text });
      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        text: response.confirmation, // This will be an acknowledgement like "Personality set."
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, botMessage];
        const currentMessageCount = updatedMessages.filter(m => m.sender === 'user' || m.sender === 'bot').length;
        handleEvolution(currentMessageCount);

        // Trigger summarization check
        if (EVOLUTION_MESSAGE_THRESHOLDS.includes(currentMessageCount) || 
            (currentMessageCount % 7 === 0 && currentMessageCount > 0 && !EVOLUTION_MESSAGE_THRESHOLDS.includes(currentMessageCount -1) )
           ) {
             // Defer summarization to avoid state update conflicts
             setTimeout(() => handleSummarizeInteraction(), 0);
        }
        return updatedMessages;
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        text: 'Error: Could not connect to EvoMind. Please try again.',
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
  
  const chatContainerStyle = cn(
    "flex flex-col h-full bg-background/80 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden",
    "border border-transparent", 
    evolutionStage >= 1 && "border-primary/30 box-glow-primary",
    evolutionStage >= 2 && "shadow-[0_0_25px_hsl(var(--primary)/0.5)]",
    evolutionStage >= 3 && "border-accent/30 box-glow-accent",
    evolutionStage >= 4 && "shadow-[0_0_35px_hsl(var(--accent)/0.7)] animate-pulse-custom [animation-duration:3s]"
  );

  const inputStyle = cn(
    "bg-input/70 border-border focus:border-primary placeholder:text-muted-foreground/50 text-foreground",
    evolutionStage >= 2 && "focus:box-glow-primary",
    evolutionStage >= 4 && "focus:box-glow-accent"
  );


  return (
    <div className={chatContainerStyle} style={{ minHeight: 'calc(100vh - 160px)', maxHeight: 'calc(100vh - 160px)' }}> {/* Adjusted height */}
      <ScrollArea className="flex-grow p-4 md:p-6" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} evolutionStage={evolutionStage} />
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
          evolutionStage >= 3 && "border-accent/30"
        )}
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={evolutionStage >= 2 ? "Converse with the evolving AGI..." : "Type your message..."}
          className={inputStyle}
          disabled={isLoading || isSummarizing}
          aria-label="Chat input"
        />
        <Button 
          type="submit" 
          variant={evolutionStage >=3 ? "outline" : "default"}
          size="icon" 
          disabled={isLoading || !input.trim() || isSummarizing}
          className={cn(
            evolutionStage >= 1 && "hover:bg-primary/80",
            evolutionStage >= 3 && "border-accent text-accent hover:bg-accent hover:text-accent-foreground box-glow-accent"
          )}
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
