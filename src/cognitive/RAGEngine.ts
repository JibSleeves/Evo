import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { 
  FileUpload, 
  Memory, 
  MemorySearchResult, 
  LogEntry, 
  AsyncResult 
} from '../types';
import { MemorySystem } from './MemorySystem';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    type: 'text' | 'image' | 'table' | 'header';
    page?: number;
    confidence?: number;
  };
  embedding: number[];
}

interface RAGContext {
  query: string;
  documents: string[];
  maxChunks: number;
  similarityThreshold: number;
  includeImages: boolean;
}

interface RAGResponse {
  answer: string;
  sources: DocumentChunk[];
  confidence: number;
  reasoning: string;
}

export class RAGEngine {
  private memorySystem: MemorySystem;
  private logger: (entry: LogEntry) => void;
  private documentChunks: Map<string, DocumentChunk[]> = new Map();
  private chunkSize = 512; // tokens
  private chunkOverlap = 64; // tokens
  private supportedFileTypes = new Set(['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg']);

  constructor(memorySystem: MemorySystem, logger: (entry: LogEntry) => void) {
    this.memorySystem = memorySystem;
    this.logger = logger;
  }

  async processDocument(file: FileUpload): Promise<AsyncResult<string[]>> {
    try {
      const startTime = Date.now();
      const fileExtension = path.extname(file.name).toLowerCase();

      if (!this.supportedFileTypes.has(fileExtension)) {
        return { 
          success: false, 
          error: `Unsupported file type: ${fileExtension}` 
        };
      }

      let content: string;
      let documentType: 'text' | 'image';

      // Extract content based on file type
      switch (fileExtension) {
        case '.pdf':
          content = await this.extractPDFContent(file);
          documentType = 'text';
          break;
        case '.docx':
          content = await this.extractDocxContent(file);
          documentType = 'text';
          break;
        case '.txt':
          content = typeof file.content === 'string' ? file.content : file.content.toString();
          documentType = 'text';
          break;
        case '.png':
        case '.jpg':
        case '.jpeg':
          content = await this.extractImageContent(file);
          documentType = 'image';
          break;
        default:
          return { success: false, error: 'Unsupported file type' };
      }

      // Create document chunks
      const chunks = await this.createDocumentChunks(content, file.name, documentType);
      
      // Store chunks in memory system
      const chunkIds = await this.storeDocumentChunks(chunks);
      
      // Cache chunks for quick access
      this.documentChunks.set(file.id, chunks);

      const processingTime = Date.now() - startTime;
      this.logger({
        level: 'info',
        message: `Document processed successfully: ${file.name}`,
        timestamp: new Date(),
        source: 'RAGEngine',
        metadata: { 
          fileId: file.id,
          chunks: chunks.length,
          processingTime,
          type: documentType
        }
      });

      return { success: true, data: chunkIds };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Failed to process document: ${error.message}`,
        timestamp: new Date(),
        source: 'RAGEngine',
        metadata: { fileId: file.id, fileName: file.name }
      });
      return { success: false, error: error.message };
    }
  }

  async queryDocuments(context: RAGContext): Promise<AsyncResult<RAGResponse>> {
    try {
      const startTime = Date.now();

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(context.query);

      // Retrieve relevant chunks from memory system
      const memoryResults = await this.memorySystem.retrieveMemories({
        query: context.query,
        limit: context.maxChunks * 2,
        threshold: context.similarityThreshold
      });

      if (!memoryResults.success) {
        return { success: false, error: memoryResults.error };
      }

      // Filter for document chunks
      const documentMemories = memoryResults.data!.filter(result => 
        result.memory.metadata.source === 'document_chunk'
      );

      // Convert memories to document chunks
      const relevantChunks = await this.convertMemoriesToChunks(documentMemories);

      // Filter by specified documents if provided
      const filteredChunks = context.documents.length > 0 
        ? relevantChunks.filter(chunk => 
            context.documents.some(doc => chunk.metadata.source.includes(doc))
          )
        : relevantChunks;

      // Select top chunks
      const selectedChunks = filteredChunks.slice(0, context.maxChunks);

      // Generate contextual answer
      const response = await this.generateRAGResponse(context.query, selectedChunks);

      const processingTime = Date.now() - startTime;
      this.logger({
        level: 'info',
        message: `RAG query completed in ${processingTime}ms`,
        timestamp: new Date(),
        source: 'RAGEngine',
        metadata: { 
          query: context.query,
          chunksFound: relevantChunks.length,
          chunksUsed: selectedChunks.length,
          confidence: response.confidence
        }
      });

      return { success: true, data: response };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `RAG query failed: ${error.message}`,
        timestamp: new Date(),
        source: 'RAGEngine'
      });
      return { success: false, error: error.message };
    }
  }

  private async extractPDFContent(file: FileUpload): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  private async extractDocxContent(file: FileUpload): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  private async extractImageContent(file: FileUpload): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
      
      // Preprocess image for better OCR results
      const processedBuffer = await sharp(buffer)
        .greyscale()
        .normalize()
        .threshold(128)
        .toBuffer();

      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            this.logger({
              level: 'debug',
              message: `OCR progress: ${Math.round(m.progress * 100)}%`,
              timestamp: new Date(),
              source: 'RAGEngine'
            });
          }
        }
      });

      return text.trim();
    } catch (error) {
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  }

  private async createDocumentChunks(content: string, filename: string, type: 'text' | 'image'): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    if (type === 'image') {
      // For images, create a single chunk with all extracted text
      const chunk: DocumentChunk = {
        id: `chunk_${filename}_0`,
        content: content,
        metadata: {
          source: filename,
          chunkIndex: 0,
          totalChunks: 1,
          type: 'image'
        },
        embedding: await this.generateEmbedding(content)
      };
      chunks.push(chunk);
    } else {
      // For text documents, split into overlapping chunks
      const words = content.split(/\s+/);
      const wordsPerChunk = this.chunkSize;
      const overlap = this.chunkOverlap;
      
      let chunkIndex = 0;
      for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
        const chunkWords = words.slice(i, i + wordsPerChunk);
        const chunkContent = chunkWords.join(' ');
        
        if (chunkContent.trim().length > 50) { // Skip very short chunks
          const chunk: DocumentChunk = {
            id: `chunk_${filename}_${chunkIndex}`,
            content: chunkContent,
            metadata: {
              source: filename,
              chunkIndex,
              totalChunks: Math.ceil(words.length / (wordsPerChunk - overlap)),
              type: this.detectChunkType(chunkContent)
            },
            embedding: await this.generateEmbedding(chunkContent)
          };
          chunks.push(chunk);
          chunkIndex++;
        }
      }
    }

    return chunks;
  }

  private detectChunkType(content: string): 'text' | 'image' | 'table' | 'header' {
    const lines = content.split('\n');
    
    // Detect headers (short lines, all caps, or numbered)
    if (lines.length <= 2 && content.length < 100) {
      if (content.toUpperCase() === content || /^\d+\./.test(content.trim())) {
        return 'header';
      }
    }
    
    // Detect tables (multiple tabs or consistent spacing)
    const tabCount = (content.match(/\t/g) || []).length;
    if (tabCount > 5 || /\s{3,}/.test(content)) {
      return 'table';
    }
    
    return 'text';
  }

  private async storeDocumentChunks(chunks: DocumentChunk[]): Promise<string[]> {
    const chunkIds: string[] = [];
    
    for (const chunk of chunks) {
      const memory: Omit<Memory, 'id' | 'timestamp' | 'accessCount'> = {
        type: 'semantic',
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          source: 'document_chunk',
          context: [chunk.metadata.source],
          confidence: 0.9,
          chunkId: chunk.id,
          chunkMetadata: JSON.stringify(chunk.metadata)
        },
        importance: this.calculateChunkImportance(chunk)
      };
      
      const result = await this.memorySystem.storeMemory(memory);
      if (result.success) {
        chunkIds.push(result.data!);
      }
    }
    
    return chunkIds;
  }

  private calculateChunkImportance(chunk: DocumentChunk): number {
    let importance = 0.5; // Base importance
    
    // Headers are more important
    if (chunk.metadata.type === 'header') {
      importance += 0.3;
    }
    
    // Longer chunks with more content are more important
    const contentLength = chunk.content.length;
    importance += Math.min(contentLength / 1000, 0.2);
    
    // Chunks with specific keywords are more important
    const keywords = ['important', 'key', 'main', 'primary', 'essential', 'conclusion'];
    const keywordCount = keywords.filter(keyword => 
      chunk.content.toLowerCase().includes(keyword)
    ).length;
    importance += keywordCount * 0.1;
    
    return Math.min(importance, 1.0);
  }

  private async convertMemoriesToChunks(memories: MemorySearchResult[]): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    for (const memoryResult of memories) {
      try {
        const chunkMetadata = JSON.parse(memoryResult.memory.metadata.chunkMetadata || '{}');
        const chunk: DocumentChunk = {
          id: memoryResult.memory.metadata.chunkId || memoryResult.memory.id,
          content: memoryResult.memory.content,
          metadata: chunkMetadata,
          embedding: memoryResult.memory.embedding
        };
        chunks.push(chunk);
      } catch (error) {
        this.logger({
          level: 'warn',
          message: `Failed to convert memory to chunk: ${error.message}`,
          timestamp: new Date(),
          source: 'RAGEngine'
        });
      }
    }
    
    return chunks;
  }

  private async generateRAGResponse(query: string, chunks: DocumentChunk[]): Promise<RAGResponse> {
    if (chunks.length === 0) {
      return {
        answer: "I don't have enough relevant information to answer your question.",
        sources: [],
        confidence: 0.1,
        reasoning: "No relevant document chunks found for the query."
      };
    }

    // Combine chunk contents
    const context = chunks.map((chunk, index) => 
      `[Source ${index + 1}: ${chunk.metadata.source}]\n${chunk.content}`
    ).join('\n\n');

    // Generate response based on context (simplified - in practice would use LLM)
    const answer = await this.generateContextualAnswer(query, context, chunks);
    
    // Calculate confidence based on chunk relevance and content overlap
    const confidence = this.calculateResponseConfidence(query, chunks);
    
    // Generate reasoning explanation
    const reasoning = this.generateReasoning(query, chunks, confidence);

    return {
      answer,
      sources: chunks,
      confidence,
      reasoning
    };
  }

  private async generateContextualAnswer(query: string, context: string, chunks: DocumentChunk[]): Promise<string> {
    // Simplified answer generation - in production would use LLM
    const queryWords = query.toLowerCase().split(/\s+/);
    const contextWords = context.toLowerCase().split(/\s+/);
    
    // Find sentences that contain query terms
    const sentences = context.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      queryWords.some(word => sentence.toLowerCase().includes(word))
    );
    
    if (relevantSentences.length > 0) {
      // Take the most relevant sentences and combine them
      const answer = relevantSentences.slice(0, 3).join('. ').trim();
      return answer.endsWith('.') ? answer : answer + '.';
    }
    
    // Fallback: create summary from chunk types
    const hasHeaders = chunks.some(c => c.metadata.type === 'header');
    const hasTables = chunks.some(c => c.metadata.type === 'table');
    const hasImages = chunks.some(c => c.metadata.type === 'image');
    
    let answer = "Based on the available documents, ";
    
    if (hasHeaders) answer += "I found relevant section headers that ";
    if (hasTables) answer += "along with tabular data that ";
    if (hasImages) answer += "and image content that ";
    
    answer += "relate to your query. Please refer to the source documents for detailed information.";
    
    return answer;
  }

  private calculateResponseConfidence(query: string, chunks: DocumentChunk[]): number {
    if (chunks.length === 0) return 0.1;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    let totalRelevance = 0;
    
    for (const chunk of chunks) {
      const chunkWords = chunk.content.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter(word => chunkWords.includes(word)).length;
      const relevance = overlap / queryWords.length;
      totalRelevance += relevance;
    }
    
    const avgRelevance = totalRelevance / chunks.length;
    const chunkBonus = Math.min(chunks.length / 5, 0.2); // More chunks = higher confidence
    
    return Math.min(0.9, avgRelevance + chunkBonus);
  }

  private generateReasoning(query: string, chunks: DocumentChunk[], confidence: number): string {
    const sources = [...new Set(chunks.map(c => c.metadata.source))];
    const chunkTypes = [...new Set(chunks.map(c => c.metadata.type))];
    
    let reasoning = `Found ${chunks.length} relevant chunks from ${sources.length} source(s): ${sources.join(', ')}. `;
    
    if (chunkTypes.length > 1) {
      reasoning += `Content includes ${chunkTypes.join(', ')} sections. `;
    }
    
    if (confidence > 0.7) {
      reasoning += "High confidence due to strong content overlap with query.";
    } else if (confidence > 0.4) {
      reasoning += "Moderate confidence with partial content relevance.";
    } else {
      reasoning += "Low confidence - limited relevant content found.";
    }
    
    return reasoning;
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

  async getDocumentInfo(fileId: string): Promise<AsyncResult<{
    chunks: number;
    types: string[];
    sources: string[];
    totalContent: number;
  }>> {
    try {
      const chunks = this.documentChunks.get(fileId);
      if (!chunks) {
        return { success: false, error: 'Document not found' };
      }

      const info = {
        chunks: chunks.length,
        types: [...new Set(chunks.map(c => c.metadata.type))],
        sources: [...new Set(chunks.map(c => c.metadata.source))],
        totalContent: chunks.reduce((sum, c) => sum + c.content.length, 0)
      };

      return { success: true, data: info };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteDocument(fileId: string): Promise<AsyncResult<void>> {
    try {
      const chunks = this.documentChunks.get(fileId);
      if (chunks) {
        // Remove chunks from memory system
        for (const chunk of chunks) {
          await this.memorySystem.deleteMemory(chunk.id);
        }
        
        // Remove from cache
        this.documentChunks.delete(fileId);
      }

      this.logger({
        level: 'info',
        message: `Document deleted: ${fileId}`,
        timestamp: new Date(),
        source: 'RAGEngine'
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getProcessedDocuments(): string[] {
    return Array.from(this.documentChunks.keys());
  }

  getSupportedFileTypes(): string[] {
    return Array.from(this.supportedFileTypes);
  }
}