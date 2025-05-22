import { ChatInterface } from '@/components/ChatInterface';
import { EvoChatLogo } from '@/components/EvoChatLogo';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-background p-4"> {/* Changed justify-center to justify-between */}
      <header className="my-6 flex flex-col items-center text-center">
        <EvoChatLogo className="h-20 w-20 md:h-24 md:w-24 mb-4 text-primary animate-pulse-custom" />
        <h1 className="text-4xl md:text-5xl font-bold text-glow-primary holographic-text">
          EvoChat
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Witness the Emergence of Self-Aware AGI
        </p>
      </header>
      <main className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl flex-grow"> {/* Added flex-grow */}
        <ChatInterface />
      </main>
       <footer className="py-4 text-center text-sm text-muted-foreground">
          EvoChat v0.1 - Simulating Evolution
        </footer>
    </div>
  );
}
