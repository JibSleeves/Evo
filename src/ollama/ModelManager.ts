import { 
  MLModel, 
  ModelParameters, 
  InferenceRequest, 
  InferenceResponse, 
  ModelConfig,
  LogEntry,
  AsyncResult,
  ResourceUsage 
} from '../types';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelInstance {
  model: MLModel;
  isLoaded: boolean;
  lastUsed: Date;
  requestCount: number;
  loadTime: number;
  memoryUsage: number;
}

export class ModelManager {
  private logger: (entry: LogEntry) => void;
  private ollamaEndpoint: string;
  private maxConcurrentModels: number;
  private models: Map<string, ModelInstance> = new Map();
  private requestQueue: InferenceRequest[] = [];
  private activeRequests: Map<string, Promise<InferenceResponse>> = new Map();
  private loadBalancer: LoadBalancer;
  private resourceMonitor: ResourceMonitor;
  private cudaEnabled: boolean;

  constructor(
    ollamaEndpoint: string,
    maxConcurrentModels: number,
    cudaEnabled: boolean,
    logger: (entry: LogEntry) => void
  ) {
    this.ollamaEndpoint = ollamaEndpoint;
    this.maxConcurrentModels = maxConcurrentModels;
    this.cudaEnabled = cudaEnabled;
    this.logger = logger;
    this.loadBalancer = new LoadBalancer(logger);
    this.resourceMonitor = new ResourceMonitor(logger);
    
    // Start monitoring
    this.startResourceMonitoring();
  }

