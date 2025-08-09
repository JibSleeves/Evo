#!/usr/bin/env node

import { CognitiveAISystem } from './index';

async function main() {
  console.log('🧠 Cognitive AI System Demo');
  console.log('============================\n');

  const system = new CognitiveAISystem();

  try {
    // Initialize the system
    console.log('Initializing system...');
    await system.initialize();
    console.log('✅ System initialized successfully!\n');

    // Test basic reasoning
    console.log('🔍 Testing basic reasoning...');
    const response1 = await system.processInput(
      "What is the relationship between artificial intelligence and cognitive science?",
      {
        context: ['AI research', 'cognitive psychology'],
        goals: ['provide comprehensive explanation']
      }
    );
    
    console.log('Response:', response1.response);
    console.log('Confidence:', response1.confidence);
    console.log('Reasoning:', response1.reasoning);
    console.log('Emotional State:', response1.metadata.emotionalState);
    console.log('');

    // Test memory and learning
    console.log('🧠 Testing memory and learning...');
    const response2 = await system.processInput(
      "Remember that I prefer detailed explanations with examples.",
      {
        context: ['user preference', 'learning'],
        goals: ['store user preference']
      }
    );
    
    console.log('Response:', response2.response);
    console.log('Memory Updates:', response2.metadata.memoryUpdates);
    console.log('');

    // Test follow-up with memory
    console.log('🔗 Testing follow-up with memory recall...');
    const response3 = await system.processInput(
      "Explain machine learning algorithms.",
      {
        context: ['machine learning', 'algorithms'],
        goals: ['explain with examples based on user preference']
      }
    );
    
    console.log('Response:', response3.response);
    console.log('Self-Reflection:', response3.metadata.selfReflection);
    console.log('');

    // Test creative reasoning
    console.log('🎨 Testing creative reasoning...');
    const response4 = await system.processInput(
      "Create a metaphor to explain how neural networks learn.",
      {
        context: ['neural networks', 'learning', 'creativity'],
        goals: ['create engaging metaphor']
      }
    );
    
    console.log('Response:', response4.response);
    console.log('Attention Changes:', response4.metadata.attentionChanges);
    console.log('');

    // Show system status
    console.log('📊 System Status:');
    const status = await system.getSystemStatus();
    console.log('Initialized:', status.initialized);
    console.log('Memory Stats:', status.memoryStats);
    console.log('Performance:', {
      uptime: Math.round(status.performance.uptime),
      memoryUsage: Math.round(status.performance.memoryUsage.heapUsed / 1024 / 1024) + 'MB'
    });
    console.log('');

    // Show processing history
    console.log('📝 Processing History:');
    const history = system.getProcessingHistory(3);
    history.forEach((entry, index) => {
      console.log(`${index + 1}. Confidence: ${entry.confidence.toFixed(2)}, Response: ${entry.response.substring(0, 100)}...`);
    });
    console.log('');

    // Show logs
    console.log('📋 Recent Logs:');
    const logs = system.getLogs('info', undefined, 5);
    logs.forEach(log => {
      console.log(`[${log.level.toUpperCase()}] ${log.source}: ${log.message}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    // Cleanup
    console.log('🧹 Shutting down system...');
    await system.shutdown();
    console.log('✅ Demo completed successfully!');
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main as runDemo };