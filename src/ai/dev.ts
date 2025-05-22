
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-interaction.ts';
import '@/ai/flows/initial-prompt.ts';
import '@/ai/flows/chatWithEvoChatFlow.ts';
import '@/ai/flows/decideNextEvolutionStepFlow.ts';
import '@/ai/flows/generateDreamVisualFlow.ts'; // New
import '@/ai/flows/generateInternalEchoFlow.ts'; // New
