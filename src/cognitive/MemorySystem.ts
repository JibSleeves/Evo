import { ChromaApi, ChromaClient } from 'chromadb';
import Redis from 'ioredis';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { 
  Memory, 
  MemoryMetadata, 
  MemoryQuery, 
  MemorySearchResult, 
  MemoryConfig,
  LogEntry,
  AsyncResult 
} from '../types';

export class MemorySystem {
  private vectorStore: ChromaClient;
  private sessionCache: Redis;
  private config: MemoryConfig;
  private embeddings: Map<string, number[]> = new Map();
  private logger: (entry: LogEntry) => void;

  constructor(config: MemoryConfig, logger: (entry: LogEntry) => void) {
    this.config = config;
    this.logger = logger;
    this.initializeStores();
  }

  private async initializeStores(): Promise<void> {
    try {
      // Initialize vector store (Chroma)
      this.vectorStore = new ChromaClient({
        path: this.config.vectorStore.endpoint
      });

      // Initialize session cache (Redis)
      if (this.config.sessionCache.provider === 'redis') {
        this.sessionCache = new Redis({
          host: 'localhost',
          port: 6379,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        });
      }

      this.logger({
        level: 'info',
        message: 'Memory system initialized successfully',
        timestamp: new Date(),
        source: 'MemorySystem',
        metadata: { config: this.config }
      });
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to initialize memory system: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      throw error;
    }
  }

  async storeMemory(memory: Omit<Memory, 'id' | 'timestamp' | 'accessCount'>): Promise<AsyncResult<string>> {
    try {
      const memoryId = this.generateMemoryId(memory.content);
      const completeMemory: Memory = {
        ...memory,
        id: memoryId,
        timestamp: new Date(),
        accessCount: 0
      };

      // Store in vector database
      await this.storeInVectorDB(completeMemory);

      // Store in session cache
      await this.storeInSessionCache(completeMemory);

      // Store in long-term storage
      await this.storeInLongTerm(completeMemory);

      this.logger({
        level: 'info',
        message: `Memory stored successfully: ${memoryId}`,
        timestamp: new Date(),
        source: 'MemorySystem',
        metadata: { memoryId, type: memory.type }
      });

      return { success: true, data: memoryId };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to store memory: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return { success: false, error: error.message };
    }
  }

