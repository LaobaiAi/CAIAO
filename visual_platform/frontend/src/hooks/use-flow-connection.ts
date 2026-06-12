import { useNodeContext } from '@/contexts/node-context';
import { api } from '@/services/api';
import { GraphRunRequest } from '@/services/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// Connection state for a specific flow
export type FlowConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'completed';

interface FlowConnectionInfo {
  state: FlowConnectionState;
  abortController: (() => void) | null;
  startTime: number;
  lastActivity: number;
  error?: string;
}

// Global connection manager - tracks all active flow connections
class FlowConnectionManager {
  private connections = new Map<string, FlowConnectionInfo>();
  private listeners = new Set<() => void>();

  getConnection(flowId: string): FlowConnectionInfo {
    return this.connections.get(flowId) || {
      state: 'idle',
      abortController: null,
      startTime: 0,
      lastActivity: 0,
    };
  }

  setConnection(flowId: string, info: Partial<FlowConnectionInfo>): void {
    const existing = this.getConnection(flowId);
    const updated = {
      ...existing,
      ...info,
      lastActivity: Date.now(),
    };

    this.connections.set(flowId, updated);
    this.notifyListeners();
  }

  removeConnection(flowId: string): void {
    const connection = this.connections.get(flowId);
    if (connection?.abortController) {
      connection.abortController();
    }
    this.connections.delete(flowId);
    this.notifyListeners();
  }

  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Global instance
export const flowConnectionManager = new FlowConnectionManager();

/**
 * Hook for managing CAIAO graph connections and execution
 */
export function useFlowConnection(flowId: string | null) {
  const nodeContext = useNodeContext();
  const [, forceUpdate] = useState({});
  const listenerRef = useRef<() => void>();

  useEffect(() => {
    const listener = () => forceUpdate({});
    listenerRef.current = listener;
    flowConnectionManager.addListener(listener);

    return () => {
      if (listenerRef.current) {
        flowConnectionManager.removeListener(listenerRef.current);
      }
    };
  }, []);

  const connection = flowId ? flowConnectionManager.getConnection(flowId) : null;
  const isConnecting = connection?.state === 'connecting';
  const isConnected = connection?.state === 'connected';
  const isError = connection?.state === 'error';
  const isCompleted = connection?.state === 'completed';

  const isProcessing = flowId ? (() => {
    const serverData = nodeContext.getServerNodeDataForFlow(flowId);
    return Object.values(serverData).some(server => server.status === 'IN_PROGRESS');
  })() : false;

  const canRun = Boolean(flowId && !isConnecting && !isConnected && !isProcessing);

  // Start a graph run
  const runFlow = useCallback((params: GraphRunRequest) => {
    if (!flowId || !canRun) return;

    nodeContext.resetAllNodes(flowId);

    flowConnectionManager.setConnection(flowId, {
      state: 'connecting',
      startTime: Date.now(),
    });

    try {
      const abortController = api.runGraph(params, nodeContext, flowId);

      flowConnectionManager.setConnection(flowId, {
        state: 'connected',
        abortController,
      });

    } catch (error) {
      console.error('Failed to start graph run:', error);
      flowConnectionManager.setConnection(flowId, {
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        abortController: null,
      });
    }
  }, [flowId, canRun, nodeContext]);

  // Stop a flow connection
  const stopFlow = useCallback(() => {
    if (!flowId) return;

    const connection = flowConnectionManager.getConnection(flowId);

    if (connection.abortController) {
      connection.abortController();
    }

    nodeContext.resetNodeStatuses(flowId);

    flowConnectionManager.setConnection(flowId, {
      state: 'idle',
      abortController: null,
    });
  }, [flowId, nodeContext]);

  // Recover from stale states
  const recoverFlowState = useCallback(() => {
    if (!flowId) return;

    const connection = flowConnectionManager.getConnection(flowId);

    if ((connection.state === 'connected' || connection.state === 'connecting') && !isProcessing) {
      const isStale = Date.now() - connection.lastActivity > 5 * 60 * 1000;

      if (isStale) {
        flowConnectionManager.setConnection(flowId, {
          state: 'idle',
          abortController: null,
        });
      }
    }
  }, [flowId, isProcessing]);

  return {
    isConnecting,
    isConnected,
    isError,
    isCompleted,
    isProcessing,
    canRun,
    error: connection?.error,
    runFlow,
    stopFlow,
    recoverFlowState,
  };
}

export function useFlowConnectionState(flowId: string | null) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!flowId) return;

    const unsubscribe = flowConnectionManager.addListener(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [flowId]);

  return flowId ? flowConnectionManager.getConnection(flowId) : null;
}
