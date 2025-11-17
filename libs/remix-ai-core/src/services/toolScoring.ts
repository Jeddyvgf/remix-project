import { IMCPTool, IUserIntent, IEnhancedMCPProviderParams } from '../types/mcp';

export interface IToolScore {
  tool: IMCPTool & { _mcpServer?: string };
  serverName: string;
  score: number;
  components: {
    keywordMatch: number;
    domainRelevance: number;
    typeRelevance: number;
    actionMatch: number;
  };
  reasoning: string;
}

/**
 * Service for scoring and ranking MCP tools based on user intent
 */
export class ToolScoring {
  private readonly defaultDomainWeights: Record<string, number> = {
    solidity: 1.0,
    javascript: 0.8,
    react: 0.7,
    web3: 0.9,
    testing: 0.6,
    deployment: 0.7,
    security: 1.0,
    defi: 0.8,
    nft: 0.7,
    compilation: 0.9,
    debugging: 0.9,
    file: 0.7,
    tutorial: 0.6
  };

  private readonly intentTypeToActions: Record<IUserIntent['type'], string[]> = {
    coding: ['compile', 'build', 'create', 'write', 'generate', 'scaffold'],
    documentation: ['read', 'list', 'get', 'fetch', 'show'],
    debugging: ['debug', 'trace', 'inspect', 'breakpoint', 'step', 'watch'],
    explanation: ['read', 'get', 'analyze', 'scan', 'explain'],
    generation: ['create', 'generate', 'scaffold', 'write', 'build'],
    completion: ['get', 'read', 'list', 'fetch', 'autocomplete']
  };

  private readonly actionPatterns: Record<string, string[]> = {
    file_operations: ['read', 'write', 'create', 'delete', 'move', 'copy', 'list', 'exists'],
    compilation: ['compile', 'build', 'verify', 'optimize'],
    deployment: ['deploy', 'send', 'call', 'execute', 'run'],
    debugging: ['debug', 'breakpoint', 'step', 'watch', 'trace', 'evaluate'],
    analysis: ['scan', 'analyze', 'check', 'inspect', 'validate'],
    configuration: ['set', 'get', 'config', 'update'],
    tutorial: ['tutorial', 'learn', 'guide', 'start']
  };

  /**
   * Score a collection of tools against user intent and prompt
   */
  async scoreTools(
    tools: Array<{ tool: IMCPTool & { _mcpServer?: string }; serverName: string }>,
    intent: IUserIntent,
    prompt: string,
    params: IEnhancedMCPProviderParams = {}
  ): Promise<IToolScore[]> {
    const domainWeights = { ...this.defaultDomainWeights, ...(params.domainWeights || {}) };
    const relevanceThreshold = params.toolRelevanceThreshold || 0.3;

    const scoredTools: IToolScore[] = [];

    for (const { tool, serverName } of tools) {
      const score = this.calculateToolScore(tool, intent, prompt, domainWeights);

      if (score.score >= relevanceThreshold) {
        scoredTools.push({
          tool,
          serverName,
          score: score.score,
          components: score.components,
          reasoning: score.reasoning
        });
      }
    }

    return scoredTools.sort((a, b) => b.score - a.score);
  }

  selectTools(
    scoredTools: IToolScore[],
    maxTools: number = 15,
    strategy: 'priority' | 'semantic' | 'hybrid' = 'hybrid'
  ): IToolScore[] {
    switch (strategy) {
    case 'priority':
      return this.selectByScore(scoredTools, maxTools);
    case 'semantic':
      return this.selectBySemantic(scoredTools, maxTools);
    case 'hybrid':
      return this.selectByHybrid(scoredTools, maxTools);
    default:
      return scoredTools.slice(0, maxTools);
    }
  }

  private calculateToolScore(
    tool: IMCPTool,
    intent: IUserIntent,
    prompt: string,
    domainWeights: Record<string, number>
  ): { score: number; components: IToolScore['components']; reasoning: string } {
    const components = {
      keywordMatch: this.calculateKeywordMatch(tool, intent.keywords, prompt),
      domainRelevance: this.calculateDomainRelevance(tool, intent.domains, domainWeights),
      typeRelevance: this.calculateTypeRelevance(tool, intent.type),
      actionMatch: this.calculateActionMatch(tool, intent.type, prompt)
    };

    const weights = {
      keywordMatch: 0.35,
      domainRelevance: 0.25,
      typeRelevance: 0.20,
      actionMatch: 0.20
    };

    const score = Object.entries(components).reduce((acc, [component, value]) => {
      return acc + (weights[component as keyof typeof weights] * value);
    }, 0);

    const reasoning = this.generateReasoningExplanation(components, tool, intent);

    return { score, components, reasoning };
  }

  private calculateKeywordMatch(tool: IMCPTool, keywords: string[], prompt: string): number {
    if (keywords.length === 0) return 0;

    const toolText = [
      tool.name,
      tool.description || '',
      JSON.stringify(tool.inputSchema)
    ].join(' ').toLowerCase();

    const promptLower = prompt.toLowerCase();

    let matchScore = 0;
    let matchCount = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Direct match in tool metadata
      if (toolText.includes(keywordLower)) {
        matchScore += 1.0;
        matchCount++;
      }
      // Partial match (e.g., "compile" matches "compilation")
      else if (toolText.includes(keywordLower.substring(0, Math.max(4, keywordLower.length - 2)))) {
        matchScore += 0.7;
        matchCount++;
      }
    }

