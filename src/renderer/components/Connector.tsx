import React from 'react';

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';
export type LineStyle = 'straight' | 'curved' | 'orthogonal';

interface ConnectorProps {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lineStyle?: LineStyle;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  lineColor?: string;
  lineWidth?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function Connector({
  id,
  fromX,
  fromY,
  toX,
  toY,
  lineStyle = 'straight',
  arrowStart = false,
  arrowEnd = true,
  lineColor = '#6366f1',
  lineWidth = 2,
  isSelected = false,
  onClick,
  onDelete,
}: ConnectorProps) {
  const activeColor = isSelected ? '#3b82f6' : lineColor;
  const markerId = `arrow-${id}`;
  const markerStartId = `arrow-start-${id}`;

  // Calculate path based on line style
  const getPath = () => {
    const dx = toX - fromX;
    const dy = toY - fromY;

    switch (lineStyle) {
      case 'curved':
        // Bezier curve with control points for smooth S-curve
        const cx1 = fromX + dx * 0.5;
        const cy1 = fromY;
        const cx2 = fromX + dx * 0.5;
        const cy2 = toY;
        return `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;

      case 'orthogonal':
        // Right-angle path
        const midX = fromX + dx / 2;
        return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;

      case 'straight':
      default:
        return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }
  };

  return (
    <g className="connector-group" onClick={onClick}>
      {/* Define arrow markers - SVG markers auto-orient to path tangent */}
      <defs>
        {/* Arrow marker for end of line */}
        <marker
          id={markerId}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 12 6 L 0 12 L 3 6 Z"
            fill={activeColor}
          />
        </marker>
        {/* Arrow marker for start of line (reversed) */}
        <marker
          id={markerStartId}
          markerWidth="12"
          markerHeight="12"
          refX="2"
          refY="6"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 12 6 L 0 12 L 3 6 Z"
            fill={activeColor}
          />
        </marker>
      </defs>

      {/* Invisible wider path for easier clicking */}
      <path
        d={getPath()}
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        style={{ cursor: 'pointer' }}
      />

      {/* Visible line with markers */}
      <path
        d={getPath()}
        stroke={activeColor}
        strokeWidth={isSelected ? lineWidth + 1 : lineWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={arrowEnd ? `url(#${markerId})` : undefined}
        markerStart={arrowStart ? `url(#${markerStartId})` : undefined}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      />

      {/* Delete button when selected */}
      {isSelected && onDelete && (
        <g
          transform={`translate(${(fromX + toX) / 2}, ${(fromY + toY) / 2})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle r="10" fill="#ef4444" />
          <path
            d="M -4 -4 L 4 4 M -4 4 L 4 -4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}

// Helper to calculate anchor point position on an element
export function getAnchorPoint(
  element: { x: number; y: number; width: number; height: number },
  anchor: AnchorPosition
): { x: number; y: number } {
  switch (anchor) {
    case 'top':
      return { x: element.x + element.width / 2, y: element.y };
    case 'right':
      return { x: element.x + element.width, y: element.y + element.height / 2 };
    case 'bottom':
      return { x: element.x + element.width / 2, y: element.y + element.height };
    case 'left':
      return { x: element.x, y: element.y + element.height / 2 };
  }
}

// Helper to find best anchor points between two elements
export function findBestAnchors(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number }
): { fromAnchor: AnchorPosition; toAnchor: AnchorPosition } {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let fromAnchor: AnchorPosition;
  let toAnchor: AnchorPosition;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      fromAnchor = 'right';
      toAnchor = 'left';
    } else {
      fromAnchor = 'left';
      toAnchor = 'right';
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      fromAnchor = 'bottom';
      toAnchor = 'top';
    } else {
      fromAnchor = 'top';
      toAnchor = 'bottom';
    }
  }

  return { fromAnchor, toAnchor };
}
