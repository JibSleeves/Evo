import { CognitiveArchitecture } from './cognitive/CognitiveArchitecture';
import { ConfigManager, Logger, SystemInitializer } from './utils/SystemConfig';
import { MemoryConfig, LogEntry } from './types';

export class CognitiveAISystem {
  private cognitive: CognitiveArchitecture;
  private logger: Logger;
  private config: any;
  private initialized: boolean = false;

  constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance().getConfig();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.log({
        level: 'warn',
        message: 'System already initialized',
        timestamp: new Date(),
        source: 'CognitiveAISystem'
      });
      return;
    }

    try {
      // Initialize the system
      const initializer = new SystemInitializer();
      await initializer.initialize();

      // Initialize cognitive architecture
      this.cognitive = new CognitiveArchitecture(
        this.config.memory as MemoryConfig,
        (entry: LogEntry) => this.logger.log(entry)
      );

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;

      this.logger.log({
        level: 'info',
        message: 'Cognitive AI System fully initialized and ready',
        timestamp: new Date(),
        source: 'CognitiveAISystem'
      });

    } catch (error) {
      this.logger.log({
        level: 'fatal',
        message: `System initialization failed: ${error.message}`,
        timestamp: new Date(),
        source: 'CognitiveAISystem'
      });
      throw error;
    }
  }

  async processInput(input: string, options?: {
    context?: string[];
    files?: any[];
    goals?: string[];
    constraints?: string[];
  }): Promise<{
    response: string;
    confidence: number;
    reasoning: string;
    metadata: any;
  }> {
    if (!this.initialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    const result = await this.cognitive.processInput({
      text: input,
      context: options?.context,
      files: options?.files,
      goals: options?.goals,
      constraints: options?.constraints
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      response: result.data!.response,
      confidence: result.data!.confidence,
      reasoning: result.data!.reasoning,
      metadata: {
        emotionalState: result.data!.emotionalState,
        attentionChanges: result.data!.attentionChanges,
        selfReflection: result.data!.selfReflection,
        memoryUpdates: result.data!.memoryUpdates
      }
    };
  }

  async getSystemStatus(): Promise<{
    initialized: boolean;
    cognitiveState: any;
    memoryStats: any;
    performance: any;
  }> {
    const status = {
      initialized: this.initialized,
      cognitiveState: this.initialized ? this.cognitive.getCurrentState() : null,
      memoryStats: null,
      performance: null
    };

    if (this.initialized) {
      const memoryStatsResult = await this.cognitive.getMemoryStats();
      if (memoryStatsResult.success) {
        status.memoryStats = memoryStatsResult.data;
      }

      // Add performance metrics
      status.performance = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    }

    return status;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.log({
      level: 'info',
      message: 'Shutting down Cognitive AI System',
      timestamp: new Date(),
      source: 'CognitiveAISystem'
    });

    // Perform cleanup
    if (this.cognitive) {
      await this.cognitive.clearHistory();
    }

    this.initialized = false;

    this.logger.log({
      level: 'info',
      message: 'System shutdown completed',
      timestamp: new Date(),
      source: 'CognitiveAISystem'
    });
  }

  private setupEventListeners(): void {
    this.cognitive.on('cognitive_processing', (event) => {
      this.logger.log({
        level: 'debug',
        message: 'Cognitive processing event',
        timestamp: new Date(),
        source: 'CognitiveAISystem',
        metadata: event.data
      });
    });

    this.cognitive.on('low_confidence', (event) => {
      this.logger.log({
        level: 'warn',
        message: 'Low confidence response detected',
        timestamp: new Date(),
        source: 'CognitiveAISystem',
        metadata: event.data
      });
    });

    // Handle process signals for graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
  }

  // Public API methods
  getCognitiveState() {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }
    return this.cognitive.getCurrentState();
  }

  getProcessingHistory(limit?: number) {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }
    return this.cognitive.getProcessingHistory(limit);
  }

  async clearHistory() {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }
    return await this.cognitive.clearHistory();
  }

  async processDocument(file: any) {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }
    return await this.cognitive.processDocument(file);
  }

  getLogs(level?: any, source?: string, limit?: number) {
    return this.logger.getLogs(level, source, limit);
  }

  clearLogs() {
    this.logger.clearLogs();
  }

  setLogLevel(level: any) {
    this.logger.setLogLevel(level);
  }
}

// Export the main class and factory function
export default CognitiveAISystem;

export function createCognitiveAISystem(): CognitiveAISystem {
  return new CognitiveAISystem();
}

// Export all types and components for advanced usage
export * from './types';
export * from './cognitive/CognitiveArchitecture';
export * from './cognitive/MemorySystem';
export * from './cognitive/ReasoningEngine';
export * from './cognitive/RAGEngine';
export * from './utils/SystemConfig';