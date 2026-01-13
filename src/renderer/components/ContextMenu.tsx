import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Group,
  Ungroup,
  Lock,
  Unlock,
  Copy,
  Clipboard,
  Trash2,
  CopyPlus,
  Table,
  StickyNote,
  Image,
  Frame,
  Palette,
  ChevronRight,
  LayoutTemplate,
  X,
} from 'lucide-react';

// Sticky note colors
const STICKY_COLORS = [
  { name: 'Yellow', value: '#fef9c3', border: '#eab308' },
  { name: 'Blue', value: '#dbeafe', border: '#3b82f6' },
  { name: 'Green', value: '#dcfce7', border: '#22c55e' },
  { name: 'Pink', value: '#fce7f3', border: '#ec4899' },
  { name: 'Purple', value: '#f3e8ff', border: '#a855f7' },
  { name: 'Orange', value: '#ffedd5', border: '#f97316' },
];

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  // Actions
  onBringToFront: () => void;
  onSendToBack: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  // Create actions
  onAddStickyNote?: () => void;
  onAddStickyNoteWithColor?: (color: string) => void;
  onAddTable?: () => void;
  onAddImage?: () => void;
  onAddFrame?: () => void;
  onShowTemplates?: () => void;
  // Color change for sticky notes
  onColorChange?: (color: string) => void;
  currentColor?: string;
  elementType?: 'sticky' | 'image' | 'connector' | 'table' | 'frame';
  // State
  isMultiSelect: boolean;
  isGrouped: boolean;
  isLocked: boolean;
  canPaste: boolean;
  isCanvasMenu?: boolean; // true when right-clicking on canvas background
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onBringToFront,
  onSendToBack,
  onGroup,
  onUngroup,
  onLock,
  onUnlock,
  onDuplicate,
  onDelete,
  onCopy,
  onPaste,
  onAddStickyNote,
  onAddStickyNoteWithColor,
  onAddTable,
  onAddImage,
  onAddFrame,
  onShowTemplates,
  onColorChange,
  currentColor,
  elementType,
  isMultiSelect,
  isGrouped,
  isLocked,
  canPaste,
  isCanvasMenu,
}: ContextMenuProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'addNote' | 'changeColor'>('none');
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x, y });

  // Adjust menu position to keep it on screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      if (x + rect.width > window.innerWidth - 20) {
        newX = window.innerWidth - rect.width - 20;
      }
      if (y + rect.height > window.innerHeight - 20) {
        newY = window.innerHeight - rect.height - 20;
      }

      setMenuPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  const MenuItem = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    danger,
    disabled,
    hasSubmenu,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
    hasSubmenu?: boolean;
  }) => (
    <button
      onClick={() => {
        if (!disabled) {
          onClick();
          if (!hasSubmenu) {
            onClose();
          }
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
        disabled
          ? 'text-slate-500 cursor-not-allowed'
          : danger
          ? 'text-red-400 hover:bg-red-500/20'
          : 'text-slate-200 hover:bg-slate-700'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-slate-500">{shortcut}</span>
      )}
      {hasSubmenu && (
        <ChevronRight className="w-4 h-4 text-slate-500" />
      )}
    </button>
  );

  const Divider = () => <div className="border-t border-slate-700 my-1" />;

  // Color panel component
  const ColorPanel = ({
    title,
    onSelect,
    selectedColor
  }: {
    title: string;
    onSelect: (color: string) => void;
    selectedColor?: string;
  }) => (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <button
          onClick={() => setActivePanel('none')}
          className="p-1 hover:bg-slate-700 rounded text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STICKY_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => {
              onSelect(color.value);
              onClose();
            }}
            className={`w-10 h-10 rounded-lg transition-all hover:scale-105 border-2 ${
              selectedColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
            }`}
            style={{ backgroundColor: color.value, borderColor: color.border }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-700 min-w-[200px] overflow-hidden"
        style={{
          left: menuPosition.x,
          top: menuPosition.y,
          maxHeight: 'calc(100vh - 40px)',
        }}
      >
        {activePanel === 'addNote' ? (
          <ColorPanel
            title="Choose Note Color"
            onSelect={(color) => onAddStickyNoteWithColor?.(color)}
          />
        ) : activePanel === 'changeColor' ? (
          <ColorPanel
            title="Change Color"
            onSelect={(color) => onColorChange?.(color)}
            selectedColor={currentColor}
          />
        ) : isCanvasMenu ? (
          /* Canvas Background Menu - Create new elements */
          <div className="py-1">
            <MenuItem
              icon={StickyNote}
              label="Add Sticky Note"
              onClick={() => setActivePanel('addNote')}
              hasSubmenu
            />
            {onAddTable && (
              <MenuItem
                icon={Table}
                label="Add Table"
                onClick={onAddTable}
              />
            )}
            {onAddImage && (
              <MenuItem
                icon={Image}
                label="Add Image"
                onClick={onAddImage}
              />
            )}
            {onAddFrame && (
              <MenuItem
                icon={Frame}
                label="Add Frame"
                onClick={onAddFrame}
              />
            )}
            <Divider />
            {onShowTemplates && (
              <MenuItem
                icon={LayoutTemplate}
                label="Use Template"
                onClick={onShowTemplates}
              />
            )}
            <Divider />
            <MenuItem
              icon={Clipboard}
              label="Paste"
              shortcut="Ctrl+V"
              onClick={onPaste}
              disabled={!canPaste}
            />
          </div>
        ) : (
          /* Element Menu - Actions on selected element */
          <div className="py-1">
            {/* Color picker for sticky notes */}
            {elementType === 'sticky' && onColorChange && (
              <>
                <button
                  onClick={() => setActivePanel('changeColor')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Palette className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Change Color</span>
                  <div
                    className="w-4 h-4 rounded border border-slate-500"
                    style={{ backgroundColor: currentColor }}
                  />
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <Divider />
              </>
            )}

            <MenuItem
              icon={ArrowUpToLine}
              label="Bring to Front"
              shortcut="Ctrl+]"
              onClick={onBringToFront}
              disabled={isLocked}
            />
            <MenuItem
              icon={ArrowDownToLine}
              label="Send to Back"
              shortcut="Ctrl+["
              onClick={onSendToBack}
              disabled={isLocked}
            />

            <Divider />

            {isMultiSelect && !isGrouped && (
              <MenuItem
                icon={Group}
                label="Group"
                shortcut="Ctrl+G"
                onClick={onGroup}
                disabled={isLocked}
              />
            )}
            {isGrouped && (
              <MenuItem
                icon={Ungroup}
                label="Ungroup"
                shortcut="Ctrl+Shift+G"
                onClick={onUngroup}
                disabled={isLocked}
              />
            )}

            {(isMultiSelect || isGrouped) && <Divider />}

            {isLocked ? (
              <MenuItem
                icon={Unlock}
                label="Unlock"
                onClick={onUnlock}
              />
            ) : (
              <MenuItem
                icon={Lock}
                label="Lock"
                onClick={onLock}
              />
            )}

            <Divider />

            <MenuItem
              icon={CopyPlus}
              label="Duplicate"
              shortcut="Ctrl+D"
              onClick={onDuplicate}
              disabled={isLocked}
            />
            <MenuItem
              icon={Trash2}
              label="Delete"
              shortcut="Del"
              onClick={onDelete}
              danger
              disabled={isLocked}
            />

            <Divider />

            <MenuItem
              icon={Copy}
              label="Copy"
              shortcut="Ctrl+C"
              onClick={onCopy}
            />
            <MenuItem
              icon={Clipboard}
              label="Paste"
              shortcut="Ctrl+V"
              onClick={onPaste}
              disabled={!canPaste}
            />
          </div>
        )}
      </div>
    </>
  );
}
