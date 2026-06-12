import { type NodeProps } from '@xyflow/react';
import { Bug, Cpu } from 'lucide-react';
import { useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CardContent } from '@/components/ui/card';
import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { useNodeState } from '@/hooks/use-node-state';
import { cn } from '@/lib/utils';
import { type ServerNode } from '../types';
import { getStatusColor } from '../utils';
import { NodeShell } from './node-shell';
import { ServerOutputDialog } from './server-output-dialog';

export function ServerNodeComponent({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<ServerNode>) {
  const { currentFlowId } = useFlowContext();
  const { getServerNodeDataForFlow } = useNodeContext();

  // Get server node data for the current flow
  const serverNodeData = getServerNodeDataForFlow(currentFlowId?.toString() || null);
  const nodeData = serverNodeData[id] || {
    status: 'IDLE',
    message: '',
    messages: [],
    lastUpdated: 0
  };
  const status = nodeData.status;
  const isInProgress = status === 'IN_PROGRESS';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load tool list from node data
  const [tools] = useNodeState<any[]>(id, 'tools', data.tools || []);

  return (
    <NodeShell
      id={id}
      selected={selected}
      isConnectable={isConnectable}
      icon={<Cpu className="h-5 w-5" />}
      iconColor={getStatusColor(status)}
      name={data.name || "CAIAO Server"}
      description={data.description}
      status={status}
      disabled={data.disabled}
      locked={data.locked}
      customColor={(data as any).customColor}
    >
      <CardContent className="p-0">
        <div className="border-t border-border p-3">
          <div className="flex flex-col gap-2">
            <div className="text-subtitle text-primary flex items-center gap-1">
              Status
            </div>

            <div className={cn(
              "text-foreground text-xs rounded p-2 border border-status",
              isInProgress ? "gradient-animation" : getStatusColor(status)
            )}>
              <span className="capitalize">{status.toLowerCase().replace(/_/g, ' ')}</span>
            </div>

            {(nodeData as any).breakpoint && (
              <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
                <Bug size={10} /> Breakpoint set
              </div>
            )}
            {/* Profiler: only shown when user toggles it via right-click */}
            {nodeData.duration_ms !== undefined && status === 'COMPLETE' && data.profiler && (
              <div className="flex items-center gap-1 text-[10px] text-green-500 font-mono bg-green-500/5 rounded px-1 py-0.5">
                ⏱ {nodeData.duration_ms}ms
              </div>
            )}
            {nodeData.message && (
              <div className="text-foreground text-subtitle">
                {nodeData.message}
              </div>
            )}

            {tools && tools.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="tools" className="border-none">
                  <AccordionTrigger className="!text-subtitle text-primary">
                    Tools ({tools.length})
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="flex flex-col gap-1">
                      {tools.map((tool: any, i: number) => (
                        <div key={i} className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                          {tool.name}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {nodeData.result && (
              <div className="mt-2">
                <button
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => setIsDialogOpen(true)}
                >
                  View Output
                </button>
              </div>
            )}
          </div>
        </div>
        <ServerOutputDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          name={data.name || "CAIAO Server"}
          nodeId={id}
          flowId={currentFlowId?.toString() || null}
        />
      </CardContent>
    </NodeShell>
  );
}
