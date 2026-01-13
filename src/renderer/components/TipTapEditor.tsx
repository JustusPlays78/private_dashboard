import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon, Palette
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  className?: string;
  minimal?: boolean; // For sticky notes - no toolbar, transparent bg
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function TipTapEditor({ content, onChange, editable = true, className = '', minimal = false, onFocus, onBlur }: TipTapEditorProps) {
  const lastExternalContent = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastExternalContent.current = html;
      onChange(html);
    },
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
  });

  // Update editor content when prop changes from outside
  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  // Minimal mode for sticky notes - just the editor, no toolbar
  if (minimal) {
    return (
      <div className={`tiptap-editor-minimal ${className}`}>
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none text-slate-800 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-0 [&_.ProseMirror_p]:my-1"
        />
      </div>
    );
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-700 border-b border-slate-600 rounded-t">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('bold') ? 'bg-slate-500' : ''}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('italic') ? 'bg-slate-500' : ''}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('underline') ? 'bg-slate-500' : ''}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px bg-slate-600 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('bulletList') ? 'bg-slate-500' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('orderedList') ? 'bg-slate-500' : ''}`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px bg-slate-600 mx-1" />

          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-500' : ''}`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-500' : ''}`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-500' : ''}`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px bg-slate-600 mx-1" />

          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded hover:bg-slate-600"
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {editor.isActive('table') && (
            <>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="px-2 py-1 text-xs rounded hover:bg-slate-600"
                title="Add Column"
              >
                Col+
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="px-2 py-1 text-xs rounded hover:bg-slate-600"
                title="Add Row"
              >
                Row+
              </button>
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="px-2 py-1 text-xs rounded hover:bg-red-600"
                title="Delete Table"
              >
                Del
              </button>
            </>
          )}

          <div className="w-px bg-slate-600 mx-1" />

          <input
            type="color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-8 h-8 rounded cursor-pointer"
            title="Text Color"
          />
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none p-3 bg-slate-800 rounded-b min-h-[100px] text-sm"
      />
    </div>
  );
}
