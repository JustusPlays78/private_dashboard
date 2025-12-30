import { useState, useRef, useEffect } from 'react'
import {
  StickyNote,
  Image as ImageIcon,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Download,
  Upload,
  Type,
  Palette
} from 'lucide-react'

interface NoteElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  positionLocked: boolean
  contentLocked: boolean
  content?: string
  imageUrl?: string
  color?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  zIndex: number
}

const COLORS = [
  '#fef08a', // yellow
  '#bfdbfe', // blue
  '#d9f99d', // green
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#f3f4f6', // gray
]

export default function Notes() {
  const [elements, setElements] = useState<NoteElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // WebSocket connection
  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8080/api/notes/ws')
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket received:', data.type)
      
      if (data.type === 'init' || data.type === 'sync') {
        try {
          const notes = typeof data.notes === 'string' 
            ? JSON.parse(data.notes) 
            : data.notes
          console.log('Loaded notes:', notes?.length || 0, 'elements')
          if (Array.isArray(notes)) {
            setElements(notes)
          }
        } catch (error) {
          console.error('Failed to parse notes:', error)
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }

    wsRef.current = ws
  }

  const sendUpdate = (newElements: NoteElement[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending update via WebSocket:', newElements.length, 'elements')
      wsRef.current.send(JSON.stringify({
        type: 'update',
        notes: newElements,
      }))
    } else {
      console.warn('WebSocket not ready, state:', wsRef.current?.readyState)
    }
  }

  // Update elements and send via WebSocket
  const updateElements = (newElements: NoteElement[]) => {
    setElements(newElements)
    sendUpdate(newElements)
  }

  // Load notes from backend (fallback)
  useEffect(() => {
    if (!isConnected) {
      loadNotes()
    }
  }, [isConnected])

  const loadNotes = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/notes')
      if (response.ok) {
        const data = await response.json()
        if (data.notes) {
          setElements(data.notes.map((note: any) => ({
            ...note,
            content: note.content || '',
          })))
        }
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const saveNotes = async () => {
    try {
      await fetch('http://localhost:8080/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: elements }),
      })
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  const addTextNote = () => {
    const newNote: NoteElement = {
      id: Date.now().toString(),
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      positionLocked: false,
      contentLocked: false,
      content: 'New note...',
      color: COLORS[0],
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      zIndex: elements.length,
    }
    updateElements([...elements, newNote])
  }

  const addImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newImage: NoteElement = {
          id: Date.now().toString(),
          type: 'image',
          x: 150,
          y: 150,
          width: 300,
          height: 200,
          positionLocked: false,
          contentLocked: false,
          imageUrl: event.target?.result as string,
          zIndex: elements.length,
        }
        updateElements([...elements, newImage])
      }
      reader.readAsDataURL(file)
    }
  }

  const togglePositionLock = (id: string) => {
    updateElements(elements.map(el =>
      el.id === id ? { ...el, positionLocked: !el.positionLocked } : el
    ))
  }

  const toggleContentLock = (id: string) => {
    updateElements(elements.map(el =>
      el.id === id ? { ...el, contentLocked: !el.contentLocked } : el
    ))
  }

  const deleteElement = (id: string) => {
    updateElements(elements.filter(el => el.id !== id))
    setSelectedId(null)
  }

  const updateElement = (id: string, updates: Partial<NoteElement>) => {
    updateElements(elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const element = elements.find(el => el.id === id)
    if (!element || element.positionLocked) return

    setSelectedId(id)
    setDraggedId(id)
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedId || !canvasRef.current) return

    const element = elements.find(el => el.id === draggedId)
    if (!element || element.positionLocked) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = e.clientX - canvasRect.left - dragOffset.x
    const newY = e.clientY - canvasRect.top - dragOffset.y

    updateElement(draggedId, { x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setDraggedId(null)
    setResizing(null)
  }

  const exportNotes = () => {
    const dataStr = JSON.stringify(elements, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `notes-${Date.now()}.json`
    link.click()
  }

  const importNotes = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string)
            updateElements(imported)
          } catch (error) {
            console.error('Failed to import notes:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...elements.map(el => el.zIndex), 0)
    updateElement(id, { zIndex: maxZ + 1 })
  }

  const selected = elements.find(el => el.id === selectedId)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Notes Canvas</h1>
            <div className={`ml-4 flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-yellow-500/10 text-yellow-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              }`} />
              {isConnected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={addTextNote}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all btn-glow"
            >
              <Type className="w-4 h-4" />
              Text Note
            </button>
            
            <button
              onClick={addImage}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-all hover-lift"
            >
              <ImageIcon className="w-4 h-4" />
              Image
            </button>

            <div className="w-px h-6 bg-border mx-2" />

            <button
              onClick={exportNotes}
              className="p-2 hover:bg-accent rounded-lg transition-all"
              title="Export Notes"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={importNotes}
              className="p-2 hover:bg-accent rounded-lg transition-all"
              title="Import Notes"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Properties Panel for Selected Element */}
      {selected && (
        <div className="border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-4">
            {selected.type === 'text' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Color:</label>
                  <div className="flex gap-1">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateElement(selected.id, { color })}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          selected.color === color ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="w-px h-6 bg-border" />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateElement(selected.id, {
                      fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold'
                    })}
                    className={`px-3 py-1 rounded border transition-all ${
                      selected.fontWeight === 'bold'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <span className="font-bold">B</span>
                  </button>

                  <button
                    onClick={() => updateElement(selected.id, {
                      fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic'
                    })}
                    className={`px-3 py-1 rounded border transition-all ${
                      selected.fontStyle === 'italic'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <span className="italic">I</span>
                  </button>
                </div>

                <div className="w-px h-6 bg-border" />

                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Size:</label>
                  <input
                    type="number"
                    value={selected.fontSize || 14}
                    onChange={(e) => updateElement(selected.id, { fontSize: parseInt(e.target.value) })}
                    className="w-16 px-2 py-1 bg-input border border-border rounded text-sm"
                    min="8"
                    max="48"
                  />
                </div>
              </>
            )}

            <div className="flex-1" />

            <button
              onClick={() => togglePositionLock(selected.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                selected.positionLocked
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'hover:bg-accent'
              }`}
              title={selected.positionLocked ? 'Unlock Position' : 'Lock Position'}
            >
              {selected.positionLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span className="text-xs">Position</span>
            </button>

            {selected.type === 'text' && (
              <button
                onClick={() => toggleContentLock(selected.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  selected.contentLocked
                    ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                    : 'hover:bg-accent'
                }`}
                title={selected.contentLocked ? 'Unlock Content' : 'Lock Content'}
              >
                {selected.contentLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="text-xs">Content</span>
              </button>
            )}

            <button
              onClick={() => bringToFront(selected.id)}
              className="px-3 py-2 hover:bg-accent rounded-lg transition-all text-sm"
            >
              Bring to Front
            </button>

            <button
              onClick={() => deleteElement(selected.id)}
              className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto bg-gradient-to-br from-background to-muted/20"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if (e.target === canvasRef.current) {
            setSelectedId(null)
          }
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Elements */}
        {elements
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => (
            <div
              key={element.id}
              className={`absolute transition-shadow ${
                element.positionLocked ? 'cursor-not-allowed' : 'cursor-move'
              } ${
                selectedId === element.id ? 'ring-2 ring-primary shadow-2xl' : 'shadow-lg'
              }`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
              }}
              onMouseDown={(e) => handleMouseDown(e, element.id)}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(element.id)
              }}
            >
              {element.type === 'text' ? (
                <div
                  className="w-full h-full p-4 rounded-lg shadow-xl"
                  style={{
                    backgroundColor: element.color,
                  }}
                >
                  <textarea
                    value={element.content}
                    onChange={(e) => updateElement(element.id, { content: e.target.value })}
                    className="w-full h-full bg-transparent resize-none outline-none"
                    style={{
                      fontSize: `${element.fontSize}px`,
                      fontWeight: element.fontWeight,
                      fontStyle: element.fontStyle,
                      color: '#1f2937',
                    }}
                    disabled={element.contentLocked}
                    placeholder="Type your note here..."
                  />
                  {element.positionLocked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-lg overflow-hidden bg-card border border-border shadow-xl relative">
                  <img
                    src={element.imageUrl}
                    alt="Note"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  {element.positionLocked && (
                    <div className="absolute top-2 right-2 bg-blue-500/80 p-1 rounded">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {/* Resize handle */}
                  {!element.positionLocked && selectedId === element.id && (
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        setResizing(element.id)
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

        {/* Empty state */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <StickyNote className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Your Canvas is Empty</h3>
                <p className="text-muted-foreground mb-4">
                  Add text notes and images to get started
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={addTextNote}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all btn-glow"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text Note
                  </button>
                  <button
                    onClick={addImage}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-all"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Add Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}