  async retrieveMemories(query: MemoryQuery): Promise<AsyncResult<MemorySearchResult[]>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.query);

      // Search vector store
      const vectorResults = await this.searchVectorStore(queryEmbedding, query);

      // Check session cache for recent memories
      const cacheResults = await this.searchSessionCache(query);

      // Combine and rank results
      const combinedResults = this.combineAndRankResults(vectorResults, cacheResults, query);

      // Update access counts
      await this.updateAccessCounts(combinedResults.map(r => r.memory.id));

      this.logger({
        level: 'info',
        message: `Retrieved ${combinedResults.length} memories for query`,
        timestamp: new Date(),
        source: 'MemorySystem',
        metadata: { query: query.query, resultCount: combinedResults.length }
      });

      return { success: true, data: combinedResults };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to retrieve memories: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return { success: false, error: error.message };
    }
  }

  async updateMemory(memoryId: string, updates: Partial<Memory>): Promise<AsyncResult<void>> {
    try {
      const existing = await this.getMemoryById(memoryId);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Memory not found' };
      }

      const updatedMemory: Memory = {
        ...existing.data,
        ...updates,
        id: memoryId, // Preserve ID
        timestamp: new Date() // Update timestamp
      };

      // Update in all stores
      await this.storeInVectorDB(updatedMemory);
      await this.storeInSessionCache(updatedMemory);
      await this.storeInLongTerm(updatedMemory);

      this.logger({
        level: 'info',
        message: `Memory updated successfully: ${memoryId}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });

      return { success: true };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to update memory: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return { success: false, error: error.message };
    }
  }

  async deleteMemory(memoryId: string): Promise<AsyncResult<void>> {
    try {
      // Remove from vector store
      await this.vectorStore.getCollection({ name: 'memories' }).then(collection => 
        collection.delete({ ids: [memoryId] })
      );

      // Remove from session cache
      if (this.sessionCache) {
        await this.sessionCache.del(`memory:${memoryId}`);
      }

      // Remove from long-term storage
      await this.deleteFromLongTerm(memoryId);

      this.logger({
        level: 'info',
        message: `Memory deleted successfully: ${memoryId}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });

      return { success: true };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to delete memory: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return { success: false, error: error.message };
    }
  }

  async getMemoryById(memoryId: string): Promise<AsyncResult<Memory>> {
    try {
      // Try session cache first
      if (this.sessionCache) {
        const cached = await this.sessionCache.get(`memory:${memoryId}`);
        if (cached) {
          const memory = JSON.parse(cached);
          memory.timestamp = new Date(memory.timestamp);
          return { success: true, data: memory };
        }
      }

      // Try vector store
      const collection = await this.vectorStore.getCollection({ name: 'memories' });
      const result = await collection.get({ ids: [memoryId] });
      
      if (result.ids.length > 0) {
        const memory = this.parseVectorResult(result, 0);
        return { success: true, data: memory };
      }

      // Try long-term storage
      const longTermMemory = await this.getFromLongTerm(memoryId);
      if (longTermMemory) {
        return { success: true, data: longTermMemory };
      }

      return { success: false, error: 'Memory not found' };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to get memory: ${error}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return { success: false, error: error.message };
    }
  }

  async getMemoryStats(): Promise<AsyncResult<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageImportance: number;
    oldestMemory: Date;
    newestMemory: Date;
  }>> {
    try {
      const collection = await this.vectorStore.getCollection({ name: 'memories' });
      const allMemories = await collection.get({});

      const stats = {
        totalMemories: allMemories.ids.length,
        memoryTypes: {} as Record<string, number>,
        averageImportance: 0,
        oldestMemory: new Date(),
        newestMemory: new Date(0)
      };

      let totalImportance = 0;
      for (let i = 0; i < allMemories.ids.length; i++) {
        const memory = this.parseVectorResult(allMemories, i);
        
        stats.memoryTypes[memory.type] = (stats.memoryTypes[memory.type] || 0) + 1;
        totalImportance += memory.importance;
        
        if (memory.timestamp < stats.oldestMemory) {
          stats.oldestMemory = memory.timestamp;
        }
        if (memory.timestamp > stats.newestMemory) {
          stats.newestMemory = memory.timestamp;
        }
      }

      stats.averageImportance = totalImportance / allMemories.ids.length;

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async storeInVectorDB(memory: Memory): Promise<void> {
    try {
      const collection = await this.vectorStore.getOrCreateCollection({
        name: 'memories',
        metadata: { description: 'Cognitive AI memory storage' }
      });

      await collection.upsert({
        ids: [memory.id],
        embeddings: [memory.embedding],
        documents: [memory.content],
        metadatas: [{
          type: memory.type,
          importance: memory.importance,
          timestamp: memory.timestamp.toISOString(),
          accessCount: memory.accessCount,
          metadata: JSON.stringify(memory.metadata)
        }]
      });
    } catch (error) {
      throw new Error(`Vector DB storage failed: ${error.message}`);
    }
  }

  private async storeInSessionCache(memory: Memory): Promise<void> {
    if (!this.sessionCache) return;

    try {
      const key = `memory:${memory.id}`;
      const value = JSON.stringify(memory);
      await this.sessionCache.setex(key, this.config.sessionCache.ttl, value);
    } catch (error) {
      throw new Error(`Session cache storage failed: ${error.message}`);
    }
  }

  private async storeInLongTerm(memory: Memory): Promise<void> {
    try {
      const filePath = path.join(this.config.longTermStorage.path, `${memory.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
    } catch (error) {
      throw new Error(`Long-term storage failed: ${error.message}`);
    }
  }

  private async searchVectorStore(queryEmbedding: number[], query: MemoryQuery): Promise<MemorySearchResult[]> {
    try {
      const collection = await this.vectorStore.getCollection({ name: 'memories' });
      
      const where: any = {};
      if (query.type) {
        where.type = query.type;
      }
      if (query.timeRange) {
        where.timestamp = {
          $gte: query.timeRange.start.toISOString(),
          $lte: query.timeRange.end.toISOString()
        };
      }

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: query.limit || 10,
        where: Object.keys(where).length > 0 ? where : undefined
      });

      return results.ids[0].map((id, index) => ({
        memory: this.parseVectorResult(results, index),
        similarity: 1 - (results.distances?.[0]?.[index] || 0),
        relevance: this.calculateRelevance(results, index, query)
      }));
    } catch (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  private async searchSessionCache(query: MemoryQuery): Promise<MemorySearchResult[]> {
    if (!this.sessionCache) return [];

    try {
      const keys = await this.sessionCache.keys('memory:*');
      const memories: MemorySearchResult[] = [];

      for (const key of keys) {
        const data = await this.sessionCache.get(key);
        if (data) {
          const memory: Memory = JSON.parse(data);
          memory.timestamp = new Date(memory.timestamp);

          if (this.matchesQuery(memory, query)) {
            const similarity = this.calculateTextSimilarity(memory.content, query.query);
            memories.push({
              memory,
              similarity,
              relevance: similarity * memory.importance
            });
          }
        }
      }

      return memories.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      this.logger({
        level: 'warn',
        message: `Session cache search failed: ${error.message}`,
        timestamp: new Date(),
        source: 'MemorySystem'
      });
      return [];
    }
  }

  private combineAndRankResults(
    vectorResults: MemorySearchResult[],
    cacheResults: MemorySearchResult[],
    query: MemoryQuery
  ): MemorySearchResult[] {
    const combined = new Map<string, MemorySearchResult>();

    // Add vector results
    vectorResults.forEach(result => {
      combined.set(result.memory.id, result);
    });

    // Add cache results (may override vector results with more recent data)
    cacheResults.forEach(result => {
      const existing = combined.get(result.memory.id);
      if (!existing || result.memory.timestamp > existing.memory.timestamp) {
        combined.set(result.memory.id, result);
      }
    });

    // Convert to array and sort by relevance
    const results = Array.from(combined.values())
      .sort((a, b) => b.relevance - a.relevance);

    // Apply threshold if specified
    if (query.threshold) {
      return results.filter(r => r.similarity >= query.threshold!);
    }

    // Apply limit
    return results.slice(0, query.limit || 10);
  }

  private async updateAccessCounts(memoryIds: string[]): Promise<void> {
    for (const id of memoryIds) {
      try {
        const memory = await this.getMemoryById(id);
        if (memory.success && memory.data) {
          memory.data.accessCount++;
          await this.updateMemory(id, { accessCount: memory.data.accessCount });
        }
      } catch (error) {
        this.logger({
          level: 'warn',
          message: `Failed to update access count for memory ${id}: ${error.message}`,
          timestamp: new Date(),
          source: 'MemorySystem'
        });
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // This would typically use a transformer model
    // For now, using a simple hash-based approach
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array(this.config.vectorStore.dimension).fill(0);
    
    for (let i = 0; i < Math.min(hash.length, embedding.length); i++) {
      embedding[i] = (hash[i] / 255) * 2 - 1; // Normalize to [-1, 1]
    }
    
    return embedding;
  }

  private generateMemoryId(content: string): string {
    const timestamp = Date.now().toString();
    const contentHash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    return `mem_${timestamp}_${contentHash}`;
  }

  private parseVectorResult(results: any, index: number): Memory {
    const metadata = results.metadatas?.[0]?.[index] || {};
    return {
      id: results.ids[0][index],
      type: metadata.type || 'semantic',
      content: results.documents[0][index],
      embedding: results.embeddings?.[0]?.[index] || [],
      metadata: metadata.metadata ? JSON.parse(metadata.metadata) : {},
      timestamp: new Date(metadata.timestamp || Date.now()),
      importance: metadata.importance || 0.5,
      accessCount: metadata.accessCount || 0
    };
  }

  private calculateRelevance(results: any, index: number, query: MemoryQuery): number {
    const similarity = 1 - (results.distances?.[0]?.[index] || 0);
    const metadata = results.metadatas?.[0]?.[index] || {};
    const importance = metadata.importance || 0.5;
    const accessCount = metadata.accessCount || 0;
    
    // Combine similarity, importance, and access frequency
    return similarity * 0.6 + importance * 0.3 + Math.min(accessCount / 10, 0.1);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private matchesQuery(memory: Memory, query: MemoryQuery): boolean {
    if (query.type && memory.type !== query.type) {
      return false;
    }
    
    if (query.timeRange) {
      if (memory.timestamp < query.timeRange.start || memory.timestamp > query.timeRange.end) {
        return false;
      }
    }
    
    return true;
  }

  private async getFromLongTerm(memoryId: string): Promise<Memory | null> {
    try {
      const filePath = path.join(this.config.longTermStorage.path, `${memoryId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const memory = JSON.parse(data);
      memory.timestamp = new Date(memory.timestamp);
      return memory;
    } catch {
      return null;
    }
  }

  private async deleteFromLongTerm(memoryId: string): Promise<void> {
    try {
      const filePath = path.join(this.config.longTermStorage.path, `${memoryId}.json`);
      await fs.unlink(filePath);
    } catch {
      // File may not exist, which is fine
    }
  }

  async clearMemories(): Promise<AsyncResult<void>> {
    try {
      // Clear vector store
      const collection = await this.vectorStore.getCollection({ name: 'memories' });
      await collection.delete({});

      // Clear session cache
      if (this.sessionCache) {
        const keys = await this.sessionCache.keys('memory:*');
        if (keys.length > 0) {
          await this.sessionCache.del(...keys);
        }
      }

      // Clear long-term storage
      const files = await fs.readdir(this.config.longTermStorage.path);
      const memoryFiles = files.filter(f => f.endsWith('.json') && f.startsWith('mem_'));
      for (const file of memoryFiles) {
        await fs.unlink(path.join(this.config.longTermStorage.path, file));
      }

      this.logger({
        level: 'info',
        message: 'All memories cleared successfully',
        timestamp: new Date(),
        source: 'MemorySystem'
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}