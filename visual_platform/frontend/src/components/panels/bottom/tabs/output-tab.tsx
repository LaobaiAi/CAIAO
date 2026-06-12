import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { sortServers } from './output-tab-utils';
import { RegularOutput } from './regular-output';

interface OutputTabProps {
  className?: string;
}

export function OutputTab({ className }: OutputTabProps) {
  const { currentFlowId } = useFlowContext();
  const { getServerNodeDataForFlow, getOutputNodeDataForFlow } = useNodeContext();
  const [, setUpdateTrigger] = useState(0);

  // Get current flow data
  const serverData = getServerNodeDataForFlow(currentFlowId?.toString() || null);
  const outputData = getOutputNodeDataForFlow(currentFlowId?.toString() || null);

  // Force re-render periodically to show real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sort servers for display
  const sortedServers = sortServers(Object.entries(serverData));

  return (
    <div className={cn("h-full overflow-y-auto font-mono text-sm", className)}>
      {/* Render regular output */}
      <RegularOutput sortedServers={sortedServers} outputData={outputData} />

      {/* Empty State */}
      {!outputData && sortedServers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No output to display. Run a pipeline to see progress and results.
        </div>
      )}
    </div>
  );
}
