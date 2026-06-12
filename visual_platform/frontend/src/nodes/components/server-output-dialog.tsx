import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNodeContext } from '@/contexts/node-context';

interface ServerOutputDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  nodeId: string;
  flowId: string | null;
}

export function ServerOutputDialog({
  isOpen,
  onOpenChange,
  name,
  nodeId,
  flowId,
}: ServerOutputDialogProps) {
  const { getServerNodeDataForFlow } = useNodeContext();
  const serverData = getServerNodeDataForFlow(flowId);
  const nodeData = serverData[nodeId];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name} - Output</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {nodeData?.result ? (
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {typeof nodeData.result === 'string'
                ? nodeData.result
                : JSON.stringify(nodeData.result, null, 2)}
            </pre>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              No output data available yet. Run the pipeline to see results.
            </div>
          )}
        </div>
        {nodeData?.messages && nodeData.messages.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Message History</h4>
            <div className="space-y-2">
              {nodeData.messages.map((msg, i) => (
                <div key={i} className="text-xs text-muted-foreground border-b pb-1">
                  <span className="text-primary">{msg.timestamp}</span>: {msg.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
