import fs from 'fs/promises';
import path from 'path';
import { 
  CodeMutation, 
  CodeChange, 
  SystemVersion, 
  PerformanceMetrics,
  LogEntry, 
  AsyncResult 
} from '../types';

interface CodeAnalysis {
  complexity: number;
  dependencies: string[];
  riskFactors: string[];
  testCoverage: number;
  performance: PerformanceMetrics;
  suggestions: string[];
}

interface MutationPlan {
  id: string;
  mutations: CodeMutation[];
  dependencies: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  rollbackPlan: string[];
  testingRequired: boolean;
  estimatedImpact: string;
}

export class IntrospectionAnalyzer {
  private logger: (entry: LogEntry) => void;
  private analysisCache: Map<string, CodeAnalysis> = new Map();
  private sourceRoot: string;
  private safetyChecks: SafetyCheck[] = [];

  constructor(sourceRoot: string, logger: (entry: LogEntry) => void) {
    this.sourceRoot = sourceRoot;
    this.logger = logger;
    this.initializeSafetyChecks();
  }

  async analyzeCodebase(): Promise<AsyncResult<CodeAnalysis>> {
    try {
      const startTime = Date.now();
      
      // Scan all source files
      const sourceFiles = await this.scanSourceFiles();
      
      // Analyze each file
      const fileAnalyses: CodeAnalysis[] = [];
      for (const file of sourceFiles) {
        const analysis = await this.analyzeFile(file);
        if (analysis.success) {
          fileAnalyses.push(analysis.data!);
          this.analysisCache.set(file, analysis.data!);
        }
      }
      
      // Aggregate analysis
      const overallAnalysis = this.aggregateAnalyses(fileAnalyses);
      
      const processingTime = Date.now() - startTime;
      this.logger({
        level: 'info',
        message: `Codebase analysis completed in ${processingTime}ms`,
        timestamp: new Date(),
        source: 'IntrospectionAnalyzer',
        metadata: {
          filesAnalyzed: sourceFiles.length,
          complexity: overallAnalysis.complexity,
          dependencies: overallAnalysis.dependencies.length
        }
      });
      
      return { success: true, data: overallAnalysis };
    } catch (error) {
      this.logger({
        level: 'error',
        message: `Codebase analysis failed: ${error.message}`,
        timestamp: new Date(),
        source: 'IntrospectionAnalyzer'
      });
      return { success: false, error: error.message };
    }
  }

