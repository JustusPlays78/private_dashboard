import { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Lock,
  Unlock,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Folder,
  FileText,
  Move,
  Hand,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Triangle,
  Star,
  Diamond,
  Copy,
  Undo2,
  Redo2
} from 'lucide-react';
import TipTapEditor from '../components/TipTapEditor';

interface NoteItem {
  id: string;
  parent_id?: string | null;
  name: string;
  type: number;
  is_folder: boolean;
  content: string;
  position: number;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'connector';
  x: number;
  y: number;
  width: number;
  height: number;
  positionLocked: boolean;
  content?: string;
  imageUrl?: string;
  color?: string;
  shape?: 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'star' | 'diamond';
  zIndex: number;
  isEditing?: boolean;
  // For connectors
  fromId?: string;
  toId?: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
}

const COLORS = [
  { name: 'Yellow', value: '#fff9c4', dark: '#f9a825' },
  { name: 'Blue', value: '#e3f2fd', dark: '#1976d2' },
  { name: 'Green', value: '#e8f5e9', dark: '#388e3c' },
  { name: 'Pink', value: '#fce4ec', dark: '#c2185b' },
  { name: 'Purple', value: '#f3e5f5', dark: '#7b1fa2' },
  { name: 'Orange', value: '#fff3e0', dark: '#f57c00' },
  { name: 'Teal', value: '#e0f2f1', dark: '#00897b' },
  { name: 'Gray', value: '#f5f5f5', dark: '#616161' },
];

