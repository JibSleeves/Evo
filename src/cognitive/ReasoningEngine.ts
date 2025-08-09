import { 
  CognitiveState, 
  ReasoningState, 
  Hypothesis, 
  Evidence, 
  Conclusion,
  Memory,
  MemorySearchResult,
  LogEntry,
  AsyncResult 
} from '../types';
import { MemorySystem } from './MemorySystem';

interface ReasoningContext {
  input: string;
  previousState: CognitiveState;
  memories: MemorySearchResult[];
  constraints: string[];
  goals: string[];
}

interface ReasoningStep {
  id: string;
  type: 'observation' | 'analysis' | 'synthesis' | 'evaluation';
  input: any;
  output: any;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export class ReasoningEngine {
  private memorySystem: MemorySystem;
  private logger: (entry: LogEntry) => void;
  private reasoningHistory: ReasoningStep[] = [];
  private maxHistorySize = 1000;
  private feedbackLoops: Map<string, number> = new Map();

  constructor(memorySystem: MemorySystem, logger: (entry: LogEntry) => void) {
    this.memorySystem = memorySystem;
    this.logger = logger;
  }

  async reason(context: ReasoningContext): Promise<AsyncResult<ReasoningState>> {
    try {
      const startTime = Date.now();
      
      // Initialize reasoning state
      const reasoning: ReasoningState = {
        mode: this.selectReasoningMode(context),
        confidence: 0,
        hypotheses: [],
        evidence: [],
        conclusions: []
      };

      // Step 1: Gather evidence from context and memories
      reasoning.evidence = await this.gatherEvidence(context);
      
      // Step 2: Generate hypotheses based on evidence
      reasoning.hypotheses = await this.generateHypotheses(reasoning.evidence, context);
      
      // Step 3: Evaluate hypotheses against evidence
      await this.evaluateHypotheses(reasoning.hypotheses, reasoning.evidence);
      
      // Step 4: Draw conclusions
      reasoning.conclusions = await this.drawConclusions(reasoning.hypotheses, reasoning.evidence);
      
      // Step 5: Calculate overall confidence
      reasoning.confidence = this.calculateOverallConfidence(reasoning);
      
      // Step 6: Update feedback loops
      await this.updateFeedbackLoops(context, reasoning);
      
      // Log reasoning step
      const reasoningStep: ReasoningStep = {
        id: `reason_${Date.now()}`,
        type: 'analysis',
        input: context.input,
        output: reasoning,
        confidence: reasoning.confidence,
        reasoning: `${reasoning.mode} reasoning with ${reasoning.evidence.length} evidence pieces`,
        timestamp: new Date()
      };
      
      this.addReasoningStep(reasoningStep);
      
      const processingTime = Date.now() - startTime;
      this.logger({
        level: 'info',
        message: `Reasoning completed in ${processingTime}ms`,
        timestamp: new Date(),
        source: 'ReasoningEngine',
        metadata: { 
          mode: reasoning.mode, 
          confidence: reasoning.confidence,
          hypotheses: reasoning.hypotheses.length,
          evidence: reasoning.evidence.length 
        }
      });

      return { success: true, data: reasoning };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Reasoning failed: ${error.message}`,
        timestamp: new Date(),
        source: 'ReasoningEngine'
      });
      return { success: false, error: error.message };
    }
  }

  private selectReasoningMode(context: ReasoningContext): ReasoningState['mode'] {
    const input = context.input.toLowerCase();
    
    // Analytical reasoning for logical, mathematical, or technical queries
    if (input.includes('analyze') || input.includes('calculate') || input.includes('logic')) {
      return 'analytical';
    }
    
    // Creative reasoning for open-ended, imaginative, or brainstorming queries
    if (input.includes('create') || input.includes('imagine') || input.includes('brainstorm')) {
      return 'creative';
    }
    
    // Critical reasoning for evaluation, judgment, or assessment queries
    if (input.includes('evaluate') || input.includes('critique') || input.includes('judge')) {
      return 'critical';
    }
    
    // Default to intuitive reasoning
    return 'intuitive';
  }

  private async gatherEvidence(context: ReasoningContext): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    
    // Evidence from direct observation (current input)
    evidence.push({
      id: `obs_${Date.now()}`,
      type: 'observation',
      content: context.input,
      reliability: 0.9,
      source: 'direct_input'
    });
    
    // Evidence from memories
    for (const memoryResult of context.memories) {
      evidence.push({
        id: `mem_${memoryResult.memory.id}`,
        type: 'memory',
        content: memoryResult.memory.content,
        reliability: memoryResult.similarity * 0.8, // Adjust reliability based on similarity
        source: `memory_${memoryResult.memory.type}`
      });
    }
    
    // Evidence from previous reasoning steps (feedback loops)
    const recentSteps = this.reasoningHistory.slice(-5);
    for (const step of recentSteps) {
      if (step.confidence > 0.7) {
        evidence.push({
          id: `prev_${step.id}`,
          type: 'inference',
          content: step.reasoning,
          reliability: step.confidence * 0.6,
          source: 'previous_reasoning'
        });
      }
    }
    
    return evidence.sort((a, b) => b.reliability - a.reliability);
  }

  private async generateHypotheses(evidence: Evidence[], context: ReasoningContext): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];
    
    // Generate hypotheses based on different reasoning patterns
    
    // Pattern 1: Direct correlation
    const correlationHypothesis = this.generateCorrelationHypothesis(evidence);
    if (correlationHypothesis) {
      hypotheses.push(correlationHypothesis);
    }
    
    // Pattern 2: Causal reasoning
    const causalHypothesis = this.generateCausalHypothesis(evidence, context);
    if (causalHypothesis) {
      hypotheses.push(causalHypothesis);
    }
    
    // Pattern 3: Analogical reasoning
    const analogicalHypothesis = this.generateAnalogicalHypothesis(evidence, context);
    if (analogicalHypothesis) {
      hypotheses.push(analogicalHypothesis);
    }
    
    // Pattern 4: Inductive reasoning
    const inductiveHypothesis = this.generateInductiveHypothesis(evidence);
    if (inductiveHypothesis) {
      hypotheses.push(inductiveHypothesis);
    }
    
    return hypotheses;
  }

  private generateCorrelationHypothesis(evidence: Evidence[]): Hypothesis | null {
    // Look for patterns in evidence
    const concepts = this.extractConcepts(evidence);
    if (concepts.length >= 2) {
      return {
        id: `hyp_corr_${Date.now()}`,
        statement: `There is a correlation between ${concepts[0]} and ${concepts[1]}`,
        probability: 0.6,
        evidence: evidence.slice(0, 3).map(e => e.id),
        generated: new Date()
      };
    }
    return null;
  }

  private generateCausalHypothesis(evidence: Evidence[], context: ReasoningContext): Hypothesis | null {
    // Look for cause-effect relationships
    const input = context.input.toLowerCase();
    if (input.includes('because') || input.includes('causes') || input.includes('results in')) {
      return {
        id: `hyp_causal_${Date.now()}`,
        statement: `The observed pattern suggests a causal relationship`,
        probability: 0.7,
        evidence: evidence.slice(0, 2).map(e => e.id),
        generated: new Date()
      };
    }
    return null;
  }

  private generateAnalogicalHypothesis(evidence: Evidence[], context: ReasoningContext): Hypothesis | null {
    // Look for analogies in memory
    const memoryEvidence = evidence.filter(e => e.type === 'memory');
    if (memoryEvidence.length > 0) {
      return {
        id: `hyp_analog_${Date.now()}`,
        statement: `Current situation is analogous to previous experiences`,
        probability: 0.5,
        evidence: memoryEvidence.slice(0, 2).map(e => e.id),
        generated: new Date()
      };
    }
    return null;
  }

  private generateInductiveHypothesis(evidence: Evidence[]): Hypothesis | null {
    // Generalize from specific evidence
    if (evidence.length >= 3) {
      return {
        id: `hyp_induct_${Date.now()}`,
        statement: `Pattern observed in evidence suggests a general principle`,
        probability: 0.6,
        evidence: evidence.slice(0, 3).map(e => e.id),
        generated: new Date()
      };
    }
    return null;
  }

  private async evaluateHypotheses(hypotheses: Hypothesis[], evidence: Evidence[]): Promise<void> {
    for (const hypothesis of hypotheses) {
      // Evaluate hypothesis against evidence
      const supportingEvidence = evidence.filter(e => 
        hypothesis.evidence.includes(e.id) && e.reliability > 0.5
      );
      
      const contradictingEvidence = evidence.filter(e => 
        !hypothesis.evidence.includes(e.id) && this.contradicts(hypothesis.statement, e.content)
      );
      
      // Update probability based on evidence
      const supportScore = supportingEvidence.reduce((sum, e) => sum + e.reliability, 0);
      const contradictScore = contradictingEvidence.reduce((sum, e) => sum + e.reliability, 0);
      
      const evidenceRatio = supportScore / (supportScore + contradictScore + 1);
      hypothesis.probability = Math.min(0.95, hypothesis.probability * evidenceRatio * 1.5);
    }
    
    // Sort hypotheses by probability
    hypotheses.sort((a, b) => b.probability - a.probability);
  }

  private async drawConclusions(hypotheses: Hypothesis[], evidence: Evidence[]): Promise<Conclusion[]> {
    const conclusions: Conclusion[] = [];
    
    // Draw conclusions from high-probability hypotheses
    const strongHypotheses = hypotheses.filter(h => h.probability > 0.6);
    
    for (const hypothesis of strongHypotheses) {
      const supportingEvidence = evidence.filter(e => hypothesis.evidence.includes(e.id));
      
      const conclusion: Conclusion = {
        id: `conc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        statement: this.synthesizeConclusion(hypothesis, supportingEvidence),
        confidence: hypothesis.probability,
        reasoning: this.explainReasoning(hypothesis, supportingEvidence),
        implications: this.generateImplications(hypothesis)
      };
      
      conclusions.push(conclusion);
    }
    
    // If no strong hypotheses, create a tentative conclusion
    if (conclusions.length === 0 && hypotheses.length > 0) {
      const bestHypothesis = hypotheses[0];
      conclusions.push({
        id: `conc_tentative_${Date.now()}`,
        statement: `Tentatively, ${bestHypothesis.statement.toLowerCase()}`,
        confidence: bestHypothesis.probability * 0.7,
        reasoning: 'Based on limited evidence, this appears to be the most likely explanation',
        implications: ['Further evidence needed to confirm this conclusion']
      });
    }
    
    return conclusions;
  }

