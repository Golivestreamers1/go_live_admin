import { Node, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';

/**
 * Editor nodes for the two bespoke blocks the landing page styles.
 * Their rendered markup must match what `.prose-golive` expects, so the
 * class names below are load-bearing — see landing-page/src/index.css.
 */

/** A paragraph carrying class="lede" — the larger opening paragraph. */
export const LedeParagraph = Paragraph.extend({
  name: 'paragraph',

  addAttributes() {
    return {
      ...this.parent?.(),
      lede: {
        default: false,
        // The lede is the opening paragraph only: pressing Enter must start a
        // normal paragraph, and list items must never inherit it.
        keepOnSplit: false,
        parseHTML: (element) => element.classList.contains('lede'),
        renderHTML: (attributes) => (attributes.lede ? { class: 'lede' } : {}),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleLede:
        () =>
        ({ editor, commands }) =>
          commands.updateAttributes('paragraph', {
            lede: !editor.getAttributes('paragraph').lede,
          }),
    };
  },
});

/** <div class="callout"><span class="label">LABEL</span> …blocks… </div> */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      label: {
        default: 'Worth knowing',
        parseHTML: (element) => element.querySelector('.label')?.textContent || 'Worth knowing',
        // The label is rendered as its own element below, not an attribute.
        renderHTML: () => ({}),
      },
      hot: {
        default: false,
        parseHTML: (element) => element.classList.contains('hot'),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.callout',
        // The label is rendered from an attribute, so it must not be parsed
        // back in as body content or it would duplicate on every round-trip.
        contentElement: (element) => {
          const clone = element.cloneNode(true);
          clone.querySelector('.label')?.remove();
          return clone;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // ProseMirror requires the content hole (0) to be the ONLY child of its
    // parent, so the body lives in an inner wrapper next to the label.
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: node.attrs.hot ? 'callout hot' : 'callout',
      }),
      ['span', { class: 'label' }, node.attrs.label || 'Worth knowing'],
      ['div', {}, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
    };
  },
});
