import { useReactFlow } from '@xyflow/react';
import { GripVertical, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PropsState {
  nodeId: string;
}

export function NodePropertiesPanel() {
  const [state, setState] = useState<PropsState | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const { getNodes, setNodes, getViewport } = useReactFlow();

  useEffect(() => {
    (window as any).__showNodeProperties = (opts: PropsState | null) => {
      if (!opts) { setState(null); return; }
      // Position near the node on screen
      const node = getNodes().find(n => n.id === opts.nodeId);
      if (node) {
        const vp = getViewport();
        const sx = node.position.x * vp.zoom + vp.x;
        const sy = node.position.y * vp.zoom + vp.y;
        setPos({ x: sx + 260, y: sy - 20 }); // right side of node
      }
      setState(opts);
    };
    return () => { delete (window as any).__showNodeProperties; };
  }, [getNodes, getViewport]);

  const node = state ? getNodes().find(n => n.id === state.nodeId) : null;
  if (!node || !state) return null;

  const data = node.data || {};

  const updateData = (key: string, value: any) => {
    setNodes(nds => nds.map(n =>
      n.id === state.nodeId ? { ...n, data: { ...n.data, [key]: value } } : n
    ));
  };

  // Dragging
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.px + ev.clientX - dragStart.current.x,
        y: dragStart.current.py + ev.clientY - dragStart.current.y,
      });
    };
    const onUp = () => { dragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Clamp to viewport
  const sx = Math.min(Math.max(pos.x, 0), window.innerWidth - 300);
  const sy = Math.min(Math.max(pos.y, 0), window.innerHeight - 350);

  return (
    <div ref={panelRef}
      className="fixed z-[110] w-72 bg-popover border rounded-lg shadow-xl overflow-hidden"
      style={{ left: sx, top: sy }}>

      {/* Draggable header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        style={{ borderLeftWidth: '3px' }}>
        <GripVertical size={12} className="text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium text-primary truncate flex-1">
          {data.nickname || data.name || 'Node'}
        </span>
        <button onClick={() => setState(null)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-primary flex-shrink-0">
          <X size={13} />
        </button>
      </div>

      <div className="px-3 py-2 space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
        {/* Nickname */}
        <div>
          <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Nickname</label>
          <input type="text" value={data.nickname || ''}
            onChange={e => updateData('nickname', e.target.value)}
            placeholder="Custom name..."
            className="w-full mt-0.5 px-2 py-1 text-[11px] rounded border border-border bg-muted/50 text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        <div>
          <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
          <div className="w-full mt-0.5 px-2 py-1 text-[11px] rounded border border-border bg-muted/30 text-muted-foreground">
            {data.name || 'Unnamed'}
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">States</label>
          {[
            { label: 'Disabled',  key: 'disabled', color: 'accent-orange-400' },
            { label: 'Locked',    key: 'locked',   color: 'accent-blue-400' },
            { label: 'Preview',   key: 'preview',  color: 'accent-green-400', default: true },
            { label: 'Profiler',  key: 'profiler', color: 'accent-purple-400' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between py-0.5 cursor-pointer">
              <span className="text-[11px] text-primary">{item.label}</span>
              <input type="checkbox"
                checked={item.default ? (data as any)[item.key] !== false : !!(data as any)[item.key]}
                onChange={e => updateData(item.key, e.target.checked)}
                className={`w-3 h-3 ${item.color}`} />
            </label>
          ))}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-border text-[9px] text-muted-foreground">
        ID: {state.nodeId.slice(0, 10)}...
      </div>
    </div>
  );
}
