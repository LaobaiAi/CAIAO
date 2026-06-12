import { type NodeProps } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

export type AnnotationNodeData = {
  name?: string;
  text?: string;
  color?: string;
};

export function AnnotationNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as AnnotationNodeData;
  const [text, setText] = useState(nodeData.text || 'Double-click to edit...');
  const [editing, setEditing] = useState(false);

  const color = nodeData.color || 'bg-[#fef9e7] dark:bg-[#1a180e] border-[#f0e4c8] dark:border-[#3a3518]';

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (data) (data as any).text = text;
  }, [text, data]);

  return (
    <div
      className={cn(
        "min-w-[160px] max-w-[280px] rounded-sm border p-3 transition-all",
        editing && "nodrag",
        color,
        "shadow-[1px_1px_3px_rgba(0,0,0,0.08)]",
        selected && "ring-2 ring-amber-300 dark:ring-amber-600",
      )}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <StickyNote size={12} className="text-[#c0a060] dark:text-[#807040]" />
        <span className="text-[11px] font-medium text-[#8a7a50] dark:text-[#9a8a60]">{nodeData.name || 'Note'}</span>
      </div>
      {editing ? (
        <textarea
          autoFocus
          className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 resize-none outline-none min-h-[60px]"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Escape') handleBlur();
          }}
        />
      ) : (
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap cursor-text min-h-[20px] leading-relaxed select-text">
          {text}
        </div>
      )}
    </div>
  );
}
