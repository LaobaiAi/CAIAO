import { useReactFlow } from '@xyflow/react';
import {
  AlignCenterHorizontal, AlignCenterVertical,
  AlignEndHorizontal, AlignEndVertical,
  AlignStartHorizontal, AlignStartVertical,
  Eye, EyeOff, Grid3X3, Group, MousePointer2,
  Scan, StickyNote, Trash2, Ungroup,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CanvasMenuState { x: number; y: number; }

export function CanvasContextMenu() {
  const [menu, setMenu] = useState<CanvasMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [apos, setApos] = useState({ x: 0, y: 0 });

  const { getNodes, setNodes, getEdges, setEdges, screenToFlowPosition, fitView } = useReactFlow();

  const selectedNodes = useMemo(() => getNodes().filter(n => n.selected), [getNodes]);
  const selectedEdges = useMemo(() => getEdges().filter(e => e.selected), [getEdges]);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(null); });
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  useEffect(() => {
    (window as any).__showCanvasContextMenu = (opts: { x: number; y: number } | null) => {
      if (!opts) { setMenu(null); return; }
      setMenu(opts); setApos(opts);
    };
    return () => { delete (window as any).__showCanvasContextMenu; };
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

  // ── Selection actions ──
  const selectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: true })));
    setEdges(eds => eds.map(e => ({ ...e, selected: true })));
    setMenu(null);
  }, [setNodes, setEdges]);

  const invertSelection = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: !n.selected })));
    setEdges(eds => eds.map(e => ({ ...e, selected: !e.selected })));
    setMenu(null);
  }, [setNodes, setEdges]);

  const deselectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: false })));
    setEdges(eds => eds.map(e => ({ ...e, selected: false })));
    setMenu(null);
  }, [setNodes, setEdges]);

  const zoomSelected = useCallback(() => {
    if (selectedNodes.length > 0) fitView({ nodes: selectedNodes, padding: 0.2, duration: 300 });
    setMenu(null);
  }, [selectedNodes, fitView]);

  // ── Group ──
  const groupSelection = useCallback(() => {
    const groupId = `group_${Date.now().toString(36)}`;
    setNodes(nds => nds.map(n => n.selected ? { ...n, data: { ...n.data, groupId } } : n));
    setMenu(null);
  }, [setNodes]);

  const ungroupSelection = useCallback(() => {
    setNodes(nds => nds.map(n => n.selected && (n.data as any)?.groupId
      ? { ...n, data: { ...n.data, groupId: undefined } } : n));
    setMenu(null);
  }, [setNodes]);

  const selectGroup = useCallback(() => {
    const selNode = selectedNodes[0];
    if (!selNode) return;
    const gid = (selNode.data as any)?.groupId;
    if (!gid) return;
    setNodes(nds => nds.map(n => (n.data as any)?.groupId === gid ? { ...n, selected: true } : n));
    setMenu(null);
  }, [selectedNodes, setNodes]);

  // ── Alignment ──
  const align = useCallback((dir: string) => {
    if (selectedNodes.length < 2) return;
    const pos = selectedNodes.map(n => n.position);
    setNodes(nds => nds.map(n => {
      if (!n.selected || n.type === 'annotation-node') return n;
      const node = { ...n, position: { ...n.position } };
      switch (dir) {
        case 'left':   node.position.x = Math.min(...pos.map(p => p.x)); break;
        case 'right':  node.position.x = Math.max(...pos.map(p => p.x)); break;
        case 'ch':     node.position.x = Math.round(pos.reduce((s, p) => s + p.x, 0) / pos.length); break;
        case 'top':    node.position.y = Math.min(...pos.map(p => p.y)); break;
        case 'bottom': node.position.y = Math.max(...pos.map(p => p.y)); break;
        case 'cv':     node.position.y = Math.round(pos.reduce((s, p) => s + p.y, 0) / pos.length); break;
        case 'dh': { const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x); const step = (sorted.at(-1)!.position.x - sorted[0].position.x) / (sorted.length - 1); const idx = sorted.findIndex(s => s.id === n.id); if (idx >= 0) node.position.x = sorted[0].position.x + step * idx; break; }
        case 'dv': { const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y); const step = (sorted.at(-1)!.position.y - sorted[0].position.y) / (sorted.length - 1); const idx = sorted.findIndex(s => s.id === n.id); if (idx >= 0) node.position.y = sorted[0].position.y + step * idx; break; }
      }
      return node;
    }));
    setMenu(null);
  }, [selectedNodes, setNodes]);

  // ── Edge operations ──
  const toggleEdge = useCallback((edgeId: string) => { setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, hidden: !e.hidden } : e)); setMenu(null); }, [setEdges]);
  const deleteEdge = useCallback((edgeId: string) => { setEdges(eds => eds.filter(e => e.id !== edgeId)); setMenu(null); }, [setEdges]);

  // Show all hidden wires
  const showAllWires = useCallback(() => {
    setEdges(eds => eds.map(e => ({
      ...e, hidden: false,
      data: { ...e.data, displayMode: 'display' as const },
    })));
    setMenu(null);
  }, [setEdges]);

  const addNote = useCallback(() => {
    if (!menu) return;
    const pos = screenToFlowPosition({ x: menu.x, y: menu.y });
    setNodes(nds => [...nds, { id: `note_${Date.now().toString(36)}`, type: 'annotation-node', position: pos, data: { name: 'Note', text: '' } } as any]);
    setMenu(null);
  }, [menu, screenToFlowPosition, setNodes]);

  if (!menu) return null;
  const selCount = selectedNodes.length;
  const edgeCount = selectedEdges.length;
  const hasGroup = selectedNodes.some(n => !!(n.data as any)?.groupId);

  return (
    <div ref={menuRef} className="fixed z-[100] min-w-[200px] max-h-[90vh] overflow-y-auto bg-popover border rounded-lg shadow-lg py-1 text-sm"
      style={{ left: apos.x || menu.x, top: apos.y || menu.y }}>

      {/* Selection */}
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Selection</div>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={selectAll}>
        <MousePointer2 size={14} /> Select All <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+A</span>
      </button>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={invertSelection}>
        <Scan size={14} /> Invert Selection <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Shift+I</span>
      </button>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={deselectAll}>
        <MousePointer2 size={14} /> Deselect All <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+D</span>
      </button>
      {selCount > 0 && (
        <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={zoomSelected}>
          <Scan size={14} /> Zoom to Selected <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+F</span>
        </button>
      )}

      {/* Group */}
      {selCount >= 1 && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Group</div>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={groupSelection}>
            <Group size={14} /> Group Selection ({selCount})
          </button>
          {hasGroup && (
            <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={ungroupSelection}>
              <Ungroup size={14} /> Ungroup
            </button>
          )}
          {hasGroup && (
            <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={selectGroup}>
              <Group size={14} /> Select All in Group
            </button>
          )}
        </>
      )}

      {/* Canvas */}
      <div className="border-t my-1" />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Canvas</div>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={addNote}>
        <StickyNote size={14} /> Add Note
      </button>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent"
        onClick={() => { (window as any).__toggleSnapToGrid?.(); setMenu(null); }}>
        <Grid3X3 size={14} /> Toggle Snap to Grid
      </button>
      {(() => {
        const hc = getEdges().filter(e => (e.data as any)?.displayMode === 'blind').length;
        if (hc > 0) return (
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-blue-400 hover:bg-accent"
            onClick={showAllWires}>
            <Scan size={14} /> Show All Wires ({hc} hidden)
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+M</span>
          </button>
        );
        return null;
      })()}

      {/* Edge selection */}
      {edgeCount > 0 && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Edge ({edgeCount})</div>
          {selectedEdges.map(edge => (
            <button key={edge.id} className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent"
              onClick={() => toggleEdge(edge.id)}>
              {edge.hidden ? <Eye size={14} /> : <EyeOff size={14} />} {edge.hidden ? 'Show' : 'Hide'} Edge
            </button>
          ))}
          {selectedEdges.map(edge => (
            <button key={`del-${edge.id}`} className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-destructive hover:bg-destructive/10"
              onClick={() => deleteEdge(edge.id)}>
              <Trash2 size={14} /> Delete Edge
            </button>
          ))}
        </>
      )}

      {/* Shortcuts reference */}
      <div className="border-t my-1" />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Tips</div>
      <div className="px-3 py-1 text-[10px] text-muted-foreground/70 leading-relaxed space-y-0.5">
        <div>🖱️ <b>Middle-click edge</b> → Delete wire</div>
        <div>📌 <b>Ctrl+Shift+1/2/3</b> → Save bookmark</div>
        <div>📌 <b>Ctrl+1/2/3</b> → Restore bookmark</div>
        <div>🖱️ <b>Right-click handle</b> → Data tree ops</div>
        <div>⌨️ <b>Esc</b> → Deselect all</div>
        <div>⌨️ <b>Home</b> → Reset view</div>
        <div>⌨️ <b>F2</b> → Rename selected</div>
        <div>⌨️ <b>Ctrl+C/V</b> → Copy/Paste</div>
        <div>⌨️ <b>Tab</b> → Wheel menu</div>
      </div>

      {/* Alignment (2+ nodes) */}
      {selCount >= 2 && (
        <>
          <div className="border-t my-1" />
          <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Align ({selCount})</div>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('left')}><AlignStartVertical size={14} /> Align Left</button>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('ch')}><AlignCenterVertical size={14} /> Align Center</button>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('right')}><AlignEndVertical size={14} /> Align Right</button>
          <div className="border-t my-0.5 mx-2 border-border/30" />
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('top')}><AlignStartHorizontal size={14} /> Align Top</button>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('cv')}><AlignCenterHorizontal size={14} /> Align Middle</button>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('bottom')}><AlignEndHorizontal size={14} /> Align Bottom</button>
          <div className="border-t my-0.5 mx-2 border-border/30" />
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('dh')}><AlignCenterVertical size={14} /> Distribute Horizontally</button>
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent" onClick={() => align('dv')}><AlignCenterHorizontal size={14} /> Distribute Vertically</button>
        </>
      )}
    </div>
  );
}
