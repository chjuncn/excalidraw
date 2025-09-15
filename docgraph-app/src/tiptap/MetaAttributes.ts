import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaAttributes: {
      setNodeMeta: (meta: Record<string, unknown> | null) => ReturnType;
    };
  }
}

export const MetaAttributes = Extension.create({
  name: 'metaAttributes',

  addGlobalAttributes() {
    const nodeTypes = [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'image',
    ];

    return [
      {
        types: nodeTypes,
        attributes: {
          meta: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: () => null,
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setNodeMeta:
        (meta) =>
        ({ state, dispatch }) => {
          const { from } = state.selection;
          const pos = from;
          const node = state.doc.nodeAt(pos);
          if (!node) return false;
          const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, meta: meta ?? null }, node.marks);
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});

export default MetaAttributes;


