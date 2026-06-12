import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { EdgeTypes } from '@xyflow/react';

/**
 * CAIAO-style Interactive Edge with three display modes:
 * - display (default): full visible wire with arrow
 * - blind: hidden wire (still exists, not rendered)
 * - faint: dimmed dashed wire (faintly visible)
 */

function InteractiveEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  selected, style = {}, markerEnd,
  animated, hidden, data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const displayMode = (data as any)?.displayMode || 'display';

  // Blind mode: completely hidden
  if (displayMode === 'blind') {
    return (
      <BaseEdge id={id} path={edgePath}
        style={{ stroke: 'transparent', strokeWidth: 0, opacity: 0, pointerEvents: 'none' }}
      />
    );
  }

  if (displayMode === 'faint' || hidden) {
    return (
      <BaseEdge id={id} path={edgePath}
        style={{
          stroke: '#94a3b8', strokeWidth: 0.6,
          strokeDasharray: '4 6', opacity: 0.2,
          cursor: 'pointer',
        }}
        markerEnd={markerEnd}
      />
    );
  }

  // Display mode: normal
  const stroke = selected ? '#16a34a' : (style.stroke as string || '#94a3b8');
  const width = selected ? 1.5 : 1;

  return (
    <>
      {/* Invisible fat hitbox for easier clicking */}
      <BaseEdge id={id} path={edgePath}
        style={{ strokeWidth: 12, opacity: 0, cursor: 'pointer' }}
      />
      {/* Visible edge */}
      <BaseEdge id={id} path={edgePath}
        style={{ stroke, strokeWidth: width, transition: 'stroke 0.15s', cursor: 'pointer' }}
        markerEnd={markerEnd}
      />
      {/* Selected glow */}
      {selected && (
        <path d={edgePath} fill="none" stroke="#16a34a" strokeWidth={4} opacity={0.12} />
      )}
      {/* Animated flow during execution */}
      {animated && (
        <path d={edgePath} fill="none" stroke="#60a5fa" strokeWidth={1.5}
          strokeDasharray="5 10" strokeLinecap="round"
          style={{ animation: 'flowDash 0.8s linear infinite' }}
        />
      )}
      <style>{`@keyframes flowDash { to { stroke-dashoffset: -15; } }`}</style>
    </>
  );
}

export const edgeTypes = {
  'interactive-edge': InteractiveEdge,
} satisfies EdgeTypes;
