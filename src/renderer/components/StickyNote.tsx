import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  ChevronDown,
} from 'lucide-react';

const COLORS = [
  { name: 'Yellow', value: '#fef9c3', border: '#eab308' },
  { name: 'Blue', value: '#dbeafe', border: '#3b82f6' },
  { name: 'Green', value: '#dcfce7', border: '#22c55e' },
  { name: 'Pink', value: '#fce7f3', border: '#ec4899' },
  { name: 'Purple', value: '#f3e8ff', border: '#a855f7' },
  { name: 'Orange', value: '#ffedd5', border: '#f97316' },
];

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  isEditing: boolean;
  isSelected: boolean;
  onContentChange: (content: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
}

export default function StickyNote({
  id,
  content,
  color,
  isEditing,
  isSelected,
  onContentChange,
  onColorChange,
  onDelete,
  onStartEditing,
  onStopEditing,
}: StickyNoteProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const headingDropdownRef = useRef<HTMLDivElement>(null);

  const colorInfo = COLORS.find(c => c.value === color) || COLORS[0];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: true,
        blockquote: true,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Type something...',
      }),
    ],
    content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      // Show toolbar only when text is selected
      setHasSelection(!editor.state.selection.empty);
    },
  });

  // Update editable state when isEditing changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        // Focus editor when starting to edit
        setTimeout(() => editor.commands.focus('end'), 10);
      }
    }
  }, [isEditing, editor]);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && !isEditing) {
      const currentContent = editor.getHTML();
      if (content !== currentContent) {
        editor.commands.setContent(content || '');
      }
    }
  }, [content, editor, isEditing]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (headingDropdownRef.current && !headingDropdownRef.current.contains(e.target as Node)) {
        setShowHeadingDropdown(false);
      }
    };
    if (showColorPicker || showHeadingDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showHeadingDropdown]);

  const toolbarButton = (
    onClick: () => void,
    isActive: boolean,
    icon: React.ReactNode,
    title: string
  ) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-slate-700 text-white'
          : 'text-slate-600 hover:bg-slate-200'
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div
      ref={noteRef}
      className="h-full w-full flex flex-col relative"
      style={{
        backgroundColor: color,
        borderRadius: '8px',
        boxShadow: isSelected
          ? `0 0 0 2px ${colorInfo.border}, 0 4px 12px rgba(0,0,0,0.15)`
          : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Floating Toolbar - appears above note when text is selected */}
      {isEditing && editor && hasSelection && (
        <div
          className="absolute -top-12 left-0 right-0 flex justify-center z-50"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-slate-200 px-1 py-1">
            {/* Heading Dropdown */}
            <div className="relative" ref={headingDropdownRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHeadingDropdown(!showHeadingDropdown);
                }}
                className={`p-1.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-0.5 ${
                  editor.isActive('heading') ? 'bg-slate-700 text-white' : 'text-slate-600'
                }`}
                title="Heading"
              >
                <span className="text-xs font-semibold">H</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showHeadingDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[120px]">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().toggleHeading({ level: 1 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left ${
                      editor.isActive('heading', { level: 1 }) ? 'bg-slate-100' : ''
                    }`}
                  >
                    <Heading1 className="w-4 h-4" />
                    <span className="text-sm">Heading 1</span>
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().toggleHeading({ level: 2 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left ${
                      editor.isActive('heading', { level: 2 }) ? 'bg-slate-100' : ''
                    }`}
                  >
                    <Heading2 className="w-4 h-4" />
                    <span className="text-sm">Heading 2</span>
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().toggleHeading({ level: 3 }).run();
                      setShowHeadingDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left ${
                      editor.isActive('heading', { level: 3 }) ? 'bg-slate-100' : ''
                    }`}
                  >
                    <Heading3 className="w-4 h-4" />
                    <span className="text-sm">Heading 3</span>
                  </button>
                  <div className="border-t border-slate-200 my-1" />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().setParagraph().run();
                      setShowHeadingDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left"
                  >
                    <span className="text-sm">Normal</span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            {toolbarButton(
              () => editor.chain().focus().toggleBold().run(),
              editor.isActive('bold'),
              <Bold className="w-4 h-4" />,
              'Bold (Ctrl+B)'
            )}
            {toolbarButton(
              () => editor.chain().focus().toggleItalic().run(),
              editor.isActive('italic'),
              <Italic className="w-4 h-4" />,
              'Italic (Ctrl+I)'
            )}
            {toolbarButton(
              () => editor.chain().focus().toggleUnderline().run(),
              editor.isActive('underline'),
              <UnderlineIcon className="w-4 h-4" />,
              'Underline (Ctrl+U)'
            )}

            <div className="w-px h-5 bg-slate-300 mx-1" />

            {toolbarButton(
              () => editor.chain().focus().toggleBulletList().run(),
              editor.isActive('bulletList'),
              <List className="w-4 h-4" />,
              'Bullet List'
            )}
            {toolbarButton(
              () => editor.chain().focus().toggleOrderedList().run(),
              editor.isActive('orderedList'),
              <ListOrdered className="w-4 h-4" />,
              'Numbered List'
            )}

            <div className="w-px h-5 bg-slate-300 mx-1" />

            {toolbarButton(
              () => editor.chain().focus().toggleCodeBlock().run(),
              editor.isActive('codeBlock'),
              <Code className="w-4 h-4" />,
              'Code Block'
            )}
            {toolbarButton(
              () => editor.chain().focus().toggleBlockquote().run(),
              editor.isActive('blockquote'),
              <Quote className="w-4 h-4" />,
              'Quote'
            )}

            <div className="w-px h-5 bg-slate-300 mx-1" />

            {/* Color picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                }}
                className="p-1.5 rounded hover:bg-slate-200 transition-colors"
                title="Change Color"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-slate-400"
                  style={{ backgroundColor: color }}
                />
              </button>

              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 flex gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-50">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onColorChange(c.value);
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        color === c.value ? 'ring-2 ring-offset-1 ring-slate-500' : ''
                      }`}
                      style={{ backgroundColor: c.value, border: `2px solid ${c.border}` }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            {/* Delete button */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Note Content */}
      <div
        className="flex-1 p-3 overflow-auto"
        style={{
          cursor: isEditing ? 'text' : 'inherit',
        }}
        onDoubleClick={(e) => {
          // Always stop propagation to prevent parent handlers from interfering
          e.stopPropagation();
          // Only start editing if not already editing - let TipTap handle double-click for text selection
          if (!isEditing) {
            onStartEditing();
          }
          // When already editing, do nothing here - TipTap will handle word selection natively
        }}
        onMouseDown={(e) => {
          // When editing, prevent the parent from starting drag operations
          if (isEditing) {
            e.stopPropagation();
          }
        }}
      >
        <EditorContent
          editor={editor}
          className="sticky-note-editor h-full text-slate-800 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:cursor-text [&_.ProseMirror_p]:my-1 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-2 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-1.5 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-slate-400 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-slate-200 [&_.ProseMirror_pre]:p-2 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_code]:bg-slate-200 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-xs"
        />
      </div>

      {/* Mini color indicator at bottom - visible when not editing */}
      {!isEditing && (
        <div
          className="absolute bottom-2 right-2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: colorInfo.border }}
        />
      )}
    </div>
  );
}

export { COLORS };
