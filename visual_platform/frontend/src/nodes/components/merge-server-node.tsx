import { type NodeProps } from '@xyflow/react';
import { GitMerge } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { useOutputNodeConnection } from '@/hooks/use-output-node-connection';
import { cn } from '@/lib/utils';
import { type MergeServerNode } from '../types';
import { getStatusColor } from '../utils';
import { NodeShell } from './node-shell';
import { ServerOutputDialog } from './server-output-dialog';

export function MergeServerNodeComponent({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<MergeServerNode>) {
  const { currentFlowId } = useFlowContext();
  const { getServerNodeDataForFlow, getOutputNodeDataForFlow } = useNodeContext();

  const serverNodeData = getServerNodeDataForFlow(currentFlowId?.toString() || null);
  const nodeData = serverNodeData[id] || {
    status: 'IDLE',
    message: '',
    messages: [],
    lastUpdated: 0,
  };
  const status = nodeData.status;
  const isInProgress = status === 'IN_PROGRESS';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const outputNodeData = getOutputNodeDataForFlow(currentFlowId?.toString() || null);
  const { connectedServerIds } = useOutputNodeConnection(id);

  return (
    <>
      <NodeShell
        id={id}
        selected={selected}
        isConnectable={isConnectable}
        icon={<GitMerge className="h-5 w-5" />}
        iconColor={getStatusColor(status)}
        name={data.name || 'Merge Server'}
        description={data.description}
        hasRightHandle={false}
        status={status}
        disabled={data.disabled}
        locked={data.locked}
      >
        <CardContent className="p-0">
          <div className="border-t border-border p-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-primary flex items-center gap-1">
                  Status
                </div>

                <div
                  className={cn(
                    'text-foreground text-xs rounded p-2 border border-status',
                    isInProgress ? 'gradient-animation' : getStatusColor(status)
                  )}
                >
                  <span className="capitalize">
                    {status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className='flex flex-col gap-2'>
                <div className="text-xs text-muted-foreground">
                  {connectedServerIds.size} server(s) connected
                </div>
                {outputNodeData && (
                  <Button
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    View Merged Output
                  </Button>
                )}
              </div>
            </div>
          </div>
          <ServerOutputDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            name="Merged Server"
            nodeId={id}
            flowId={currentFlowId?.toString() || null}
          />
        </CardContent>
      </NodeShell>
    </>
  );
}
