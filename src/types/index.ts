// Core System Types
export interface SystemConfig {
  environment: 'development' | 'production' | 'testing';
  debug: boolean;
  security: SecurityConfig;
  ai: AIConfig;
  memory: MemoryConfig;
}

export interface SecurityConfig {
  sandboxEnabled: boolean;
  ethicsEnabled: boolean;
  auditLogging: boolean;
  encryptionKey: string;
  maxExecutionTime: number;
}

export interface AIConfig {
  ollamaEndpoint: string;
  models: ModelConfig[];
  fallbackModel: string;
  cudaAcceleration: boolean;
  maxConcurrentModels: number;
}

export interface ModelConfig {
  name: string;
  type: 'reasoning' | 'generation' | 'vision' | 'code' | 'multimodal';
  endpoint: string;
  parameters: Record<string, any>;
  capabilities: string[];
}

export interface MemoryConfig {
  vectorStore: {
    provider: 'chroma' | 'pinecone' | 'weaviate';
    endpoint: string;
    dimension: number;
  };
  sessionCache: {
    provider: 'redis' | 'memory';
    ttl: number;
    maxSize: number;
  };
  longTermStorage: {
    provider: 'filesystem' | 's3' | 'postgresql';
    path: string;
  };
}

// Memory System Types
export interface Memory {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working';
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
  timestamp: Date;
  importance: number;
  accessCount: number;
}

export interface MemoryMetadata {
  source: string;
  context: string[];
  emotions?: string[];
  concepts?: string[];
  relationships?: string[];
  confidence: number;
}

export interface MemoryQuery {
  query: string;
  type?: Memory['type'];
  limit?: number;
  threshold?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface MemorySearchResult {
  memory: Memory;
  similarity: number;
  relevance: number;
}

// Cognitive Architecture Types
export interface CognitiveState {
  currentContext: string[];
  activeMemories: Memory[];
  reasoning: ReasoningState;
  attention: AttentionState;
  emotions: EmotionalState;
}

export interface ReasoningState {
  mode: 'analytical' | 'creative' | 'critical' | 'intuitive';
  confidence: number;
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  conclusions: Conclusion[];
}

export interface Hypothesis {
  id: string;
  statement: string;
  probability: number;
  evidence: string[];
  generated: Date;
}

export interface Evidence {
  id: string;
  type: 'observation' | 'memory' | 'inference' | 'external';
  content: string;
  reliability: number;
  source: string;
}

export interface Conclusion {
  id: string;
  statement: string;
  confidence: number;
  reasoning: string;
  implications: string[];
}

export interface AttentionState {
  focus: string[];
  weights: Record<string, number>;
  inhibition: string[];
}

export interface EmotionalState {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  dominance: number; // 0 to 1
  emotions: Record<string, number>;
}

// Self-Modification Types
export interface CodeMutation {
  id: string;
  type: 'function' | 'class' | 'module' | 'configuration';
  target: string;
  changes: CodeChange[];
  reason: string;
  risk: 'low' | 'medium' | 'high';
  status: 'proposed' | 'approved' | 'applied' | 'rejected' | 'rolled_back';
  timestamp: Date;
  author: 'system' | 'user';
}

export interface CodeChange {
  operation: 'add' | 'modify' | 'delete';
  location: string;
  oldCode?: string;
  newCode?: string;
  line?: number;
}

export interface SystemVersion {
  id: string;
  version: string;
  changes: CodeMutation[];
  timestamp: Date;
  stable: boolean;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  responseTime: number;
  accuracy: number;
  resourceUsage: ResourceUsage;
  errorRate: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  gpu?: number;
  disk: number;
  network: number;
}

// ML and AI Types
export interface MLModel {
  id: string;
  name: string;
  type: string;
  framework: 'pytorch' | 'tensorflow' | 'ollama' | 'huggingface';
  path: string;
  parameters: ModelParameters;
  metrics: ModelMetrics;
  status: 'loading' | 'ready' | 'error' | 'updating';
}

export interface ModelParameters {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  seed?: number;
  [key: string]: any;
}

export interface ModelMetrics {
  accuracy?: number;
  perplexity?: number;
  bleuScore?: number;
  latency: number;
  throughput: number;
}

export interface InferenceRequest {
  id: string;
  model: string;
  input: any;
  parameters?: Partial<ModelParameters>;
  context?: string[];
  priority: 'low' | 'normal' | 'high';
}

export interface InferenceResponse {
  id: string;
  result: any;
  confidence: number;
  metadata: InferenceMetadata;
  processingTime: number;
}

export interface InferenceMetadata {
  model: string;
  parameters: ModelParameters;
  tokensGenerated?: number;
  probabilityDistribution?: number[];
}

// Security and Ethics Types
export interface SecurityContext {
  user: string;
  permissions: Permission[];
  restrictions: Restriction[];
  auditTrail: AuditEntry[];
}

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface Restriction {
  type: 'time' | 'resource' | 'action' | 'content';
  rule: string;
  severity: 'warning' | 'block';
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: Date;
  details: Record<string, any>;
  risk: 'low' | 'medium' | 'high';
}

export interface EthicsAssessment {
  bias: BiasAssessment;
  safety: SafetyAssessment;
  privacy: PrivacyAssessment;
  fairness: FairnessAssessment;
  overall: 'approved' | 'warning' | 'rejected';
}

export interface BiasAssessment {
  score: number;
  categories: Record<string, number>;
  flags: string[];
}

export interface SafetyAssessment {
  harmfulness: number;
  toxicity: number;
  appropriateness: number;
  flags: string[];
}

export interface PrivacyAssessment {
  dataExposure: number;
  identifiableInfo: string[];
  complianceFlags: string[];
}

export interface FairnessAssessment {
  representation: number;
  equality: number;
  inclusivity: number;
  flags: string[];
}

// GUI and Interface Types
export interface GUIState {
  theme: 'retro' | 'modern' | 'dark' | 'light';
  layout: 'sidebar' | 'tabs' | 'grid';
  activePanel: string;
  notifications: Notification[];
  modalStack: Modal[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  persistent: boolean;
}

export interface Modal {
  id: string;
  type: string;
  props: Record<string, any>;
  closable: boolean;
}

export interface FileUpload {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | Buffer;
  metadata: Record<string, any>;
  processed: boolean;
}

// Testing and Validation Types
export interface TestSuite {
  id: string;
  name: string;
  tests: Test[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: TestResults;
}

export interface Test {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'performance' | 'safety' | 'ethics';
  function: string;
  parameters: any[];
  expectedResult: any;
  timeout: number;
}

export interface TestResults {
  passed: number;
  failed: number;
  errors: TestError[];
  performance: PerformanceMetrics;
  coverage: number;
}

export interface TestError {
  test: string;
  error: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high';
}

// Event System Types
export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: Date;
  priority: number;
}

export interface EventHandler {
  event: string;
  handler: (event: SystemEvent) => void | Promise<void>;
  priority: number;
  once?: boolean;
}

// API Types
export interface APIRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: any;
  timeout: number;
}

export interface APIResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  processingTime: number;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncResult<T> = Promise<{
  success: boolean;
  data?: T;
  error?: string;
}>;

export type EventCallback<T = any> = (data: T) => void | Promise<void>;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}
