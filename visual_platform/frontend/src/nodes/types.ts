import { MessageItem } from '@/contexts/node-context';
import type { BuiltInNode, Node } from '@xyflow/react';

export type NodeMessage = MessageItem;

// Shared base data fields for all CAIAO node types
interface BaseNodeData {
  name: string;
  description: string;
  status: string;
  disabled?: boolean;
  locked?: boolean;
  profiler?: boolean;
  preview?: boolean;
  nickname?: string;
  internal_state?: Record<string, any>;
}

export type ServerNode = Node<BaseNodeData & {
  serverName?: string;
  tool?: string;
  tools?: any[];
}, 'server-node'>;

export type InputServerNode = Node<BaseNodeData, 'input-server-node'>;

export type OutputServerNode = Node<BaseNodeData, 'output-server-node'>;

export type MergeServerNode = Node<BaseNodeData, 'merge-server-node'>;

export type AppNode = BuiltInNode | ServerNode | InputServerNode | OutputServerNode | MergeServerNode;