export default function NotesCanvas() {
  const [noteItems, setNoteItems] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]); // Multi-select
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Undo/Redo
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Multi-select box
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  
  // Clipboard
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  
  // Canvas viewport
  const [viewportX, setViewportX] = useState(0);
  const [viewportY, setViewportY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalParentId, setCreateModalParentId] = useState<string | null>(null);
  const [createModalIsFolder, setCreateModalIsFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNoteItems();
    
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in editor
      const target = e.target as HTMLElement;
      if (target.closest('.ProseMirror') || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setTool('pan');
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setSelectedElementIds([]);
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelected();
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        paste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          deleteElement(selectedElementId);
        }
        selectedElementIds.forEach(id => deleteElement(id));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  useEffect(() => {
    if (selectedNote && canvasElements.length > 0) {
      const timer = setTimeout(saveCanvas, 2000);
      return () => clearTimeout(timer);
    }
  }, [canvasElements, selectedNote]);

  const loadNoteItems = async () => {
    try {
      const result = await window.electronAPI.noteItems.getAll();
      if (result.items) {
        setNoteItems(result.items);
        // Auto-select first non-folder note
        const firstNote = result.items.find((item: NoteItem) => !item.is_folder);
        if (firstNote && !selectedNote) {
          setSelectedNote(firstNote);
        }
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
      const result = await window.electronAPI.noteItems.create({
        parent_id: createModalParentId,
        name: newItemName.trim(),
        type: 3,
        is_folder: createModalIsFolder,
        content: createModalIsFolder ? '' : '[]',
        position: noteItems.length,
      });

      if (result.success) {
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
      const result = await window.electronAPI.noteItems.delete(deleteItemId);

      if (result.success) {
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
      await window.electronAPI.noteItems.update(selectedNote.id, {
        name: selectedNote.name,
        content: JSON.stringify(canvasElements),
        position: selectedNote.position,
        parent_id: selectedNote.parent_id,
      });
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  };

  const addTextElement = (color?: string) => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'text',
      x: -viewportX / zoom + 200,
      y: -viewportY / zoom + 200,
      width: 280,
      height: 200,
      positionLocked: false,
      content: '<p>New note...</p>',
      color: color || COLORS[0].value,
      zIndex: canvasElements.length,
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
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
          x: -viewportX / zoom + 150,
          y: -viewportY / zoom + 150,
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

  const addShape = (shape: 'rectangle' | 'circle') => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'shape',
      x: -viewportX / zoom + 200,
      y: -viewportY / zoom + 200,
      width: 200,
      height: 150,
      positionLocked: false,
      color: COLORS[4].value,
      shape,
      content: '<p></p>', // Shapes können jetzt auch Text haben
      zIndex: canvasElements.length,
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  const togglePositionLock = (id: string) => {
    const newElements = canvasElements.map(el =>
      el.id === id ? { ...el, positionLocked: !el.positionLocked } : el
    );
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  const deleteElement = (id: string) => {
    const newElements = canvasElements.filter(el => el.id !== id);
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementId(null);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    const newElements = canvasElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  // Undo/Redo
  const addToHistory = (elements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    if (newHistory.length > 50) newHistory.shift(); // Max 50 steps
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCanvasElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCanvasElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Copy/Paste
  const copySelected = () => {
    const ids = selectedElementId ? [selectedElementId] : selectedElementIds;
    const elementsToCopy = canvasElements.filter(el => ids.includes(el.id));
    setClipboard(JSON.parse(JSON.stringify(elementsToCopy)));
  };

  const paste = () => {
    if (clipboard.length === 0) return;
    
    const pastedElements = clipboard.map(el => ({
      ...el,
      id: Date.now().toString() + Math.random(),
      x: el.x + 50,
      y: el.y + 50,
      zIndex: canvasElements.length + 1,
    }));
    
    const newElements = [...canvasElements, ...pastedElements];
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementIds(pastedElements.map(el => el.id));
  };

  // Add more shapes
  const addAdvancedShape = (shape: 'triangle' | 'arrow' | 'star' | 'diamond') => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'shape',
      x: -viewportX / zoom + 200,
      y: -viewportY / zoom + 200,
      width: 200,
      height: 150,
      positionLocked: false,
      color: COLORS[4].value,
      shape,
      content: '<p></p>',
      zIndex: canvasElements.length,
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    if (tool === 'pan') return;
    
    const element = canvasElements.find(el => el.id === id);
    if (!element || element.positionLocked) return;
    
    // Don't start drag if editing text
    if (element.isEditing) return;
    if (!element || element.positionLocked) return;

    setSelectedElementId(id);
    setDraggedId(id);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    e.stopPropagation();
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    const element = canvasElements.find(el => el.id === id);
    if (!element || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left - viewportX) / zoom;
    const mouseY = (e.clientY - canvasRect.top - viewportY) / zoom;

    setResizingId(id);
    setResizeHandle(handle);
    setResizeStart({
      x: mouseX,
      y: mouseY,
      width: element.width,
      height: element.height,
    });
    setSelectedElementId(id);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Right-click or middle-click for panning
    if (tool === 'pan' || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewportX, y: e.clientY - viewportY });
      e.preventDefault();
    } else if (tool === 'select' && e.ctrlKey && canvasRef.current) {
      // Start box selection with Ctrl+Drag
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const startX = (e.clientX - canvasRect.left - viewportX) / zoom;
      const startY = (e.clientY - canvasRect.top - viewportY) / zoom;
      setIsBoxSelecting(true);
      setSelectionStart({ x: startX, y: startY });
      setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
    } else {
      setSelectedElementId(null);
      setSelectedElementIds([]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewportX(e.clientX - panStart.x);
      setViewportY(e.clientY - panStart.y);
    } else if (isBoxSelecting && canvasRef.current) {
      // Update box selection
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - canvasRect.left - viewportX) / zoom;
      const mouseY = (e.clientY - canvasRect.top - viewportY) / zoom;
      
      const x = Math.min(selectionStart.x, mouseX);
      const y = Math.min(selectionStart.y, mouseY);
      const width = Math.abs(mouseX - selectionStart.x);
      const height = Math.abs(mouseY - selectionStart.y);
      
      setSelectionBox({ x, y, width, height });
      
      // Find elements in box
      const selectedIds = canvasElements
        .filter(el => {
          return (
            el.x + el.width > x &&
            el.x < x + width &&
            el.y + el.height > y &&
            el.y < y + height
          );
        })
        .map(el => el.id);
      
      setSelectedElementIds(selectedIds);
    } else if (resizingId && canvasRef.current) {
      const element = canvasElements.find(el => el.id === resizingId);
      if (!element) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - canvasRect.left - viewportX) / zoom;
      const mouseY = (e.clientY - canvasRect.top - viewportY) / zoom;
      
      const deltaX = mouseX - resizeStart.x;
      const deltaY = mouseY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = element.x;
      let newY = element.y;

      if (resizeHandle?.includes('e')) {
        newWidth = Math.max(100, resizeStart.width + deltaX);
      }
      if (resizeHandle?.includes('w')) {
        newWidth = Math.max(100, resizeStart.width - deltaX);
        newX = resizeStart.x + (resizeStart.width - newWidth);
      }
      if (resizeHandle?.includes('s')) {
        newHeight = Math.max(80, resizeStart.height + deltaY);
      }
      if (resizeHandle?.includes('n')) {
        newHeight = Math.max(80, resizeStart.height - deltaY);
        newY = resizeStart.y + (resizeStart.height - newHeight);
      }

      updateElement(resizingId, { width: newWidth, height: newHeight, x: newX, y: newY });
    } else if (draggedId && canvasRef.current) {
      const element = canvasElements.find(el => el.id === draggedId);
      if (!element || element.positionLocked) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - viewportX - dragOffset.x) / zoom;
      const newY = (e.clientY - canvasRect.top - viewportY - dragOffset.y) / zoom;

      updateElement(draggedId, { x: newX, y: newY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedId(null);
    setResizingId(null);
    setResizeHandle(null);
    setIsBoxSelecting(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
      setZoom(newZoom);
    }
  };

  const zoomIn = () => setZoom(Math.min(3, zoom * 1.2));
  const zoomOut = () => setZoom(Math.max(0.1, zoom / 1.2));
  const resetZoom = () => { setZoom(1); setViewportX(0); setViewportY(0); };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...canvasElements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  const notes = noteItems.filter(item => !item.is_folder);

  const modals = (
    <>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Item</h3>
            <p className="text-slate-300 mb-4">
              Are you sure you want to delete this item?
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
      <>
        {modals}
        <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No notes yet. Create one to get started!</p>
            <button
              onClick={() => createNoteItem(null, false)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded"
            >
              Create First Note
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {modals}
      <div className="h-screen flex flex-col bg-slate-900">
        {/* Topbar */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3">
          {/* Note Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
            >
              <FileText className="w-4 h-4" />
              <span className="max-w-xs truncate">{selectedNote.name}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
                <div className="p-2">
                  <button
                    onClick={() => {
                      createNoteItem(null, false);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded text-sm text-slate-300"
                  >
                    <Plus className="w-4 h-4" />
                    New Note
                  </button>
                </div>
                <div className="border-t border-slate-700">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setSelectedNote(note);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-700 text-sm text-left ${
                        selectedNote.id === note.id ? 'bg-slate-700 text-white' : 'text-slate-300'
                      }`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{note.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-slate-700 rounded p-1">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded ${tool === 'select' ? 'bg-purple-600' : 'hover:bg-slate-600'}`}
              title="Select (V)"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('pan')}
              className={`p-2 rounded ${tool === 'pan' ? 'bg-purple-600' : 'hover:bg-slate-600'}`}
              title="Pan (H)"
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-700 rounded p-1">
            <button onClick={zoomOut} className="p-2 hover:bg-slate-600 rounded" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm text-white min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} className="p-2 hover:bg-slate-600 rounded" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={resetZoom} className="p-2 hover:bg-slate-600 rounded" title="Reset">
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Elements */}
          <div className="flex items-center gap-1">
            {COLORS.slice(0, 4).map((color) => (
              <button
                key={color.value}
                onClick={() => addTextElement(color.value)}
                className="w-8 h-8 rounded border-2 border-slate-600 hover:border-white transition-colors"
                style={{ backgroundColor: color.value }}
                title={`Add ${color.name} Note`}
              />
            ))}
            
            <button
              onClick={addImageElement}
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addShape('rectangle')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Rectangle"
            >
              <Square className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addShape('circle')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Circle"
            >
              <Circle className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addAdvancedShape('triangle')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Triangle"
            >
              <Triangle className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addAdvancedShape('diamond')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Diamond"
            >
              <Diamond className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addAdvancedShape('star')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Star"
            >
              <Star className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => addAdvancedShape('arrow')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
              title="Add Arrow"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

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
          className="flex-1 relative overflow-hidden bg-slate-900"
          style={{ 
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            cursor: tool === 'pan' || isPanning ? 'grab' : 'default'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              transform: `translate(${viewportX}px, ${viewportY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {canvasElements.map((element) => {
              const isSelected = selectedElementId === element.id;
              
              return (
                <div
                  key={element.id}
                  className={`absolute transition-all ${
                    isSelected 
                      ? 'ring-3 ring-blue-500 ring-offset-2 ring-offset-slate-900' 
                      : 'hover:ring-2 hover:ring-blue-400/50'
                  }`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex,
                    cursor: tool === 'select' && !element.positionLocked && !element.isEditing ? 'move' : 'default',
                  }}
                  onMouseDown={(e) => {
                    // Start drag if not clicking inside the editor
                    const target = e.target as HTMLElement;
                    if (!target.closest('.ProseMirror') && !target.closest('.tiptap-editor')) {
                      handleElementMouseDown(e, element.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(element.id);
                    bringToFront(element.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Double click to start editing
                    updateElement(element.id, { isEditing: true });
                  }}
                >
                  {/* Resize Handles */}
                  {isSelected && !element.positionLocked && (
                    <>
                      {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
                        <div
                          key={handle}
                          onMouseDown={(e) => handleResizeMouseDown(e, element.id, handle)}
                          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-md hover:scale-125 transition-transform"
                          style={{
                            cursor: `${handle}-resize`,
                            top: handle.includes('n') ? -6 : handle.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                            left: handle.includes('w') ? -6 : handle.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                            zIndex: 10,
                          }}
                        />
                      ))}
                    </>
                  )}
                  {element.type === 'text' ? (
                    <div 
                      className="h-full flex flex-col rounded-xl shadow-xl transition-all hover:shadow-2xl" 
                      style={{ backgroundColor: element.color, border: `2px solid ${COLORS.find(c => c.value === element.color)?.dark || '#000'}20` }}
                    >
                      <div className="flex items-center justify-end gap-1 p-2 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex gap-0.5 mr-auto">
                          {COLORS.map((color) => (
                            <button
                              key={color.value}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateElement(element.id, { color: color.value });
                              }}
                              className={`w-6 h-6 rounded-full shadow-sm hover:scale-110 transition-transform ${
                                element.color === color.value ? 'ring-2 ring-offset-1 ring-slate-800' : ''
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePositionLock(element.id);
                          }}
                          className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                          title={element.positionLocked ? 'Unlock Position' : 'Lock Position'}
                        >
                          {element.positionLocked ? (
                            <Lock className="w-4 h-4" style={{ color: COLORS.find(c => c.value === element.color)?.dark }} />
                          ) : (
                            <Unlock className="w-4 h-4" style={{ color: COLORS.find(c => c.value === element.color)?.dark }} />
                          )}
                        </button>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <div 
                        className="flex-1 overflow-auto px-4 pb-4 cursor-text"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        <TipTapEditor
                          content={element.content || '<p>Type something...</p>'}
                          onChange={(content) => updateElement(element.id, { content })}
                          editable={true}
                          className="h-full"
                        />
                      </div>
                    </div>
                  ) : element.type === 'shape' ? (
                    <div 
                      className="w-full h-full border-2 group relative transition-all hover:shadow-xl"
                      style={{
                        backgroundColor: element.color,
                        borderColor: `${COLORS.find(c => c.value === element.color)?.dark || '#000'}40`,
                        borderRadius: element.shape === 'circle' ? '50%' : element.shape === 'rectangle' ? '12px' : '0',
                        clipPath: element.shape === 'triangle' 
                          ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
                          : element.shape === 'diamond'
                          ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                          : element.shape === 'star'
                          ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                          : 'none',
                      }}
                    >
                      {element.shape === 'arrow' && (
                        <svg
                          viewBox="0 0 100 100"
                          className="absolute inset-0 w-full h-full"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <marker
                              id={`arrowhead-${element.id}`}
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="3"
                              orient="auto"
                            >
                              <polygon
                                points="0 0, 10 3, 0 6"
                                fill={COLORS.find(c => c.value === element.color)?.dark || '#000'}
                              />
                            </marker>
                          </defs>
                          <line
                            x1="10"
                            y1="50"
                            x2="90"
                            y2="50"
                            stroke={COLORS.find(c => c.value === element.color)?.dark || '#000'}
                            strokeWidth="6"
                            markerEnd={`url(#arrowhead-${element.id})`}
                          />
                        </svg>
                      )}
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePositionLock(element.id);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all"
                        >
                          {element.positionLocked ? (
                            <Lock className="w-4 h-4" style={{ color: COLORS.find(c => c.value === element.color)?.dark }} />
                          ) : (
                            <Unlock className="w-4 h-4" style={{ color: COLORS.find(c => c.value === element.color)?.dark }} />
                          )}
                        </button>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-red-50 rounded-lg shadow-md transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      
                      {element.shape !== 'arrow' && (
                        <div 
                          className="w-full h-full overflow-auto text-center flex items-center justify-center p-4"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            updateElement(element.id, { isEditing: true });
                          }}
                          onBlur={() => updateElement(element.id, { isEditing: false })}
                          style={{
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}
                        >
                          <TipTapEditor
                            content={element.content || '<p></p>'}
                            onChange={(content) => updateElement(element.id, { content })}
                            editable={true}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full relative group rounded-xl overflow-hidden shadow-xl transition-all hover:shadow-2xl bg-white">
                      <img
                        src={element.imageUrl}
                        alt="canvas"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePositionLock(element.id);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all"
                        >
                          {element.positionLocked ? (
                            <Lock className="w-4 h-4 text-slate-700" />
                          ) : (
                            <Unlock className="w-4 h-4 text-slate-700" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-red-50 rounded-lg shadow-md transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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
