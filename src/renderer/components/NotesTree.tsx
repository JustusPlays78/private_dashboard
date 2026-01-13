import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, Trash2 } from 'lucide-react';

export interface NoteItem {
  id: string;
  parentId?: string | null;
  name: string;
  type: number; // 1=word, 2=table, 3=canvas
  isFolder: boolean;
  content: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TreeNodeProps {
  item: NoteItem;
  allItems: NoteItem[];
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (item: NoteItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function TreeNode({ item, allItems, level, selectedId, expandedIds, onSelect, onToggle, onDelete, onAddChild }: TreeNodeProps) {
  const isExpanded = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const children = allItems.filter(i => i.parentId === item.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group ${
          isSelected ? 'bg-slate-600/40 text-white' : 'hover:bg-slate-700/50 text-slate-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(item)}
      >
        {item.isFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
            className="p-0.5 hover:bg-slate-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        {!item.isFolder && <div className="w-5" />}

        {item.isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        
        <span className="text-sm flex-1 truncate">{item.name}</span>
        
        <div className="hidden group-hover:flex items-center gap-1">
          {item.isFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(item.id);
              }}
              className="p-1 hover:bg-slate-600 rounded"
              title="Add child"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 hover:bg-red-500/20 rounded"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>
      
      {item.isFolder && isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              allItems={allItems}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NotesTreeProps {
  items: NoteItem[];
  selectedId: string | null;
  onSelect: (item: NoteItem) => void;
  onCreateNote: (parentId: string | null, isFolder: boolean) => void;
  onDelete: (id: string) => void;
}

export default function NotesTree({ items, selectedId, onSelect, onCreateNote, onDelete }: NotesTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Build root items (no parent)
  const rootItems = items.filter(item => !item.parentId);

  return (
    <div className="h-full flex flex-col bg-slate-800 border-r border-slate-700">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Notes</h3>
        <div className="flex gap-1">
          <button
            onClick={() => onCreateNote(null, true)}
            className="p-1 hover:bg-slate-700 rounded"
            title="New Folder"
          >
            <Folder className="w-4 h-4 text-yellow-400" />
          </button>
          <button
            onClick={() => onCreateNote(null, false)}
            className="p-1 hover:bg-slate-700 rounded"
            title="New Note"
          >
            <Plus className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {rootItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No notes yet
          </div>
        ) : (
          rootItems.map((item) => (
            <TreeNode
              key={item.id}
              item={item}
              allItems={items}
              level={0}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={toggleExpand}
              onDelete={onDelete}
              onAddChild={(parentId) => onCreateNote(parentId, false)}
            />
          ))
        )}
      </div>
    </div>
  );
}
