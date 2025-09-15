import { forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { MetaAttributes } from '../tiptap/MetaAttributes';

export type DocEditorHandle = {
  setContent: (json: any) => void;
  getJSON: () => any;
};

type DocEditorProps = {
  initialContent?: any;
  onUpdate?: (json: any) => void;
};

export const DocEditor = forwardRef<DocEditorHandle, DocEditorProps>(({ initialContent, onUpdate }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: true }),
      MetaAttributes,
    ],
    content: initialContent ?? {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { meta: { status: 'draft' } },
          content: [{ type: 'text', text: 'DocGraph editor ready.' }],
        },
      ],
    },
    onUpdate: ({ editor }) => onUpdate?.(editor.getJSON()),
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items || !items.length) return false;

        // Try image first
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              view.dispatch(view.state.tr);
              (view as any).editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return true;
          }
        }

        // Try SVG text (plain)
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (text.trim().startsWith('<svg')) {
          const svg = text.trim();
          const base64 = typeof window !== 'undefined'
            ? window.btoa(unescape(encodeURIComponent(svg)))
            : Buffer.from(svg, 'utf8').toString('base64');
          const dataUrl = `data:image/svg+xml;base64,${base64}`;
          (view as any).editor?.chain().focus().setImage({ src: dataUrl }).run();
          event.preventDefault();
          return true;
        }

        // Try HTML containing SVG
        const html = event.clipboardData?.getData('text/html') ?? '';
        if (html.includes('<svg')) {
          const match = html.match(/<svg[\s\S]*<\/svg>/i);
          if (match) {
            const svg = match[0];
            const base64 = typeof window !== 'undefined'
              ? window.btoa(unescape(encodeURIComponent(svg)))
              : Buffer.from(svg, 'utf8').toString('base64');
            const dataUrl = `data:image/svg+xml;base64,${base64}`;
            (view as any).editor?.chain().focus().setImage({ src: dataUrl }).run();
            event.preventDefault();
            return true;
          }
        }

        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              (view as any).editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return true;
          }
          if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = () => {
              const svg = reader.result as string;
              const base64 = typeof window !== 'undefined'
                ? window.btoa(unescape(encodeURIComponent(svg)))
                : Buffer.from(svg, 'utf8').toString('base64');
              const dataUrl = `data:image/svg+xml;base64,${base64}`;
              (view as any).editor?.chain().focus().setImage({ src: dataUrl }).run();
            };
            reader.readAsText(file);
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
  });

  useImperativeHandle(ref, () => ({
    setContent: (json: any) => {
      editor?.commands.setContent(json, { emitUpdate: false });
    },
    getJSON: () => editor?.getJSON(),
  }), [editor]);

  if (!editor) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullets</button>
        <button onClick={() => editor.commands.setNodeMeta({ status: 'todo' })}>Set meta: todo</button>
        <button onClick={() => {
          const { state } = editor;
          const { from } = state.selection;
          const node = state.doc.nodeAt(from);
          // eslint-disable-next-line no-console
          console.log('meta', (node?.attrs as any)?.meta ?? null)
        }}>Log meta</button>
      </div>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minHeight: 240 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default DocEditor;


