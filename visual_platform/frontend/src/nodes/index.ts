import { Edge, type NodeTypes } from '@xyflow/react';

import { InputServerNodeComponent } from './components/input-server-node';
import { AnnotationNodeComponent } from './components/annotation-node';
import { MergeServerNodeComponent } from './components/merge-server-node';
import { OutputServerNodeComponent } from './components/output-server-node';
import { ServerNodeComponent } from './components/server-node';
import { type AppNode } from './types';

// Types
export * from './types';

export const initialNodes: AppNode[] = [
  {
    id: 'input-server-node',
    type: 'input-server-node',
    position: { x: 0, y: 150 },
    data: {
      name: 'Input Server',
      description: 'Provide input data to the CAIAO pipeline',
      status: 'Idle',
      internal_state: {
        inputData: '{"count": 20, "min_val": 1, "max_val": 100, "threshold": 50}',
      },
    },
  },
  {
    id: 'datasource-1',
    type: 'server-node',
    position: { x: 280, y: 50 },
    data: {
      name: 'Data Source',
      description: 'Generate random numbers for analysis',
      status: 'Idle',
      serverName: 'datasource',
      tool: 'random_numbers',
      tools: [
        { name: 'random_numbers', description: 'Generate a list of random integers' },
      ],
    },
  },
  {
    id: 'filter-1',
    type: 'server-node',
    position: { x: 560, y: 50 },
    data: {
      name: 'Filter',
      description: 'Keep numbers greater than threshold',
      status: 'Idle',
      serverName: 'data_filter',
      tool: 'greater_than',
      tools: [
        { name: 'greater_than', description: 'Keep numbers > threshold' },
      ],
    },
  },
  {
    id: 'analyzer-1',
    type: 'server-node',
    position: { x: 840, y: 50 },
    data: {
      name: 'Analyzer',
      description: 'Compute statistics on filtered numbers',
      status: 'Idle',
      serverName: 'analyzer',
      tool: 'statistics',
      tools: [
        { name: 'statistics', description: 'Compute min, max, avg, sum, median, count' },
      ],
    },
  },
  {
    id: 'reporter-1',
    type: 'server-node',
    position: { x: 1120, y: 50 },
    data: {
      name: 'Reporter',
      description: 'Generate a summary report',
      status: 'Idle',
      serverName: 'reporter',
      tool: 'summary_report',
      tools: [
        { name: 'summary_report', description: 'Generate a text summary report' },
      ],
    },
  },
  {
    id: 'output-server-node',
    type: 'output-server-node',
    position: { x: 1400, y: 150 },
    data: {
      name: 'Output Server',
      description: 'Collects pipeline results',
      status: 'Idle',
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e-in-ds',  source: 'input-server-node', target: 'datasource-1', type: 'interactive-edge' },
  { id: 'e-ds-fl', source: 'datasource-1',       target: 'filter-1', type: 'interactive-edge' },
  { id: 'e-fl-an', source: 'filter-1',           target: 'analyzer-1', type: 'interactive-edge' },
  { id: 'e-an-rp', source: 'analyzer-1',         target: 'reporter-1', type: 'interactive-edge' },
  { id: 'e-rp-out', source: 'reporter-1',        target: 'output-server-node', type: 'interactive-edge' },
];

export const nodeTypes = {
  'server-node': ServerNodeComponent,
  'input-server-node': InputServerNodeComponent,
  'output-server-node': OutputServerNodeComponent,
  'merge-server-node': MergeServerNodeComponent,
  'annotation-node': AnnotationNodeComponent,
} satisfies NodeTypes;
