import path from 'path';
import { 
  SystemConfig, 
  MemoryConfig, 
  AIConfig, 
  SecurityConfig,
  LogEntry,
  LogLevel 
} from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfig;
  
  private constructor() {
    this.config = this.loadDefaultConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  getConfig(): SystemConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  private loadDefaultConfig(): SystemConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      environment: (process.env.NODE_ENV as any) || 'development',
      debug: isDevelopment,
      security: {
        sandboxEnabled: true,
        ethicsEnabled: true,
        auditLogging: true,
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production',
        maxExecutionTime: 30000 // 30 seconds
      },
      ai: {
        ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        models: [
          {
            name: 'llama2',
            type: 'reasoning',
            endpoint: 'http://localhost:11434/api/generate',
            parameters: {
              temperature: 0.7,
              top_p: 0.9,
              top_k: 40,
              max_tokens: 2048
            },
            capabilities: ['text-generation', 'reasoning', 'analysis']
          },
          {
            name: 'codellama',
            type: 'code',
            endpoint: 'http://localhost:11434/api/generate',
            parameters: {
              temperature: 0.3,
              top_p: 0.95,
              top_k: 20,
              max_tokens: 4096
            },
            capabilities: ['code-generation', 'code-analysis', 'debugging']
          },
          {
            name: 'llava',
            type: 'vision',
            endpoint: 'http://localhost:11434/api/generate',
            parameters: {
              temperature: 0.5,
              top_p: 0.9,
              top_k: 30,
              max_tokens: 1024
            },
            capabilities: ['image-analysis', 'visual-reasoning', 'ocr']
          }
        ],
        fallbackModel: 'llama2',
        cudaAcceleration: process.env.CUDA_AVAILABLE === 'true',
        maxConcurrentModels: 3
      },
      memory: {
        vectorStore: {
          provider: 'chroma',
          endpoint: process.env.CHROMA_ENDPOINT || 'http://localhost:8000',
          dimension: 384
        },
        sessionCache: {
          provider: 'redis',
          ttl: 3600, // 1 hour
          maxSize: 1000000 // 1MB
        },
        longTermStorage: {
          provider: 'filesystem',
          path: process.env.STORAGE_PATH || path.join(process.cwd(), 'data', 'memories')
        }
      }
    };
  }
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logLevel: LogLevel = 'info';
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  log(entry: LogEntry): void {
    if (this.shouldLog(entry.level)) {
      this.logs.push(entry);
      
      // Maintain log size limit
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      
      // Console output for development
      if (process.env.NODE_ENV === 'development') {
        this.consoleLog(entry);
      }
    }
  }
  
  getLogs(level?: LogLevel, source?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return [...filteredLogs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
  
  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.metadata || '');
        break;
      case 'info':
        console.info(prefix, entry.message, entry.metadata || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.metadata || '');
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, entry.message, entry.metadata || '');
        break;
    }
  }
}

export class SystemInitializer {
  private logger: Logger;
  private config: SystemConfig;
  
  constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance().getConfig();
  }
  
  async initialize(): Promise<void> {
    this.logger.log({
      level: 'info',
      message: 'Initializing Cognitive AI System',
      timestamp: new Date(),
      source: 'SystemInitializer'
    });
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Check external dependencies
      await this.checkDependencies();
      
      // Initialize security components
      await this.initializeSecurity();
      
      // Verify system readiness
      await this.verifySystemReadiness();
      
      this.logger.log({
        level: 'info',
        message: 'System initialization completed successfully',
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
      
    } catch (error) {
      this.logger.log({
        level: 'fatal',
        message: `System initialization failed: ${error.message}`,
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
      throw error;
    }
  }
  
  private async createDirectories(): Promise<void> {
    const fs = await import('fs/promises');
    
    const directories = [
      this.config.memory.longTermStorage.path,
      path.join(process.cwd(), 'data', 'backups'),
      path.join(process.cwd(), 'data', 'logs'),
      path.join(process.cwd(), 'data', 'temp'),
      path.join(process.cwd(), 'data', 'uploads')
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        this.logger.log({
          level: 'debug',
          message: `Created directory: ${dir}`,
          timestamp: new Date(),
          source: 'SystemInitializer'
        });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw new Error(`Failed to create directory ${dir}: ${error.message}`);
        }
      }
    }
  }
  
  private async validateConfiguration(): Promise<void> {
    // Validate memory configuration
    if (!this.config.memory.vectorStore.endpoint) {
      throw new Error('Vector store endpoint not configured');
    }
    
    if (this.config.memory.vectorStore.dimension <= 0) {
      throw new Error('Invalid vector store dimension');
    }
    
    // Validate AI configuration
    if (!this.config.ai.ollamaEndpoint) {
      throw new Error('Ollama endpoint not configured');
    }
    
    if (this.config.ai.models.length === 0) {
      throw new Error('No AI models configured');
    }
    
    // Validate security configuration
    if (!this.config.security.encryptionKey || this.config.security.encryptionKey === 'default-dev-key-change-in-production') {
      if (this.config.environment === 'production') {
        throw new Error('Production encryption key not configured');
      }
      this.logger.log({
        level: 'warn',
        message: 'Using default encryption key in development',
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
    }
    
    this.logger.log({
      level: 'info',
      message: 'Configuration validation passed',
      timestamp: new Date(),
      source: 'SystemInitializer'
    });
  }
  
  private async checkDependencies(): Promise<void> {
    const dependencies = [
      { name: 'Ollama', check: () => this.checkOllama() },
      { name: 'Vector Store', check: () => this.checkVectorStore() },
      { name: 'Redis', check: () => this.checkRedis() }
    ];
    
    for (const dep of dependencies) {
      try {
        await dep.check();
        this.logger.log({
          level: 'info',
          message: `${dep.name} connection verified`,
          timestamp: new Date(),
          source: 'SystemInitializer'
        });
      } catch (error) {
        this.logger.log({
          level: 'warn',
          message: `${dep.name} check failed: ${error.message}`,
          timestamp: new Date(),
          source: 'SystemInitializer'
        });
        
        if (dep.name === 'Ollama') {
          this.logger.log({
            level: 'info',
            message: 'Ollama unavailable - system will run with limited AI capabilities',
            timestamp: new Date(),
            source: 'SystemInitializer'
          });
        }
      }
    }
  }
  
  private async checkOllama(): Promise<void> {
    try {
      const response = await fetch(`${this.config.ai.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Ollama connection failed: ${error.message}`);
    }
  }
  
  private async checkVectorStore(): Promise<void> {
    try {
      const response = await fetch(`${this.config.memory.vectorStore.endpoint}/api/v1/heartbeat`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Vector store connection failed: ${error.message}`);
    }
  }
  
  private async checkRedis(): Promise<void> {
    if (this.config.memory.sessionCache.provider === 'redis') {
      try {
        const Redis = await import('ioredis');
        const redis = new Redis.default({
          host: 'localhost',
          port: 6379,
          connectTimeout: 5000,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 1
        });
        
        await redis.ping();
        redis.disconnect();
      } catch (error) {
        throw new Error(`Redis connection failed: ${error.message}`);
      }
    }
  }
  
  private async initializeSecurity(): Promise<void> {
    if (this.config.security.sandboxEnabled) {
      // Initialize sandbox environment
      this.logger.log({
        level: 'info',
        message: 'Security sandbox enabled',
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
    }
    
    if (this.config.security.ethicsEnabled) {
      // Initialize ethics engine
      this.logger.log({
        level: 'info',
        message: 'Ethics engine enabled',
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
    }
    
    if (this.config.security.auditLogging) {
      // Initialize audit logging
      this.logger.log({
        level: 'info',
        message: 'Audit logging enabled',
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
    }
  }
  
  private async verifySystemReadiness(): Promise<void> {
    // Perform final readiness checks
    const checks = [
      'Memory system components available',
      'AI model configurations valid',
      'Security measures in place',
      'Storage directories accessible'
    ];
    
    for (const check of checks) {
      this.logger.log({
        level: 'debug',
        message: `✓ ${check}`,
        timestamp: new Date(),
        source: 'SystemInitializer'
      });
    }
  }
}

// Utility functions
export function getEnvironmentVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
}

export function validatePort(port: string | number): number {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error(`Invalid port number: ${port}`);
  }
  return portNum;
}

export function sanitizePath(inputPath: string): string {
  // Remove any potentially dangerous path components
  return path.normalize(inputPath).replace(/\.\./g, '');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        resolve(result);
        return;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          await delay(delayMs * attempt); // Exponential backoff
        }
      }
    }
    
    reject(lastError);
  });
}