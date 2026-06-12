import { getConnectedEdges, useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';

import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';

/**
 * Custom hook to determine output node connection state and processing status
 */
export function useOutputNodeConnection(nodeId: string) {
  const { currentFlowId } = useFlowContext();
  const { getServerNodeDataForFlow, getOutputNodeDataForFlow } = useNodeContext();
  const { getNodes, getEdges } = useReactFlow();

  const flowId = currentFlowId?.toString() || null;
  const serverNodeData = getServerNodeDataForFlow(flowId);
  const outputNodeData = getOutputNodeDataForFlow(flowId);

  return useMemo(() => {
    const nodes = getNodes();
    const edges = getEdges();

    const connectedEdges = getConnectedEdges([{ id: nodeId }] as any, edges);
    const connectedServerIds = connectedEdges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source)
      .filter(sourceId => {
        const sourceNode = nodes.find(n => n.id === sourceId);
        return sourceNode?.type === 'server-node';
      });

    const isAnyServerRunning = connectedServerIds.some(serverId =>
      serverNodeData[serverId]?.status === 'IN_PROGRESS'
    );

    const isProcessing = isAnyServerRunning;
    const isOutputAvailable = outputNodeData !== null && outputNodeData !== undefined;
    const isConnected = connectedServerIds.length > 0;

    return {
      isProcessing,
      isAnyServerRunning,
      isOutputAvailable,
      isConnected,
      connectedServerIds: new Set(connectedServerIds),
    };
  }, [nodeId, serverNodeData, outputNodeData, getNodes, getEdges]);
}