  private calculateOverallConfidence(reasoning: ReasoningState): number {
    if (reasoning.conclusions.length === 0) return 0.1;
    
    const avgConfidence = reasoning.conclusions.reduce((sum, c) => sum + c.confidence, 0) / reasoning.conclusions.length;
    const evidenceBonus = Math.min(reasoning.evidence.length / 10, 0.2);
    
    return Math.min(0.95, avgConfidence + evidenceBonus);
  }

  private async updateFeedbackLoops(context: ReasoningContext, reasoning: ReasoningState): Promise<void> {
    // Update feedback loops based on reasoning success
    const key = `${reasoning.mode}_${this.extractKey(context.input)}`;
    const currentStrength = this.feedbackLoops.get(key) || 0;
    const newStrength = currentStrength + (reasoning.confidence - 0.5) * 0.1;
    
    this.feedbackLoops.set(key, Math.max(0, Math.min(1, newStrength)));
    
    // Store reasoning as memory for future reference
    await this.memorySystem.storeMemory({
      type: 'procedural',
      content: `Reasoning: ${context.input} -> ${reasoning.conclusions[0]?.statement || 'No conclusion'}`,
      embedding: await this.generateEmbedding(context.input),
      metadata: {
        source: 'reasoning_engine',
        context: [reasoning.mode],
        confidence: reasoning.confidence
      },
      importance: reasoning.confidence
    });
  }

