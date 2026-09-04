import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { bannerService } from '../services/bannerService';
import { contestService } from '../services/contestService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
import { ConfirmationDialog } from '../components/ConfirmationDialog';

const TYPES = [
  { value: 'contest', label: 'Contest' },
  { value: 'show', label: 'Live show' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'external', label: 'External URL' },
];

const emptyForm = {
  title: '',
  subtitle: '',
  type: 'announcement',
  link: '',
  sortOrder: 0,
  isActive: true,
  startAt: '',
  endAt: '',
  image: '',
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function bannerImageSrc(image) {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('blob:')) return image;
  if (!API_BASE) return '';
  return `${API_BASE}/files?key=${encodeURIComponent(image)}`;
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  /** Ids currently being toggled — disables just that row's control, not the whole table. */
  const [togglingIds, setTogglingIds] = useState([]);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const list = await bannerService.list();
      setBanners(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  /**
   * Show/hide a banner without opening the edit dialog.
   *
   * `isActive` is the only switch the app honours regardless of dates: the public feed returns
   * `isActive: true` AND inside the start/end window, so a banner can be scheduled correctly and
   * still be hidden by this flag. Updates optimistically and rolls back on failure so the row
   * never shows a state the server rejected.
   */
  const toggleActive = useCallback(
    async (banner) => {
      const id = banner?._id;
      if (!id) return;
      const next = !banner.isActive;
      setTogglingIds((ids) => [...ids, id]);
      setBanners((rows) =>
        rows.map((r) => (r._id === id ? { ...r, isActive: next } : r)),
      );
      try {
        await bannerService.update(id, { isActive: next });
        toast.success(next ? 'Banner is now active' : 'Banner hidden');
      } catch (err) {
        setBanners((rows) =>
          rows.map((r) => (r._id === id ? { ...r, isActive: banner.isActive } : r)),
        );
        toast.error(err.response?.data?.message || 'Could not update banner');
      } finally {
        setTogglingIds((ids) => ids.filter((x) => x !== id));
      }
    },
    [],
  );

  useEffect(() => {
    contestService
      .getContests({ limit: 50 })
      .then((res) => setContests(res?.contests || []))
      .catch(() => setContests([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setPreview('');
    setDialogOpen(true);
  };

  const openEdit = (banner) => {
    setEditing(banner);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      type: banner.type || 'announcement',
      link: banner.link || '',
      sortOrder: banner.sortOrder ?? 0,
      isActive: banner.isActive !== false,
      startAt: toDatetimeLocal(banner.startAt),
      endAt: toDatetimeLocal(banner.endAt),
      image: banner.image || '',
    });
    setFile(null);
    setPreview(banner.image || '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFile(null);
    setPreview('');
  };

  const onPickFile = (event) => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editing && !file && !form.image) {
      toast.error('Upload a banner image');
      return;
    }
    try {
      setSubmitting(true);
      let image = form.image;
      if (file) {
        image = await bannerService.uploadImage(file);
        if (!image) throw new Error('Image upload failed');
      }
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        type: form.type,
        link: form.link.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        image,
      };
      if (editing) {
        await bannerService.update(editing._id, payload);
        toast.success('Banner updated');
      } else {
        await bannerService.create(payload);
        toast.success('Banner created');
      }
      closeDialog();
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await bannerService.remove(deleteTarget._id);
      toast.success('Banner deleted');
      setDeleteTarget(null);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const typeLabel = (type) => TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Home banners
            </CardTitle>
            <CardDescription>
              Slides on the app home screen for contests, live shows, and announcements.
              Inactive or expired banners stay hidden from users.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add banner
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : banners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No banners yet. Add one to show it on home.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner._id}>
                    <TableCell>
                      {bannerImageSrc(banner.image) ? (
                        <img
                          src={bannerImageSrc(banner.image)}
                          alt=""
                          className="h-12 w-20 rounded-md object-cover bg-muted"
                        />
                      ) : (
                        <div className="h-12 w-20 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell>{typeLabel(banner.type)}</TableCell>
                    <TableCell>{banner.sortOrder ?? 0}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        disabled={togglingIds.includes(banner._id)}
                        onClick={() => toggleActive(banner)}
                        title={
                          banner.isActive
                            ? 'Click to hide this banner'
                            : 'Click to make this banner active'
                        }
                      >
                        <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                          {banner.isActive ? 'Active' : 'Hidden'}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(banner)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setDeleteTarget(banner)}>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit banner' : 'New banner'}</DialogTitle>
              <DialogDescription>
                Image should be wide (about 16:9). Home uses the app red accent on dots and labels.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="banner-title">Title</Label>
                <Input
                  id="banner-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={80}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-subtitle">Subtitle (optional)</Label>
                <Input
                  id="banner-subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  maxLength={160}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-type">Type</Label>
                <select
                  id="banner-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, link: '' }))}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.type === 'contest' ? (
                <div className="grid gap-2">
                  <Label htmlFor="banner-contest">Contest</Label>
                  <select
                    id="banner-contest"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.link}
                    onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  >
                    <option value="">Open contest tab</option>
                    {contests.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="banner-link">
                    {form.type === 'show'
                      ? 'Live stream ID'
                      : form.type === 'external'
                        ? 'https URL'
                        : 'Optional in-app path or URL'}
                  </Label>
                  <Input
                    id="banner-link"
                    value={form.link}
                    onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                    placeholder={
                      form.type === 'show'
                        ? 'Live stream ObjectId'
                        : form.type === 'external'
                          ? 'https://…'
                          : '/home/leaderboard'
                    }
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="banner-order">Sort order</Label>
                  <Input
                    id="banner-order"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <input
                    id="banner-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <Label htmlFor="banner-active">Active on home</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="banner-start">Starts (optional)</Label>
                  <Input
                    id="banner-start"
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="banner-end">Ends (optional)</Label>
                  <Input
                    id="banner-end"
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-image">Image</Label>
                <Input id="banner-image" type="file" accept="image/*" onChange={onPickFile} />
                {bannerImageSrc(preview) || (preview.startsWith('blob:') ? preview : '') ? (
                  <img
                    src={preview.startsWith('blob:') ? preview : bannerImageSrc(preview)}
                    alt=""
                    className="mt-1 h-28 w-full rounded-md object-cover bg-muted"
                  />
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete banner?"
        description={`“${deleteTarget?.title || ''}” will disappear from the home screen.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
};

export default BannerManagement;
