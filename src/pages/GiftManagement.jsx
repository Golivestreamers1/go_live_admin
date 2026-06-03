import React, { useState, useEffect } from 'react';
import { giftService } from '../services/giftService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Gift, Plus, Pencil, Trash2, Image as ImageIcon, Upload, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';

const GIFT_CATEGORIES = ["Popular", "Roses", "Special", "Guns", "New"];

const emptyGift = {
  name: '',
  coinValue: '',
  category: 'Popular',
  iconUrl: '',
  animationUrl: '',
  /** Raw Lottie JSON (Bodymovin) — from paste or .json file read in browser; stored in MongoDB. */
  animationJson: '',
  animationDurationMs: null,
  /** Admin-facing seconds (converted to ms on save). */
  animationDurationSec: '',
  displayOrder: 0,
  isActive: true,
};

const msToDurationSecInput = (ms) => {
  if (ms == null || ms === '' || Number(ms) <= 0) return '';
  const sec = Number(ms) / 1000;
  return Number.isInteger(sec) ? String(sec) : String(Math.round(sec * 100) / 100);
};

const parseDurationSecToMs = (secStr) => {
  if (secStr === '' || secStr == null) return null;
  const sec = Number(secStr);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.round(sec * 1000);
};

const formatDurationLabel = (ms) => {
  if (ms == null || Number(ms) <= 0) return '—';
  const sec = Number(ms) / 1000;
  return sec >= 10 ? `${sec.toFixed(1)} s` : `${sec < 1 ? sec.toFixed(2) : sec.toFixed(1)} s`;
};

/** Table / picker preview: icon first; else static animation (GIF/WebP/PNG), not Lottie JSON. */
function giftStripPreviewSrc(g) {
  const icon = g?.iconUrl?.trim();
  if (icon) return icon;
  const anim = g?.animationUrl?.trim();
  if (anim && !/\.json($|\?)/i.test(anim)) return anim;
  return null;
}

