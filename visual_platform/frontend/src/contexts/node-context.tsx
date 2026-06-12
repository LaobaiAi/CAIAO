import { LanguageModel } from '@/data/models';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

export type NodeStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR';

// Message history item
export interface MessageItem {
  timestamp: string;
  message: string;
  data?: any;
}

// Server node state structure
export interface ServerNodeData {
  status: NodeStatus;
  message: string;
  lastUpdated: number;
  messages: MessageItem[];
  timestamp?: string;
  result?: any;
  duration_ms?: number;
  breakpoint?: boolean;
}

// Data structure for the output node data (from complete event)
export interface OutputNodeData {
  results: Record<string, any>;
  execution_time?: number;
  success: boolean;
}

// Default server node state
const DEFAULT_SERVER_NODE_STATE: ServerNodeData = {
  status: 'IDLE',
  message: '',
  messages: [],
  lastUpdated: Date.now(),
};

// Helper function to create flow-aware composite keys
function createCompositeKey(flowId: string | null, nodeId: string): string {
  return flowId ? `${flowId}:${nodeId}` : nodeId;
}

interface NodeContextType {
  serverNodeData: Record<string, ServerNodeData>;
  outputNodeData: OutputNodeData | null;
  serverModels: Record<string, LanguageModel | null>;
  updateServerNode: (flowId: string | null, nodeId: string, data: Partial<ServerNodeData> | NodeStatus) => void;
  updateServerNodes: (flowId: string | null, nodeIds: string[], status: NodeStatus) => void;
  setOutputNodeData: (flowId: string | null, data: OutputNodeData) => void;
  setServerModel: (flowId: string | null, nodeId: string, model: LanguageModel | null) => void;
  getServerModel: (flowId: string | null, nodeId: string) => LanguageModel | null;
  getAllServerModels: (flowId: string | null) => Record<string, LanguageModel | null>;
  resetAllNodes: (flowId: string | null) => void;
  resetNodeStatuses: (flowId: string | null) => void;
  exportNodeContextData: (flowId: string | null) => {
    serverNodeData: Record<string, ServerNodeData>;
    outputNodeData: OutputNodeData | null;
  };
  importNodeContextData: (flowId: string | null, data: {
    serverNodeData?: Record<string, ServerNodeData>;
    outputNodeData?: OutputNodeData | null;
  }) => void;
  getServerNodeDataForFlow: (flowId: string | null) => Record<string, ServerNodeData>;
  getOutputNodeDataForFlow: (flowId: string | null) => OutputNodeData | null;
}

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export function NodeProvider({ children }: { children: ReactNode }) {
  const [serverNodeData, setServerNodeData] = useState<Record<string, ServerNodeData>>({});
  const [outputNodeData, setOutputNodeData] = useState<Record<string, OutputNodeData>>({});
  const [serverModels, setServerModels] = useState<Record<string, LanguageModel | null>>({});

  const updateServerNode = useCallback((flowId: string | null, nodeId: string, data: Partial<ServerNodeData> | NodeStatus) => {
    const compositeKey = createCompositeKey(flowId, nodeId);

    if (typeof data === 'string') {
      setServerNodeData(prev => {
        const existingNode = prev[compositeKey] || { ...DEFAULT_SERVER_NODE_STATE };
        return {
          ...prev,
          [compositeKey]: {
            ...existingNode,
            status: data,
            lastUpdated: Date.now()
          }
        };
      });
      return;
    }

    setServerNodeData(prev => {
      const existingNode = prev[compositeKey] || { ...DEFAULT_SERVER_NODE_STATE };

      const newMessages = [...existingNode.messages];

      if (data.message && data.timestamp) {
        const messageExists = newMessages.some(msg =>
          msg.timestamp === data.timestamp &&
          msg.message === data.message
        );

        if (!messageExists) {
          const messageItem: MessageItem = {
            timestamp: data.timestamp,
            message: data.message,
            data: data.result,
          };
          newMessages.push(messageItem);
        }
      }

      const updatedNode = {
        ...existingNode,
        ...data,
        messages: newMessages,
        lastUpdated: Date.now()
      };

      return {
        ...prev,
        [compositeKey]: updatedNode
      };
    });
  }, []);

  const updateServerNodes = useCallback((flowId: string | null, nodeIds: string[], status: NodeStatus) => {
    if (nodeIds.length === 0) return;

    setServerNodeData(prev => {
      const newStates = { ...prev };

      nodeIds.forEach(id => {
        const compositeKey = createCompositeKey(flowId, id);
        newStates[compositeKey] = {
          ...(newStates[compositeKey] || { ...DEFAULT_SERVER_NODE_STATE }),
          status,
          lastUpdated: Date.now()
        };
      });

      return newStates;
    });
  }, []);

  const setServerModel = useCallback((flowId: string | null, nodeId: string, model: LanguageModel | null) => {
    const compositeKey = createCompositeKey(flowId, nodeId);

    setServerModels(prev => {
      if (model === null) {
        const { [compositeKey]: removed, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [compositeKey]: model
        };
      }
    });
  }, []);

  const getServerModel = useCallback((flowId: string | null, nodeId: string): LanguageModel | null => {
    const compositeKey = createCompositeKey(flowId, nodeId);
    return serverModels[compositeKey] || null;
  }, [serverModels]);

  const getAllServerModels = useCallback((flowId: string | null): Record<string, LanguageModel | null> => {
    if (!flowId) {
      return Object.fromEntries(
        Object.entries(serverModels).filter(([key]) => !key.includes(':'))
      );
    }

    const flowPrefix = `${flowId}:`;
    const currentFlowModels: Record<string, LanguageModel | null> = {};

    Object.entries(serverModels).forEach(([compositeKey, model]) => {
      if (compositeKey.startsWith(flowPrefix)) {
        const nodeId = compositeKey.substring(flowPrefix.length);
        currentFlowModels[nodeId] = model;
      }
    });

    return currentFlowModels;
  }, [serverModels]);

  const setOutputNodeDataForFlow = useCallback((flowId: string | null, data: OutputNodeData) => {
    if (!flowId) {
      setOutputNodeData(prev => ({ ...prev, 'default': data }));
    } else {
      setOutputNodeData(prev => ({ ...prev, [flowId]: data }));
    }
  }, []);

  const resetAllNodes = useCallback((flowId: string | null) => {
    if (!flowId) {
      setServerNodeData({});
      setOutputNodeData({});
    } else {
      const flowPrefix = `${flowId}:`;
      setServerNodeData(prev => {
        const newData: Record<string, ServerNodeData> = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (!key.startsWith(flowPrefix)) {
            newData[key] = value;
          }
        });
        return newData;
      });

      setOutputNodeData(prev => {
        const { [flowId]: removed, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const resetNodeStatuses = useCallback((flowId: string | null) => {
    if (!flowId) {
      setServerNodeData(prev => {
        const newData: Record<string, ServerNodeData> = {};
        Object.entries(prev).forEach(([key, value]) => {
          newData[key] = {
            ...value,
            status: 'IDLE',
            lastUpdated: Date.now(),
          };
        });
        return newData;
      });
    } else {
      const flowPrefix = `${flowId}:`;
      setServerNodeData(prev => {
        const newData: Record<string, ServerNodeData> = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (key.startsWith(flowPrefix)) {
            newData[key] = {
              ...value,
              status: 'IDLE',
              lastUpdated: Date.now(),
            };
          } else {
            newData[key] = value;
          }
        });
        return newData;
      });
    }
  }, []);

  const exportNodeContextData = useCallback((flowId: string | null) => {
    const currentFlowServerData: Record<string, ServerNodeData> = {};
    const flowPrefix = flowId ? `${flowId}:` : '';

    Object.entries(serverNodeData).forEach(([compositeKey, data]) => {
      if (flowId) {
        if (compositeKey.startsWith(flowPrefix)) {
          const nodeId = compositeKey.substring(flowPrefix.length);
          currentFlowServerData[nodeId] = data;
        }
      } else {
        if (!compositeKey.includes(':')) {
          currentFlowServerData[compositeKey] = data;
        }
      }
    });

    const currentFlowOutputData = flowId
      ? outputNodeData[flowId] || null
      : outputNodeData['default'] || null;

    return {
      serverNodeData: currentFlowServerData,
      outputNodeData: currentFlowOutputData,
    };
  }, [serverNodeData, outputNodeData]);

  const importNodeContextData = useCallback((flowId: string | null, data: {
    serverNodeData?: Record<string, ServerNodeData>;
    outputNodeData?: OutputNodeData | null;
  }) => {
    if (data.serverNodeData) {
      Object.entries(data.serverNodeData).forEach(([nodeId, nodeData]) => {
        const compositeKey = createCompositeKey(flowId, nodeId);
        setServerNodeData(prev => ({
          ...prev,
          [compositeKey]: nodeData,
        }));
      });
    }

    if (data.outputNodeData) {
      if (flowId) {
        setOutputNodeData(prev => ({
          ...prev,
          [flowId]: data.outputNodeData!,
        }));
      } else {
        setOutputNodeData(prev => ({
          ...prev,
          'default': data.outputNodeData!,
        }));
      }
    }
  }, []);

  const getServerNodeDataForFlow = useCallback((flowId: string | null): Record<string, ServerNodeData> => {
    if (!flowId) {
      return Object.fromEntries(
        Object.entries(serverNodeData).filter(([key]) => !key.includes(':'))
      );
    }

    const flowPrefix = `${flowId}:`;
    const currentFlowData: Record<string, ServerNodeData> = {};

    Object.entries(serverNodeData).forEach(([compositeKey, data]) => {
      if (compositeKey.startsWith(flowPrefix)) {
        const nodeId = compositeKey.substring(flowPrefix.length);
        currentFlowData[nodeId] = data;
      }
    });

    return currentFlowData;
  }, [serverNodeData]);

  const getOutputNodeDataForFlow = useCallback((flowId: string | null): OutputNodeData | null => {
    if (!flowId) {
      return outputNodeData['default'] || null;
    }
    return outputNodeData[flowId] || null;
  }, [outputNodeData]);

  const contextValue = {
    serverNodeData: {},
    outputNodeData: null,
    serverModels,
    updateServerNode,
    updateServerNodes,
    setOutputNodeData: setOutputNodeDataForFlow,
    setServerModel,
    getServerModel,
    getAllServerModels,
    resetAllNodes,
    resetNodeStatuses,
    exportNodeContextData,
    importNodeContextData,
    getServerNodeDataForFlow,
    getOutputNodeDataForFlow,
  };

  return (
    <NodeContext.Provider value={contextValue}>
      {children}
    </NodeContext.Provider>
  );
}

export function useNodeContext() {
  const context = useContext(NodeContext);

  if (context === undefined) {
    throw new Error('useNodeContext must be used within a NodeProvider');
  }

  return context;
}