  private addReasoningStep(step: ReasoningStep): void {
    this.reasoningHistory.push(step);
    
    // Maintain history size limit
    if (this.reasoningHistory.length > this.maxHistorySize) {
      this.reasoningHistory = this.reasoningHistory.slice(-this.maxHistorySize);
    }
  }

  private extractConcepts(evidence: Evidence[]): string[] {
    const concepts: Set<string> = new Set();
    
    for (const e of evidence) {
      // Simple concept extraction (in practice, would use NLP)
      const words = e.content.toLowerCase().split(/\s+/);
      const significantWords = words.filter(w => w.length > 4 && !this.isStopWord(w));
      significantWords.forEach(w => concepts.add(w));
    }
    
    return Array.from(concepts).slice(0, 5);
  }

  private contradicts(statement: string, content: string): boolean {
    // Simple contradiction detection
    const negationWords = ['not', 'no', 'never', 'none', 'false', 'incorrect'];
    const statementWords = statement.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    return negationWords.some(neg => 
      contentWords.includes(neg) && 
      statementWords.some(word => contentWords.includes(word))
    );
  }

  private synthesizeConclusion(hypothesis: Hypothesis, evidence: Evidence[]): string {
    const evidenceTypes = [...new Set(evidence.map(e => e.type))];
    const strength = hypothesis.probability > 0.8 ? 'strongly' : 'moderately';
    
    return `Based on ${evidenceTypes.join(', ')} evidence, I ${strength} believe that ${hypothesis.statement.toLowerCase()}`;
  }

