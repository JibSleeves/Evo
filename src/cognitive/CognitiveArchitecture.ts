import EventEmitter from 'events';
import { 
  CognitiveState, 
  AttentionState, 
  EmotionalState,
  Memory,
  MemoryQuery,
  MemoryConfig,
  LogEntry,
  AsyncResult,
  SystemEvent,
  FileUpload
} from '../types';
import { MemorySystem } from './MemorySystem';
import { ReasoningEngine } from './ReasoningEngine';
import { RAGEngine } from './RAGEngine';

interface CognitiveInput {
  text: string;
  context?: string[];
  emotionalContext?: Partial<EmotionalState>;
  files?: FileUpload[];
  goals?: string[];
  constraints?: string[];
}

interface CognitiveOutput {
  response: string;
  confidence: number;
  reasoning: string;
  emotionalState: EmotionalState;
  memoryUpdates: string[];
  attentionChanges: AttentionState;
  selfReflection: SelfReflectionResult;
}

interface SelfReflectionResult {
  performanceAssessment: number; // 0-1
  improvementSuggestions: string[];
  biasDetection: string[];
  confidenceCalibration: number;
  learningOpportunities: string[];
}

export class CognitiveArchitecture extends EventEmitter {
  private memorySystem: MemorySystem;
  private reasoningEngine: ReasoningEngine;
  private ragEngine: RAGEngine;
  private logger: (entry: LogEntry) => void;
  private currentState: CognitiveState;
  private processingHistory: CognitiveOutput[] = [];
  private maxHistorySize = 100;
  private reflectionThreshold = 0.7;

  constructor(config: MemoryConfig, logger: (entry: LogEntry) => void) {
    super();
    this.logger = logger;
    
    // Initialize components
    this.memorySystem = new MemorySystem(config, logger);
    this.reasoningEngine = new ReasoningEngine(this.memorySystem, logger);
    this.ragEngine = new RAGEngine(this.memorySystem, logger);
    
    // Initialize cognitive state
    this.currentState = this.initializeCognitiveState();
    
    this.logger({
      level: 'info',
      message: 'Cognitive architecture initialized successfully',
      timestamp: new Date(),
      source: 'CognitiveArchitecture'
    });
  }

