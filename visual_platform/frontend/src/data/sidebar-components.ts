import {
  Box,
  Cable,
  Cpu,
  GitMerge,
  Import,
  LucideIcon,
  Wrench,
  Zap
} from 'lucide-react';
import { ServerInfo, getServers } from './servers';

// Define component items by group
export interface ComponentItem {
  name: string;
  icon: LucideIcon;
  serverName?: string; // Original server name for category mapping
}

export interface ComponentGroup {
  name: string;
  icon: LucideIcon;
  iconColor: string;
  items: ComponentItem[];
}

// Default category names
export const DEFAULT_CATEGORIES = [
  'Start Nodes',
  'CAIAO Servers',
  'Merge Server',
  'End Nodes',
];

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  'Start Nodes': { icon: Import, color: 'text-blue-500' },
  'CAIAO Servers': { icon: Cpu, color: 'text-red-500' },
  'Merge Server': { icon: GitMerge, color: 'text-purple-500' },
  'End Nodes': { icon: Zap, color: 'text-green-500' },
};

// Special fixed nodes that always belong to specific categories
const SPECIAL_NODES: Record<string, { category: string; icon: LucideIcon }> = {
  'Input Server': { category: 'Start Nodes', icon: Box },
  'Output Server': { category: 'End Nodes', icon: Zap },
  'Merge Server': { category: 'End Nodes', icon: GitMerge },
  'Data Pipeline': { category: 'Merge Server', icon: Cable },
  'Compute Chain': { category: 'Merge Server', icon: Wrench },
};

/**
 * Get the icon for a given category name
 */
export const getCategoryIcon = (categoryName: string): { icon: LucideIcon; color: string } => {
  return CATEGORY_ICONS[categoryName] || { icon: Cpu, color: 'text-purple-500' };
};

/**
 * Get all component groups with CAIAO servers distributed across categories.
 * @param serverCategoryMap Optional mapping of server names to category names
 * @param customCategories Optional additional user-created categories
 */
export const getComponentGroups = async (
  serverCategoryMap?: Record<string, string>,
  customCategories?: string[]
): Promise<ComponentGroup[]> => {
  let servers: ServerInfo[] = [];
  try {
    const result = await getServers();
    if (Array.isArray(result)) {
      servers = result;
    } else {
      console.warn('getServers() returned non-array:', typeof result);
    }
  } catch (error) {
    console.warn('Failed to fetch CAIAO servers, showing default categories only:', error);
  }
  const allCategories = [...DEFAULT_CATEGORIES, ...(customCategories || [])];

  // Initialize groups for all categories
  const groups: ComponentGroup[] = allCategories.map(cat => {
    const { icon, color } = getCategoryIcon(cat);
    return {
      name: cat,
      icon,
      iconColor: color,
      items: [],
    };
  });

  // Helper to add an item to a category group
  const addToGroup = (categoryName: string, item: ComponentItem) => {
    const group = groups.find(g => g.name === categoryName);
    if (group) {
      group.items.push(item);
    }
  };

  // Add special nodes — respect serverCategoryMap to allow category switching
  for (const [nodeName, { category, icon }] of Object.entries(SPECIAL_NODES)) {
    const targetCategory = serverCategoryMap?.[nodeName] || category;
    addToGroup(targetCategory, { name: nodeName, icon, serverName: nodeName });
  }

  // Add CAIAO servers to their assigned categories
  for (const server of servers) {
    const displayName = server.display_name || server.name;
    const assignedCategory = serverCategoryMap?.[server.name] || server.category || 'default';
    
    // Map server categories to group names
    let targetCategory = 'CAIAO Servers';
    if (serverCategoryMap?.[server.name]) {
      targetCategory = serverCategoryMap[server.name];
    } else if (server.category === 'custom') {
      targetCategory = 'CAIAO Servers';
    }

    addToGroup(targetCategory, {
      name: displayName,
      icon: Cpu,
      serverName: server.name,
    });
  }

  // Remove empty groups (keep default categories and user-created custom categories)
  return groups.filter(g => g.items.length > 0 || DEFAULT_CATEGORIES.includes(g.name) || (customCategories || []).includes(g.name));
};
