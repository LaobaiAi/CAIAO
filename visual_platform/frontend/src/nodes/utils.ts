import { type Edge, type Node, getConnectedEdges } from '@xyflow/react';

export type NodeStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR';

/**
 * Returns the appropriate background color class based on node status
 */
export function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-amber-500  dark:bg-amber-80';
    case 'ERROR':
      return 'bg-red-500 dark:bg-red-800';
    default:
      return 'bg-node';
  }
}

/**
 * Finds all nodes that are part of a complete path from a start node to an end node
 */
export function getNodesInCompletePaths({
  startNodeId,
  endNodeId,
  nodes,
  edges
}: {
  startNodeId: string;
  endNodeId: string;
  nodes: Node[];
  edges: Edge[];
}): Set<string> {
  const connectedEdges = getConnectedEdges(nodes, edges);
  const selectedServers = new Set<string>();

  const findCompletePaths = (
    currentNode: string,
    visited: Set<string>,
    currentPath: string[]
  ) => {
    visited.add(currentNode);
    currentPath.push(currentNode);

    if (currentNode === endNodeId) {
      currentPath.forEach(node => selectedServers.add(node));
      visited.delete(currentNode);
      currentPath.pop();
      return;
    }

    const outgoingEdges = connectedEdges.filter(edge => edge.source === currentNode);

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        findCompletePaths(edge.target, visited, currentPath);
      }
    }

    visited.delete(currentNode);
    currentPath.pop();
  };

  findCompletePaths(startNodeId, new Set<string>(), []);

  return selectedServers;
}
