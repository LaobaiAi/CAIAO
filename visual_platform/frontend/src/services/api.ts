import { OutputNodeData, useNodeContext } from '@/contexts/node-context';
import { ServerInfo } from '@/data/servers';
import { flowConnectionManager } from '@/hooks/use-flow-connection';
import {
  GraphRunRequest,
  ServerMergeRequest,
  ServerMergeResult
} from '@/services/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8766';

export const api = {
  /**
   * Gets the list of available CAIAO Servers from the backend
   */
  getServers: async (): Promise<ServerInfo[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/servers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Backend returns flat array or {servers: [...]} wrapper — handle both
      return Array.isArray(data) ? data : (data.servers || []);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
      throw error;
    }
  },

  /**
   * Gets the metadata for a specific CAIAO Server
   */
  getServerMetadata: async (serverName: string): Promise<ServerInfo> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/servers/${serverName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to fetch server metadata for ${serverName}:`, error);
      throw error;
    }
  },

  /**
   * Saves JSON data to a file
   */
  saveJsonFile: async (filename: string, data: any): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/storage/save-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error('Failed to save JSON file:', error);
      throw error;
    }
  },

  /**
   * Runs a CAIAO graph pipeline with the given nodes/edges and streams results via SSE
   */
  runGraph: (
    params: GraphRunRequest,
    nodeContext: ReturnType<typeof useNodeContext>,
    flowId: string | null = null
  ): (() => void) => {
    const getServerIds = () => params.graph_nodes.map(node => node.id);

    const controller = new AbortController();
    const { signal } = controller;

    fetch(`${API_BASE_URL}/api/graph/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const events = buffer.split('\n\n');
              buffer = events.pop() || '';

              for (const eventText of events) {
                if (!eventText.trim()) continue;

                try {
                  const eventTypeMatch = eventText.match(/^event: (.+)$/m);
                  const dataMatch = eventText.match(/^data: (.+)$/m);

                  if (eventTypeMatch && dataMatch) {
                    const eventType = eventTypeMatch[1];
                    const eventData = JSON.parse(dataMatch[1]);

                    switch (eventType) {
                      case 'start':
                        nodeContext.resetAllNodes(flowId);
                        break;
                      case 'node_start':
                        if (eventData.node_id) {
                          nodeContext.updateServerNode(flowId, eventData.node_id, {
                            status: 'IN_PROGRESS',
                            message: 'Running...',
                          });
                        }
                        break;
                      case 'node_complete':
                        if (eventData.node_id) {
                          nodeContext.updateServerNode(flowId, eventData.node_id, {
                            status: 'COMPLETE',
                            message: eventData.duration_ms ? `${eventData.duration_ms}ms` : 'Done',
                            result: eventData.result,
                            duration_ms: eventData.duration_ms,
                          });
                        }
                        break;
                      case 'node_error':
                        if (eventData.node_id) {
                          nodeContext.updateServerNode(flowId, eventData.node_id, {
                            status: 'ERROR',
                            message: eventData.error || 'Error',
                          });
                        }
                        break;
                      case 'complete':
                        if (eventData.data) {
                          nodeContext.setOutputNodeData(flowId, eventData.data as OutputNodeData);
                        }
                        nodeContext.updateServerNodes(flowId, getServerIds(), 'COMPLETE');

                        if (flowId) {
                          flowConnectionManager.setConnection(flowId, {
                            state: 'completed',
                            abortController: null,
                          });

                          setTimeout(() => {
                            const currentConnection = flowConnectionManager.getConnection(flowId);
                            if (currentConnection.state === 'completed') {
                              flowConnectionManager.setConnection(flowId, {
                                state: 'idle',
                              });
                            }
                          }, 30000);
                        }
                        break;
                      case 'error':
                        nodeContext.updateServerNodes(flowId, getServerIds(), 'ERROR');

                        if (flowId) {
                          flowConnectionManager.setConnection(flowId, {
                            state: 'error',
                            error: eventData.message || 'Unknown error occurred',
                            abortController: null,
                          });
                        }
                        break;
                      default:
                        console.warn('Unknown event type:', eventType);
                    }
                  }
                } catch (err) {
                  console.error('Error parsing SSE event:', err, 'Raw event:', eventText);
                }
              }
            }

            if (flowId) {
              const currentConnection = flowConnectionManager.getConnection(flowId);
              if (currentConnection.state === 'connected') {
                flowConnectionManager.setConnection(flowId, {
                  state: 'completed',
                  abortController: null,
                });
              }
            }
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Error reading SSE stream:', error);
              nodeContext.updateServerNodes(flowId, getServerIds(), 'ERROR');

              if (flowId) {
                flowConnectionManager.setConnection(flowId, {
                  state: 'error',
                  error: error.message || 'Connection error',
                  abortController: null,
                });
              }
            }
          }
        };

        processStream();
      })
      .catch((error: any) => {
        if (error.name !== 'AbortError') {
          console.error('SSE connection error:', error);
          nodeContext.updateServerNodes(flowId, getServerIds(), 'ERROR');

          if (flowId) {
            flowConnectionManager.setConnection(flowId, {
              state: 'error',
              error: error.message || 'Connection failed',
              abortController: null,
            });
          }
        }
      });

    return () => {
      controller.abort();
      if (flowId) {
        flowConnectionManager.setConnection(flowId, {
          state: 'idle',
          abortController: null,
        });
      }
    };
  },

  /**
   * Validates a graph structure without executing it
   */
  validateGraph: async (params: GraphRunRequest): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/graph/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to validate graph:', error);
      throw error;
    }
  },

  /**
   * Merges selected servers into a new CAIAO Server
   */
  mergeServers: async (params: ServerMergeRequest): Promise<ServerMergeResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/graph/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to merge servers:', error);
      throw error;
    }
  },
};
