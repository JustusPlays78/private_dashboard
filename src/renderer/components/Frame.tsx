import React, { useState } from 'react';

interface FrameProps {
  id: string;
  title: string;
  color: string;
  isSelected: boolean;
  onTitleChange: (title: string) => void;
  onColorChange: (color: string) => void;
}

const FRAME_COLORS = [
  { name: 'Gray', value: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
  { name: 'Blue', value: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { name: 'Green', value: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  { name: 'Purple', value: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  { name: 'Orange', value: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { name: 'Pink', value: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
];

export default function Frame({
  id,
  title,
  color,
  isSelected,
  onTitleChange,
  onColorChange,
}: FrameProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorInfo = FRAME_COLORS.find(c => c.value === color) || FRAME_COLORS[0];

  return (
    <div
      className="h-full w-full relative pointer-events-none"
      style={{
        backgroundColor: colorInfo.bg,
        borderRadius: '12px',
        border: `2px dashed ${color}`,
        boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none',
      }}
    >
      {/* Frame border overlay - catches events only on the border, not the content */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          borderRadius: '12px',
          // Only capture events on the edges (8px border area)
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 8px 8px, 8px calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 8px, 8px 8px)',
        }}
      />

      {/* Frame Title */}
      <div
        className="absolute -top-7 left-2 flex items-center gap-2 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setIsEditingTitle(false);
              }
            }}
            className="px-2 py-0.5 text-sm font-medium bg-white border border-slate-300 rounded outline-none focus:border-slate-500"
            style={{ color }}
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium cursor-pointer hover:opacity-80"
            style={{ color }}
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {title || 'Frame'}
          </span>
        )}

        {/* Color picker - visible when selected */}
        {isSelected && (
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: color }}
              title="Change Color"
            />

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 flex gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-50">
                {FRAME_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      onColorChange(c.value);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                      color === c.value ? 'ring-2 ring-offset-1 ring-slate-500' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame content area - just visual, actual elements are rendered separately */}
      <div className="h-full w-full p-4 pointer-events-none">
        {/* This is transparent - elements inside are rendered at the canvas level */}
      </div>
    </div>
  );
}

export { FRAME_COLORS };
