import { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  FileText,
  Move,
  Hand,
  Minus,
} from 'lucide-react';
import StickyNote, { COLORS } from '../components/StickyNote';
import ContextMenu from '../components/ContextMenu';
import Connector, { getAnchorPoint, findBestAnchors, AnchorPosition, LineStyle } from '../components/Connector';
import CanvasTable, { createDefaultTableData, TableData } from '../components/CanvasTable';
import Frame, { FRAME_COLORS } from '../components/Frame';
import TemplatePicker, { CANVAS_TEMPLATES, CanvasTemplate } from '../components/CanvasTemplates';

interface NoteItem {
  id: string;
  parentId?: string | null;
  name: string;
  type: number;
  isFolder: boolean;
  content: string;
  position: number;
}

interface CanvasElement {
  id: string;
  type: 'sticky' | 'image' | 'connector' | 'table' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  imageUrl?: string;
  color?: string;
  zIndex: number;
  isEditing?: boolean;
  // Grouping
  groupId?: string;
  // Locking
  locked?: boolean;
  // Connector properties
  fromElementId?: string;
  toElementId?: string;
  fromAnchor?: AnchorPosition;
  toAnchor?: AnchorPosition;
  lineStyle?: LineStyle;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  lineColor?: string;
  // Table properties
  tableData?: TableData;
  // Frame properties
  frameTitle?: string;
  frameColor?: string;
}

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

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string | null; isCanvasMenu: boolean } | null>(null);

  // Connector creation
  const [isCreatingConnector, setIsCreatingConnector] = useState(false);
  const [connectorStart, setConnectorStart] = useState<{ elementId: string; anchor: AnchorPosition } | null>(null);
  const [connectorPreview, setConnectorPreview] = useState<{ x: number; y: number } | null>(null);

  // Template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [lastContextMenuPos, setLastContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load notes on mount
  useEffect(() => {
    loadNoteItems();
  }, []);

  // Keyboard shortcuts - needs to update when state changes
  useEffect(() => {
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
        // Undo inline to avoid stale closure
        if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setCanvasElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        // Redo inline to avoid stale closure
        if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setCanvasElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        // Copy inline
        const ids = selectedElementId ? [selectedElementId] : selectedElementIds;
        const elementsToCopy = canvasElements.filter(el => ids.includes(el.id));
        setClipboard(JSON.parse(JSON.stringify(elementsToCopy)));
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        // Paste inline
        if (clipboard.length > 0) {
          const pastedElements = clipboard.map(el => ({
            ...el,
            id: Date.now().toString() + Math.random(),
            x: el.x + 50,
            y: el.y + 50,
            zIndex: canvasElements.length + 1,
          }));
          const newElements = [...canvasElements, ...pastedElements];
          setCanvasElements(newElements);
          // Add to history
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(newElements)));
          if (newHistory.length > 50) newHistory.shift();
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          setSelectedElementIds(pastedElements.map(el => el.id));
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const idsToDelete = selectedElementId ? [selectedElementId, ...selectedElementIds] : selectedElementIds;
        if (idsToDelete.length > 0) {
          const newElements = canvasElements.filter(el => !idsToDelete.includes(el.id));
          setCanvasElements(newElements);
          // Add to history
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(newElements)));
          if (newHistory.length > 50) newHistory.shift();
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          setSelectedElementId(null);
          setSelectedElementIds([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedElementId, selectedElementIds, canvasElements, clipboard]);

  // Load canvas elements and restore viewport when note changes
  useEffect(() => {
    if (selectedNote && selectedNote.type === 3) {
      try {
        const elements = selectedNote.content ? JSON.parse(selectedNote.content) : [];
        setCanvasElements(elements);

        // Restore saved viewport position for this note
        const savedViewport = localStorage.getItem(`canvas-viewport-${selectedNote.id}`);
        if (savedViewport) {
          const { x, y, z } = JSON.parse(savedViewport);
          setViewportX(x);
          setViewportY(y);
          setZoom(z);
        } else {
          // Reset to default for new notes
          setViewportX(0);
          setViewportY(0);
          setZoom(1);
        }
      } catch (e) {
        setCanvasElements([]);
        setViewportX(0);
        setViewportY(0);
        setZoom(1);
      }
    }
  }, [selectedNote]);

  // Save viewport position when it changes
  useEffect(() => {
    if (selectedNote) {
      const saveViewport = () => {
        localStorage.setItem(`canvas-viewport-${selectedNote.id}`, JSON.stringify({
          x: viewportX,
          y: viewportY,
          z: zoom,
        }));
      };
      // Debounce viewport saving
      const timer = setTimeout(saveViewport, 500);
      return () => clearTimeout(timer);
    }
  }, [viewportX, viewportY, zoom, selectedNote]);

  useEffect(() => {
    if (selectedNote) {
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
        const firstNote = result.items.find((item: NoteItem) => !item.isFolder);
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
        parentId: createModalParentId,
        name: newItemName.trim(),
        type: 3,
        isFolder: createModalIsFolder,
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
        parentId: selectedNote.parentId,
      });
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  };

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return { x: 0, y: 0 };
    const x = (screenX - canvasRect.left - viewportX) / zoom;
    const y = (screenY - canvasRect.top - viewportY) / zoom;
    return { x, y };
  };

  const addStickyNote = (color?: string, atPosition?: { x: number; y: number }) => {
    const pos = atPosition || { x: -viewportX / zoom + 200, y: -viewportY / zoom + 200 };
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'sticky',
      x: pos.x,
      y: pos.y,
      width: 200,
      height: 180,
      content: '',
      color: color || COLORS[0].value,
      zIndex: canvasElements.length,
      isEditing: true,
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementId(newElement.id);
  };

  const addImageElement = () => {
    fileInputRef.current?.click();
  };

  const addTableElement = (atPosition?: { x: number; y: number }) => {
    const pos = atPosition || { x: -viewportX / zoom + 150, y: -viewportY / zoom + 150 };
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'table',
      x: pos.x,
      y: pos.y,
      width: 330,
      height: 150,
      zIndex: canvasElements.length,
      tableData: createDefaultTableData(3, 3),
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementId(newElement.id);
  };

  const addFrameElement = (atPosition?: { x: number; y: number }) => {
    const pos = atPosition || { x: -viewportX / zoom + 100, y: -viewportY / zoom + 100 };
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'frame',
      x: pos.x,
      y: pos.y,
      width: 400,
      height: 300,
      zIndex: -10, // Frames behind other elements
      frameTitle: 'Section',
      frameColor: FRAME_COLORS[0].value,
    };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementId(newElement.id);
  };

  // Apply template to canvas
  const applyTemplate = (template: CanvasTemplate, atPosition?: { x: number; y: number }) => {
    const pos = atPosition || { x: -viewportX / zoom + 50, y: -viewportY / zoom + 50 };
    const offsetX = pos.x;
    const offsetY = pos.y;
    const baseTime = Date.now();

    // First pass: create all non-connector elements and track their IDs
    const elementIds: string[] = [];
    const newElements: CanvasElement[] = [];

    template.elements.forEach((el, index) => {
      if (el.type === 'connector') return; // Skip connectors in first pass

      const id = `${baseTime}-${index}`;
      elementIds.push(id);

      let zIndex = canvasElements.length + index;
      if (el.type === 'frame') zIndex = -10 + index;

      const element: CanvasElement = {
        id,
        type: el.type,
        x: el.x + offsetX,
        y: el.y + offsetY,
        width: el.width,
        height: el.height,
        content: el.content,
        color: el.color,
        frameTitle: el.frameTitle,
        frameColor: el.frameColor,
        tableData: el.tableData,
        zIndex,
      };

      newElements.push(element);
    });

    // Second pass: create connectors with proper element references
    template.elements.forEach((el, index) => {
      if (el.type !== 'connector') return;

      const fromId = el.fromIndex !== undefined ? elementIds[el.fromIndex] : undefined;
      const toId = el.toIndex !== undefined ? elementIds[el.toIndex] : undefined;

      if (!fromId || !toId) return;

      const connector: CanvasElement = {
        id: `${baseTime}-connector-${index}`,
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: -1,
        fromElementId: fromId,
        toElementId: toId,
        fromAnchor: 'bottom',
        toAnchor: 'top',
        lineStyle: el.lineStyle || 'curved',
        arrowEnd: true,
        lineColor: '#6366f1',
      };

      newElements.push(connector);
    });

    const allElements = [...canvasElements, ...newElements];
    setCanvasElements(allElements);
    addToHistory(allElements);
    setShowTemplatePicker(false);
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
          imageUrl: event.target?.result as string,
          zIndex: canvasElements.length,
        };
        const newElements = [...canvasElements, newElement];
        setCanvasElements(newElements);
        addToHistory(newElements);
      };
      reader.readAsDataURL(file);
    }
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

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    if (tool === 'pan') return;

    const element = canvasElements.find(el => el.id === id);
    if (!element) return;

    // Don't start drag if editing text or element is locked
    if (element.isEditing || element.locked) return;

    e.stopPropagation();
    e.preventDefault();

    // Handle multi-select with Ctrl/Cmd key
    if (e.ctrlKey || e.metaKey) {
      // Build current selection array
      const currentIds = new Set(selectedElementIds);
      if (selectedElementId) {
        currentIds.add(selectedElementId);
      }

      if (currentIds.has(id)) {
        // Remove from selection
        currentIds.delete(id);
      } else {
        // Add to selection
        currentIds.add(id);
      }

      setSelectedElementIds(Array.from(currentIds));
      setSelectedElementId(null);
      // Don't start dragging when Ctrl+clicking - just toggle selection
      return;
    }

    // Normal click - single select, clear multi-select
    setSelectedElementId(id);
    setSelectedElementIds([]);
    setDraggedId(id);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
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
    // Right-click - don't start panning, let context menu handle it
    if (e.button === 2) {
      return;
    }

    // Middle-click for panning or pan tool active
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewportX, y: e.clientY - viewportY });
      e.preventDefault();
      return;
    }

    // Left-click on canvas background with select tool
    if (tool === 'select' && e.button === 0 && canvasRef.current) {
      // Start box selection on empty canvas area
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const startX = (e.clientX - canvasRect.left - viewportX) / zoom;
      const startY = (e.clientY - canvasRect.top - viewportY) / zoom;
      setIsBoxSelecting(true);
      setSelectionStart({ x: startX, y: startY });
      setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });

      // If not holding Ctrl, clear existing selection
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedElementId(null);
        setSelectedElementIds([]);
      }

      // Stop editing any elements
      setCanvasElements(prev => prev.map(el => ({ ...el, isEditing: false })));

      // Cancel connector creation
      if (isCreatingConnector) {
        cancelConnector();
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Update connector preview position
    if (isCreatingConnector && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - canvasRect.left - viewportX) / zoom;
      const mouseY = (e.clientY - canvasRect.top - viewportY) / zoom;
      setConnectorPreview({ x: mouseX, y: mouseY });
    }

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
      
      // Find elements in box (exclude connectors and frames from box selection)
      const selectedIds = canvasElements
        .filter(el => {
          // Skip connectors and frames - they shouldn't be box-selectable
          if (el.type === 'connector' || el.type === 'frame') return false;

          // Check if element overlaps with selection box
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
      if (!element) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - viewportX - dragOffset.x) / zoom;
      const newY = (e.clientY - canvasRect.top - viewportY - dragOffset.y) / zoom;

      const deltaX = newX - element.x;
      const deltaY = newY - element.y;

      // If element is part of a group, move all grouped elements together
      if (element.groupId) {
        const newElements = canvasElements.map(el => {
          if (el.groupId === element.groupId) {
            return { ...el, x: el.x + deltaX, y: el.y + deltaY };
          }
          return el;
        });
        setCanvasElements(newElements);
        // Don't add to history on every move - will be added on mouse up
      } else {
        updateElement(draggedId, { x: newX, y: newY });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    // Add to history if we were dragging a grouped element
    if (draggedId) {
      const element = canvasElements.find(el => el.id === draggedId);
      if (element?.groupId) {
        addToHistory(canvasElements);
      }
    }

    setIsPanning(false);
    setDraggedId(null);
    setResizingId(null);
    setResizeHandle(null);
    setIsBoxSelecting(false);
  };

  // Zoom to cursor position
  const zoomAtPoint = (newZoom: number, clientX: number, clientY: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Mouse position relative to canvas element
    const mouseX = clientX - canvasRect.left;
    const mouseY = clientY - canvasRect.top;

    // Canvas position under the mouse before zoom
    const canvasX = (mouseX - viewportX) / zoom;
    const canvasY = (mouseY - viewportY) / zoom;

    // Calculate new viewport to keep the same canvas point under the mouse
    const newViewportX = mouseX - canvasX * newZoom;
    const newViewportY = mouseY - canvasY * newZoom;

    setZoom(newZoom);
    setViewportX(newViewportX);
    setViewportY(newViewportY);
  };

  // Native wheel event listener to avoid passive event issues
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
        zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelEvent);
  }, [zoom, viewportX, viewportY]);

  const zoomIn = () => {
    // Zoom to center of canvas
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const centerX = canvasRect.left + canvasRect.width / 2;
      const centerY = canvasRect.top + canvasRect.height / 2;
      zoomAtPoint(Math.min(3, zoom * 1.2), centerX, centerY);
    } else {
      setZoom(Math.min(3, zoom * 1.2));
    }
  };

  const zoomOut = () => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const centerX = canvasRect.left + canvasRect.width / 2;
      const centerY = canvasRect.top + canvasRect.height / 2;
      zoomAtPoint(Math.max(0.1, zoom / 1.2), centerX, centerY);
    } else {
      setZoom(Math.max(0.1, zoom / 1.2));
    }
  };

  const resetZoom = () => { setZoom(1); setViewportX(0); setViewportY(0); };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...canvasElements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const minZ = Math.min(...canvasElements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: minZ - 1 });
  };

  // Grouping functions
  const groupElements = (ids: string[]) => {
    if (ids.length < 2) return;
    const groupId = `group-${Date.now()}`;
    const newElements = canvasElements.map(el =>
      ids.includes(el.id) ? { ...el, groupId } : el
    );
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  const ungroupElements = (groupId: string) => {
    const newElements = canvasElements.map(el =>
      el.groupId === groupId ? { ...el, groupId: undefined } : el
    );
    setCanvasElements(newElements);
    addToHistory(newElements);
  };

  // Locking functions
  const lockElement = (id: string) => {
    updateElement(id, { locked: true });
  };

  const unlockElement = (id: string) => {
    updateElement(id, { locked: false });
  };

  // Duplicate function
  const duplicateElements = (ids: string[]) => {
    const elementsToDuplicate = canvasElements.filter(el => ids.includes(el.id));
    const duplicated = elementsToDuplicate.map(el => ({
      ...el,
      id: `${Date.now()}-${Math.random()}`,
      x: el.x + 30,
      y: el.y + 30,
      zIndex: Math.max(...canvasElements.map(e => e.zIndex), 0) + 1,
      groupId: undefined, // Don't copy group membership
    }));
    const newElements = [...canvasElements, ...duplicated];
    setCanvasElements(newElements);
    addToHistory(newElements);
    setSelectedElementIds(duplicated.map(el => el.id));
    setSelectedElementId(null);
  };

  // Context menu handler for elements
  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, elementId, isCanvasMenu: false });
    setSelectedElementId(elementId);
  };

  // Context menu handler for canvas background
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Store the canvas position for element creation
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setLastContextMenuPos(canvasPos);
    // Only show canvas menu if clicking on background (not on an element)
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: null, isCanvasMenu: true });
  };

  // Connector functions
  const startConnector = (elementId: string, anchor: AnchorPosition) => {
    setIsCreatingConnector(true);
    setConnectorStart({ elementId, anchor });
  };

  const finishConnector = (elementId: string, anchor: AnchorPosition) => {
    if (!connectorStart || connectorStart.elementId === elementId) {
      cancelConnector();
      return;
    }

    const newConnector: CanvasElement = {
      id: `connector-${Date.now()}`,
      type: 'connector',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: -1, // Connectors behind other elements
      fromElementId: connectorStart.elementId,
      toElementId: elementId,
      fromAnchor: connectorStart.anchor,
      toAnchor: anchor,
      lineStyle: 'curved',
      arrowEnd: true,
      lineColor: '#6366f1',
    };

    const newElements = [...canvasElements, newConnector];
    setCanvasElements(newElements);
    addToHistory(newElements);
    cancelConnector();
  };

  const cancelConnector = () => {
    setIsCreatingConnector(false);
    setConnectorStart(null);
    setConnectorPreview(null);
  };

  // Get anchor positions for an element
  const getElementAnchors = (element: CanvasElement) => {
    return {
      top: { x: element.x + element.width / 2, y: element.y },
      right: { x: element.x + element.width, y: element.y + element.height / 2 },
      bottom: { x: element.x + element.width / 2, y: element.y + element.height },
      left: { x: element.x, y: element.y + element.height / 2 },
    };
  };

  const notes = noteItems.filter(item => !item.isFolder);

  // Get context menu element info
  const contextMenuElement = contextMenu?.elementId ? canvasElements.find(el => el.id === contextMenu.elementId) : null;
  const selectedIds = selectedElementId ? [selectedElementId, ...selectedElementIds] : selectedElementIds;
  const isMultiSelect = selectedIds.length > 1;
  const isGrouped = contextMenuElement?.groupId !== undefined;
  const isLocked = contextMenuElement?.locked === true;

  const modals = (
    <>
      {/* Context Menu */}
      {contextMenu && (contextMenuElement || contextMenu.isCanvasMenu) && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onBringToFront={() => contextMenu.elementId && bringToFront(contextMenu.elementId)}
          onSendToBack={() => contextMenu.elementId && sendToBack(contextMenu.elementId)}
          onGroup={() => groupElements(selectedIds)}
          onUngroup={() => contextMenuElement?.groupId && ungroupElements(contextMenuElement.groupId)}
          onLock={() => contextMenu.elementId && lockElement(contextMenu.elementId)}
          onUnlock={() => contextMenu.elementId && unlockElement(contextMenu.elementId)}
          onDuplicate={() => contextMenu.elementId && duplicateElements(selectedIds.length > 0 ? selectedIds : [contextMenu.elementId])}
          onDelete={() => {
            if (!contextMenu.elementId) return;
            const idsToDelete = selectedIds.length > 0 ? selectedIds : [contextMenu.elementId];
            const newElements = canvasElements.filter(el => !idsToDelete.includes(el.id));
            setCanvasElements(newElements);
            addToHistory(newElements);
            setSelectedElementId(null);
            setSelectedElementIds([]);
          }}
          onCopy={copySelected}
          onPaste={paste}
          onAddStickyNote={() => addStickyNote(undefined, lastContextMenuPos || undefined)}
          onAddStickyNoteWithColor={(color) => addStickyNote(color, lastContextMenuPos || undefined)}
          onAddTable={() => addTableElement(lastContextMenuPos || undefined)}
          onAddImage={addImageElement}
          onAddFrame={() => addFrameElement(lastContextMenuPos || undefined)}
          onShowTemplates={() => setShowTemplatePicker(true)}
          onColorChange={(color) => contextMenu.elementId && updateElement(contextMenu.elementId, { color })}
          currentColor={contextMenuElement?.color}
          elementType={contextMenuElement?.type}
          isMultiSelect={isMultiSelect}
          isGrouped={isGrouped}
          isLocked={isLocked}
          canPaste={clipboard.length > 0}
          isCanvasMenu={contextMenu.isCanvasMenu}
        />
      )}

      {/* Template Picker */}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={(template) => applyTemplate(template, lastContextMenuPos || undefined)}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

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
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-slate-400 focus:outline-none"
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
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
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
        <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No notes yet. Create one to get started!</p>
            <button
              onClick={() => createNoteItem(null, false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
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
      <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
        {/* Floating Note Selector - top left */}
        <div className="absolute top-3 left-3 z-20">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700/90 rounded-lg text-white text-sm border border-slate-700/50 shadow-lg"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="max-w-[200px] truncate">{selectedNote.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
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
            cursor: isPanning
              ? 'grabbing'
              : tool === 'pan'
                ? 'grab'
                : draggedId
                  ? 'grabbing'
                  : 'default',
            // Prevent text selection during box selection
            userSelect: isBoxSelecting ? 'none' : 'auto',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onContextMenu={handleCanvasContextMenu}
        >
          <div
            style={{
              transform: `translate(${viewportX}px, ${viewportY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* SVG Layer for Connectors */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ overflow: 'visible', zIndex: -1 }}
            >
              {canvasElements
                .filter(el => el.type === 'connector')
                .map(connector => {
                  const fromElement = canvasElements.find(el => el.id === connector.fromElementId);
                  const toElement = canvasElements.find(el => el.id === connector.toElementId);

                  if (!fromElement || !toElement) return null;

                  const fromAnchor = connector.fromAnchor || 'right';
                  const toAnchor = connector.toAnchor || 'left';
                  const fromAnchors = getElementAnchors(fromElement);
                  const toAnchors = getElementAnchors(toElement);

                  return (
                    <g key={connector.id} style={{ pointerEvents: 'auto' }}>
                      <Connector
                        id={connector.id}
                        fromX={fromAnchors[fromAnchor].x}
                        fromY={fromAnchors[fromAnchor].y}
                        toX={toAnchors[toAnchor].x}
                        toY={toAnchors[toAnchor].y}
                        lineStyle={connector.lineStyle}
                        arrowStart={connector.arrowStart}
                        arrowEnd={connector.arrowEnd}
                        lineColor={connector.lineColor}
                        isSelected={selectedElementId === connector.id}
                        onClick={() => setSelectedElementId(connector.id)}
                        onDelete={() => deleteElement(connector.id)}
                      />
                    </g>
                  );
                })}

              {/* Connector Preview Line */}
              {isCreatingConnector && connectorStart && connectorPreview && (() => {
                const startElement = canvasElements.find(el => el.id === connectorStart.elementId);
                if (!startElement) return null;
                const startAnchors = getElementAnchors(startElement);
                const startPos = startAnchors[connectorStart.anchor];

                return (
                  <line
                    x1={startPos.x}
                    y1={startPos.y}
                    x2={connectorPreview.x}
                    y2={connectorPreview.y}
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              })()}
            </svg>

            {canvasElements.filter(el => el.type !== 'connector').map((element) => {
              const isSelected = selectedElementId === element.id;
              const isMultiSelected = selectedElementIds.includes(element.id);
              const showAnchors = isSelected || isCreatingConnector;

              // Check if this element is part of the same group as the selected element
              const selectedElement = selectedElementId ? canvasElements.find(el => el.id === selectedElementId) : null;
              const isGroupMember = element.groupId && selectedElement?.groupId === element.groupId && !isSelected;

              return (
                <div
                  key={element.id}
                  className="absolute group"
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex,
                    cursor: element.locked
                      ? 'not-allowed'
                      : element.type === 'frame'
                        ? 'default'
                        : element.isEditing
                          ? 'default'
                          : tool === 'select'
                            ? 'grab'
                            : 'default',
                    // Visual indicator for multi-selected elements and group members
                    outline: isMultiSelected
                      ? '2px solid #64748b'
                      : isGroupMember
                        ? '2px dashed #64748b'
                        : 'none',
                    outlineOffset: '2px',
                    // Frames should let mouse events pass through to elements inside
                    pointerEvents: element.type === 'frame' ? 'none' : 'auto',
                  }}
                  onMouseDown={(e) => {
                    // Don't start drag if element is being edited and click is inside editor
                    const target = e.target as HTMLElement;
                    if (element.isEditing && target.closest('.ProseMirror')) {
                      return;
                    }
                    handleElementMouseDown(e, element.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Don't handle click if inside editor (let editor handle it)
                    const target = e.target as HTMLElement;
                    if (element.isEditing && (target.closest('.ProseMirror') || target.closest('.sticky-note-editor'))) {
                      return;
                    }
                    // Handle Ctrl+Click for multi-select (backup if mouseDown didn't fire)
                    if (e.ctrlKey || e.metaKey) {
                      setSelectedElementIds(prev => {
                        if (prev.includes(element.id)) {
                          return prev.filter(id => id !== element.id);
                        }
                        const newIds = [...prev, element.id];
                        if (selectedElementId && !newIds.includes(selectedElementId)) {
                          newIds.push(selectedElementId);
                        }
                        return newIds;
                      });
                      setSelectedElementId(null);
                    } else if (selectedElementIds.length === 0) {
                      // Only set single selection if not already multi-selecting
                      setSelectedElementId(element.id);
                    }
                    // Don't auto-bring to front - let user control via context menu
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Check if double-click is inside the editor - if so, don't interfere with text selection
                    const target = e.target as HTMLElement;
                    if (target.closest('.ProseMirror') || target.closest('.sticky-note-editor')) {
                      // Already in editor, let TipTap handle the double-click for text selection
                      return;
                    }
                    // Only start editing if not already editing and not locked
                    if (element.type === 'sticky' && !element.isEditing && !element.locked) {
                      updateElement(element.id, { isEditing: true });
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, element.id)}
                >
                  {/* Lock indicator */}
                  {element.locked && (
                    <div className="absolute -top-6 right-0 bg-slate-700 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1 z-30">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Locked
                    </div>
                  )}

                  {/* Resize Handles - only when selected, not editing, and not locked */}
                  {isSelected && !element.isEditing && !element.locked && (
                    <>
                      {['nw', 'ne', 'se', 'sw'].map((handle) => (
                        <div
                          key={handle}
                          onMouseDown={(e) => handleResizeMouseDown(e, element.id, handle)}
                          className="absolute w-3 h-3 bg-slate-200 border-2 border-slate-500 rounded-sm shadow-md hover:scale-110 transition-transform"
                          style={{
                            cursor: `${handle}-resize`,
                            top: handle.includes('n') ? -5 : 'calc(100% - 7px)',
                            left: handle.includes('w') ? -5 : 'calc(100% - 7px)',
                            zIndex: 20,
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Anchor Points for Connectors - show on hover or when creating connector */}
                  {showAnchors && !element.locked && element.type !== 'connector' && (
                    <>
                      {(['top', 'right', 'bottom', 'left'] as AnchorPosition[]).map((anchor) => {
                        const pos = {
                          top: { top: -6, left: '50%', transform: 'translateX(-50%)' },
                          right: { top: '50%', right: -6, transform: 'translateY(-50%)' },
                          bottom: { bottom: -6, left: '50%', transform: 'translateX(-50%)' },
                          left: { top: '50%', left: -6, transform: 'translateY(-50%)' },
                        };
                        return (
                          <div
                            key={anchor}
                            className="absolute w-3 h-3 bg-slate-500 rounded-full cursor-crosshair hover:bg-slate-400 hover:scale-125 transition-all z-30 border-2 border-white shadow-md"
                            style={pos[anchor] as React.CSSProperties}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (isCreatingConnector) {
                                finishConnector(element.id, anchor);
                              } else {
                                startConnector(element.id, anchor);
                              }
                            }}
                            title={isCreatingConnector ? 'Connect here' : 'Drag to connect'}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Sticky Note */}
                  {element.type === 'sticky' && (
                    <StickyNote
                      id={element.id}
                      content={element.content || ''}
                      color={element.color || COLORS[0].value}
                      isEditing={element.isEditing || false}
                      isSelected={isSelected}
                      onContentChange={(content) => updateElement(element.id, { content })}
                      onColorChange={(color) => updateElement(element.id, { color })}
                      onDelete={() => deleteElement(element.id)}
                      onStartEditing={() => updateElement(element.id, { isEditing: true })}
                      onStopEditing={() => updateElement(element.id, { isEditing: false })}
                    />
                  )}

                  {/* Image */}
                  {element.type === 'image' && (
                    <div className="h-full w-full relative rounded-lg overflow-hidden shadow-lg bg-white">
                      <img
                        src={element.imageUrl}
                        alt="canvas"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                      {/* Delete button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteElement(element.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}

                  {/* Table */}
                  {element.type === 'table' && element.tableData && (
                    <CanvasTable
                      id={element.id}
                      tableData={element.tableData}
                      isSelected={isSelected}
                      isEditing={element.isEditing || false}
                      onTableDataChange={(tableData) => updateElement(element.id, { tableData })}
                      onStartEditing={() => updateElement(element.id, { isEditing: true })}
                      onStopEditing={() => updateElement(element.id, { isEditing: false })}
                      containerWidth={element.width}
                      containerHeight={element.height}
                    />
                  )}

                  {/* Frame */}
                  {element.type === 'frame' && (
                    <Frame
                      id={element.id}
                      title={element.frameTitle || 'Section'}
                      color={element.frameColor || FRAME_COLORS[0].value}
                      isSelected={isSelected}
                      onTitleChange={(title) => updateElement(element.id, { frameTitle: title })}
                      onColorChange={(color) => updateElement(element.id, { frameColor: color })}
                    />
                  )}
                </div>
              );
            })}

            {/* Box Selection Rectangle */}
            {isBoxSelecting && selectionBox.width > 0 && selectionBox.height > 0 && (
              <div
                className="absolute pointer-events-none border-2 border-slate-400 bg-slate-400/10"
                style={{
                  left: selectionBox.x,
                  top: selectionBox.y,
                  width: selectionBox.width,
                  height: selectionBox.height,
                  zIndex: 9999,
                }}
              />
            )}
          </div>

          {/* Bottom-left floating controls - Tool & Zoom */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
            {/* Tool Selector */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50 shadow-lg">
              <button
                onClick={() => setTool('select')}
                className={`p-2 rounded-md transition-colors ${tool === 'select' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="Select (V)"
              >
                <Move className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`p-2 rounded-md transition-colors ${tool === 'pan' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="Pan (H)"
              >
                <Hand className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50 shadow-lg">
              <button onClick={zoomOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors min-w-[50px] text-center"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={zoomIn} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Coordinates Display */}
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-2 py-1 border border-slate-700/50 shadow-lg">
              <span className="text-xs text-slate-400 font-mono">
                {Math.round(-viewportX / zoom)}, {Math.round(-viewportY / zoom)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
