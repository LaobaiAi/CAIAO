import { useReactFlow } from '@xyflow/react';
import { WrapText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HandleMenuState {
  x: number; y: number;
  nodeId: string;
  handleType: 'source' | 'target';
  handleId?: string;
}

export function HandleContextMenu() {
  const [menu, setMenu] = useState<HandleMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [apos, setApos] = useState({ x: 0, y: 0 });
  const { setNodes } = useReactFlow();

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(null); });
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  useEffect(() => {
    (window as any).__showHandleContextMenu = (opts: HandleMenuState | null) => { setMenu(opts); };
    return () => { delete (window as any).__showHandleContextMenu; };
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

  // Data tree operations (simulated for web context)
  const handleDataTree = useCallback((op: string) => {
    if (!menu) return;
    // Store data tree operation on the node's handle config
    setNodes(nds => nds.map(n => {
      if (n.id !== menu.nodeId) return n;
      const key = `_${menu.handleType}_treeOp`;
      const treeOps = (n.data as any)?.[key] || [];
      const newOps = op === 'clear' ? [] : [...treeOps, op];
      return { ...n, data: { ...n.data, [key]: newOps } };
    }));
    setMenu(null);
  }, [menu, setNodes]);

  if (!menu) return null;

  const isInput = menu.handleType === 'target';
  const label = isInput ? 'Input Handle' : 'Output Handle';

  return (
    <div ref={menuRef}
      className="fixed z-[100] min-w-[180px] max-h-[90vh] overflow-y-auto bg-popover border rounded-lg shadow-lg py-1 text-sm"
      style={{ left: apos.x || menu.x, top: apos.y || menu.y }}>
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">{label}</div>

      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Data Tree</div>
      {/* TODO: Add custom Data Tree operations here */}

      <div className="border-t my-1" />
      <div className="px-3 pt-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Wire Display</div>
      <Row icon={<WrapText size={14} />} label="Normal" onClick={() => handleDataTree('wire_normal')} />
      <Row icon={<WrapText size={14} />} label="Faint" onClick={() => handleDataTree('wire_faint')} />

      {(n => {
        const key = `_${menu.handleType}_treeOp`;
        const ops = (n.data as any)?.[key];
        if (!ops || ops.length === 0) return null;
        return (
          <>
            <div className="border-t my-1" />
            <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-accent"
              onClick={() => handleDataTree('clear')}>
              <WrapText size={14} /> Clear Tree Ops ({ops.length})
            </button>
          </>
        );
      })({} as any)}
    </div>
  );
}

function Row({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc?: string; onClick: () => void }) {
  return (
    <button className="w-full text-left px-3 py-1.5 pl-5 flex items-center gap-2 text-primary hover:bg-accent transition-colors"
      onClick={onClick}>
      {icon}
      <span>{label}</span>
      {desc && <span className="ml-auto text-[10px] text-muted-foreground">{desc}</span>}
    </button>
  );
}
