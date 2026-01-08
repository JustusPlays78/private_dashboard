import React from 'react';
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
}

export default function TipTapEditor({ content, onChange, editable = true, className = '' }: TipTapEditorProps) {
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
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-700 border-b border-slate-600 rounded-t">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('bold') ? 'bg-purple-600' : ''}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('italic') ? 'bg-purple-600' : ''}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('underline') ? 'bg-purple-600' : ''}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          
          <div className="w-px bg-slate-600 mx-1" />
          
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('bulletList') ? 'bg-purple-600' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive('orderedList') ? 'bg-purple-600' : ''}`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          
          <div className="w-px bg-slate-600 mx-1" />
          
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'left' }) ? 'bg-purple-600' : ''}`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'center' }) ? 'bg-purple-600' : ''}`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-slate-600 ${editor.isActive({ textAlign: 'right' }) ? 'bg-purple-600' : ''}`}
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
