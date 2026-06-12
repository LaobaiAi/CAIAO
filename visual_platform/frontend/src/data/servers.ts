import { api } from '@/services/api';
import { ToolInfo } from '@/services/types';

export interface ServerInfo {
  name: string;
  display_name: string;
  description: string;
  version: string;
  tools: ToolInfo[];
  category?: string;
  order?: number;
}

// In-memory cache for servers to avoid repeated API calls
let servers: ServerInfo[] | null = null;

/**
 * Get the list of CAIAO Servers from the backend API
 * Uses caching to avoid repeated API calls
 */
export const getServers = async (): Promise<ServerInfo[]> => {
  if (servers && servers.length > 0) {
    return servers;
  }

  try {
    const result = await api.getServers();
    // Only cache if valid array result
    if (Array.isArray(result) && result.length > 0) {
      servers = result;
    }
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Failed to fetch servers:', error);
    throw error;
  }
};

/**
 * Clear the server cache - useful for forcing a refresh
 */
export const clearServerCache = () => {
  servers = null;
};
