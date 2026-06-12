import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { useTabsContext } from '@/contexts/tabs-context';
import {
  clearFlowNodeStates,
  getNodeInternalState,
  setNodeInternalState,
} from '@/hooks/use-node-state';
import { useToastManager } from '@/hooks/use-toast-manager';
import { initialEdges, initialNodes } from '@/nodes';
import { flowService } from '@/services/flow-service';
import { TabService } from '@/services/tab-service';
import { Flow } from '@/types/flow';
import { useEffect, useState, useCallback, useRef } from 'react';

// Virtual demo flow that works entirely client-side, no backend required
const VIRTUAL_DEMO_ID = -1;
function createVirtualDemoFlow(): Flow {
  // Pre-fill Input Server state so the canvas shows default data immediately
  setNodeInternalState('input-server-node', {
    inputData: '{"count": 20, "min_val": 1, "max_val": 100}',
  });
  
  return {
    id: VIRTUAL_DEMO_ID,
    name: 'Demo',
    description: 'CAIAO Visual demo pipeline: Data Source → Filter → Analyzer → Reporter',
    nodes: initialNodes,
    edges: initialEdges,
    viewport: { x: 0, y: 0, zoom: 0.8 },
    is_template: false,
    tags: ['demo', 'tutorial'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export interface UseFlowManagementTabsReturn {
  // State
  flows: Flow[];
  searchQuery: string;
  isLoading: boolean;
  openGroups: string[];
  createDialogOpen: boolean;
  
  // Computed values
  filteredFlows: Flow[];
  recentFlows: Flow[];
  templateFlows: Flow[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setOpenGroups: (groups: string[]) => void;
  setCreateDialogOpen: (open: boolean) => void;
  handleAccordionChange: (value: string[]) => void;
  handleCreateNewFlow: () => void;
  handleFlowCreated: (newFlow: Flow) => Promise<void>;
  handleSaveCurrentFlow: () => Promise<void>;
  handleOpenFlowInTab: (flow: Flow) => Promise<void>;
  handleDeleteFlow: (flow: Flow) => Promise<void>;
  handleRefresh: () => Promise<void>;
  
  // Internal functions (for testing/advanced use)
  loadFlows: () => Promise<void>;
  createDefaultFlow: () => Promise<Flow | null>;
}

export function useFlowManagementTabs(): UseFlowManagementTabsReturn {
  // Get flow context, node context, tabs context, and toast manager
  const { saveCurrentFlow, reactFlowInstance, currentFlowId } = useFlowContext();
  const { exportNodeContextData } = useNodeContext();
  const { openTab, isTabOpen, closeTab } = useTabsContext();
  const { success, error } = useToastManager();
  
  // State for flows
  const [flows, setFlows] = useState<Flow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['recent-flows']);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Enhanced save function that includes internal node states AND node context data
  const saveCurrentFlowWithStates = useCallback(async (): Promise<Flow | null> => {
    try {
      // Get current nodes from React Flow
      const currentNodes = reactFlowInstance.getNodes();
      
      // Get node context data (runtime data: agent status, messages, output data)
      const flowId = currentFlowId?.toString() || null;
      const nodeContextData = exportNodeContextData(flowId);
      
      // Enhance nodes with internal states
      const nodesWithStates = currentNodes.map((node: any) => {
        const internalState = getNodeInternalState(node.id);
        return {
          ...node,
          data: {
            ...node.data,
            // Only add internal_state if there is actually state to save
            ...(internalState && Object.keys(internalState).length > 0 ? { internal_state: internalState } : {})
          }
        };
      });

      // Temporarily replace nodes in React Flow with enhanced nodes
      reactFlowInstance.setNodes(nodesWithStates);
      
      try {
        // Use the context's save function which handles currentFlowId properly
        const savedFlow = await saveCurrentFlow();
        
        if (savedFlow) {
          // After basic save, update with node context data
          const updatedFlow = await flowService.updateFlow(savedFlow.id, {
            ...savedFlow,
            data: {
              ...savedFlow.data,
              nodeContextData, // Add runtime data from node context
            }
          });
          
          return updatedFlow;
        }
        
        return savedFlow;
      } finally {
        // Restore original nodes (without internal_state in React Flow)
        reactFlowInstance.setNodes(currentNodes);
      }
    } catch (err) {
      console.error('Failed to save flow with states:', err);
      return null;
    }
  }, [reactFlowInstance, saveCurrentFlow, exportNodeContextData, currentFlowId]);

  // Track whether demo flow has been created (only once per session)
  const demoCreated = useRef(false);

  // Create default demo flow for new users
  const createDefaultFlow = useCallback(async () => {
    try {
      const demoFlow = await flowService.createFlow({
        name: 'Demo',
        description: 'CAIAO Visual demo pipeline: Data Source → Filter → Analyzer → Reporter',
        nodes: initialNodes,
        edges: initialEdges,
        viewport: { x: 0, y: 0, zoom: 0.8 },
      });
      
      // Open the demo flow in a tab
      const tabData = TabService.createFlowTab(demoFlow);
      openTab(tabData);

      // Remember it
      localStorage.setItem('lastSelectedFlowId', demoFlow.id.toString());
      
      return demoFlow;
    } catch (error) {
      console.error('Failed to create demo flow:', error);
      return null;
    }
  }, [openTab]);

  // Load flows from API
  const loadFlows = useCallback(async () => {
    setIsLoading(true);
    try {
      const flowsData = await flowService.getFlows();
      
      // Auto-create demo flow via backend if no saved flows exist
      if (flowsData.length === 0 && !demoCreated.current) {
        demoCreated.current = true;
        const demoFlow = await createDefaultFlow();
        if (demoFlow) {
          setFlows([demoFlow]);
          setIsLoading(false);
          return;
        }
        // Backend creation failed — fall back to virtual demo flow
        const virtualFlow = createVirtualDemoFlow();
        setFlows([virtualFlow]);
        // Auto-open the demo in a tab
        const tabData = TabService.createFlowTab(virtualFlow);
        openTab(tabData);
        localStorage.setItem('lastSelectedFlowId', virtualFlow.id.toString());
        setIsLoading(false);
        return;
      }
      
      setFlows(flowsData);
    } catch (error) {
      console.error('Error loading flows:', error);
      // Backend unreachable — show virtual demo flow client-side
      if (!demoCreated.current) {
        demoCreated.current = true;
        const virtualFlow = createVirtualDemoFlow();
        setFlows([virtualFlow]);
        // Auto-open the demo in a tab
        const tabData = TabService.createFlowTab(virtualFlow);
        openTab(tabData);
        localStorage.setItem('lastSelectedFlowId', virtualFlow.id.toString());
      }
    } finally {
      setIsLoading(false);
    }
  }, [createDefaultFlow, openTab]);

  // Load flows on mount
  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // Filter flows based on search query
  const filteredFlows = flows.filter(flow =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort flows by updated_at descending, then group them
  const sortedFlows = [...filteredFlows].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  // Group flows
  const recentFlows = sortedFlows.filter(f => !f.is_template).slice(0, 10);
  const templateFlows = sortedFlows.filter(f => f.is_template);

  // Event handlers
  const handleAccordionChange = useCallback((value: string[]) => {
    setOpenGroups(value);
  }, []);

  const handleCreateNewFlow = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleFlowCreated = useCallback(async (newFlow: Flow) => {
    // Open the new flow in a tab
    const tabData = TabService.createFlowTab(newFlow);
    openTab(tabData);
    
    // Remember it
    localStorage.setItem('lastSelectedFlowId', newFlow.id.toString());
    
    // Refresh the flows list to show the new flow
    await loadFlows();
  }, [openTab, loadFlows]);

  const handleSaveCurrentFlow = useCallback(async () => {
    try {
      const savedFlow = await saveCurrentFlowWithStates();
      if (savedFlow) {
        // Remember the saved flow
        localStorage.setItem('lastSelectedFlowId', savedFlow.id.toString());
        // Refresh the flows list
        await loadFlows();
        success(`"${savedFlow.name}" saved!`, 'flow-save');
      } else {
        error('Failed to save flow', 'flow-save-error');
      }
    } catch (err) {
      console.error('Failed to save flow:', err);
      error('Failed to save flow', 'flow-save-error');
    }
  }, [saveCurrentFlowWithStates, loadFlows, success, error]);

  const handleOpenFlowInTab = useCallback(async (flow: Flow) => {
    try {      
      // Virtual demo flow — use its embedded nodes/edges directly, no backend needed
      let fullFlow: Flow;
      if (flow.id === VIRTUAL_DEMO_ID) {
        fullFlow = flow;
      } else {
        fullFlow = await flowService.getFlow(flow.id);
      }
      
      // Create tab data with configuration restoration only
      const createTabWithConfigRestore = (flowData: Flow) => {
        const tabData = TabService.createFlowTab(flowData);
        
        // Enhance the tab content to restore only configuration data when the tab is activated
        return {
          ...tabData,
          onActivate: () => {
            // Restore internal states for each node (use-node-state data - configuration only)
            if (flowData.nodes) {
              flowData.nodes.forEach((node: any) => {
                if (node.data?.internal_state) {
                  setNodeInternalState(node.id, node.data.internal_state);
                }
              });
            }
          }
        };
      };
      
      // Check if tab is already open
      if (isTabOpen(flow.id.toString(), 'flow')) {
        // Tab exists - update it with fresh data and focus it
        const tabId = `flow-${flow.id}`;
        const enhancedTabData = createTabWithConfigRestore(fullFlow);
        
        // Update the existing tab with fresh data
        openTab({
          id: tabId,
          type: enhancedTabData.type,
          title: enhancedTabData.title,
          content: enhancedTabData.content,
          flow: enhancedTabData.flow,
          metadata: enhancedTabData.metadata,
        });
        
        // Trigger the enhanced restoration
        if (enhancedTabData.onActivate) {
          enhancedTabData.onActivate();
        }
      } else {
        // Create new tab with fresh data
        const enhancedTabData = createTabWithConfigRestore(fullFlow);
        openTab(enhancedTabData);
        
        // Trigger the enhanced restoration for new tab
        if (enhancedTabData.onActivate) {
          enhancedTabData.onActivate();
        }
      }
      
      // Remember the selected flow
      localStorage.setItem('lastSelectedFlowId', fullFlow.id.toString());
    } catch (err) {
      console.error('Failed to open flow in tab:', err);
      error('Failed to load flow data');
    }
  }, [isTabOpen, openTab, error]);

  const handleRefresh = useCallback(async () => {
    await loadFlows();
  }, [loadFlows]);

  const handleDeleteFlow = useCallback(async (flow: Flow) => {
    try {
      // Only call backend for non-virtual flows
      if (flow.id !== VIRTUAL_DEMO_ID) {
        await flowService.deleteFlow(flow.id);
      }
      
      // Close the tab if it's open
      const tabId = `flow-${flow.id}`;
      closeTab(tabId);
      
      // Clear node states for the deleted flow
      clearFlowNodeStates(flow.id.toString());
      
      // Remove from localStorage if it was the last selected
      const lastSelectedFlowId = localStorage.getItem('lastSelectedFlowId');
      if (lastSelectedFlowId === flow.id.toString()) {
        localStorage.removeItem('lastSelectedFlowId');
      }
      
      // Refresh the flows list
      await loadFlows();
    } catch (error) {
      console.error('Failed to delete flow:', error);
    }
  }, [loadFlows, closeTab]);

  return {
    // State
    flows,
    searchQuery,
    isLoading,
    openGroups,
    createDialogOpen,
    
    // Computed values
    filteredFlows,
    recentFlows,
    templateFlows,
    
    // Actions
    setSearchQuery,
    setOpenGroups,
    setCreateDialogOpen,
    handleAccordionChange,
    handleCreateNewFlow,
    handleFlowCreated,
    handleSaveCurrentFlow,
    handleOpenFlowInTab,
    handleDeleteFlow,
    handleRefresh,
    
    // Internal functions
    loadFlows,
    createDefaultFlow,
  };
} 