const GiftManagement = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState({ ...emptyGift });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPreviewUrl, setIconPreviewUrl] = useState('');
  const iconFileRef = React.useRef(null);
  const [uploadingAnimation, setUploadingAnimation] = useState(false);
  const [animationPreviewUrl, setAnimationPreviewUrl] = useState('');
  const animationFileRef = React.useRef(null);
  const lottieJsonFileRef = React.useRef(null);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const list = await giftService.getGifts();
      setGifts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch gifts', err);
      toast.error(err.response?.data?.message || 'Failed to fetch gifts');
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  const openCreate = () => {
    setEditingGift(null);
    setForm({ ...emptyGift });
    setIconPreviewUrl('');
    setAnimationPreviewUrl('');
    setDialogOpen(true);
  };

  const openEdit = (gift) => {
    setEditingGift(gift);
    setForm({
      name: gift.name ?? '',
      coinValue: gift.coinValue ?? '',
      category: gift.category ?? 'Popular',
      iconUrl: gift.iconUrl ?? '',
      animationUrl: gift.animationUrl ?? '',
      animationJson: typeof gift.animationJson === 'string' ? gift.animationJson : '',
      animationDurationMs:
        typeof gift.animationDurationMs === 'number' && gift.animationDurationMs > 0
          ? gift.animationDurationMs
          : null,
      animationDurationSec: msToDurationSecInput(gift.animationDurationMs),
      displayOrder: gift.displayOrder ?? 0,
      isActive: gift.isActive !== false,
    });
    setIconPreviewUrl(gift.iconUrl ?? '');
    setAnimationPreviewUrl(gift.animationUrl ?? '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingGift(null);
    setForm({ ...emptyGift });
    setIconPreviewUrl('');
    setAnimationPreviewUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = String(form.name).trim();
    const coinValue = Number(form.coinValue);
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (isNaN(coinValue) || coinValue < 0) {
      toast.error('Coin value must be a non-negative number');
      return;
    }
    const iconT = form.iconUrl?.trim() || '';
    const animT = form.animationUrl?.trim() || '';
    const animJsonT = form.animationJson?.trim() || '';
    if (animJsonT) {
      try {
        JSON.parse(animJsonT);
      } catch {
        toast.error('Lottie JSON is invalid — paste valid JSON from your .json file.');
        return;
      }
    }
    if (!iconT && !animT && !animJsonT) {
      toast.error('Add a Lottie JSON, a send animation URL/upload, and/or an icon — at least one is required.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        name,
        coinValue,
        category: form.category || 'Popular',
        iconUrl: iconT || undefined,
        animationUrl: animT || undefined,
        animationJson: animJsonT || null,
        animationDurationMs: (() => {
          const fromSec = parseDurationSecToMs(form.animationDurationSec);
          if (fromSec != null) return fromSec;
          if (typeof form.animationDurationMs === 'number' && form.animationDurationMs > 0) {
            return form.animationDurationMs;
          }
          return null;
        })(),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      if (editingGift?._id) {
        await giftService.updateGift(editingGift._id, body);
        toast.success('Gift updated');
      } else {
        await giftService.createGift(body);
        toast.success('Gift created');
      }
      closeDialog();
      fetchGifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (gift) => setDeleteTarget(gift);

  const handleUploadIcon = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, GIF, WebP)');
      return;
    }
    try {
      setUploadingIcon(true);
      const result = await giftService.uploadImage(file);
      const url = result?.url ?? result;
      if (url) {
        setForm((f) => ({ ...f, iconUrl: url }));
        setIconPreviewUrl(result?.previewUrl || url);
        toast.success('Icon uploaded');
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingIcon(false);
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
  };

  const handleUploadAnimation = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    const okExt = /\.(gif|webp|png|jpe?g)$/i.test(name);
    if (!okExt) {
      toast.error('Upload GIF / WebP / PNG / JPG only. For Lottie, upload a .json file or paste JSON below.');
      return;
    }
    try {
      setUploadingAnimation(true);
      const result = await giftService.uploadAnimation(file);
      const url = result?.url ?? result;
      if (url) {
        const autoIcon = result?.iconUrl?.trim?.() || '';
        setForm((f) => ({
          ...f,
          animationUrl: url,
          animationDurationMs:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? result.animationDurationMs
              : f.animationDurationMs,
          animationDurationSec:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? msToDurationSecInput(result.animationDurationMs)
              : f.animationDurationSec,
          iconUrl: autoIcon || f.iconUrl,
        }));
        if (autoIcon) setIconPreviewUrl(result?.iconPreviewUrl || autoIcon);
        setAnimationPreviewUrl(result?.previewUrl || url);
        toast.success(
          autoIcon
            ? 'Animation uploaded — picker icon auto-generated'
            : 'Animation uploaded — viewers will see it when this gift is sent',
        );
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingAnimation(false);
      if (animationFileRef.current) animationFileRef.current.value = '';
    }
  };

  const handleLottieJsonFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    if (!name.endsWith('.json') && file.type && !/json|text\/plain/i.test(file.type)) {
      toast.error('Please choose a Lottie / Bodymovin .json file.');
      if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
      return;
    }
    try {
      const text = await file.text();
      const trimmed = text.trim();
      if (!trimmed) {
        toast.error('File is empty.');
        if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
        return;
      }
      JSON.parse(trimmed);
      setForm((f) => ({ ...f, animationJson: trimmed }));
      toast.success('Lottie JSON loaded from file — save the gift to store it.');
    } catch {
      toast.error('Invalid JSON — use a valid Bodymovin / Lottie export .json file.');
    } finally {
      if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?._id) return;
    try {
      setDeleteLoading(true);
      await giftService.deleteGift(deleteTarget._id);
      toast.success('Gift deleted');
      setDeleteTarget(null);
      fetchGifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete gift');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Live stream gifts
            </CardTitle>
            <CardDescription>
              <strong>Send animation</strong> (Lottie or GIF) is what plays on the live screen when someone sends this gift. Optional <strong>icon</strong> is a small image in the gift strip; if you only upload an animation, the app uses it everywhere.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add gift
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading gifts...</div>
          ) : gifts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No gifts yet. Click &quot;Add gift&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Icon</TableHead>
                  <TableHead className="w-[60px]">Animation</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Rubies</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gifts.map((g) => (
                  <TableRow key={g._id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded border flex items-center justify-center bg-muted overflow-hidden">
                        {giftStripPreviewSrc(g) ? (
                          <img
                            src={giftStripPreviewSrc(g)}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-10 w-10 rounded border flex items-center justify-center bg-muted overflow-hidden text-[10px] text-muted-foreground"
                        title={g.animationUrl || ''}
                      >
                        {(g.animationJson && String(g.animationJson).trim()) ||
                        (g.animationUrl && /\.json($|\?)/i.test(g.animationUrl)) ? (
                          <span className="px-1 text-center leading-tight">Lottie</span>
                        ) : g.animationUrl ? (
                          <img
                            src={g.animationUrl}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.category || 'Popular'}</Badge>
                    </TableCell>
                    <TableCell>{g.coinValue}</TableCell>
                    <TableCell>{g.rubyValue ?? '—'}</TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {formatDurationLabel(g.animationDurationMs)}
                    </TableCell>
                    <TableCell>{g.displayOrder ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={g.isActive !== false ? 'default' : 'secondary'}>
                        {g.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-1"
                        onClick={() => openEdit(g)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(g)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGift ? 'Edit gift' : 'Add gift'}</DialogTitle>
            <DialogDescription>
              {editingGift
                ? 'Lottie: upload a .json file or paste JSON below (stored in MongoDB). Optional: GIF/WebP URL or upload for raster animation; icon for the gift strip.'
                : 'Upload your Lottie .json file or paste JSON, or set a GIF/WebP animation URL/upload, plus optional icon.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rose, Rocket"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coinValue">Coin value *</Label>
              <Input
                id="coinValue"
                type="number"
                min={0}
                step={1}
                value={form.coinValue}
                onChange={(e) => setForm((f) => ({ ...f, coinValue: e.target.value }))}
                placeholder="e.g. 10"
                required
              />
              <p className="text-xs text-muted-foreground">Streamer earns 55% of coins as rubies when the stream ends.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {GIFT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Category determines how gifts are grouped in the app.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="animationJson">Lottie animation (JSON)</Label>
              <p className="text-xs text-muted-foreground">
                Upload a Bodymovin / Lottie <code className="text-xs">.json</code> file (we read it in the browser and store the JSON in MongoDB), or paste the same below. No line or character cap in the form — very large files are limited only by MongoDB (~16MB per document) and the API payload. Plays on viewer and streamer for ~10s when the gift is sent.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={lottieJsonFileRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  className="hidden"
                  onChange={handleLottieJsonFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => lottieJsonFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload lottie.json
                </Button>
                {form.animationJson?.trim() ? (
                  <span className="text-xs text-muted-foreground">JSON loaded — edit below if needed.</span>
                ) : null}
              </div>
              <Textarea
                id="animationJson"
                value={form.animationJson}
                onChange={(e) => setForm((f) => ({ ...f, animationJson: e.target.value }))}
                placeholder='{"v":"5.7.4","fr":60,...} or use Upload lottie.json above'
                className="font-mono text-xs min-h-[120px]"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Send animation (GIF / WebP / image URL)
              </Label>
              <p className="text-xs text-muted-foreground">
                Optional alternative to Lottie JSON: raster animation or static art. You can also upload a file (not .json).
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={animationFileRef}
                  type="file"
                  accept="image/gif,image/webp,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleUploadAnimation}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAnimation}
                  onClick={() => animationFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAnimation ? 'Uploading…' : 'Upload image / GIF'}
                </Button>
                {(animationPreviewUrl || form.animationUrl) &&
                /\.json($|[?#&])/i.test((form.animationUrl || animationPreviewUrl || '').trim()) ? (
                  <span
                    className="text-xs text-muted-foreground max-w-[200px] truncate"
                    title={form.animationUrl || animationPreviewUrl}
                  >
                    JSON URL (legacy)
                  </span>
                ) : (animationPreviewUrl || form.animationUrl) ? (
                  <div className="h-14 w-14 rounded border overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={animationPreviewUrl || form.animationUrl}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <Input
                id="animationUrl"
                type="url"
                value={form.animationUrl}
                onChange={(e) => setForm((f) => ({ ...f, animationUrl: e.target.value }))}
                placeholder="Or paste animation URL (Lottie .json or image URL)"
                className="mt-1"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/30">
              <Label htmlFor="animationDurationSec">Playback duration (seconds)</Label>
              <p className="text-xs text-muted-foreground">
                How long the gift animation plays on stream (GIF/WebP loop timing). Auto-filled when you
                upload a GIF; you can override. Leave empty to use app default (~10s for Lottie). Examples:{' '}
                <code className="text-xs">1.8</code> = 1800ms, <code className="text-xs">9</code> = 9 seconds.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="animationDurationSec"
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="max-w-[160px]"
                  value={form.animationDurationSec}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      animationDurationSec: e.target.value,
                      animationDurationMs: null,
                    }))
                  }
                  placeholder="e.g. 1.8"
                />
                {form.animationDurationSec !== '' && parseDurationSecToMs(form.animationDurationSec) != null && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    = {parseDurationSecToMs(form.animationDurationSec).toLocaleString()} ms
                  </span>
                )}
                {form.animationDurationSec !== '' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        animationDurationSec: '',
                        animationDurationMs: null,
                      }))
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon image (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Small thumbnail in the gift strip. If you skip this, the app uses your animation (GIF/WebP) as the thumbnail; Lottie-only gifts show a default until you add a PNG/GIF icon.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={iconFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleUploadIcon}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingIcon}
                  onClick={() => iconFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingIcon ? 'Uploading...' : 'Upload icon'}
                </Button>
                {form.animationUrl?.trim() && !form.iconUrl?.trim() && /\.(gif|webp|png|jpe?g)($|\?)/i.test(form.animationUrl) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, iconUrl: f.animationUrl?.trim() || '' }))}
                  >
                    Use animation as icon
                  </Button>
                )}
                {(iconPreviewUrl || form.iconUrl) && (
                  <div className="h-12 w-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                    <img src={iconPreviewUrl || form.iconUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <Input
                id="iconUrl"
                type="url"
                value={form.iconUrl}
                onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
                placeholder="Or paste icon URL"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active (show in app gift list)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingGift ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete gift"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
};

export default GiftManagement;
