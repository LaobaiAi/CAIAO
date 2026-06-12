import { useReactFlow, useStore } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';

const GROUP_COLORS = [
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f43f5e', '#3b82f6', '#10b981', '#06b6d4',
];

// Approximate fallback dimensions for nodes that haven't been measured yet
const FALLBACK_SIZE: Record<string, { w: number; h: number }> = {
  'annotation-node': { w: 200, h: 72 },
  'server-node': { w: 224, h: 160 },
  'input-server-node': { w: 224, h: 144 },
  'output-server-node': { w: 224, h: 144 },
  'merge-server-node': { w: 224, h: 160 },
};

export function GroupBoxes() {
  const { setNodes } = useReactFlow();
  const nodes = useStore(s => s.nodes);
  const transform = useStore(s => s.transform);
  const [vx, vy, zoom] = transform;

  // Editing state: groupId -> editing mode
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Stable color assignment: each groupId gets a fixed color index by insertion order
  const colorMapRef = useRef<Map<string, number>>(new Map());

  // Group name → read from first node in group, or default
  const getGroupName = useCallback((gid: string, count: number) => {
    const firstNode = nodes.find((n: any) => n.data?.groupId === gid);
    return (firstNode?.data as any)?.groupName || `Group (${count})`;
  }, [nodes]);

  const groupRects = useMemo(() => {
    const groups = new Map<string, {
      xs: number[]; ys: number[]; w: number[]; h: number[];
    }>();
    nodes.forEach((n: any) => {
      const gid = n.data?.groupId;
      if (!gid) return;
      if (!groups.has(gid)) groups.set(gid, { xs: [], ys: [], w: [], h: [] });
      const g = groups.get(gid)!;
      g.xs.push(n.position.x);
      g.ys.push(n.position.y);
      // Use measured dimensions if available, otherwise fallback
      const measuredW = n.measured?.width;
      const measuredH = n.measured?.height;
      if (measuredW && measuredH) {
        g.w.push(measuredW);
        g.h.push(measuredH);
      } else {
        const fb = FALLBACK_SIZE[n.type as string] || FALLBACK_SIZE['server-node'];
        g.w.push(fb.w);
        g.h.push(fb.h);
      }
    });

    const currentIds = new Set(groups.keys());
    const colorMap = colorMapRef.current;

    // Remove stale entries (groups that no longer exist)
    for (const gid of colorMap.keys()) {
      if (!currentIds.has(gid)) colorMap.delete(gid);
    }

    // Assign colors to new groups: find first free slot
    const usedIndices = new Set(colorMap.values());
    for (const [gid] of groups) {
      if (colorMap.has(gid)) continue;
      let idx = 0;
      while (usedIndices.has(idx)) idx++;
      colorMap.set(gid, idx);
      usedIndices.add(idx);
    }

    return Array.from(groups.entries()).map(([gid, g]) => {
      const pad = 16; const topPad = 60;
      const x = Math.min(...g.xs) - pad;
      const y = Math.min(...g.ys) - topPad;
      const w = Math.max(...g.xs.map((xi, i) => xi + g.w[i])) - Math.min(...g.xs) + pad * 2;
      const h = Math.max(...g.ys.map((yi, i) => yi + g.h[i])) - Math.min(...g.ys) + topPad + pad;
      const color = GROUP_COLORS[colorMap.get(gid)! % GROUP_COLORS.length];
      const count = g.xs.length;
      const name = getGroupName(gid, count);
      return { id: gid, color, x, y, w, h, count, name };
    });
  }, [nodes, getGroupName]);

  // ── Drag to move entire group ──
  const dragRef = useRef<{
    groupId: string;
    startX: number;
    startY: number;
    nodeStartPositions: Map<string, { x: number; y: number }>;
  } | null>(null);

  const handleTitleMouseDown = useCallback((e: React.MouseEvent, gb: typeof groupRects[0]) => {
    if (editingGroupId) return;
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const nodeStarts = new Map<string, { x: number; y: number }>();
    nodes.forEach((n: any) => {
      if (n.data?.groupId === gb.id) {
        nodeStarts.set(n.id, { x: n.position.x, y: n.position.y });
      }
    });
    dragRef.current = { groupId: gb.id, startX: startMouseX, startY: startMouseY, nodeStartPositions: nodeStarts };

    const handleMouseMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (me.clientX - dragRef.current.startX) / zoom;
      const dy = (me.clientY - dragRef.current.startY) / zoom;
      setNodes(nds => nds.map(n => {
        const startPos = dragRef.current!.nodeStartPositions.get(n.id);
        if (!startPos) return n;
        return {
          ...n,
          position: { x: startPos.x + dx, y: startPos.y + dy },
        };
      }));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [nodes, setNodes, zoom, editingGroupId]);

  // ── Double-click to edit group name ──
  const handleTitleDoubleClick = useCallback((e: React.MouseEvent, gb: typeof groupRects[0]) => {
    e.stopPropagation();
    e.preventDefault();
    const currentName = gb.name === `Group (${gb.count})` ? '' : gb.name;
    setEditValue(currentName);
    setEditingGroupId(gb.id);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const finishEditing = useCallback(() => {
    if (!editingGroupId) return;
    const newName = editValue.trim();
    if (newName) {
      setNodes(nds => nds.map(n =>
        n.data?.groupId === editingGroupId
          ? { ...n, data: { ...n.data, groupName: newName } }
          : n
      ));
    }
    setEditingGroupId(null);
    setEditValue('');
  }, [editingGroupId, editValue, setNodes]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') finishEditing();
    if (e.key === 'Escape') { setEditingGroupId(null); setEditValue(''); }
  }, [finishEditing]);

  // Prevent ReactFlow from intercepting interactions on group elements
  const preventFlowIntercept = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (groupRects.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {groupRects.map(gb => {
        const sx = gb.x * zoom + vx;
        const sy = gb.y * zoom + vy;
        const sw = gb.w * zoom;
        const sh = gb.h * zoom;
        return (
          <div key={gb.id} className="absolute pointer-events-none"
            style={{ left: sx, top: sy, width: sw, height: sh }}>
            {/* Bounding rect */}
            <div className="absolute inset-0 rounded-lg border-2"
              style={{ borderColor: gb.color, backgroundColor: `${gb.color}08` }} />
            {/* Draggable & editable label — scales with zoom, base size 1.5x */}
            {editingGroupId === gb.id ? (
              <div className="absolute left-0 pointer-events-auto"
                style={{ top: -30 * zoom }}
                onMouseDown={preventFlowIntercept}
                onDoubleClick={preventFlowIntercept}
                onClick={preventFlowIntercept}>
                <input
                  ref={inputRef}
                  className="font-semibold whitespace-nowrap bg-popover border outline-none rounded"
                  style={{
                    color: gb.color,
                    borderColor: gb.color,
                    fontSize: 15 * zoom,
                    padding: `${3 * zoom}px ${9 * zoom}px`,
                    width: Math.max(editValue.length * 12 * zoom + 60 * zoom, 120 * zoom),
                  }}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={finishEditing}
                  onKeyDown={handleEditKeyDown}
                />
              </div>
            ) : (
              <div
                className="absolute left-0 font-semibold whitespace-nowrap pointer-events-auto cursor-grab active:cursor-grabbing select-none rounded"
                style={{
                  top: -30 * zoom,
                  color: gb.color,
                  backgroundColor: `${gb.color}18`,
                  fontSize: 15 * zoom,
                  padding: `${3 * zoom}px ${9 * zoom}px`,
                }}
                onMouseDown={(e) => handleTitleMouseDown(e, gb)}
                onDoubleClick={(e) => handleTitleDoubleClick(e, gb)}
                onClick={preventFlowIntercept}
                title="Drag to move group | Double-click to rename"
              >
                {gb.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
