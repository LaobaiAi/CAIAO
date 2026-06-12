import { useReactFlow, type NodeProps } from '@xyflow/react';
import { Box, Play, Square } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { useFlowConnection } from '@/hooks/use-flow-connection';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useNodeState } from '@/hooks/use-node-state';
import { formatKeyboardShortcut } from '@/lib/utils';
import { type InputServerNode } from '../types';
import { NodeShell } from './node-shell';

export function InputServerNodeComponent({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<InputServerNode>) {
  const [inputData, setInputData] = useNodeState(id, 'inputData', '');

  const { currentFlowId } = useFlowContext();
  const nodeContext = useNodeContext();
  const { getAllServerModels } = nodeContext;
  const { getNodes, getEdges } = useReactFlow();

  const flowId = currentFlowId?.toString() || null;
  const {
    isConnecting,
    isConnected,
    isProcessing,
    canRun,
    runFlow,
    stopFlow,
    recoverFlowState
  } = useFlowConnection(flowId);

  const canRunPipeline = canRun && inputData.trim() !== '';

  // Keyboard shortcut
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        ctrlKey: true,
        metaKey: true,
        callback: () => {
          if (canRunPipeline) {
            handlePlay();
          }
        },
        preventDefault: true,
      },
    ],
  });

  useEffect(() => {
    if (flowId) {
      recoverFlowState();
    }
  }, [flowId, recoverFlowState]);

  const handleStop = () => {
    stopFlow();
  };

  const handlePlay = () => {
    const allNodes = getNodes();
    const allEdges = getEdges();

    // DFS to find reachable nodes
    const reachableNodes = new Set<string>();
    const visited = new Set<string>();

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      if (nodeId !== id) {
        reachableNodes.add(nodeId);
      }

      const outgoingEdges = allEdges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.target);
      }
    };

    dfs(id);

    const serverNodes = allNodes.filter(node => reachableNodes.has(node.id));

    const reachableNodeIds = new Set([id, ...reachableNodes]);
    const validEdges = allEdges.filter(edge =>
      reachableNodeIds.has(edge.source) && reachableNodeIds.has(edge.target)
    );

    // Collect server models
    const serverModels: any[] = [];
    const allServerModels = getAllServerModels(flowId);
    for (const node of serverNodes) {
      const model = allServerModels[node.id];
      if (model) {
        serverModels.push({
          server_id: node.id,
          model_name: model.model_name,
          model_provider: model.provider,
        });
      }
    }

    // Parse input data
    let parsedInput: Record<string, any> = {};
    try {
      parsedInput = JSON.parse(inputData);
    } catch {
      // Use as plain string
      parsedInput = { value: inputData };
    }

    runFlow({
      graph_nodes: serverNodes.map(node => ({
        id: node.id,
        type: node.type,
        data: node.data,
        position: node.position
      })),
      graph_edges: validEdges,
      input_data: parsedInput,
    });
  };

  const showAsProcessing = isConnecting || isConnected || isProcessing;

  return (
    <TooltipProvider>
      <NodeShell
        id={id}
        selected={selected}
        isConnectable={isConnectable}
        icon={<Box className="h-5 w-5" />}
        name={data.name || "Input Server"}
        description={data.description}
        hasLeftHandle={false}
        disabled={data.disabled}
        locked={data.locked}
      >
        <CardContent className="p-0">
          <div className="border-t border-border p-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-primary flex items-center gap-1">
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span>Input Data</span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Enter JSON data or plain text to feed into the pipeline
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder='Enter data (e.g. {"a": 10, "b": 5})'
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-primary flex items-center gap-1">
                  Run
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    title={showAsProcessing ? "Stop" : `Run (${formatKeyboardShortcut('↵')})`}
                    onClick={showAsProcessing ? handleStop : handlePlay}
                    disabled={!canRunPipeline && !showAsProcessing}
                  >
                    {showAsProcessing ? (
                      <><Square className="h-3.5 w-3.5 mr-2" /> Stop</>
                    ) : (
                      <><Play className="h-3.5 w-3.5 mr-2" /> Run</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </NodeShell>
    </TooltipProvider>
  );
}
