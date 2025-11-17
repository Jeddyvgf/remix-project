/**
 * MCP (Model Context Protocol) types and interfaces for Remix AI integration
 */

export interface IMCPServer {
  name: string
  description?: string
  transport: 'stdio' | 'sse' | 'websocket' | 'http' | 'internal'
  command?: string[]
  args?: string[]
  url?: string
  env?: Record<string, string>
  autoStart?: boolean
  timeout?: number
  enabled?: boolean
  isBuiltIn?: boolean // Cannot be removed if true
}

export interface IMCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: {
    audience?: string[];
    priority?: number;
  };
}

export interface IMCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface IMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface IMCPToolCall {
  name: string;
  arguments?: Record<string, any>;
}

export interface IMCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface IMCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface IMCPServerCapabilities {
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, any>;
  experimental?: Record<string, any>;
}

export interface IMCPClientCapabilities {
  resources?: {
    subscribe?: boolean;
  };
  sampling?: Record<string, any>;
  roots?: {
    listChanged?: boolean;
  };
  experimental?: Record<string, any>;
}

export interface IMCPInitializeResult {
  protocolVersion: string;
  capabilities: IMCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

export interface IMCPConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverName: string;
  error?: string;
  lastAttempt?: number;
  capabilities?: IMCPServerCapabilities;
}

/**
 * MCP provider configuration for AI parameters
 */
export interface IMCPProviderParams {
  mcpServers?: string[];
  maxResources?: number;
  resourcePriorityThreshold?: number;
  enableTools?: boolean;
  toolTimeout?: number;
}

/**
 * Intent analysis results
 */
export interface IUserIntent {
  /** Primary intent type */
  type: 'coding' | 'documentation' | 'debugging' | 'explanation' | 'generation' | 'completion';
  /** Confidence score 0-1 */
  confidence: number;
  /** Extracted keywords */
  keywords: string[];
  /** Detected domains */
  domains: string[];
  /** Query complexity level */
  complexity: 'low' | 'medium' | 'high';
  /** Original query */
  originalQuery: string;
}

/**
 * Resource relevance score
 */
export interface IResourceScore {
  /** Resource reference */
  resource: IMCPResource;
  /** Server name */
  serverName: string;
  /** Overall relevance score 0-1 */
  score: number;
  /** Breakdown of score components */
  components: {
    keywordMatch: number;
    domainRelevance: number;
    typeRelevance: number;
    priority: number;
    freshness: number;
  };
  /** Explanation of why this resource was selected */
  reasoning: string;
}

/**
 * Enhanced resource selection result
 */
export interface IResourceSelectionResult {
  selectedResources: IResourceScore[];
  totalResourcesConsidered: number;
  strategy: 'priority' | 'semantic' | 'hybrid';
  intent: IUserIntent;
}

export interface IEnhancedMCPProviderParams extends IMCPProviderParams {
  enableIntentMatching?: boolean;
  relevanceThreshold?: number;
  selectionStrategy?: 'priority' | 'semantic' | 'hybrid';
  domainWeights?: Record<string, number>;
  enableQueryExpansion?: boolean;
  maxExpansionTerms?: number;
  enableToolScoring?: boolean;
  toolRelevanceThreshold?: number;
  maxTools?: number;
}

/**
 * Extended IParams interface with MCP support
 */
export interface IMCPAwareParams {
  /** MCP-specific parameters */
  mcp?: IEnhancedMCPProviderParams;
}
