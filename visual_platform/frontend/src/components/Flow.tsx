import {
  Background, BackgroundVariant, ColorMode, Connection, Edge, EdgeChange,
  MarkerType, NodeChange, ReactFlow, addEdge, useEdgesState, useNodesState,
  useStore,
} from '@xyflow/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import { useFlowContext } from '@/contexts/flow-context';
import { useEnhancedFlowActions } from '@/hooks/use-enhanced-flow-actions';
import { useFlowHistory } from '@/hooks/use-flow-history';
import { useFlowKeyboardShortcuts, useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useToastManager } from '@/hooks/use-toast-manager';
import { initialNodes, initialEdges } from '@/nodes';
import { AppNode } from '@/nodes/types';
import { edgeTypes } from '../edges';
import { nodeTypes } from '../nodes';
import { CanvasContextMenu } from './canvas-context-menu';
import { EdgeContextMenu } from './edge-context-menu';
import { GroupBoxes } from './group-boxes';
import { HandleContextMenu } from './handle-context-menu';
import { NodeContextMenu } from './node-context-menu';
import { NodePropertiesPanel } from './node-properties-panel';
import { TooltipProvider } from './ui/tooltip';

type FlowProps = { className?: string };

export function Flow({ className = '' }: FlowProps) {
  const { resolvedTheme } = useTheme();
  const colorMode: ColorMode = resolvedTheme === 'light' ? 'light' : 'dark';

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [isInitialized, setIsInitialized] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [dirty, setDirty] = useState(false);
  const bookmarks = useRef<Record<string, { x: number; y: number; zoom: number }>>({});
  const clipboard = useRef<AppNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const proOptions = { hideAttribution: true };
  const defaultEdgeOptions = { type: 'interactive-edge' };

  // Keep a ref of latest store nodes (reactive, for DOM event handlers)
  const storeNodes = useStore(s => s.nodes);
  const storeNodesRef = useRef(storeNodes);
  storeNodesRef.current = storeNodes;

  useEffect(() => { (window as any).__toggleSnapToGrid = () => setSnapToGrid(prev => !prev); return () => { delete (window as any).__toggleSnapToGrid; }; }, []);

  const { currentFlowId, reactFlowInstance } = useFlowContext();
  const { saveCurrentFlowWithCompleteState } = useEnhancedFlowActions();
  const { success, error } = useToastManager();
  const { takeSnapshot, undo, redo } = useFlowHistory({ flowId: currentFlowId });

  // ── Autosave ────────────────────────────────────────────────
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSave = useCallback(async (flowIdToSave?: number | null) => {
    const targetFlowId = flowIdToSave !== undefined ? flowIdToSave : currentFlowId;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!targetFlowId || targetFlowId !== currentFlowId) return;
      try { await saveCurrentFlowWithCompleteState(); }
      catch (e) { console.error('[Auto-save] Failed:', e); }
    }, 1000);
  }, [currentFlowId, saveCurrentFlowWithCompleteState]);

  useEffect(() => { return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); }; }, []);
  useEffect(() => { if (autoSaveTimeoutRef.current) { clearTimeout(autoSaveTimeoutRef.current); autoSaveTimeoutRef.current = null; } }, [currentFlowId]);

  // ── Snap + Autosave on node changes ─────────────────────────
  const handleNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const snapped = snapToGrid
      ? changes.map(c => c.type === 'position' && !c.dragging && c.position
          ? { ...c, position: { x: Math.round(c.position.x / gridSize) * gridSize, y: Math.round(c.position.y / gridSize) * gridSize } }
          : c)
      : changes;
    onNodesChange(snapped);
    const shouldSave = changes.some(c => c.type === 'add' || c.type === 'remove' || (c.type === 'position' && !c.dragging));
    if (shouldSave && isInitialized && currentFlowId) { setDirty(true); autoSave(currentFlowId); }
  }, [onNodesChange, autoSave, isInitialized, currentFlowId, snapToGrid, gridSize]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    if (changes.some(c => c.type === 'remove') && isInitialized && currentFlowId) { setDirty(true); autoSave(currentFlowId); }
  }, [onEdgesChange, autoSave, isInitialized, currentFlowId]);

  // ── History ─────────────────────────────────────────────────
  useEffect(() => { if (isInitialized && nodes.length === 0 && edges.length === 0) takeSnapshot(); }, [isInitialized]);
  useEffect(() => { if (!isInitialized) return; const t = setTimeout(() => takeSnapshot(), 500); return () => clearTimeout(t); }, [nodes, edges, takeSnapshot, isInitialized]);

  useFlowKeyboardShortcuts(async () => {
    try { const f = await saveCurrentFlowWithCompleteState(); setDirty(false); f ? success(`"${f.name}" saved!`, 'flow-save') : error('Save failed', 'flow-save-error'); }
    catch { error('Save failed', 'flow-save-error'); }
  });

  useKeyboardShortcuts({ shortcuts: [
    { key: 'z', ctrlKey: true, metaKey: true, callback: undo, preventDefault: true },
    { key: 'z', ctrlKey: true, metaKey: true, shiftKey: true, callback: redo, preventDefault: true },
  ]});

  // ── ALL Keyboard Shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Esc: Deselect all
      if (e.key === 'Escape') {
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
      }
      // F2: Rename selected node
      if (e.key === 'F2') {
        e.preventDefault();
        const sel = nodes.filter(n => n.selected);
        if (sel.length === 1) {
          const nn = prompt('Rename:', sel[0].data?.name || 'Node');
          if (nn?.trim()) setNodes(nds => nds.map(n => n.id === sel[0].id ? { ...n, data: { ...n.data, name: nn.trim() } } : n));
        }
      }
      // Ctrl+A: Select All
      if (ctrl && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
        setEdges(eds => eds.map(e => ({ ...e, selected: true })));
      }
      // Ctrl+Shift+I: Invert
      if (ctrl && e.key === 'I' && e.shiftKey) {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: !n.selected })));
        setEdges(eds => eds.map(e => ({ ...e, selected: !e.selected })));
      }
      // Ctrl+D: Deselect
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
      }
      // Ctrl+C: Copy selected nodes
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        clipboard.current = nodes.filter(n => n.selected).map(n => JSON.parse(JSON.stringify(n)));
      }
      // Ctrl+V: Paste copied nodes
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        if (clipboard.current.length > 0) {
          const offset = 50 * (Date.now() % 5);
          clipboard.current.forEach(n => {
            const nn = { ...JSON.parse(JSON.stringify(n)), id: `paste_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, position: { x: n.position.x + offset, y: n.position.y + offset }, selected: false };
            setNodes(nds => [...nds, nn]);
          });
        }
      }
      // Ctrl+F: Zoom to selected
      if (ctrl && e.key === 'f') {
        e.preventDefault();
        const sel = nodes.filter(n => n.selected);
        if (sel.length > 0) reactFlowInstance.fitView({ nodes: sel, padding: 0.2, duration: 300 });
      }
      // Ctrl+M: Show all wires
      if (ctrl && e.key === 'm') {
        e.preventDefault();
        setEdges(eds => eds.map(e => ({ ...e, hidden: false, data: { ...e.data, displayMode: 'display' as const } })));
      }
      // Home: Reset view
      if (e.key === 'Home') {
        e.preventDefault();
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }
      // Ctrl+1/2/3: Save/restore viewport bookmarks
      const DIGIT_KEYS: Record<string, string> = { Digit1: '1', Digit2: '2', Digit3: '3' };
      const digit = DIGIT_KEYS[e.code];
      if (ctrl && digit) {
        e.preventDefault();
        const vp = reactFlowInstance.getViewport();
        if (e.shiftKey) {
          bookmarks.current[digit] = { x: vp.x, y: vp.y, zoom: vp.zoom };
          success(`Bookmark ${digit} saved`, 'bm-save');
        } else {
          const bm = bookmarks.current[digit];
          if (bm) {
            reactFlowInstance.setViewport({ x: bm.x, y: bm.y, zoom: bm.zoom }, { duration: 300 });
            success(`Bookmark ${digit} restored`, 'bm-restore');
          } else {
            error(`No bookmark ${digit}`, 'bm-miss');
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, setNodes, setEdges, reactFlowInstance]);

  // ── Init ────────────────────────────────────────────────────
  const onInit = useCallback(() => {
    if (!isInitialized) { setIsInitialized(true); setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 300 }), 100); }
  }, [isInitialized, reactFlowInstance]);

  // ── Connection ──────────────────────────────────────────────
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = { ...connection, id: `edge-${Date.now()}`, type: 'interactive-edge', markerEnd: { type: MarkerType.ArrowClosed } };
    setEdges(eds => addEdge(newEdge, eds));
    setDirty(true);
    if (currentFlowId) { const fid = currentFlowId; if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); setTimeout(async () => { if (fid === currentFlowId) await saveCurrentFlowWithCompleteState(); }, 100); }
  }, [setEdges, currentFlowId, saveCurrentFlowWithCompleteState]);

  // ── Theme ───────────────────────────────────────────────────
  const gridColor = resolvedTheme === 'light' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))';

  // ── Node: double-click → properties ─────────────────────────
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: AppNode) => {
    // Annotation node: inline editing handled by its own onDoubleClick
    if (node.type === 'annotation-node') return;
    (window as any).__showNodeProperties?.({ nodeId: node.id });
  }, []);

  // ── Pane: click → dismiss menus ─────────────────────────────
  const onPaneClick = useCallback(() => {
    (window as any).__showNodeContextMenu?.(null);
    (window as any).__showCanvasContextMenu?.(null);
    (    window as any).__showEdgeContextMenu?.(null);
    (window as any).__showHandleContextMenu?.(null);
    (window as any).__showNodeProperties?.(null);
  }, []);

  // ── Pane: double-click → dismiss menus ────────────────────
  const lastClickRef = useRef(0);
  const onPaneMouseDown = useCallback((event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) {
      (window as any).__showNodeContextMenu?.(null);
      (window as any).__showCanvasContextMenu?.(null);
      (window as any).__showEdgeContextMenu?.(null);
      (window as any).__showHandleContextMenu?.(null);
    }
    lastClickRef.current = now;
  }, []);

  // ── Edge: left-click selects edge ───────────────────────────
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEdges(eds => eds.map(e => ({ ...e, selected: e.id === edge.id })));
  }, [setEdges]);

  // ── Edge: right-click → edge menu ───────────────────────────
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setEdges(eds => eds.map(e => ({ ...e, selected: e.id === edge.id })));
    (window as any).__showEdgeContextMenu?.({ x: event.clientX, y: event.clientY, edgeId: edge.id, sourceId: edge.source, targetId: edge.target, hidden: edge.hidden, displayMode: (edge as any).displayMode || 'display' });
  }, [setEdges]);

  // ── DOM listeners: handle menu + multi-select context menu + middle-click wire ──
  useEffect(() => {
    if (!isInitialized) return;

    const ctxMenu = (e: Event) => {
      const me = e as MouseEvent;
      const target = me.target as HTMLElement;

      // Only intercept clicks inside the flow canvas
      if (!target.closest('.react-flow')) return;

      // 1. Handle right-click
      const handle = target.closest('.react-flow__handle') as HTMLElement;
      if (handle) {
        e.preventDefault(); e.stopImmediatePropagation();
        const nodeId = handle.closest('[data-id]')?.getAttribute('data-id') || '';
        (window as any).__showHandleContextMenu?.({ x: me.clientX, y: me.clientY, nodeId, handleType: handle.classList.contains('source') ? 'source' : 'target' });
        return;
      }

      // 2. Edge right-click → let ReactFlow handle natively
      if (target.closest('.react-flow__edge') || target.closest('[data-testid*="rf__edge"]')) return;

      // 3. Read selection from store (always fresh)
      const allN = storeNodesRef.current;
      const selected = allN.filter((n: any) => n.selected);

      // No selection → canvas menu
      if (selected.length === 0) {
        e.preventDefault();
        (window as any).__showCanvasContextMenu?.({ x: me.clientX, y: me.clientY });
        return;
      }

      // Selected ≥2 → node multi-select menu (anywhere on canvas)
      if (selected.length >= 2) {
        e.preventDefault(); e.stopImmediatePropagation();
        const first = selected[0];
        (window as any).__showNodeContextMenu?.({
          x: me.clientX, y: me.clientY, nodeId: first.id,
          nodeName: `${selected.length} components`, nodeType: first.type || '',
          serverName: first.data?.serverName,
          isDisabled: !!first.data?.disabled, isLocked: !!first.data?.locked,
          isProfiler: !!first.data?.profiler, hasBreakpoint: false,
          groupId: first.data?.groupId, selectedCount: selected.length,
        });
        return;
      }

      // Selected =1 → node single menu
      const single = selected[0];
      e.preventDefault(); e.stopImmediatePropagation();
      (window as any).__showNodeContextMenu?.({
        x: me.clientX, y: me.clientY, nodeId: single.id,
        nodeName: single.data?.nickname || single.data?.name || single.type || 'Node',
        nodeType: single.type || '', serverName: single.data?.serverName,
        isDisabled: !!single.data?.disabled, isLocked: !!single.data?.locked,
        isProfiler: !!single.data?.profiler, hasBreakpoint: false,
        groupId: single.data?.groupId, selectedCount: 1,
      });
    };

    // Middle-click on edge → quick delete
    const edgeMD = (e: Event) => {
      const me = e as MouseEvent;
      if (me.button !== 1) return;
      me.preventDefault(); // block browser autoscroll
      const edgeEl = (me.target as HTMLElement).closest('[data-testid^="rf__edge-"]') as HTMLElement;
      if (!edgeEl) return;
      const edgeId = edgeEl.getAttribute('data-testid')?.replace('rf__edge-', '');
      if (edgeId) setEdges(eds => eds.filter(e => e.id !== edgeId));
    };

    document.addEventListener('contextmenu', ctxMenu, true);
    document.addEventListener('mousedown', edgeMD, true);

    return () => {
      document.removeEventListener('contextmenu', ctxMenu, true);
      document.removeEventListener('mousedown', edgeMD, true);
    };
  }, [isInitialized, setEdges, setNodes]);

  // ── Selection count ─────────────────────────────────────────
  const selNodes = nodes.filter(n => n.selected).length;
  const selEdgesCount = edges.filter(e => e.selected).length;
  const selText = selNodes > 0 ? `${selNodes} node${selNodes > 1 ? 's' : ''} selected` : selEdgesCount > 0 ? `${selEdgesCount} edge${selEdgesCount > 1 ? 's' : ''} selected` : '';

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
      <TooltipProvider>
        <ReactFlow
          nodes={nodes} nodeTypes={nodeTypes} onNodesChange={handleNodesChange}
          edges={edges} edgeTypes={edgeTypes} onEdgesChange={handleEdgesChange}
          onConnect={onConnect} onInit={onInit}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick} onPaneMouseDown={onPaneMouseDown}
          onEdgeClick={onEdgeClick} onEdgeContextMenu={onEdgeContextMenu}
          colorMode={colorMode} proOptions={proOptions} defaultEdgeOptions={defaultEdgeOptions}
          selectionOnDrag panOnDrag={[1, 2]} selectionMode="partial"
          multiSelectionKeyCode="Shift" deleteKeyCode={['Delete', 'Backspace']}
          edgesFocusable={true} edgesUpdatable={false} selectNodesOnDrag
          selectionKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={13} color={gridColor}
            style={{ backgroundColor: 'hsl(var(--background))' }} />
        </ReactFlow>
      </TooltipProvider>

      <GroupBoxes />

      {/* Dirty indicator + selection count */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {dirty && (
          <div className="px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-[10px] text-yellow-500 font-medium">
            Modified
          </div>
        )}
        {selText && (
          <div className="px-3 py-1 rounded-full bg-popover border border-border shadow-md text-[11px] text-muted-foreground">
            {selText}
          </div>
        )}
      </div>

      <NodeContextMenu />
      <CanvasContextMenu />
      <EdgeContextMenu />
      <HandleContextMenu />
      <NodePropertiesPanel />
    </div>
  );
}
