import { cn } from '@/lib/utils';
import { Handle, Position } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { ReactNode } from 'react';

export interface NodeShellProps {
  id: string;
  selected?: boolean;
  isConnectable?: boolean;
  icon: ReactNode;
  iconColor?: string;
  name: string;
  description?: string;
  children: ReactNode;
  hasLeftHandle?: boolean;
  hasRightHandle?: boolean;
  status?: string;
  width?: string;
  disabled?: boolean;
  locked?: boolean;
  leftHandleLabel?: string;
  rightHandleLabel?: string;
  customColor?: string;
}

const statusDot: Record<string, string> = {
  'IDLE':       'bg-gray-400',
  'IN_PROGRESS':'bg-blue-400 animate-pulse',
  'COMPLETE':   'bg-green-400',
  'ERROR':      'bg-red-400',
};

export function NodeShell({
  id,
  selected,
  isConnectable,
  icon,
  iconColor,
  name,
  description,
  children,
  hasLeftHandle = true,
  hasRightHandle = true,
  status = 'IDLE',
  width = 'w-56',
  disabled = false,
  locked = false,
  leftHandleLabel,
  rightHandleLabel,
  customColor,
}: NodeShellProps) {
  const isInProgress = status === 'IN_PROGRESS';
  const dot = statusDot[status] || 'bg-gray-400';

  return (
    <div
      className={cn(
        "react-flow__node-default relative select-none rounded-md border bg-card transition-all duration-200",
        width,
        !selected && !disabled && "hover:border-blue-400/50 hover:shadow-md hover:shadow-blue-400/10",
        !disabled && "cursor-pointer",
        selected && "border-blue-400 shadow-lg ring-1 ring-blue-400/30 scale-[1.02]",
        disabled && "opacity-40 grayscale cursor-default",
        locked && "cursor-default",
        "border-border"
      )}
      style={customColor && !selected ? { borderColor: customColor, borderWidth: 2 } : undefined}
      data-id={id}
      data-nodeid={id}
    >
      {/* Disabled banner */}
      {disabled && (
        <div className="absolute top-0 left-0 right-0 bg-orange-500/80 text-white text-[10px] text-center py-0.5 rounded-t-md font-medium z-10">
          DISABLED
        </div>
      )}

      {/* Locked indicator */}
      {locked && (
        <div className="absolute top-1 right-1 z-10 bg-blue-500/80 rounded-full p-0.5" title="Locked">
          <Lock size={10} className="text-white" />
        </div>
      )}

      {/* Animated progress border */}
      {isInProgress && (
        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none">
          <div className="absolute inset-0 border-2 border-blue-400 rounded-md animate-pulse" />
        </div>
      )}

      {/* Header: icon + name + status dot */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/50">
        <div className={cn(
          "flex items-center justify-center h-6 w-6 rounded",
          iconColor || "text-muted-foreground"
        )}>
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {name}
        </span>
        <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} title={status} />
      </div>

      {/* Description */}
      {description && (
        <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground border-b border-border/30 leading-tight">
          {description}
        </div>
      )}

      {/* Body */}
      <div className="px-2.5 py-2">
        {children}
      </div>

      {/* Handles with labels */}
      {hasLeftHandle && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {leftHandleLabel && (
            <span className="text-[9px] text-muted-foreground ml-1 leading-none max-w-[48px] truncate">
              {leftHandleLabel}
            </span>
          )}
          <Handle
            type="target"
            position={Position.Left}
            className={cn(
              "!static !w-2.5 !h-2.5 !rounded-full !border-2 !border-gray-400 !bg-card",
              "hover:!border-blue-400 hover:!bg-blue-100 dark:hover:!bg-blue-900 hover:!w-3 hover:!h-3",
              "transition-all duration-150"
            )}
            isConnectable={isConnectable}
          />
        </div>
      )}
      {hasRightHandle && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Handle
            type="source"
            position={Position.Right}
            className={cn(
              "!static !w-2.5 !h-2.5 !rounded-full !border-2 !border-gray-400 !bg-card",
              "hover:!border-blue-400 hover:!bg-blue-100 dark:hover:!bg-blue-900 hover:!w-3 hover:!h-3",
              "transition-all duration-150"
            )}
            isConnectable={isConnectable}
          />
          {rightHandleLabel && (
            <span className="text-[9px] text-muted-foreground mr-1 leading-none max-w-[48px] truncate">
              {rightHandleLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