  async identifyMutationOpportunities(
    performanceGoals: PerformanceMetrics,
    constraints: string[]
  ): Promise<AsyncResult<MutationPlan[]>> {
    try {
      const analysis = await this.analyzeCodebase();
      if (!analysis.success) {
        return { success: false, error: analysis.error };
      }
      
      const opportunities = await this.findOptimizationOpportunities(analysis.data!);
      const plans = await this.createMutationPlans(opportunities, performanceGoals, constraints);
      
      // Filter and rank plans by safety and impact
      const filteredPlans = plans.filter(plan => this.isValidMutationPlan(plan));
      const rankedPlans = this.rankMutationPlans(filteredPlans, performanceGoals);
      
      this.logger({
        level: 'info',
        message: `Identified ${rankedPlans.length} mutation opportunities`,
        timestamp: new Date(),
        source: 'IntrospectionAnalyzer',
        metadata: {
          opportunities: opportunities.length,
          validPlans: rankedPlans.length
        }
      });
      
      return { success: true, data: rankedPlans };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateMutation(mutation: CodeMutation): Promise<AsyncResult<{
    isValid: boolean;
    risks: string[];
    recommendations: string[];
    safetyScore: number;
  }>> {
    try {
      const validation = {
        isValid: true,
        risks: [] as string[],
        recommendations: [] as string[],
        safetyScore: 1.0
      };
      
      // Run safety checks
      for (const check of this.safetyChecks) {
        const result = await check.validate(mutation);
        
        if (!result.passed) {
          validation.isValid = false;
          validation.risks.push(result.risk);
        }
        
        validation.recommendations.push(...result.recommendations);
        validation.safetyScore *= result.safetyScore;
      }
      
      // Additional context-specific validations
      await this.validateDependencies(mutation, validation);
      await this.validateTestCoverage(mutation, validation);
      await this.validatePerformanceImpact(mutation, validation);
      
      this.logger({
        level: validation.isValid ? 'info' : 'warn',
        message: `Mutation validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`,
        timestamp: new Date(),
        source: 'IntrospectionAnalyzer',
        metadata: {
          mutationId: mutation.id,
          safetyScore: validation.safetyScore,
          risks: validation.risks.length
        }
      });
      
      return { success: true, data: validation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async planRollback(mutation: CodeMutation): Promise<AsyncResult<string[]>> {
    try {
      const rollbackSteps: string[] = [];
      
      // For each change, create reverse operation
      for (const change of mutation.changes) {
        switch (change.operation) {
          case 'add':
            rollbackSteps.push(`Remove added code at ${change.location}:${change.line}`);
            break;
          case 'modify':
            rollbackSteps.push(`Restore original code at ${change.location}:${change.line}`);
            break;
          case 'delete':
            rollbackSteps.push(`Restore deleted code at ${change.location}:${change.line}`);
            break;
        }
      }
      
      // Add backup verification steps
      rollbackSteps.push('Verify system functionality after rollback');
      rollbackSteps.push('Run regression tests');
      rollbackSteps.push('Check performance metrics');
      
      return { success: true, data: rollbackSteps };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async scanSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDirectory(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && this.isSourceFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDirectory(this.sourceRoot);
    return files;
  }

  private isSourceFile(filename: string): boolean {
    const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c'];
    return sourceExtensions.some(ext => filename.endsWith(ext));
  }

  private async analyzeFile(filePath: string): Promise<AsyncResult<CodeAnalysis>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const analysis: CodeAnalysis = {
        complexity: this.calculateComplexity(content),
        dependencies: this.extractDependencies(content),
        riskFactors: this.identifyRiskFactors(content),
        testCoverage: await this.calculateTestCoverage(filePath),
        performance: await this.analyzePerformance(content),
        suggestions: this.generateSuggestions(content)
      };
      
      return { success: true, data: analysis };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private calculateComplexity(content: string): number {
    let complexity = 0;
    
    // Count control structures
    const controlKeywords = ['if', 'else', 'for', 'while', 'switch', 'try', 'catch'];
    for (const keyword of controlKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex) || [];
      complexity += matches.length;
    }
    
    // Count function definitions
    const functionRegex = /function\s+\w+|=>\s*{|class\s+\w+/g;
    const functions = content.match(functionRegex) || [];
    complexity += functions.length * 2;
    
    // Normalize by lines of code
    const loc = content.split('\n').filter(line => line.trim().length > 0).length;
    return loc > 0 ? complexity / loc : 0;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: Set<string> = new Set();
    
    // Extract imports
    const importRegex = /import\s+.*?from\s+['"](.+?)['"];?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }
    
    // Extract requires
    const requireRegex = /require\(['"](.+?)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }
    
    return Array.from(dependencies);
  }

  private identifyRiskFactors(content: string): string[] {
    const risks: string[] = [];
    
    // Check for potential security issues
    if (content.includes('eval(')) {
      risks.push('Uses eval() - potential security risk');
    }
    
    if (content.includes('innerHTML')) {
      risks.push('Uses innerHTML - potential XSS risk');
    }
    
    // Check for performance issues
    if (content.includes('while(true)') || content.includes('while (true)')) {
      risks.push('Contains infinite loop');
    }
    
    // Check for deprecated patterns
    if (content.includes('var ')) {
      risks.push('Uses var instead of let/const');
    }
    
    return risks;
  }

  private async calculateTestCoverage(filePath: string): Promise<number> {
    // Simplified test coverage calculation
    const testFilePath = filePath.replace(/\.(ts|js)$/, '.test.$1');
    
    try {
      await fs.access(testFilePath);
      return 0.8; // Assume 80% coverage if test file exists
    } catch {
      return 0.0; // No test coverage if no test file
    }
  }

  private async analyzePerformance(content: string): Promise<PerformanceMetrics> {
    // Simplified performance analysis
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    return {
      responseTime: lines.length * 0.1, // Estimate based on LOC
      accuracy: 0.95, // Default assumption
      resourceUsage: {
        cpu: 0.1,
        memory: lines.length * 100, // Rough memory estimate
        disk: 0,
        network: 0
      },
      errorRate: 0.01
    };
  }

  private generateSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // Performance suggestions
    if (content.includes('console.log')) {
      suggestions.push('Remove console.log statements for production');
    }
    
    if (content.match(/for\s*\(\s*var\s+\w+\s*=\s*0/)) {
      suggestions.push('Consider using for...of or forEach for better readability');
    }
    
    // Security suggestions
    if (content.includes('http://')) {
      suggestions.push('Consider using HTTPS instead of HTTP');
    }
    
    return suggestions;
  }

  private aggregateAnalyses(analyses: CodeAnalysis[]): CodeAnalysis {
    if (analyses.length === 0) {
      return {
        complexity: 0,
        dependencies: [],
        riskFactors: [],
        testCoverage: 0,
        performance: {
          responseTime: 0,
          accuracy: 0,
          resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
          errorRate: 0
        },
        suggestions: []
      };
    }
    
    const totalComplexity = analyses.reduce((sum, a) => sum + a.complexity, 0);
    const allDependencies = new Set<string>();
    const allRisks = new Set<string>();
    const allSuggestions = new Set<string>();
    
    analyses.forEach(analysis => {
      analysis.dependencies.forEach(dep => allDependencies.add(dep));
      analysis.riskFactors.forEach(risk => allRisks.add(risk));
      analysis.suggestions.forEach(suggestion => allSuggestions.add(suggestion));
    });
    
    return {
      complexity: totalComplexity / analyses.length,
      dependencies: Array.from(allDependencies),
      riskFactors: Array.from(allRisks),
      testCoverage: analyses.reduce((sum, a) => sum + a.testCoverage, 0) / analyses.length,
      performance: this.aggregatePerformanceMetrics(analyses.map(a => a.performance)),
      suggestions: Array.from(allSuggestions)
    };
  }

  private aggregatePerformanceMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        responseTime: 0,
        accuracy: 0,
        resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
        errorRate: 0
      };
    }
    
    return {
      responseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      resourceUsage: {
        cpu: metrics.reduce((sum, m) => sum + m.resourceUsage.cpu, 0) / metrics.length,
        memory: metrics.reduce((sum, m) => sum + m.resourceUsage.memory, 0) / metrics.length,
        disk: metrics.reduce((sum, m) => sum + m.resourceUsage.disk, 0) / metrics.length,
        network: metrics.reduce((sum, m) => sum + m.resourceUsage.network, 0) / metrics.length
      },
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
    };
  }

  private async findOptimizationOpportunities(analysis: CodeAnalysis): Promise<string[]> {
    const opportunities: string[] = [];
    
    if (analysis.complexity > 0.3) {
      opportunities.push('Reduce code complexity through refactoring');
    }
    
    if (analysis.testCoverage < 0.8) {
      opportunities.push('Improve test coverage');
    }
    
    if (analysis.performance.responseTime > 100) {
      opportunities.push('Optimize performance bottlenecks');
    }
    
    if (analysis.riskFactors.length > 0) {
      opportunities.push('Address security and safety risks');
    }
    
    return opportunities;
  }

  private async createMutationPlans(
    opportunities: string[],
    goals: PerformanceMetrics,
    constraints: string[]
  ): Promise<MutationPlan[]> {
    const plans: MutationPlan[] = [];
    
    for (const opportunity of opportunities) {
      const plan: MutationPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        mutations: await this.createMutationsForOpportunity(opportunity),
        dependencies: [],
        riskAssessment: this.assessRisk(opportunity),
        rollbackPlan: [`Revert changes for: ${opportunity}`],
        testingRequired: true,
        estimatedImpact: this.estimateImpact(opportunity, goals)
      };
      
      plans.push(plan);
    }
    
    return plans;
  }

  private async createMutationsForOpportunity(opportunity: string): Promise<CodeMutation[]> {
    const mutations: CodeMutation[] = [];
    
    // Create placeholder mutations based on opportunity type
    const mutation: CodeMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'function',
      target: 'TBD', // Would be determined by specific analysis
      changes: [{
        operation: 'modify',
        location: 'TBD',
        oldCode: '// Original code',
        newCode: '// Optimized code',
        line: 1
      }],
      reason: opportunity,
      risk: 'low',
      status: 'proposed',
      timestamp: new Date(),
      author: 'system'
    };
    
    mutations.push(mutation);
    return mutations;
  }

  private assessRisk(opportunity: string): 'low' | 'medium' | 'high' {
    if (opportunity.includes('security') || opportunity.includes('safety')) {
      return 'high';
    }
    if (opportunity.includes('complexity') || opportunity.includes('performance')) {
      return 'medium';
    }
    return 'low';
  }

  private estimateImpact(opportunity: string, goals: PerformanceMetrics): string {
    if (opportunity.includes('performance')) {
      return `Expected to improve response time by ${Math.round(goals.responseTime * 0.1)}ms`;
    }
    if (opportunity.includes('complexity')) {
      return 'Should improve maintainability and reduce bugs';
    }
    if (opportunity.includes('test')) {
      return 'Will increase confidence in system reliability';
    }
    return 'General system improvement';
  }

  private isValidMutationPlan(plan: MutationPlan): boolean {
    // Basic validation rules
    if (plan.riskAssessment === 'high' && plan.mutations.length > 1) {
      return false; // Too risky for multiple changes
    }
    
    if (plan.mutations.some(m => m.target === 'TBD')) {
      return false; // Incomplete plan
    }
    
    return true;
  }

  private rankMutationPlans(plans: MutationPlan[], goals: PerformanceMetrics): MutationPlan[] {
    return plans.sort((a, b) => {
      // Prioritize low-risk, high-impact changes
      const scoreA = this.calculatePlanScore(a, goals);
      const scoreB = this.calculatePlanScore(b, goals);
      return scoreB - scoreA;
    });
  }

  private calculatePlanScore(plan: MutationPlan, goals: PerformanceMetrics): number {
    let score = 0;
    
    // Risk penalty
    switch (plan.riskAssessment) {
      case 'low': score += 10; break;
      case 'medium': score += 5; break;
      case 'high': score += 1; break;
    }
    
    // Impact bonus
    if (plan.estimatedImpact.includes('performance')) score += 8;
    if (plan.estimatedImpact.includes('security')) score += 6;
    if (plan.estimatedImpact.includes('maintainability')) score += 4;
    
    return score;
  }

  private initializeSafetyChecks(): void {
    this.safetyChecks = [
      new CriticalSystemCheck(),
      new DependencyBreakageCheck(),
      new SecurityImpactCheck(),
      new PerformanceRegressionCheck(),
      new TestCoverageCheck()
    ];
  }

  private async validateDependencies(mutation: CodeMutation, validation: any): Promise<void> {
    // Check if mutation affects critical dependencies
    if (mutation.target.includes('node_modules') || mutation.target.includes('package.json')) {
      validation.risks.push('Affects external dependencies');
      validation.safetyScore *= 0.7;
    }
  }

  private async validateTestCoverage(mutation: CodeMutation, validation: any): Promise<void> {
    // Ensure mutations have adequate test coverage
    if (!mutation.target.includes('.test.')) {
      validation.recommendations.push('Add tests for this mutation');
    }
  }

  private async validatePerformanceImpact(mutation: CodeMutation, validation: any): Promise<void> {
    // Check for potential performance regressions
    if (mutation.changes.some(c => c.newCode?.includes('while') || c.newCode?.includes('for'))) {
      validation.recommendations.push('Performance test this change');
    }
  }
}

// Safety check interfaces and implementations
interface SafetyCheckResult {
  passed: boolean;
  risk: string;
  recommendations: string[];
  safetyScore: number;
}

abstract class SafetyCheck {
  abstract validate(mutation: CodeMutation): Promise<SafetyCheckResult>;
}

class CriticalSystemCheck extends SafetyCheck {
  async validate(mutation: CodeMutation): Promise<SafetyCheckResult> {
    const criticalFiles = ['package.json', 'tsconfig.json', 'next.config.ts'];
    const isCritical = criticalFiles.some(file => mutation.target.includes(file));
    
    return {
      passed: !isCritical,
      risk: isCritical ? 'Modifying critical system file' : '',
      recommendations: isCritical ? ['Review change carefully', 'Test thoroughly'] : [],
      safetyScore: isCritical ? 0.3 : 1.0
    };
  }
}

class DependencyBreakageCheck extends SafetyCheck {
  async validate(mutation: CodeMutation): Promise<SafetyCheckResult> {
    const affectsDependencies = mutation.changes.some(change => 
      change.oldCode?.includes('import') || change.oldCode?.includes('require')
    );
    
    return {
      passed: !affectsDependencies,
      risk: affectsDependencies ? 'May break dependency imports' : '',
      recommendations: affectsDependencies ? ['Check all imports', 'Run dependency analysis'] : [],
      safetyScore: affectsDependencies ? 0.6 : 1.0
    };
  }
}

class SecurityImpactCheck extends SafetyCheck {
  async validate(mutation: CodeMutation): Promise<SafetyCheckResult> {
    const securityKeywords = ['auth', 'password', 'token', 'secret', 'key'];
    const affectsSecurity = mutation.changes.some(change =>
      securityKeywords.some(keyword => 
        change.oldCode?.toLowerCase().includes(keyword) ||
        change.newCode?.toLowerCase().includes(keyword)
      )
    );
    
    return {
      passed: !affectsSecurity,
      risk: affectsSecurity ? 'Affects security-sensitive code' : '',
      recommendations: affectsSecurity ? ['Security review required', 'Audit access controls'] : [],
      safetyScore: affectsSecurity ? 0.4 : 1.0
    };
  }
}

class PerformanceRegressionCheck extends SafetyCheck {
  async validate(mutation: CodeMutation): Promise<SafetyCheckResult> {
    const performanceRisks = ['while', 'for', 'recursive', 'setTimeout', 'setInterval'];
    const hasPerformanceRisk = mutation.changes.some(change =>
      performanceRisks.some(risk => change.newCode?.includes(risk))
    );
    
    return {
      passed: !hasPerformanceRisk,
      risk: hasPerformanceRisk ? 'Potential performance impact' : '',
      recommendations: hasPerformanceRisk ? ['Benchmark performance', 'Add performance tests'] : [],
      safetyScore: hasPerformanceRisk ? 0.8 : 1.0
    };
  }
}

class TestCoverageCheck extends SafetyCheck {
  async validate(mutation: CodeMutation): Promise<SafetyCheckResult> {
    const hasTests = mutation.target.includes('.test.') || 
                    mutation.changes.some(change => change.newCode?.includes('test'));
    
    return {
      passed: hasTests,
      risk: !hasTests ? 'No test coverage for changes' : '',
      recommendations: !hasTests ? ['Add unit tests', 'Add integration tests'] : [],
      safetyScore: hasTests ? 1.0 : 0.7
    };
  }
}