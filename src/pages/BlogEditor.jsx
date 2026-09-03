import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Pencil, Save, Send, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectItem } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import RichTextEditor from '../components/blog/RichTextEditor';
import ImageUploadField from '../components/blog/ImageUploadField';
import BlogPreview from '../components/blog/BlogPreview';
import { blogService, blogCategoryService } from '../services/blogService';

const EMPTY = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  coverImage: null,
  coverImageAlt: '',
  status: 'draft',
  publishedAt: '',
  featured: false,
  displayOrder: 0,
  seo: {
    metaTitle: '',
    metaDescription: '',
    ogImage: null,
    canonicalUrl: '',
    noIndex: false,
  },
};

/** "2026-08-11T09:00:00.000Z" → "2026-08-11T09:00" for datetime-local. */
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function slugFromTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function BlogEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...EMPTY });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [slugState, setSlugState] = useState({ checking: false, available: null });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaveTo, setLeaveTo] = useState(null);

  const setField = useCallback((patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }, []);

  const setSeo = useCallback((patch) => {
    setForm((f) => ({ ...f, seo: { ...f.seo, ...patch } }));
    setDirty(true);
  }, []);

  useEffect(() => {
    blogCategoryService
      .getCategories()
      .then(setCategories)
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load categories'));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    blogService
      .getPost(id)
      .then((post) => {
        if (cancelled || !post) return;
        setForm({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          category: post.category?._id || post.category || '',
          coverImage: post.coverImage || null,
          coverImageAlt: post.coverImageAlt || '',
          status: post.status || 'draft',
          publishedAt: isoToLocalInput(post.publishedAt),
          featured: Boolean(post.featured),
          displayOrder: post.displayOrder ?? 0,
          seo: {
            metaTitle: post.seo?.metaTitle || '',
            metaDescription: post.seo?.metaDescription || '',
            ogImage: post.seo?.ogImage || null,
            canonicalUrl: post.seo?.canonicalUrl || '',
            noIndex: Boolean(post.seo?.noIndex),
          },
        });
        setDirty(false);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load post'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // Losing a long article to a stray navigation is this screen's worst failure.
  useEffect(() => {
    const warn = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const checkSlug = useCallback(
    async (slug) => {
      if (!slug) return;
      try {
        setSlugState({ checking: true, available: null });
        const res = await blogService.checkSlug(slug, id);
        setSlugState({ checking: false, available: res.available });
      } catch {
        setSlugState({ checking: false, available: null });
      }
    },
    [id],
  );

  const buildBody = () => ({
    title: form.title.trim(),
    slug: form.slug.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content,
    category: form.category || null,
    coverImage: form.coverImage,
    coverImageAlt: form.coverImageAlt.trim(),
    featured: form.featured,
    displayOrder: Number(form.displayOrder) || 0,
    publishedAt: localInputToIso(form.publishedAt),
    seo: {
      metaTitle: form.seo.metaTitle.trim(),
      metaDescription: form.seo.metaDescription.trim(),
      ogImage: form.seo.ogImage,
      canonicalUrl: form.seo.canonicalUrl.trim(),
      noIndex: form.seo.noIndex,
    },
  });

  const save = async (status) => {
    if (!form.title.trim()) {
      toast.error('Give the post a title');
      return;
    }
    const body = { ...buildBody(), status };

    try {
      setSaving(true);
      const saved = isEdit
        ? await blogService.updatePost(id, body)
        : await blogService.createPost(body);

      setDirty(false);
      toast.success(status === 'published' ? 'Post published' : 'Draft saved');

      if (!isEdit && saved?._id) navigate(`/blogs/${saved._id}/edit`, { replace: true });
      else if (saved) setForm((f) => ({ ...f, slug: saved.slug, status: saved.status }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await blogService.deletePost(id);
      toast.success('Post deleted');
      setDirty(false);
      navigate('/blogs');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const leave = (to) => {
    if (dirty) setLeaveTo(to);
    else navigate(to);
  };

  const previewPost = useMemo(
    () => ({
      title: form.title,
      content: form.content,
      categoryLabel: categories.find((c) => c._id === form.category)?.label || '',
      readingMinutes: Math.max(1, Math.round((form.content || '').split(/\s+/).length / 220)),
      status: form.status,
      coverImage: form.coverImage,
      coverImageAlt: form.coverImageAlt,
    }),
    [form, categories],
  );

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Loading post…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => leave('/blogs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            All posts
          </Button>
          <h1 className="text-2xl font-semibold">{isEdit ? 'Edit post' : 'New post'}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)}>
          {showPreview ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showPreview ? 'Back to editing' : 'Preview'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {showPreview ? (
            <BlogPreview post={previewPost} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    autoFocus
                    onChange={(e) => {
                      const title = e.target.value;
                      // Only auto-fill the slug for a new post — changing a
                      // published URL silently would break inbound links.
                      setField(
                        isEdit ? { title } : { title, slug: slugFromTitle(title) },
                      );
                    }}
                    placeholder="How PK battles actually work"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setField({ slug: e.target.value })}
                      onBlur={(e) => checkSlug(slugFromTitle(e.target.value))}
                      placeholder="how-pk-battles-work"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const slug = slugFromTitle(form.title);
                        setField({ slug });
                        checkSlug(slug);
                      }}
                    >
                      From title
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /blog/{form.slug || 'your-post'}
                    {slugState.checking && ' · checking…'}
                    {slugState.available === true && ' · available'}
                    {slugState.available === false && ' · already taken'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={form.excerpt}
                    maxLength={320}
                    rows={3}
                    onChange={(e) => setField({ excerpt: e.target.value })}
                    placeholder="Leave blank to generate one from the article."
                  />
                  <p className="text-xs text-muted-foreground">{form.excerpt.length}/320</p>
                </div>

                <div className="space-y-2">
                  <Label>Article</Label>
                  <RichTextEditor
                    value={form.content}
                    onChange={(html) => setField({ content: html })}
                    onUploadImage={async (file) => {
                      const res = await blogService.uploadImage(file);
                      return res?.url || null;
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) => setField({ status })}
                  placeholder="Select status"
                >
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishedAt">Publish date</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => setField({ publishedAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A future date keeps it hidden until then.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured</Label>
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(featured) => setField({ featured })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setField({ displayOrder: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <Button disabled={saving} onClick={() => save('draft')} variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save draft
                </Button>
                <Button disabled={saving} onClick={() => save('published')}>
                  <Send className="mr-2 h-4 w-4" />
                  {form.status === 'published' ? 'Update published post' : 'Publish'}
                </Button>
                {isEdit && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete post
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select
                value={form.category}
                onValueChange={(category) => setField({ category })}
                placeholder="Choose a category"
              >
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.label}
                  </SelectItem>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Required to publish. Manage the list on the Blog page.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ImageUploadField
                value={form.coverImage}
                label="Cover"
                onChange={(coverImage) => setField({ coverImage })}
              />
              <div className="space-y-2">
                <Label htmlFor="coverAlt">Alt text</Label>
                <Input
                  id="coverAlt"
                  value={form.coverImageAlt}
                  onChange={(e) => setField({ coverImageAlt: e.target.value })}
                  placeholder="Describe the image"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta title</Label>
                <Input
                  id="metaTitle"
                  value={form.seo.metaTitle}
                  maxLength={70}
                  onChange={(e) => setSeo({ metaTitle: e.target.value })}
                  placeholder={form.title || 'Defaults to the post title'}
                />
                <p className="text-xs text-muted-foreground">{form.seo.metaTitle.length}/70</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta description</Label>
                <Textarea
                  id="metaDescription"
                  value={form.seo.metaDescription}
                  maxLength={200}
                  rows={3}
                  onChange={(e) => setSeo({ metaDescription: e.target.value })}
                  placeholder="Defaults to the excerpt"
                />
                <p className="text-xs text-muted-foreground">
                  {form.seo.metaDescription.length}/200
                </p>
              </div>
              <div className="space-y-2">
                <Label>Social share image</Label>
                <ImageUploadField
                  value={form.seo.ogImage}
                  label="Share image"
                  onChange={(ogImage) => setSeo({ ogImage })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  type="url"
                  value={form.seo.canonicalUrl}
                  onChange={(e) => setSeo({ canonicalUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={form.seo.noIndex}
                  onChange={(e) => setSeo({ noIndex: e.target.checked })}
                />
                Ask search engines not to index this post
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete post"
        description={`"${form.title}" will be permanently removed. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
      />

      <ConfirmationDialog
        isOpen={Boolean(leaveTo)}
        onClose={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo;
          setLeaveTo(null);
          setDirty(false);
          navigate(to);
        }}
        title="Leave without saving?"
        description="This post has unsaved changes. They will be lost."
        confirmText="Discard changes"
        variant="destructive"
      />
    </div>
  );
}
