# Cognitive AI System

A comprehensive self-modifying AI system with cognitive architecture, memory management, multi-model integration, and advanced ML capabilities.

## 🧠 Core Features Implemented

### ✅ Cognitive Architecture & Memory
- **Modular Memory System**: Vector stores, session caches, and long-term storage
- **Reasoning Engine**: RNN/Transformer-based feedback loops with contextual reasoning
- **RAG Engine**: PDF/file/image processing for context-aware interactions
- **Self-Reflection**: Performance assessment and bias detection

### ✅ Self-Modification Engine  
- **Introspection Analyzer**: Code analysis and mutation planning with safety checks
- **Live Code Rewriting**: Safe system modifications with rollback support
- **Version Control**: Git-style diff, branching, and restore capabilities
- **Permission Gates**: Validation and sandboxing for system changes

### ✅ Ollama Integration
- **Multi-Model AI Stack**: GGUF/GPTQ/LoRA model support
- **CUDA Acceleration**: GPU optimization with fallback mechanisms  
- **Load Balancing**: Intelligent model selection and resource management
- **Model Manager**: Dynamic loading/unloading and performance monitoring

### 🔧 Advanced ML Features (Planned)
- Reinforcement Learning with Human Feedback (RLHF)
- Neural Architecture Search (NAS)
- Vision processing and image generation
- Adversarial training and pattern recognition

### 🎨 GUI Interface (Planned)
- Retro-90s inspired modern interface
- Drag-and-drop file upload and model management
- Real-time monitoring and logs
- Speech-to-text integration

### 🔒 Security & Ethics
- Sandboxed execution environment
- Ethical decision-making layer
- Comprehensive audit logging
- User approval gates for critical actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Ollama installed and running
- Redis (optional, for session caching)
- ChromaDB (optional, for vector storage)

### Installation

```bash
# Clone and install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the demo
npm run demo
```

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_ENDPOINT=http://localhost:11434
CUDA_AVAILABLE=false

# Memory Storage
CHROMA_ENDPOINT=http://localhost:8000
STORAGE_PATH=./data/memories

# Security
ENCRYPTION_KEY=your-secure-key-here
```

## 💡 Usage Examples

### Basic Usage

```typescript
import { CognitiveAISystem } from './src';

const system = new CognitiveAISystem();

// Initialize the system
await system.initialize();

// Process user input
const response = await system.processInput(
  "Explain quantum computing in simple terms",
  {
    context: ['physics', 'computing'],
    goals: ['provide clear explanation']
  }
);

console.log(response.response);
console.log(`Confidence: ${response.confidence}`);
```

### Document Processing

```typescript
// Process a PDF document
const result = await system.processDocument({
  id: 'doc1',
  name: 'research.pdf',
  type: 'application/pdf',
  content: pdfBuffer,
  metadata: {},
  processed: false
});

// Query the document
const answer = await system.processInput(
  "What are the main findings in the research paper?",
  { context: ['document analysis'] }
);
```

### Memory and Learning

```typescript
// Store user preferences
await system.processInput(
  "I prefer detailed technical explanations with examples",
  { goals: ['remember user preference'] }
);

// System will remember and adapt future responses
const response = await system.processInput(
  "How do neural networks work?"
  // Will automatically provide detailed technical explanation
);
```

## 📊 System Monitoring

```typescript
// Get system status
const status = await system.getSystemStatus();
console.log(status.cognitiveState);
console.log(status.memoryStats);
console.log(status.performance);

// View processing history
const history = system.getProcessingHistory(10);

// Monitor logs
const logs = system.getLogs('info', 'CognitiveArchitecture', 20);
```

## 🏗️ Architecture

The system is built with a modular architecture:

```
src/
├── cognitive/           # Core cognitive components
│   ├── CognitiveArchitecture.ts
│   ├── MemorySystem.ts
│   ├── ReasoningEngine.ts
│   └── RAGEngine.ts
├── self-modification/   # Self-modification capabilities
│   └── IntrospectionAnalyzer.ts
├── ollama/             # AI model integration
│   └── ModelManager.ts
├── utils/              # Configuration and utilities
│   └── SystemConfig.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── index.ts            # Main system entry point
└── demo.ts             # Demonstration script
```

## 🔬 Testing

```bash
# Run the demo to test core functionality
npm run demo

# Run with debug logging
DEBUG=true npm run demo

# Test specific components
npm test
```

## 🤖 Supported AI Models

The system supports various Ollama models:

- **Reasoning**: llama2, mistral, neural-chat
- **Code**: codellama, deepseek-coder, wizard-coder  
- **Vision**: llava, bakllava
- **Multimodal**: llava-phi3, moondream

## 📈 Performance & Scalability

- **Memory Management**: Automatic cleanup and optimization
- **Resource Monitoring**: Real-time CPU, memory, and GPU tracking
- **Load Balancing**: Intelligent request distribution
- **Caching**: Multi-level caching for improved performance

## 🔒 Security Features

- **Sandboxed Execution**: All code modifications run in isolation
- **Ethics Engine**: Bias detection and safety evaluation
- **Audit Logging**: Complete audit trail of all operations
- **Encryption**: All sensitive data encrypted at rest

## 🛣️ Roadmap

- [ ] Advanced ML Features (RLHF, NAS, Vision)
- [ ] Web-based GUI Interface
- [ ] Plugin System for Extensions
- [ ] Distributed Multi-Node Support
- [ ] Advanced Security Features
- [ ] Performance Optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📚 Documentation

For detailed documentation, see the [docs/](docs/) directory:

- [API Reference](docs/api.md)
- [Configuration Guide](docs/configuration.md)  
- [Development Guide](docs/development.md)
- [Security Guide](docs/security.md)
