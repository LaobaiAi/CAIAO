import { useReactFlow } from '@xyflow/react';
import { ArrowLeftRight, Eye, Scan, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EdgeMenuState {
  x: number; y: number;
  edgeId: string; sourceId: string; targetId: string;
  displayMode?: 'display' | 'blind' | 'faint';
}

export function EdgeContextMenu() {
  const [menu, setMenu] = useState<EdgeMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [apos, setApos] = useState({ x: 0, y: 0 });
  const { getEdges, setEdges, deleteElements } = useReactFlow();

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(null); });
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  useEffect(() => {
    (window as any).__showEdgeContextMenu = (opts: EdgeMenuState | null) => {
      if (!opts) { setMenu(null); return; }
      setMenu(opts); setApos(opts);
    };
    return () => { delete (window as any).__showEdgeContextMenu; };
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

  // Cycle display mode: display → faint → blind → display
  const cycleDisplayMode = useCallback(() => {
    if (!menu) return;
    const current = menu.displayMode || 'display';
    const next = current === 'display' ? 'faint' : current === 'faint' ? 'blind' : 'display';
    setEdges(eds => eds.map(e => {
      if (e.id === menu.edgeId) return { ...e, data: { ...e.data, displayMode: next, _prevMode: current }, hidden: next === 'blind' };
      return e;
    }));
    setMenu(null);
  }, [menu, setEdges]);

  // Set specific mode
  const setDisplayMode = useCallback((mode: 'display' | 'blind' | 'faint') => {
    if (!menu) return;
    setEdges(eds => eds.map(e => {
      if (e.id === menu.edgeId) return { ...e, data: { ...e.data, displayMode: mode }, hidden: mode === 'blind' };
      return e;
    }));
    setMenu(null);
  }, [menu, setEdges]);

  // Show ALL wires (recover hidden)
  const showAllWires = useCallback(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      hidden: false,
      data: { ...e.data, displayMode: 'display' },
    })));
    setMenu(null);
  }, [setEdges]);

  const removeWire = useCallback(() => {
    if (!menu) return;
    deleteElements({ edges: [{ id: menu.edgeId }] });
    setMenu(null);
  }, [menu, deleteElements]);

  const reverseWire = useCallback(() => {
    if (!menu) return;
    setEdges(eds => eds.map(e => {
      if (e.id === menu.edgeId) return { ...e, source: menu.targetId, target: menu.sourceId, data: { ...e.data, reversed: true } };
      return e;
    }));
    setMenu(null);
  }, [menu, setEdges]);

  if (!menu) return null;

  const current = menu.displayMode || 'display';
  const modeLabel: Record<string, string> = {
    display: 'Normal — fully visible',
    blind:   'Blind — hidden (Ctrl+M to recover)',
    faint:   'Faint — dimmed dashed',
  };

  // Count hidden edges
  const hiddenCount = getEdges().filter(e => (e.data as any)?.displayMode === 'blind').length;

  return (
    <div ref={menuRef}
      className="fixed z-[100] min-w-[220px] max-h-[90vh] overflow-y-auto bg-popover border rounded-lg shadow-lg py-1 text-sm"
      style={{ left: apos.x || menu.x, top: apos.y || menu.y }}>
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
        Wire → {menu.targetId.slice(0, 8)}...
      </div>

      {/* Display mode selector */}
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Display</div>
      <div className="px-3 py-1 text-[10px] text-muted-foreground">{modeLabel[current]}</div>

      <div className="flex gap-1 px-3 py-1">
        {(['display', 'faint', 'blind'] as const).map(mode => (
          <button key={mode} onClick={() => setDisplayMode(mode)}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors
              ${current === mode
                ? 'border-blue-400 bg-blue-400/10 text-blue-400 font-medium'
                : 'border-border text-muted-foreground hover:border-blue-400/50 hover:text-primary'}`}>
            {mode === 'display' ? 'Normal' : mode === 'faint' ? 'Faint' : 'Blind'}
          </button>
        ))}
      </div>

      {/* Operations */}
      <div className="border-t my-1" />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Operations</div>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent"
        onClick={reverseWire}>
        <ArrowLeftRight size={14} /> Reverse Direction
      </button>
      <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-destructive hover:bg-destructive/10"
        onClick={removeWire}>
        <Trash2 size={14} /> Remove Wire
      </button>

      {/* Show all wires */}
      {hiddenCount > 0 && (
        <>
          <div className="border-t my-1" />
          <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-blue-400 hover:bg-accent"
            onClick={showAllWires}>
            <Scan size={14} /> Show All Wires ({hiddenCount} hidden)
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+M</span>
          </button>
        </>
      )}
    </div>
  );
}
