import { AppNode } from "@/nodes/types";
import { ServerInfo, getServers } from "./servers";

// Map of sidebar item names to node creation functions
export interface NodeTypeDefinition {
  createNode: (position: { x: number, y: number }) => AppNode;
}

// Cache for node type definitions to avoid repeated API calls
let nodeTypeDefinitionsCache: Record<string, NodeTypeDefinition> | null = null;

// Utility function to generate unique short ID suffix
const generateUniqueIdSuffix = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Extract the base server key from a unique node ID
 */
export const extractBaseServerKey = (uniqueId: string): string => {
  const parts = uniqueId.split('_');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 6 && /^[a-z0-9]+$/.test(lastPart)) {
      return parts.slice(0, -1).join('_');
    }
  }
  return uniqueId;
};

// Define base node creation functions (non-server nodes)
const baseNodeTypeDefinitions: Record<string, NodeTypeDefinition> = {
  "Input Server": {
    createNode: (position: { x: number, y: number }): AppNode => ({
      id: `input-server_${generateUniqueIdSuffix()}`,
      type: "input-server-node",
      position,
      data: {
        name: "Input Server",
        description: "Provide input data to the CAIAO pipeline. Connect to Servers to start processing.",
        status: "Idle",
      },
    }),
  },
  "Output Server": {
    createNode: (position: { x: number, y: number }): AppNode => ({
      id: `output-server_${generateUniqueIdSuffix()}`,
      type: "output-server-node",
      position,
      data: {
        name: "Output Server",
        description: "Collects and displays results from the CAIAO pipeline.",
        status: "Idle",
      },
    }),
  },
  "Merge Server": {
    createNode: (position: { x: number, y: number }): AppNode => ({
      id: `merge-server_${generateUniqueIdSuffix()}`,
      type: "merge-server-node",
      position,
      data: {
        name: "Merge Server",
        description: "Merges multiple upstream Servers into a new composite CAIAO Server.",
        status: "Idle",
      },
    }),
  },
  "Annotation": {
    createNode: (position: { x: number, y: number }): AppNode => ({
      id: `annotation_${generateUniqueIdSuffix()}`,
      type: "annotation-node",
      position,
      data: {
        name: "Note",
        text: "Double-click to edit...",
      },
    }),
  },
};

/**
 * Get all node type definitions, including servers fetched from the backend
 */
const getNodeTypeDefinitions = async (): Promise<Record<string, NodeTypeDefinition>> => {
  if (nodeTypeDefinitionsCache) {
    return nodeTypeDefinitionsCache;
  }

  const servers = await getServers();

  // Create server node definitions
  const serverNodeDefinitions = servers.reduce((acc: Record<string, NodeTypeDefinition>, server: ServerInfo) => {
    const displayName = server.display_name || server.name;
    acc[displayName] = {
      createNode: (position: { x: number, y: number }): AppNode => ({
        id: `${server.name}_${generateUniqueIdSuffix()}`,
        type: "server-node",
        position,
        data: {
          name: displayName,
          description: server.description || "",
          status: "Idle",
          serverName: server.name,
          tools: server.tools || [],
        },
      }),
    };
    return acc;
  }, {});

  // Combine base and server definitions
  nodeTypeDefinitionsCache = {
    ...baseNodeTypeDefinitions,
    ...serverNodeDefinitions,
  };

  return nodeTypeDefinitionsCache;
};

export async function getNodeTypeDefinition(componentName: string): Promise<NodeTypeDefinition | null> {
  const nodeTypeDefinitions = await getNodeTypeDefinitions();
  return nodeTypeDefinitions[componentName] || null;
}

// Get the node ID that would be generated for a component
export async function getNodeIdForComponent(componentName: string): Promise<string | null> {
  const nodeTypeDefinition = await getNodeTypeDefinition(componentName);
  if (!nodeTypeDefinition) {
    return null;
  }

  const tempNode = nodeTypeDefinition.createNode({ x: 0, y: 0 });
  return tempNode.id;
}

/**
 * Clear the node type definitions cache
 */
export const clearNodeTypeDefinitionsCache = () => {
  nodeTypeDefinitionsCache = null;
};
