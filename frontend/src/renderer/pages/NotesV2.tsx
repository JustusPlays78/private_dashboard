import { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Type,
  Palette,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import NotesTree, { NoteItem } from '../components/NotesTree';
import TipTapEditor from '../components/TipTapEditor';

interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  positionLocked: boolean;
  content?: string;
  imageUrl?: string;
  color?: string;
  zIndex: number;
}

const COLORS = [
  '#fef08a', // yellow
  '#bfdbfe', // blue
  '#d9f99d', // green
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#f3f4f6', // gray
];

export default function NotesV2() {
  const [noteItems, setNoteItems] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalParentId, setCreateModalParentId] = useState<string | null>(null);
  const [createModalIsFolder, setCreateModalIsFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNoteItems();
  }, []);

  // Load selected note's canvas content
  useEffect(() => {
    if (selectedNote && selectedNote.type === 3) {
      try {
        const elements = selectedNote.content ? JSON.parse(selectedNote.content) : [];
        setCanvasElements(elements);
      } catch (e) {
        setCanvasElements([]);
      }
    }
  }, [selectedNote]);

  const loadNoteItems = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/note-items');
      const data = await response.json();
      if (data.items) {
        setNoteItems(data.items);
      }
    } catch (error) {
      console.error('Failed to load note items:', error);
    }
  };

  const createNoteItem = async (parentId: string | null, isFolder: boolean) => {
    setCreateModalParentId(parentId);
    setCreateModalIsFolder(isFolder);
    setNewItemName('');
    setShowCreateModal(true);
  };

  const handleCreateConfirm = async () => {
    if (!newItemName.trim()) return;

    try {
      const response = await fetch('http://localhost:8080/api/note-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: createModalParentId,
          name: newItemName.trim(),
          type: 3, // Default to canvas
          is_folder: createModalIsFolder,
          content: createModalIsFolder ? '' : '[]',
          position: noteItems.length,
        }),
      });

      if (response.ok) {
        await loadNoteItems();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const deleteNoteItem = async (id: string) => {
    setDeleteItemId(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    try {
      const response = await fetch(`http://localhost:8080/api/note-items/${deleteItemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (selectedNote?.id === deleteItemId) {
          setSelectedNote(null);
        }
        await loadNoteItems();
        setShowDeleteConfirm(false);
        setDeleteItemId(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const saveCanvas = async () => {
    if (!selectedNote) return;

    try {
      await fetch(`http://localhost:8080/api/note-items/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedNote.name,
          content: JSON.stringify(canvasElements),
          position: selectedNote.position,
          parent_id: selectedNote.parent_id,
        }),
      });
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  };

  // Auto-save canvas periodically
  useEffect(() => {
    if (selectedNote && canvasElements.length > 0) {
      const timer = setTimeout(saveCanvas, 2000);
      return () => clearTimeout(timer);
    }
  }, [canvasElements, selectedNote]);

  const addTextElement = () => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'text',
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      positionLocked: false,
      content: '<p>New note...</p>',
      color: COLORS[0],
      zIndex: canvasElements.length,
    };
    setCanvasElements([...canvasElements, newElement]);
  };

  const addImageElement = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newElement: CanvasElement = {
          id: Date.now().toString(),
          type: 'image',
          x: 150,
          y: 150,
          width: 300,
          height: 200,
          positionLocked: false,
          imageUrl: event.target?.result as string,
          zIndex: canvasElements.length,
        };
        setCanvasElements([...canvasElements, newElement]);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePositionLock = (id: string) => {
    setCanvasElements(canvasElements.map(el =>
      el.id === id ? { ...el, positionLocked: !el.positionLocked } : el
    ));
  };

  const deleteElement = (id: string) => {
    setCanvasElements(canvasElements.filter(el => el.id !== id));
    setSelectedElementId(null);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElements(canvasElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (!element || element.positionLocked) return;

    setSelectedElementId(id);
    setDraggedId(id);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedId || !canvasRef.current) return;

    const element = canvasElements.find(el => el.id === draggedId);
    if (!element || element.positionLocked) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    updateElement(draggedId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggedId(null);
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...canvasElements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  // Render modals (always visible)
  const modals = (
    <>
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              {createModalIsFolder ? 'New Folder' : 'New Note'}
            </h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setShowCreateModal(false);
              }}
              placeholder="Enter name..."
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfirm}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Item</h3>
            <p className="text-slate-300 mb-4">
              Are you sure you want to delete this item and all its children?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItemId(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!selectedNote) {
    return (
      <div className="h-screen flex">
        {modals}
        <div className="w-64">
          <NotesTree
            items={noteItems}
            selectedId={null}
            onSelect={setSelectedNote}
            onCreateNote={createNoteItem}
            onDelete={deleteNoteItem}
          />
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Type className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Select a note to start editing</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedNote.is_folder) {
    return (
      <div className="h-screen flex">
        {modals}
        <div className="w-64">
          <NotesTree
            items={noteItems}
            selectedId={selectedNote.id}
            onSelect={setSelectedNote}
            onCreateNote={createNoteItem}
            onDelete={deleteNoteItem}
          />
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <p>This is a folder. Select a note to edit.</p>
          </div>
        </div>
      </div>
    );
  }

  // Canvas view for type 3 notes
  return (
    <>
      {modals}
      <div className="h-screen flex">
        <div className="w-64">
          <NotesTree
            items={noteItems}
            selectedId={selectedNote.id}
            onSelect={setSelectedNote}
            onCreateNote={createNoteItem}
            onDelete={deleteNoteItem}
          />
        </div>

        <div className="flex-1 flex flex-col bg-slate-900">
        {/* Toolbar */}
        <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex-1">{selectedNote.name}</h2>
          
          <button
            onClick={addTextElement}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center gap-2"
          >
            <Type className="w-4 h-4" />
            Text
          </button>
          
          <button
            onClick={addImageElement}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-slate-900"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => setSelectedElementId(null)}
        >
          {canvasElements.map((element) => {
            const isSelected = selectedElementId === element.id;
            
            return (
              <div
                key={element.id}
                className={`absolute cursor-move ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  zIndex: element.zIndex,
                  backgroundColor: element.type === 'text' ? element.color : undefined,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(e, element.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(element.id);
                  bringToFront(element.id);
                }}
              >
                {element.type === 'text' ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-1 bg-black/10">
                      <div className="flex gap-1">
                        <select
                          value={element.color}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateElement(element.id, { color: e.target.value });
                          }}
                          className="text-xs bg-black/20 rounded px-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {COLORS.map((color) => (
                            <option key={color} value={color} style={{ backgroundColor: color }}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePositionLock(element.id);
                          }}
                          className="p-1 hover:bg-black/20 rounded"
                          title={element.positionLocked ? 'Unlock' : 'Lock'}
                        >
                          {element.positionLocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div 
                      className="flex-1 overflow-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TipTapEditor
                        content={element.content || '<p>New note...</p>'}
                        onChange={(content) => updateElement(element.id, { content })}
                        className="h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full relative group">
                    <img
                      src={element.imageUrl}
                      alt="canvas"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePositionLock(element.id);
                        }}
                        className="p-1 bg-black/50 hover:bg-black/70 rounded"
                      >
                        {element.positionLocked ? (
                          <Lock className="w-3 h-3 text-white" />
                        ) : (
                          <Unlock className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteElement(element.id);
                        }}
                        className="p-1 bg-red-500/50 hover:bg-red-500/70 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