    // Boost score if tool name appears in prompt
    if (promptLower.includes(tool.name.toLowerCase())) {
      matchScore += 1.0;
    }

    return keywords.length > 0 ? Math.min(matchScore / keywords.length, 1.0) : 0;
  }

  private calculateDomainRelevance(
    tool: IMCPTool,
    domains: string[],
    domainWeights: Record<string, number>
  ): number {
    if (domains.length === 0) return 0.5; // Neutral if no domains detected

    const toolText = [
      tool.name,
      tool.description || ''
    ].join(' ').toLowerCase();

    let totalRelevance = 0;
    let matchCount = 0;

    for (const domain of domains) {
      const weight = domainWeights[domain] || 0.5;
      if (toolText.includes(domain.toLowerCase())) {
        totalRelevance += weight;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalRelevance / matchCount : 0;
  }

  private calculateTypeRelevance(tool: IMCPTool, intentType: IUserIntent['type']): number {
    const expectedActions = this.intentTypeToActions[intentType] || [];
    if (expectedActions.length === 0) return 0.5;

    const toolName = tool.name.toLowerCase();
    const toolDesc = (tool.description || '').toLowerCase();

    let maxRelevance = 0;
    for (const action of expectedActions) {
      if (toolName.includes(action) || toolDesc.includes(action)) {
        maxRelevance = Math.max(maxRelevance, 1.0);
      }
    }

    return maxRelevance || 0.3; // Small base score if no direct match
  }

  private calculateActionMatch(tool: IMCPTool, intentType: IUserIntent['type'], prompt: string): number {
    const toolName = tool.name.toLowerCase();
    const promptLower = prompt.toLowerCase();

    let matchScore = 0;

    // Check if tool action category matches intent
    for (const [category, actions] of Object.entries(this.actionPatterns)) {
      for (const action of actions) {
        // Tool name contains action
        if (toolName.includes(action)) {
          // Prompt also mentions this action
          if (promptLower.includes(action)) {
            matchScore = Math.max(matchScore, 1.0);
          } else {
            matchScore = Math.max(matchScore, 0.6);
          }
        }
      }
    }

    // Intent-specific action matching
    const expectedActions = this.intentTypeToActions[intentType] || [];
    for (const action of expectedActions) {
      if (toolName.includes(action)) {
        matchScore = Math.max(matchScore, 0.8);
      }
    }

    return matchScore;
  }

  private selectByScore(tools: IToolScore[], maxTools: number): IToolScore[] {
    return [...tools]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTools);
  }

  private selectBySemantic(tools: IToolScore[], maxTools: number): IToolScore[] {
    const semanticScore = (t: IToolScore) =>
      (t.components.keywordMatch + t.components.domainRelevance + t.components.actionMatch) / 3;

    return [...tools]
      .sort((a, b) => semanticScore(b) - semanticScore(a))
      .slice(0, maxTools);
  }

  private selectByHybrid(tools: IToolScore[], maxTools: number): IToolScore[] {
    // Ensure diversity by selecting from different servers and action categories
    const selected: IToolScore[] = [];
    const serverCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    for (const toolScore of tools) {
      if (selected.length >= maxTools) break;

      const serverCount = serverCounts.get(toolScore.serverName) || 0;
      const category = this.inferToolCategory(toolScore.tool);
      const categoryCount = categoryCounts.get(category) || 0;

      // Prefer diversity but still consider score
      const diversityPenalty = Math.min(serverCount * 0.05, 0.2) + Math.min(categoryCount * 0.1, 0.3);
      const adjustedScore = toolScore.score * (1 - diversityPenalty);

      if (adjustedScore > 0.15) { // Minimum threshold
        selected.push(toolScore);
        serverCounts.set(toolScore.serverName, serverCount + 1);
        categoryCounts.set(category, categoryCount + 1);
      }
    }

    return selected;
  }

  private inferToolCategory(tool: IMCPTool): string {
    const name = tool.name.toLowerCase();

    for (const [category, actions] of Object.entries(this.actionPatterns)) {
      for (const action of actions) {
        if (name.includes(action)) {
          return category;
        }
      }
    }

    return 'general';
  }

  private generateReasoningExplanation(
    components: IToolScore['components'],
    tool: IMCPTool,
    intent: IUserIntent
  ): string {
    const reasons = [];

    if (components.keywordMatch > 0.7) {
      reasons.push(`Strong keyword match (${Math.round(components.keywordMatch * 100)}%)`);
    }

    if (components.domainRelevance > 0.7) {
      reasons.push(`Highly relevant to ${intent.domains.join(', ')} domains`);
    }

    if (components.typeRelevance > 0.7) {
      reasons.push(`Well-suited for ${intent.type} tasks`);
    }

    if (components.actionMatch > 0.7) {
      reasons.push('Action matches user intent');
    }

    if (reasons.length === 0) {
      reasons.push('General utility tool');
    }

    return reasons.join('; ');
  }
}
