import { CheckCircle, Clock, MoreHorizontal, XCircle } from 'lucide-react';

// Helper function to detect if content is JSON
export function isJsonString(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

// Helper function to get display name for server
export function getDisplayName(serverName: string): string {
  let name = serverName;

  // Remove ID suffix (everything after the last underscore if it looks like an ID)
  const lastUnderscoreIndex = name.lastIndexOf("_");
  if (lastUnderscoreIndex !== -1) {
    const potentialId = name.substring(lastUnderscoreIndex + 1);
    if (/^[a-zA-Z0-9]{5,}$/.test(potentialId)) {
      name = name.substring(0, lastUnderscoreIndex);
    }
  }

  // Replace remaining underscores with spaces and title case
  return name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to get status icon and color
export function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'complete':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'error':
      return { icon: XCircle, color: 'text-red-500' };
    case 'in_progress':
      return { icon: MoreHorizontal, color: 'text-yellow-500' };
    default:
      return { icon: Clock, color: 'text-muted-foreground' };
  }
}

// Helper function to sort servers in display order
export function sortServers(servers: [string, any][]): [string, any][] {
  return servers.sort(([serverA, dataA], [serverB, dataB]) => {
    // Sort by timestamp (ascending - oldest first)
    const timestampA = dataA.timestamp ? new Date(dataA.timestamp).getTime() : 0;
    const timestampB = dataB.timestamp ? new Date(dataB.timestamp).getTime() : 0;

    if (timestampA !== timestampB) {
      return timestampA - timestampB;
    }

    // If no timestamp difference, sort alphabetically
    return serverA.localeCompare(serverB);
  });
}
