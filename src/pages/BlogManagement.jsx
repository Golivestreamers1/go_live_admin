import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { blogService, blogCategoryService } from '../services/blogService';

const STATUS_FILTERS = ['ALL', 'draft', 'published', 'archived'];
const PAGE_LIMIT = 20;

const STATUS_VARIANT = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogManagement() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ label: '', slug: '', displayOrder: 0 });
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await blogService.listPosts({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter,
        ...(search ? { search } : {}),
      });
      setPosts(Array.isArray(data.blogs) ? data.blogs : []);
      setPagination(data.pagination || { current: 1, pages: 1, total: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const fetchCategories = useCallback(async () => {
    try {
      setCategories(await blogCategoryService.getCategories());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load categories');
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleFeatured = async (post) => {
    try {
      setBusyId(post._id);
      await blogService.setFeatured(post._id, { featured: !post.featured });
      setPosts((list) =>
        list.map((p) => (p._id === post._id ? { ...p, featured: !p.featured } : p)),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update post');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await blogService.deletePost(deleteTarget._id);
      toast.success('Post deleted');
      setDeleteTarget(null);
      fetchPosts();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------------------- categories ---------------------------- */

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ label: '', slug: '', displayOrder: categories.length });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      label: category.label ?? '',
      slug: category.slug ?? '',
      displayOrder: category.displayOrder ?? 0,
    });
    setCategoryDialogOpen(true);
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.label.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      setSavingCategory(true);
      const body = {
        label: categoryForm.label.trim(),
        slug: categoryForm.slug.trim() || undefined,
        displayOrder: Number(categoryForm.displayOrder) || 0,
      };
      if (editingCategory?._id) {
        await blogCategoryService.updateCategory(editingCategory._id, body);
        toast.success('Category updated');
      } else {
        await blogCategoryService.createCategory(body);
        toast.success('Category created');
      }
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      setDeletingCategory(true);
      await blogCategoryService.deleteCategory(categoryDeleteTarget._id);
      toast.success('Category deleted');
      setCategoryDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      // The backend blocks deleting a category still in use, and says how many.
      toast.error(err.response?.data?.message || 'Failed to delete category');
      setCategoryDeleteTarget(null);
    } finally {
      setDeletingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Newspaper className="h-6 w-6" />
                  Blog posts
                </CardTitle>
                <CardDescription>
                  Published posts appear on the marketing site at /blog.
                </CardDescription>
              </div>
              <Button onClick={() => navigate('/blogs/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New post
              </Button>
            </CardHeader>

            <CardContent>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((s) => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setStatusFilter(s);
                        setPage(1);
                      }}
                    >
                      {s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearch(searchInput.trim());
                    setPage(1);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search posts"
                      className="w-48 pl-8"
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    Search
                  </Button>
                </form>
              </div>

              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No posts yet. Click &quot;New post&quot; to write the first one.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Cover</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post) => (
                        <TableRow key={post._id}>
                          <TableCell>
                            <div className="h-10 w-14 overflow-hidden rounded border bg-muted">
                              {post.coverImage && (
                                <img
                                  src={post.coverImage}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{post.title}</div>
                            <div className="text-xs text-muted-foreground">/{post.slug}</div>
                          </TableCell>
                          <TableCell>
                            {post.category?.label ? (
                              <Badge variant="outline">{post.category.label}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[post.status] || 'secondary'}>
                              {post.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(post.publishedAt)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={Boolean(post.featured)}
                              disabled={busyId === post._id}
                              onCheckedChange={() => toggleFeatured(post)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/blogs/${post._id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(post)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Page {pagination.current} of {pagination.pages} · {pagination.total} total
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= (pagination.pages || 1)}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl">Categories</CardTitle>
                <CardDescription>
                  These become the filter chips on the public blog.
                </CardDescription>
              </div>
              <Button onClick={openCreateCategory}>
                <Plus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No categories yet. Every published post needs one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell className="font-medium">{category.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {category.slug}
                        </TableCell>
                        <TableCell>{category.postCount}</TableCell>
                        <TableCell>{category.displayOrder}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCategory(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCategoryDeleteTarget(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => !open && setCategoryDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              The slug appears in filter links, so keep it short.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryLabel">Name *</Label>
              <Input
                id="categoryLabel"
                value={categoryForm.label}
                onChange={(e) =>
                  setCategoryForm((f) => ({
                    ...f,
                    label: e.target.value,
                    slug: editingCategory
                      ? f.slug
                      : e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, ''),
                  }))
                }
                placeholder="Guides"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categorySlug">Slug</Label>
              <Input
                id="categorySlug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="guides"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryOrder">Display order</Label>
              <Input
                id="categoryOrder"
                type="number"
                value={categoryForm.displayOrder}
                onChange={(e) =>
                  setCategoryForm((f) => ({ ...f, displayOrder: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingCategory}>
                {savingCategory ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete post"
        description={`"${deleteTarget?.title}" will be permanently removed. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
      />

      <ConfirmationDialog
        isOpen={Boolean(categoryDeleteTarget)}
        onClose={() => setCategoryDeleteTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Delete category"
        description={`"${categoryDeleteTarget?.label}" will be removed. Categories still used by a post cannot be deleted.`}
        confirmText="Delete"
        variant="destructive"
        loading={deletingCategory}
      />
    </div>
  );
}
