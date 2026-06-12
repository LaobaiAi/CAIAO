import { useReactFlow, useStore } from '@xyflow/react';
import {
  AlignCenterHorizontal, AlignCenterVertical,
  AlignEndHorizontal, AlignEndVertical,
  AlignStartHorizontal, AlignStartVertical,
  Bug, Clock, Copy, Download, Eye, EyeOff, Group, Lock,
  Palette, Pencil,
  RotateCcw, ScanEye, Search, Settings, Trash2,
  Ungroup, Unlock, ZoomIn,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodeContext } from '@/contexts/node-context';
import { useFlowContext } from '@/contexts/flow-context';
import { cn } from '@/lib/utils';

interface ContextMenuState {
  x: number; y: number; nodeId: string;
  nodeName: string; nodeType: string;
  serverName?: string;
  isDisabled?: boolean; isLocked?: boolean; isProfiler?: boolean;
  hasBreakpoint?: boolean; groupId?: string;
  selectedCount?: number;
}

export function NodeContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [apos, setApos] = useState({ x: 0, y: 0 });

  const { getNodes, setNodes, deleteElements, fitView, getEdges } = useReactFlow();
  const { currentFlowId } = useFlowContext();
  const nodeContext = useNodeContext();

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    const kh = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', kh);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', kh); };
  }, [menu]);

  useEffect(() => {
    (window as any).__showNodeContextMenu = (opts: ContextMenuState | null) => { setMenu(opts); };
    return () => { delete (window as any).__showNodeContextMenu; };
  }, []);

  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const t = setTimeout(() => {
      const el = menuRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      let x = menu.x, y = menu.y;
      if (r.right > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
      if (r.bottom > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
      if (x < 4) x = 4; if (y < 4) y = 4;
      setApos({ x, y });
    }, 0);
    return () => clearTimeout(t);
  }, [menu]);

  // ── Read nodes from store ──
  const allNodes = useStore(s => s.nodes) as any[];

  // Use selectedCount passed from Flow.tsx (avoids stale store reads)
  const selCount = menu?.selectedCount || 1;
  const isMultiSelect = selCount > 1;

  // Breakpoint state
  const hasBreakpoint = useMemo(() => {
    if (!menu) return false;
    const flowId = currentFlowId?.toString() || null;
    const sd = nodeContext.getServerNodeDataForFlow(flowId);
    return !!(sd[menu.nodeId] as any)?.breakpoint;
  }, [menu, currentFlowId, nodeContext]);

  // ── Get IDs to operate on (multi-select: all selected; single: only clicked) ──
  const getTargetIds = useCallback((includeAnnotations = true): string[] => {
    if (!menu) return [];
    if (isMultiSelect) {
      const base = allNodes.filter((n: any) => n.selected);
      return includeAnnotations ? base.map((n: any) => n.id) : base.filter((n: any) => n.type !== 'annotation-node').map((n: any) => n.id);
    }
    return [menu.nodeId];
  }, [menu, isMultiSelect, allNodes]);

  // Check if any target (in multi-select) is an annotation node
  const hasAnnotationInSelection = useMemo(() => {
    if (!menu) return false;
    if (isMultiSelect) return allNodes.some((n: any) => n.selected && n.type === 'annotation-node');
    return menu.nodeType === 'annotation-node';
  }, [menu, isMultiSelect, allNodes]);

  // Check if current node is an annotation
  const isAnnotationNode = menu?.nodeType === 'annotation-node';

  // Get only non-annotation IDs for server-specific operations
  const getServerTargetIds = useCallback((): string[] => {
    if (!menu) return [];
    if (isMultiSelect) {
      return allNodes.filter((n: any) => n.selected && n.type !== 'annotation-node').map((n: any) => n.id);
    }
    return isAnnotationNode ? [] : [menu.nodeId];
  }, [menu, isMultiSelect, allNodes, isAnnotationNode]);

  // Align selected nodes (multi-select)
  const alignNodes = useCallback((dir: string) => {
    const sel = getNodes().filter(n => n.selected && n.type !== 'annotation-node');
    if (sel.length < 2) return;
    const positions = sel.map(n => n.position);
    setNodes(nds => nds.map(n => {
      if (!n.selected || n.type === 'annotation-node') return n;
      const node = { ...n, position: { ...n.position } };
      switch (dir) {
        case 'left':   node.position.x = Math.min(...positions.map(p => p.x)); break;
        case 'right':  node.position.x = Math.max(...positions.map(p => p.x)); break;
        case 'ch':     node.position.x = Math.round(positions.reduce((s, p) => s + p.x, 0) / positions.length); break;
        case 'top':    node.position.y = Math.min(...positions.map(p => p.y)); break;
        case 'bottom': node.position.y = Math.max(...positions.map(p => p.y)); break;
        case 'cv':     node.position.y = Math.round(positions.reduce((s, p) => s + p.y, 0) / positions.length); break;
      }
      return node;
    }));
    setMenu(null);
  }, [getNodes, setNodes]);

  // Delete
  const handleDelete = useCallback(() => {
    if (!menu) return;
    const ids = getTargetIds(true);
    deleteElements({ nodes: ids.map(id => ({ id })) });
    setMenu(null);
  }, [menu, getTargetIds, deleteElements]);

  // Duplicate (server nodes only)
  const handleDuplicate = useCallback(() => {
    if (!menu) return;
    const nodes = getNodes();
    const ids = getServerTargetIds();
    if (ids.length === 0) return;
    ids.forEach(nid => {
      const node = nodes.find(n => n.id === nid);
      if (!node) return;
      setNodes(nds => [...nds, {
        ...JSON.parse(JSON.stringify(node)),
        id: `dup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: false,
      }]);
    });
    setMenu(null);
  }, [menu, getNodes, setNodes, getServerTargetIds]);

  // Rename (only single)
  const handleRename = useCallback(() => {
    if (!menu || isMultiSelect) return;
    const nn = prompt('Rename:', menu.nodeName);
    if (nn?.trim()) setNodes(nds => nds.map(n => n.id === menu.nodeId ? { ...n, data: { ...n.data, name: nn.trim() } } : n));
    setMenu(null);
  }, [menu, isMultiSelect, setNodes]);

  // Toggle on ALL selected (server nodes only)
  const toggleOnSelected = useCallback((key: string) => {
    if (!menu) return;
    const ids = new Set(getServerTargetIds());
    if (ids.size === 0) return;
    setNodes(nds => nds.map(n => {
      if (!ids.has(n.id)) return n;
      const val = key === 'preview' ? (n.data as any)?.[key] !== false : !!(n.data as any)?.[key];
      return { ...n, data: { ...n.data, [key]: !val } };
    }));
    setMenu(null);
  }, [menu, getServerTargetIds, setNodes]);

  // Group: ALL selected (including annotations) → same groupId
  const handleGroup = useCallback(() => {
    if (!menu) return;
    const gid = `group_${Date.now().toString(36)}`;
    const ids = new Set(getTargetIds(true));
    setNodes(nds => nds.map(n => ids.has(n.id) ? { ...n, data: { ...n.data, groupId: gid } } : n));
    setMenu(null);
  }, [menu, getTargetIds, setNodes]);

  // Ungroup: ALL selected (including annotations) → remove groupId
  const handleUngroup = useCallback(() => {
    if (!menu) return;
    const ids = new Set(getTargetIds(true));
    setNodes(nds => nds.map(n => ids.has(n.id) ? { ...n, data: { ...n.data, groupId: undefined } } : n));
    setMenu(null);
  }, [menu, getTargetIds, setNodes]);

  // Select all in group
  const handleSelectGroup = useCallback(() => {
    if (!menu) return;
    const node = getNodes().find(n => n.id === menu.nodeId);
    const gid = (node?.data as any)?.groupId;
    if (!gid) return;
    setNodes(nds => nds.map(n => (n.data as any)?.groupId === gid ? { ...n, selected: true } : n));
    setMenu(null);
  }, [menu, getNodes, setNodes]);

  const handleReset = useCallback(() => {
    if (!menu) return;
    const flowId = currentFlowId?.toString() || null;
    const ids = getServerTargetIds();
    ids.forEach(nid => nodeContext.updateServerNode(flowId, nid, 'IDLE'));
    setMenu(null);
  }, [menu, currentFlowId, nodeContext, getServerTargetIds]);

  const handleExport = useCallback(() => {
    if (!menu) return;
    if (isAnnotationNode) return;
    const flowId = currentFlowId?.toString() || null;
    const sd = nodeContext.getServerNodeDataForFlow(flowId);
    const nd = sd[menu.nodeId];
    if (!nd?.result) { alert('No result. Run pipeline first.'); setMenu(null); return; }
    const blob = new Blob([JSON.stringify(nd.result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${menu.nodeName}_result.json`; a.click();
    setMenu(null);
  }, [menu, currentFlowId, nodeContext, isAnnotationNode]);

  const handleProperties = useCallback(() => {
    if (!menu) return;
    if (isAnnotationNode) return;
    (window as any).__showNodeProperties?.({ nodeId: menu.nodeId });
    setMenu(null);
  }, [menu, isAnnotationNode]);

  // Find References: highlight upstream + downstream connected nodes
  const handleFindReferences = useCallback(() => {
    if (!menu) return;
    if (isAnnotationNode) return;
    const allEdges = getEdges();
    const visited = new Set<string>();
    const queue = [menu.nodeId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      allEdges.forEach(e => {
        if (e.source === id && !visited.has(e.target)) queue.push(e.target);
        if (e.target === id && !visited.has(e.source)) queue.push(e.source);
      });
    }
    setNodes(nds => nds.map(n => ({ ...n, selected: visited.has(n.id) })));
    setMenu(null);
  }, [menu, getEdges, setNodes, isAnnotationNode]);

  // Set Color: native color picker via hidden input (all nodes including annotations)
  const handleSetColor = useCallback(() => {
    if (!menu) return;
    const node = getNodes().find(n => n.id === menu.nodeId);
    const currentColor = (node?.data as any)?.customColor || '#3b82f6';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentColor;
    input.style.position = 'fixed';
    input.style.top = '-100px';
    input.style.left = '-100px';
    document.body.appendChild(input);
    input.click();
    input.addEventListener('change', () => {
      const color = input.value;
      const ids = new Set(getTargetIds(true));
      setNodes(nds => nds.map(n => ids.has(n.id) ? { ...n, data: { ...n.data, customColor: color } } : n));
      document.body.removeChild(input);
      setMenu(null);
    }, { once: true });
    input.addEventListener('blur', () => {
      if (document.body.contains(input)) document.body.removeChild(input);
      setMenu(null);
    }, { once: true });
  }, [menu, getNodes, getTargetIds, setNodes]);

  if (!menu) return null;

  const nodeObj = getNodes().find(n => n.id === menu.nodeId);
  const hasGroup = !!(nodeObj?.data as any)?.groupId;
  const previewOff = nodeObj?.data?.preview === false;
  const title = selCount > 1 ? `${selCount} components selected` : menu.nodeName;
  // Show only limited options when all selected nodes are annotations
  const annotationOnly = selCount > 1 && allNodes.filter((n: any) => n.selected).every((n: any) => n.type === 'annotation-node');

  return (
    <div ref={menuRef}
      className="fixed z-[100] min-w-[200px] max-h-[90vh] overflow-y-auto bg-popover border rounded-lg shadow-lg py-1 text-sm"
      style={{ left: apos.x || menu.x, top: apos.y || menu.y }}>
      {/* Header */}
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b truncate max-w-[280px]">
        {title}
        {selCount <= 1 && menu.serverName && <span className="text-muted-foreground/60 ml-1">({menu.serverName})</span>}
        {isAnnotationNode && <span className="ml-1 text-amber-400/60">[note]</span>}
        {menu.isDisabled && <span className="ml-1 text-orange-400">[disabled]</span>}
        {menu.isLocked && <span className="ml-1 text-blue-400">[locked]</span>}
        {hasBreakpoint && <span className="ml-1 text-red-400">[bp]</span>}
        {previewOff && <span className="ml-1 text-muted-foreground/50">[preview off]</span>}
      </div>

      {/* Edit */}
      {!annotationOnly && (
        <>
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Edit</div>
          {!isAnnotationNode && !(selCount > 1 && hasAnnotationInSelection) && (
            <Row icon={<Copy size={14} />} label={selCount > 1 ? `Duplicate (${selCount})` : 'Duplicate'} onClick={handleDuplicate} />
          )}
          {selCount <= 1 && !isAnnotationNode && <Row icon={<Pencil size={14} />} label="Rename" onClick={handleRename} />}
          <Row icon={<Palette size={14} />} label={selCount > 1 ? `Set Color (${selCount})` : 'Set Color'} onClick={handleSetColor} />
          {selCount <= 1 && !isAnnotationNode && <Row icon={<Download size={14} />} label="Copy Config" onClick={() => {
            const n = getNodes().find(nn => nn.id === menu!.nodeId);
            if (n) navigator.clipboard.writeText(JSON.stringify({ type: n.type, data: n.data }, null, 2));
            setMenu(null);
          }} />}
        </>
      )}

      {/* Group */}
      <div className={annotationOnly ? "" : "border-t my-1"} />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Group</div>
      <Row icon={<Group size={14} />} label={selCount > 1 ? `Group (${selCount})` : 'Group'} onClick={handleGroup} />
      {hasGroup && <Row icon={<Ungroup size={14} />} label="Ungroup" onClick={handleUngroup} />}
      {hasGroup && <Row icon={<Group size={14} />} label="Select All in Group" onClick={handleSelectGroup} />}

      {/* Align (multi-select only, server nodes only) */}
      {selCount >= 2 && !annotationOnly && !(selCount > 1 && allNodes.filter((n: any) => n.selected && n.type === 'annotation-node').length === selCount) && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Align</div>
          <Row icon={<AlignStartVertical size={14} />} label="Align Left" onClick={() => { alignNodes('left'); }} />
          <Row icon={<AlignCenterVertical size={14} />} label="Align Center" onClick={() => { alignNodes('ch'); }} />
          <Row icon={<AlignEndVertical size={14} />} label="Align Right" onClick={() => { alignNodes('right'); }} />
          <Row icon={<AlignStartHorizontal size={14} />} label="Align Top" onClick={() => { alignNodes('top'); }} />
          <Row icon={<AlignCenterHorizontal size={14} />} label="Align Middle" onClick={() => { alignNodes('cv'); }} />
          <Row icon={<AlignEndHorizontal size={14} />} label="Align Bottom" onClick={() => { alignNodes('bottom'); }} />
        </>
      )}

      {/* View */}
      {!isAnnotationNode && !annotationOnly && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">View</div>
          {selCount <= 1 && <Row icon={<Settings size={14} />} label="Properties" onClick={handleProperties} />}
          {selCount <= 1 && <Row icon={<Search size={14} />} label="Find References" onClick={handleFindReferences} />}
          <Row icon={<ZoomIn size={14} />} label="Zoom to Fit" onClick={() => { fitView({ padding: 0.2, duration: 300 }); setMenu(null); }} />
          {selCount <= 1 && <Row icon={<ScanEye size={14} />} label="Export Result" onClick={handleExport} />}
        </>
      )}

      {/* Control (applies to ALL selected, server nodes only) */}
      {!isAnnotationNode && !annotationOnly && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Control</div>
          <Row icon={menu.isDisabled ? <Eye size={14} /> : <EyeOff size={14} />}
            label={menu.isDisabled ? 'Enable' : 'Disable'} onClick={() => toggleOnSelected('disabled')} />
          <Row icon={menu.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            label={menu.isLocked ? 'Unlock' : 'Lock'} onClick={() => toggleOnSelected('locked')} />
          <Row icon={<Clock size={14} />}
            label={menu.isProfiler ? 'Hide Profiler' : 'Show Profiler'} onClick={() => toggleOnSelected('profiler')} />
          <Row icon={<Bug size={14} />}
            label={hasBreakpoint ? 'Remove Breakpoint' : 'Set Breakpoint'} onClick={() => {
              const fid = currentFlowId?.toString() || null;
              if (!isAnnotationNode) nodeContext.updateServerNode(fid, menu.nodeId, { breakpoint: !hasBreakpoint } as any);
              setMenu(null);
            }} />
          <Row icon={<RotateCcw size={14} />} label="Reset State" onClick={handleReset} />
        </>
      )}

      {/* Danger */}
      <div className="border-t my-1" />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Danger</div>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-destructive hover:bg-destructive/10"
        onClick={handleDelete}>
        <Trash2 size={14} /> {selCount > 1 ? `Delete (${selCount})` : 'Delete'}
      </button>
    </div>
  );
}

// Helper row
function Row({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button className={cn(
      "w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 transition-colors",
      disabled ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-accent"
    )} onClick={disabled ? undefined : onClick}>
      {icon} {label}
    </button>
  );
}