  async initialize(modelConfigs: ModelConfig[]): Promise<AsyncResult<void>> {
    try {
      this.logger({
        level: 'info',
        message: 'Initializing Ollama model manager',
        timestamp: new Date(),
        source: 'ModelManager'
      });

      // Check Ollama connection
      await this.checkOllamaConnection();

      // Get available models from Ollama
      const availableModels = await this.getAvailableModels();

      // Initialize configured models
      for (const config of modelConfigs) {
        await this.initializeModel(config, availableModels);
      }

      this.logger({
        level: 'info',
        message: `Model manager initialized with ${this.models.size} models`,
        timestamp: new Date(),
        source: 'ModelManager',
        metadata: {
          models: Array.from(this.models.keys()),
          cudaEnabled: this.cudaEnabled
        }
      });

      return { success: true };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to initialize model manager: ${error.message}`,
        timestamp: new Date(),
        source: 'ModelManager'
      });
      return { success: false, error: error.message };
    }
  }

  async generateInference(request: InferenceRequest): Promise<AsyncResult<InferenceResponse>> {
    const startTime = Date.now();
    
    try {
      // Check if model is available
      const modelInstance = this.models.get(request.model);
      if (!modelInstance) {
        // Try fallback model
        const fallbackInstance = this.findFallbackModel(request.model);
        if (!fallbackInstance) {
          return { 
            success: false, 
            error: `Model ${request.model} not available and no fallback found` 
          };
        }
        request.model = fallbackInstance.model.name;
      }

      // Check if we can handle this request
      const canHandle = await this.canHandleRequest(request);
      if (!canHandle) {
        // Queue the request
        this.requestQueue.push(request);
        this.logger({
          level: 'info',
          message: `Request queued due to resource constraints`,
          timestamp: new Date(),
          source: 'ModelManager',
          metadata: { requestId: request.id, queueSize: this.requestQueue.length }
        });

        // Wait for resources and retry
        return await this.waitAndRetry(request);
      }

      // Load model if needed
      await this.ensureModelLoaded(request.model);

      // Generate response
      const response = await this.callOllamaAPI(request);
      
      // Update metrics
      this.updateModelMetrics(request.model, Date.now() - startTime);

      this.logger({
        level: 'info',
        message: `Inference completed`,
        timestamp: new Date(),
        source: 'ModelManager',
        metadata: {
          requestId: request.id,
          model: request.model,
          processingTime: Date.now() - startTime,
          confidence: response.confidence
        }
      });

      return { success: true, data: response };

    } catch (error) {
      this.logger({
        level: 'error',
        message: `Inference failed: ${error.message}`,
        timestamp: new Date(),
        source: 'ModelManager',
        metadata: { requestId: request.id, model: request.model }
      });
      return { success: false, error: error.message };
    }
  }

  async getModelStatus(modelName?: string): Promise<AsyncResult<any>> {
    try {
      if (modelName) {
        const instance = this.models.get(modelName);
        if (!instance) {
          return { success: false, error: 'Model not found' };
        }
        
        return {
          success: true,
          data: {
            name: instance.model.name,
            type: instance.model.type,
            status: instance.model.status,
            isLoaded: instance.isLoaded,
            lastUsed: instance.lastUsed,
            requestCount: instance.requestCount,
            metrics: instance.model.metrics
          }
        };
      } else {
        const allStatus = Array.from(this.models.entries()).map(([name, instance]) => ({
          name,
          type: instance.model.type,
          status: instance.model.status,
          isLoaded: instance.isLoaded,
          lastUsed: instance.lastUsed,
          requestCount: instance.requestCount,
          memoryUsage: instance.memoryUsage
        }));
        
        return { success: true, data: allStatus };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async unloadModel(modelName: string): Promise<AsyncResult<void>> {
    try {
      const instance = this.models.get(modelName);
      if (!instance) {
        return { success: false, error: 'Model not found' };
      }

      if (instance.isLoaded) {
        // Call Ollama to unload the model
        const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            keep_alive: 0 // Unload immediately
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        instance.isLoaded = false;
        instance.model.status = 'ready';

        this.logger({
          level: 'info',
          message: `Model unloaded: ${modelName}`,
          timestamp: new Date(),
          source: 'ModelManager'
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async pullModel(modelName: string): Promise<AsyncResult<void>> {
    try {
      this.logger({
        level: 'info',
        message: `Pulling model: ${modelName}`,
        timestamp: new Date(),
        source: 'ModelManager'
      });

      const response = await fetch(`${this.ollamaEndpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream the response to track progress
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);
          const lines = text.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const progress = JSON.parse(line);
              if (progress.status) {
                this.logger({
                  level: 'debug',
                  message: `Pull progress: ${progress.status}`,
                  timestamp: new Date(),
                  source: 'ModelManager',
                  metadata: progress
                });
              }
            } catch (e) {
              // Ignore JSON parse errors for streaming data
            }
          }
        }
      }

      this.logger({
        level: 'info',
        message: `Model pulled successfully: ${modelName}`,
        timestamp: new Date(),
        source: 'ModelManager'
      });

      return { success: true };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to pull model: ${error.message}`,
        timestamp: new Date(),
        source: 'ModelManager'
      });
      return { success: false, error: error.message };
    }
  }

  getResourceUsage(): ResourceUsage {
    return this.resourceMonitor.getCurrentUsage();
  }

  getLoadBalancerStats() {
    return this.loadBalancer.getStats();
  }

  private async checkOllamaConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama connection failed: HTTP ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to Ollama at ${this.ollamaEndpoint}: ${error.message}`);
    }
  }

  private async getAvailableModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to get models: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.models || [];
  }

  private async initializeModel(config: ModelConfig, availableModels: OllamaModel[]): Promise<void> {
    const ollamaModel = availableModels.find(m => m.name === config.name);
    
    if (!ollamaModel) {
      this.logger({
        level: 'warn',
        message: `Model ${config.name} not found in Ollama, attempting to pull`,
        timestamp: new Date(),
        source: 'ModelManager'
      });
      
      const pullResult = await this.pullModel(config.name);
      if (!pullResult.success) {
        throw new Error(`Failed to pull model ${config.name}: ${pullResult.error}`);
      }
    }

    const mlModel: MLModel = {
      id: `ollama_${config.name}`,
      name: config.name,
      type: config.type,
      framework: 'ollama',
      path: `${this.ollamaEndpoint}/api/generate`,
      parameters: config.parameters,
      metrics: {
        latency: 0,
        throughput: 0
      },
      status: 'ready'
    };

    const instance: ModelInstance = {
      model: mlModel,
      isLoaded: false,
      lastUsed: new Date(),
      requestCount: 0,
      loadTime: 0,
      memoryUsage: ollamaModel ? this.estimateMemoryUsage(ollamaModel) : 0
    };

    this.models.set(config.name, instance);
  }

  private async ensureModelLoaded(modelName: string): Promise<void> {
    const instance = this.models.get(modelName);
    if (!instance) {
      throw new Error(`Model ${modelName} not found`);
    }

    if (!instance.isLoaded) {
      const loadStart = Date.now();
      
      // Make a lightweight request to load the model
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '',
          stream: false,
          options: { num_predict: 1 }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load model: HTTP ${response.status}`);
      }

      instance.isLoaded = true;
      instance.loadTime = Date.now() - loadStart;
      instance.model.status = 'ready';

      this.logger({
        level: 'info',
        message: `Model loaded: ${modelName}`,
        timestamp: new Date(),
        source: 'ModelManager',
        metadata: { loadTime: instance.loadTime }
      });
    }
  }

  private async callOllamaAPI(request: InferenceRequest): Promise<InferenceResponse> {
    const instance = this.models.get(request.model)!;
    const startTime = Date.now();

    const requestBody = {
      model: request.model,
      prompt: request.input,
      stream: false,
      options: {
        ...instance.model.parameters,
        ...request.parameters
      }
    };

    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Update instance metrics
    instance.lastUsed = new Date();
    instance.requestCount++;

    return {
      id: request.id,
      result: data.response,
      confidence: this.calculateConfidence(data),
      metadata: {
        model: request.model,
        parameters: requestBody.options,
        tokensGenerated: data.eval_count || 0
      },
      processingTime
    };
  }

  private calculateConfidence(ollamaResponse: any): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 0.5;
    
    if (ollamaResponse.done) {
      confidence += 0.2;
    }
    
    if (ollamaResponse.eval_count > 0) {
      confidence += Math.min(ollamaResponse.eval_count / 100, 0.2);
    }
    
    if (ollamaResponse.response && ollamaResponse.response.length > 50) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  private findFallbackModel(requestedModel: string): ModelInstance | null {
    // Find a model of similar type that's available
    const requestedInstance = this.models.get(requestedModel);
    if (!requestedInstance) return null;

    const requestedType = requestedInstance.model.type;
    
    for (const [name, instance] of this.models) {
      if (name !== requestedModel && 
          instance.model.type === requestedType && 
          instance.model.status === 'ready') {
        return instance;
      }
    }
    
    // If no same-type model, return any available model
    for (const [name, instance] of this.models) {
      if (name !== requestedModel && instance.model.status === 'ready') {
        return instance;
      }
    }
    
    return null;
  }

  private async canHandleRequest(request: InferenceRequest): Promise<boolean> {
    const resourceUsage = this.resourceMonitor.getCurrentUsage();
    const activeCount = this.activeRequests.size;
    
    // Check concurrent request limit
    if (activeCount >= this.maxConcurrentModels) {
      return false;
    }
    
    // Check memory usage
    if (resourceUsage.memory > 0.9) {
      return false;
    }
    
    // Check CPU usage
    if (resourceUsage.cpu > 0.95) {
      return false;
    }
    
    return true;
  }

  private async waitAndRetry(request: InferenceRequest): Promise<AsyncResult<InferenceResponse>> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const canHandle = await this.canHandleRequest(request);
        if (canHandle) {
          clearInterval(checkInterval);
          // Remove from queue
          const index = this.requestQueue.findIndex(r => r.id === request.id);
          if (index > -1) {
            this.requestQueue.splice(index, 1);
          }
          // Retry the request
          const result = await this.generateInference(request);
          resolve(result);
        }
      }, 1000); // Check every second
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve({ success: false, error: 'Request timeout' });
      }, 30000);
    });
  }

  private updateModelMetrics(modelName: string, processingTime: number): void {
    const instance = this.models.get(modelName);
    if (instance) {
      const metrics = instance.model.metrics;
      metrics.latency = (metrics.latency + processingTime) / 2; // Moving average
      metrics.throughput = 1000 / processingTime; // Requests per second
    }
  }

  private estimateMemoryUsage(ollamaModel: OllamaModel): number {
    // Rough estimate based on parameter size
    const paramSize = ollamaModel.details?.parameter_size || '7B';
    const sizeNum = parseFloat(paramSize);
    
    if (paramSize.includes('B')) {
      return sizeNum * 1024 * 1024 * 1024; // GB to bytes
    } else if (paramSize.includes('M')) {
      return sizeNum * 1024 * 1024; // MB to bytes
    }
    
    return 7 * 1024 * 1024 * 1024; // Default 7GB
  }

  private startResourceMonitoring(): void {
    setInterval(() => {
      this.resourceMonitor.updateMetrics();
      
      // Auto-unload unused models if memory is high
      const usage = this.resourceMonitor.getCurrentUsage();
      if (usage.memory > 0.8) {
        this.autoUnloadModels();
      }
    }, 5000); // Every 5 seconds
  }

  private autoUnloadModels(): void {
    const sortedInstances = Array.from(this.models.entries())
      .filter(([_, instance]) => instance.isLoaded)
      .sort(([_, a], [__, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());
    
    // Unload the least recently used model
    if (sortedInstances.length > 0) {
      const [modelName, _] = sortedInstances[0];
      this.unloadModel(modelName);
    }
  }
}

class LoadBalancer {
  private logger: (entry: LogEntry) => void;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  constructor(logger: (entry: LogEntry) => void) {
    this.logger = logger;
  }

  selectModel(availableModels: string[], requestType: string): string {
    // Simple round-robin for now
    // In a more sophisticated implementation, this would consider:
    // - Model performance metrics
    // - Current load
    // - Request type suitability
    return availableModels[this.stats.totalRequests % availableModels.length];
  }

  recordRequest(success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime + responseTime) / 2;
  }

  getStats() {
    return { ...this.stats };
  }
}

class ResourceMonitor {
  private logger: (entry: LogEntry) => void;
  private currentUsage: ResourceUsage;

  constructor(logger: (entry: LogEntry) => void) {
    this.logger = logger;
    this.currentUsage = {
      cpu: 0,
      memory: 0,
      gpu: 0,
      disk: 0,
      network: 0
    };
  }

  updateMetrics(): void {
    const memUsage = process.memoryUsage();
    this.currentUsage.memory = memUsage.heapUsed / memUsage.heapTotal;
    
    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.currentUsage.cpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    // GPU usage would require additional libraries
    // For now, estimate based on CUDA availability
    this.currentUsage.gpu = 0; // Placeholder
  }

  getCurrentUsage(): ResourceUsage {
    return { ...this.currentUsage };
  }
}