  private explainReasoning(hypothesis: Hypothesis, evidence: Evidence[]): string {
    const evidenceCount = evidence.length;
    const avgReliability = evidence.reduce((sum, e) => sum + e.reliability, 0) / evidenceCount;
    
    return `This conclusion is based on ${evidenceCount} pieces of evidence with average reliability of ${avgReliability.toFixed(2)}. The hypothesis probability is ${hypothesis.probability.toFixed(2)}.`;
  }

  private generateImplications(hypothesis: Hypothesis): string[] {
    const implications: string[] = [];
    
    // Generate implications based on hypothesis type and content
    if (hypothesis.statement.includes('correlation')) {
      implications.push('Further investigation needed to establish causation');
      implications.push('Pattern may be useful for prediction');
    }
    
    if (hypothesis.statement.includes('causal')) {
      implications.push('Intervention at the cause may affect the outcome');
      implications.push('Preventive measures might be possible');
    }
    
    implications.push('Confidence may change with additional evidence');
    
    return implications;
  }

  private extractKey(input: string): string {
    // Extract key concepts for feedback loop identification
    const words = input.toLowerCase().split(/\s+/);
    const keyWords = words.filter(w => w.length > 3 && !this.isStopWord(w));
    return keyWords.slice(0, 3).join('_');
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple embedding generation (in practice, would use a proper embedding model)
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Standard embedding size
    
    for (let i = 0; i < words.length && i < embedding.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      embedding[i % embedding.length] += (hash / 0xffffffff);
    }
    
    // Normalize embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  async getReasoningHistory(limit?: number): Promise<ReasoningStep[]> {
    const steps = limit ? this.reasoningHistory.slice(-limit) : this.reasoningHistory;
    return [...steps]; // Return copy to prevent modification
  }

  async clearReasoningHistory(): Promise<void> {
    this.reasoningHistory = [];
    this.feedbackLoops.clear();
    
    this.logger({
      level: 'info',
      message: 'Reasoning history and feedback loops cleared',
      timestamp: new Date(),
      source: 'ReasoningEngine'
    });
  }

  getFeedbackLoopStrengths(): Map<string, number> {
    return new Map(this.feedbackLoops);
  }
}