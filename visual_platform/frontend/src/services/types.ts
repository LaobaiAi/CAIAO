// CAIAO Server & Graph types

export interface ServerInfo {
  name: string;
  description: string;
  version: string;
  tools: ToolInfo[];
}

export interface ToolInfo {
  name: string;
  description: string;
  input_schema?: Record<string, any>;
}

export interface GraphNode {
  id: string;
  type?: string;
  data?: any;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: any;
}

export interface GraphRunRequest {
  graph_nodes: GraphNode[];
  graph_edges: GraphEdge[];
  input_data?: Record<string, any>;
}

export interface GraphRunResult {
  success: boolean;
  results: Record<string, any>;
  execution_time: number;
  error?: string;
}

export interface ServerMergeRequest {
  name: string;
  description?: string;
  graph_nodes: GraphNode[];
  graph_edges: GraphEdge[];
}

export interface ServerMergeResult {
  success: boolean;
  server_name: string;
  code: string;
  tools: ToolInfo[];
}