  async processInput(input: CognitiveInput): Promise<AsyncResult<CognitiveOutput>> {
    const startTime = Date.now();
    
    try {
      // 1. Update attention and context
      await this.updateAttention(input);
      
      // 2. Process uploaded files if any
      const fileProcessingResults = await this.processFiles(input.files || []);
      
      // 3. Retrieve relevant memories
      const memories = await this.retrieveRelevantMemories(input);
      
      // 4. Perform reasoning
      const reasoningResult = await this.reasoningEngine.reason({
        input: input.text,
        previousState: this.currentState,
        memories: memories.success ? memories.data! : [],
        constraints: input.constraints || [],
        goals: input.goals || []
      });
      
      if (!reasoningResult.success) {
        return { success: false, error: reasoningResult.error };
      }
      
      // 5. Generate response using RAG if relevant
      const ragResponse = await this.generateRAGResponse(input.text, memories.data || []);
      
      // 6. Update emotional state
      const newEmotionalState = await this.updateEmotionalState(input, reasoningResult.data!);
      
      // 7. Store new memories from this interaction
      const memoryUpdates = await this.storeInteractionMemories(input, reasoningResult.data!);
      
      // 8. Perform self-reflection
      const selfReflection = await this.performSelfReflection(input, reasoningResult.data!);
      
      // 9. Create response
      const response = this.synthesizeResponse(
        input,
        reasoningResult.data!,
        ragResponse,
        newEmotionalState,
        selfReflection
      );
      
      // 10. Update cognitive state
      this.updateCognitiveState({
        currentContext: [...(input.context || []), input.text],
        activeMemories: memories.data || [],
        reasoning: reasoningResult.data!,
        attention: this.currentState.attention,
        emotions: newEmotionalState
      });
      
      // 11. Add to processing history
      this.addToHistory(response);
      
      // 12. Emit events for monitoring
      this.emitCognitiveEvents(input, response);
      
      const processingTime = Date.now() - startTime;
      this.logger({
        level: 'info',
        message: `Cognitive processing completed in ${processingTime}ms`,
        timestamp: new Date(),
        source: 'CognitiveArchitecture',
        metadata: {
          confidence: response.confidence,
          memoriesUsed: memories.data?.length || 0,
          processingTime
        }
      });
      
      return { success: true, data: response };
      
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Cognitive processing failed: ${error.message}`,
        timestamp: new Date(),
        source: 'CognitiveArchitecture'
      });
      return { success: false, error: error.message };
    }
  }

  private initializeCognitiveState(): CognitiveState {
    return {
      currentContext: [],
      activeMemories: [],
      reasoning: {
        mode: 'intuitive',
        confidence: 0.5,
        hypotheses: [],
        evidence: [],
        conclusions: []
      },
      attention: {
        focus: [],
        weights: {},
        inhibition: []
      },
      emotions: {
        valence: 0,
        arousal: 0.5,
        dominance: 0.5,
        emotions: {
          curiosity: 0.7,
          confidence: 0.5,
          uncertainty: 0.3
        }
      }
    };
  }

  private async updateAttention(input: CognitiveInput): Promise<void> {
    const words = input.text.toLowerCase().split(/\s+/);
    const importantWords = words.filter(word => 
      word.length > 4 && !this.isStopWord(word)
    );
    
    // Update focus
    this.currentState.attention.focus = importantWords.slice(0, 5);
    
    // Update weights based on context
    const newWeights: Record<string, number> = {};
    for (const word of importantWords) {
      newWeights[word] = (this.currentState.attention.weights[word] || 0) + 0.1;
    }
    
    // Decay existing weights
    for (const [word, weight] of Object.entries(this.currentState.attention.weights)) {
      if (!newWeights[word]) {
        newWeights[word] = weight * 0.9;
      }
    }
    
    this.currentState.attention.weights = newWeights;
    
    // Update inhibition (words to suppress)
    if (input.constraints) {
      this.currentState.attention.inhibition = input.constraints
        .flatMap(constraint => constraint.toLowerCase().split(/\s+/))
        .filter(word => word.length > 3);
    }
  }

  private async processFiles(files: FileUpload[]): Promise<AsyncResult<string[]>> {
    const processedFiles: string[] = [];
    
    for (const file of files) {
      try {
        const result = await this.ragEngine.processDocument(file);
        if (result.success) {
          processedFiles.push(file.id);
        }
      } catch (error) {
        this.logger({
          level: 'warn',
          message: `Failed to process file ${file.name}: ${error.message}`,
          timestamp: new Date(),
          source: 'CognitiveArchitecture'
        });
      }
    }
    
    return { success: true, data: processedFiles };
  }

  private async retrieveRelevantMemories(input: CognitiveInput): Promise<AsyncResult<Memory[]>> {
    try {
      const query: MemoryQuery = {
        query: input.text,
        limit: 10,
        threshold: 0.3
      };
      
      const result = await this.memorySystem.retrieveMemories(query);
      if (result.success) {
        return { 
          success: true, 
          data: result.data!.map(r => r.memory) 
        };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async generateRAGResponse(query: string, memories: Memory[]): Promise<string | null> {
    try {
      // Check if we have document memories that might be relevant
      const documentMemories = memories.filter(m => 
        m.metadata.source === 'document_chunk'
      );
      
      if (documentMemories.length === 0) {
        return null;
      }
      
      const result = await this.ragEngine.queryDocuments({
        query,
        documents: [],
        maxChunks: 5,
        similarityThreshold: 0.4,
        includeImages: true
      });
      
      return result.success ? result.data!.answer : null;
    } catch (error) {
      this.logger({
        level: 'warn',
        message: `RAG response generation failed: ${error.message}`,
        timestamp: new Date(),
        source: 'CognitiveArchitecture'
      });
      return null;
    }
  }

  private async updateEmotionalState(
    input: CognitiveInput, 
    reasoning: any
  ): Promise<EmotionalState> {
    const currentEmotions = this.currentState.emotions;
    
    // Base emotional update on reasoning confidence
    let valence = currentEmotions.valence;
    let arousal = currentEmotions.arousal;
    let dominance = currentEmotions.dominance;
    
    // Adjust valence based on reasoning confidence
    if (reasoning.confidence > 0.7) {
      valence = Math.min(1, valence + 0.1);
    } else if (reasoning.confidence < 0.3) {
      valence = Math.max(-1, valence - 0.1);
    }
    
    // Adjust arousal based on reasoning complexity
    const complexityScore = reasoning.hypotheses.length + reasoning.evidence.length;
    if (complexityScore > 5) {
      arousal = Math.min(1, arousal + 0.1);
    } else {
      arousal = Math.max(0, arousal - 0.05);
    }
    
    // Adjust dominance based on conclusion strength
    if (reasoning.conclusions.length > 0) {
      const avgConfidence = reasoning.conclusions.reduce((sum: number, c: any) => sum + c.confidence, 0) / reasoning.conclusions.length;
      dominance = avgConfidence;
    }
    
    // Update specific emotions
    const emotions = {
      curiosity: this.calculateCuriosity(input, reasoning),
      confidence: reasoning.confidence,
      uncertainty: 1 - reasoning.confidence,
      satisfaction: valence > 0 ? valence : 0,
      frustration: valence < 0 ? -valence : 0
    };
    
    return { valence, arousal, dominance, emotions };
  }

  private calculateCuriosity(input: CognitiveInput, reasoning: any): number {
    let curiosity = this.currentState.emotions.emotions.curiosity || 0.5;
    
    // Increase curiosity for questions
    if (input.text.includes('?')) {
      curiosity = Math.min(1, curiosity + 0.2);
    }
    
    // Increase curiosity when confidence is low
    if (reasoning.confidence < 0.5) {
      curiosity = Math.min(1, curiosity + 0.1);
    }
    
    // Decrease curiosity when highly confident
    if (reasoning.confidence > 0.8) {
      curiosity = Math.max(0, curiosity - 0.1);
    }
    
    return curiosity;
  }

  private async storeInteractionMemories(
    input: CognitiveInput, 
    reasoning: any
  ): Promise<string[]> {
    const memoryIds: string[] = [];
    
    try {
      // Store the interaction as episodic memory
      const interactionMemory = await this.memorySystem.storeMemory({
        type: 'episodic',
        content: `User: ${input.text}`,
        embedding: await this.generateEmbedding(input.text),
        metadata: {
          source: 'user_interaction',
          context: input.context || [],
          confidence: reasoning.confidence,
          reasoning_mode: reasoning.mode
        },
        importance: this.calculateInteractionImportance(input, reasoning)
      });
      
      if (interactionMemory.success) {
        memoryIds.push(interactionMemory.data!);
      }
      
      // Store significant conclusions as semantic memory
      for (const conclusion of reasoning.conclusions) {
        if (conclusion.confidence > 0.7) {
          const conclusionMemory = await this.memorySystem.storeMemory({
            type: 'semantic',
            content: conclusion.statement,
            embedding: await this.generateEmbedding(conclusion.statement),
            metadata: {
              source: 'reasoning_conclusion',
              context: [reasoning.mode],
              confidence: conclusion.confidence,
              reasoning: conclusion.reasoning
            },
            importance: conclusion.confidence
          });
          
          if (conclusionMemory.success) {
            memoryIds.push(conclusionMemory.data!);
          }
        }
      }
      
    } catch (error) {
      this.logger({
        level: 'warn',
        message: `Failed to store interaction memories: ${error.message}`,
        timestamp: new Date(),
        source: 'CognitiveArchitecture'
      });
    }
    
    return memoryIds;
  }

  private async performSelfReflection(
    input: CognitiveInput, 
    reasoning: any
  ): Promise<SelfReflectionResult> {
    // Performance assessment based on confidence and reasoning quality
    const performanceAssessment = this.assessPerformance(reasoning);
    
    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(reasoning);
    
    // Detect potential biases
    const biasDetection = this.detectBiases(input, reasoning);
    
    // Calibrate confidence
    const confidenceCalibration = this.calibrateConfidence(reasoning);
    
    // Identify learning opportunities
    const learningOpportunities = this.identifyLearningOpportunities(input, reasoning);
    
    return {
      performanceAssessment,
      improvementSuggestions,
      biasDetection,
      confidenceCalibration,
      learningOpportunities
    };
  }

  private assessPerformance(reasoning: any): number {
    let score = 0.5; // Base score
    
    // Bonus for high confidence with multiple evidence pieces
    if (reasoning.confidence > 0.7 && reasoning.evidence.length > 2) {
      score += 0.2;
    }
    
    // Bonus for multiple hypotheses (thorough thinking)
    if (reasoning.hypotheses.length > 1) {
      score += 0.1;
    }
    
    // Penalty for very low confidence
    if (reasoning.confidence < 0.3) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private generateImprovementSuggestions(reasoning: any): string[] {
    const suggestions: string[] = [];
    
    if (reasoning.evidence.length < 2) {
      suggestions.push("Gather more evidence before drawing conclusions");
    }
    
    if (reasoning.hypotheses.length < 2) {
      suggestions.push("Consider alternative hypotheses for more robust reasoning");
    }
    
    if (reasoning.confidence < 0.5) {
      suggestions.push("Seek additional information to increase confidence");
    }
    
    if (reasoning.conclusions.length === 0) {
      suggestions.push("Work toward drawing actionable conclusions");
    }
    
    return suggestions;
  }

  private detectBiases(input: CognitiveInput, reasoning: any): string[] {
    const biases: string[] = [];
    
    // Confirmation bias check
    const positiveEvidence = reasoning.evidence.filter((e: any) => e.reliability > 0.7);
    const negativeEvidence = reasoning.evidence.filter((e: any) => e.reliability < 0.5);
    
    if (positiveEvidence.length > 0 && negativeEvidence.length === 0) {
      biases.push("Potential confirmation bias - consider contradicting evidence");
    }
    
    // Anchoring bias check
    if (reasoning.hypotheses.length > 0 && reasoning.hypotheses[0].probability > 0.8) {
      biases.push("Potential anchoring bias - first hypothesis may be overly weighted");
    }
    
    // Availability bias check
    const recentMemories = reasoning.evidence.filter((e: any) => e.source === 'memory');
    if (recentMemories.length > reasoning.evidence.length * 0.7) {
      biases.push("Potential availability bias - overrelying on recent memories");
    }
    
    return biases;
  }

  private calibrateConfidence(reasoning: any): number {
    // Adjust confidence based on historical accuracy
    let calibration = reasoning.confidence;
    
    // Check recent performance
    const recentOutputs = this.processingHistory.slice(-10);
    if (recentOutputs.length > 0) {
      const avgPerformance = recentOutputs.reduce(
        (sum, output) => sum + output.selfReflection.performanceAssessment, 0
      ) / recentOutputs.length;
      
      // Adjust based on historical performance
      if (avgPerformance < 0.5) {
        calibration *= 0.8; // Reduce confidence if performance is poor
      } else if (avgPerformance > 0.8) {
        calibration = Math.min(1, calibration * 1.1); // Slight boost for good performance
      }
    }
    
    return calibration;
  }

  private identifyLearningOpportunities(input: CognitiveInput, reasoning: any): string[] {
    const opportunities: string[] = [];
    
    if (reasoning.confidence < 0.5) {
      opportunities.push("Research domain knowledge related to this query");
    }
    
    if (reasoning.evidence.length < 3) {
      opportunities.push("Develop better information gathering strategies");
    }
    
    if (reasoning.mode === 'intuitive') {
      opportunities.push("Practice analytical reasoning for similar problems");
    }
    
    return opportunities;
  }

  private synthesizeResponse(
    input: CognitiveInput,
    reasoning: any,
    ragResponse: string | null,
    emotionalState: EmotionalState,
    selfReflection: SelfReflectionResult
  ): CognitiveOutput {
    let response = "";
    
    // Use RAG response if available and relevant
    if (ragResponse && ragResponse.length > 50) {
      response = ragResponse;
    } else {
      // Generate response from reasoning conclusions
      if (reasoning.conclusions.length > 0) {
        const primaryConclusion = reasoning.conclusions[0];
        response = primaryConclusion.statement;
        
        if (reasoning.confidence < 0.7) {
          response += " However, I would need more information to be more certain.";
        }
      } else {
        response = "I need to gather more information to provide a meaningful response.";
      }
    }
    
    // Add emotional coloring to response
    if (emotionalState.emotions.uncertainty > 0.7) {
      response += " I'm still exploring this topic and welcome additional perspectives.";
    }
    
    if (emotionalState.emotions.curiosity > 0.8) {
      response += " This is a fascinating question that raises several interesting points.";
    }
    
    return {
      response,
      confidence: selfReflection.confidenceCalibration,
      reasoning: reasoning.conclusions[0]?.reasoning || "No clear reasoning path established",
      emotionalState,
      memoryUpdates: [], // Will be filled by caller
      attentionChanges: this.currentState.attention,
      selfReflection
    };
  }

  private updateCognitiveState(newState: CognitiveState): void {
    this.currentState = newState;
    
    // Limit context size
    if (this.currentState.currentContext.length > 20) {
      this.currentState.currentContext = this.currentState.currentContext.slice(-20);
    }
    
    // Limit active memories
    if (this.currentState.activeMemories.length > 10) {
      this.currentState.activeMemories = this.currentState.activeMemories.slice(-10);
    }
  }

  private addToHistory(output: CognitiveOutput): void {
    this.processingHistory.push(output);
    
    if (this.processingHistory.length > this.maxHistorySize) {
      this.processingHistory = this.processingHistory.slice(-this.maxHistorySize);
    }
  }

  private emitCognitiveEvents(input: CognitiveInput, output: CognitiveOutput): void {
    this.emit('cognitive_processing', {
      id: `cog_${Date.now()}`,
      type: 'cognitive_processing_complete',
      source: 'CognitiveArchitecture',
      data: {
        input: input.text,
        confidence: output.confidence,
        reasoning: output.reasoning,
        emotionalState: output.emotionalState
      },
      timestamp: new Date(),
      priority: 1
    });
    
    if (output.confidence < this.reflectionThreshold) {
      this.emit('low_confidence', {
        id: `low_conf_${Date.now()}`,
        type: 'low_confidence_response',
        source: 'CognitiveArchitecture',
        data: {
          confidence: output.confidence,
          suggestions: output.selfReflection.improvementSuggestions
        },
        timestamp: new Date(),
        priority: 2
      });
    }
  }

  private calculateInteractionImportance(input: CognitiveInput, reasoning: any): number {
    let importance = 0.5;
    
    // Questions are more important
    if (input.text.includes('?')) {
      importance += 0.2;
    }
    
    // High confidence conclusions are important
    if (reasoning.confidence > 0.8) {
      importance += 0.2;
    }
    
    // Complex reasoning is important
    if (reasoning.hypotheses.length > 2) {
      importance += 0.1;
    }
    
    return Math.min(1, importance);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ]);
    return stopWords.has(word);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple embedding generation (placeholder)
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    
    for (let i = 0; i < words.length && i < embedding.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      embedding[i % embedding.length] += (hash / 0xffffffff);
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  // Public interface methods
  getCurrentState(): CognitiveState {
    return { ...this.currentState };
  }

  getProcessingHistory(limit?: number): CognitiveOutput[] {
    const history = limit ? this.processingHistory.slice(-limit) : this.processingHistory;
    return [...history];
  }

  async clearHistory(): Promise<void> {
    this.processingHistory = [];
    await this.reasoningEngine.clearReasoningHistory();
    
    this.logger({
      level: 'info',
      message: 'Cognitive history cleared',
      timestamp: new Date(),
      source: 'CognitiveArchitecture'
    });
  }

  async getMemoryStats(): Promise<AsyncResult<any>> {
    return await this.memorySystem.getMemoryStats();
  }

  async processDocument(file: FileUpload): Promise<AsyncResult<string[]>> {
    return await this.ragEngine.processDocument(file);
  }
}