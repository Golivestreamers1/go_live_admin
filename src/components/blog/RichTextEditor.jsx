import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { toast } from 'sonner';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
  Undo2,
  Redo2,
  Code2,
  Type,
  Info,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { LedeParagraph, Callout } from './editorExtensions';
import '../../styles/blog-preview.css';

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={Boolean(active)}
      disabled={disabled}
      // Keep focus in the document: a button that takes focus would blur
      // ProseMirror, and whatever the author typed next would go nowhere.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors disabled:opacity-40 ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

ToolbarButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * WYSIWYG post editor. Emits HTML, which is what the landing page renders.
 *
 * The server sanitizes on write regardless of what this produces, so the
 * "Source" escape hatch below is safe: an author who needs markup the toolbar
 * doesn't cover can type it, and anything dangerous is stripped server-side.
 */
export default function RichTextEditor({ value, onChange, onUploadImage }) {
  const [showSource, setShowSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // Replaced by the lede-aware paragraph below.
        paragraph: false,
      }),
      LedeParagraph,
      Callout,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Write the post…' }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Adopt content loaded after mount (editing an existing post) without
  // clobbering what the author is currently typing.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming !== editor.getHTML()) editor.commands.setContent(incoming, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const handleUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      toast.error('Choose a JPEG, PNG, GIF or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be 5MB or smaller');
      return;
    }
    try {
      setUploading(true);
      const url = await onUploadImage(file);
      if (url) editor?.chain().focus().setImage({ src: url }).run();
      else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const promptForLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const url = window.prompt('Link URL', previous);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const applySource = () => {
    onChange(sourceDraft);
    editor?.commands.setContent(sourceDraft, false);
    setShowSource(false);
  };

  if (!editor) return null;

  return (
    <div className="rounded-md border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 p-2">
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Lede paragraph" active={editor.isActive('paragraph', { lede: true })} onClick={() => editor.chain().focus().toggleLede().run()}>
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Callout box" active={editor.isActive('callout')} onClick={() => editor.chain().focus().toggleCallout().run()}>
          <Info className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Add link" active={editor.isActive('link')} onClick={promptForLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title={uploading ? 'Uploading…' : 'Insert image'} disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleUpload}
        />

        <span className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto">
          <Button
            type="button"
            variant={showSource ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSourceDraft(value || '');
              setShowSource((s) => !s);
            }}
          >
            <Code2 className="mr-2 h-4 w-4" />
            {showSource ? 'Close source' : 'Source'}
          </Button>
        </div>
      </div>

      {showSource ? (
        <div className="space-y-2 p-3">
          <Textarea
            value={sourceDraft}
            onChange={(e) => setSourceDraft(e.target.value)}
            rows={18}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={applySource}>
              Apply HTML
            </Button>
            <span className="text-xs text-muted-foreground">
              The server strips anything unsafe when you save.
            </span>
          </div>
        </div>
      ) : (
        <div className="blog-editor blog-preview rounded-b-md">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

RichTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onUploadImage: PropTypes.func.isRequired,
};
