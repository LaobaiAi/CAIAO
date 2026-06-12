import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getDisplayName, getStatusIcon, isJsonString } from './output-tab-utils';

// Progress Section Component
function ProgressSection({ sortedServers }: { sortedServers: [string, any][] }) {
  if (sortedServers.length === 0) return null;

  return (
    <Card className="bg-transparent mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Pipeline Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedServers.map(([serverId, data]) => {
            const { icon: StatusIcon, color } = getStatusIcon(data.status);
            const displayName = getDisplayName(serverId);

            return (
              <div key={serverId} className="flex items-center gap-2">
                <StatusIcon className={cn("h-4 w-4 flex-shrink-0", color)} />
                <span className="font-medium">{displayName}</span>
                <span className={cn("flex-1", color)}>
                  {data.message || data.status}
                </span>
                {data.timestamp && (
                  <span className="text-muted-foreground text-xs">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Results Section Component
function ResultsSection({ outputData }: { outputData: any }) {
  if (!outputData) return null;

  const results = outputData.results || {};

  return (
    <Card className="bg-transparent mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Results</CardTitle>
      </CardHeader>
      <CardContent>
        {outputData.execution_time !== undefined && (
          <div className="text-sm text-muted-foreground mb-3">
            Execution time: {outputData.execution_time.toFixed(3)}s
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Server</TableHead>
              <TableHead>Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(results).map(([serverId, result]: [string, any]) => (
              <TableRow key={serverId}>
                <TableCell className="font-medium">
                  {getDisplayName(serverId)}
                </TableCell>
                <TableCell className="max-w-md">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {typeof result === 'string'
                      ? (isJsonString(result) ? JSON.stringify(JSON.parse(result), null, 2) : result)
                      : JSON.stringify(result, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Main component for regular output
export function RegularOutput({
  sortedServers,
  outputData
}: {
  sortedServers: [string, any][];
  outputData: any;
}) {
  return (
    <>
      <ProgressSection sortedServers={sortedServers} />
      <ResultsSection outputData={outputData} />
    </>
  );
}
