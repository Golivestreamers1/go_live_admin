import React, { useState, useEffect, useMemo, useRef } from 'react';
import { levelService } from '../services/levelService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { Pencil, Upload } from 'lucide-react';
import { toast } from 'sonner';

const MAX_VIDEO_MB = 20;
const HEX = /^#[0-9a-fA-F]{6}$/;
const fmt = (n) => Number(n || 0).toLocaleString();
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

const tierFor = (tiers, level) => tiers.find((t) => t.levelMin <= level && level <= t.levelMax);

const VideoPreview = ({ src }) =>
  src ? <video src={src} className="h-20 w-20 rounded border bg-muted object-contain" muted playsInline loop autoPlay /> : null;

const LevelManagement = () => {
  const [data, setData] = useState({ seeded: true, levels: [], tiers: [], totalXpToLevel100: 0 });
  const [loading, setLoading] = useState(true);
  const [tierDraft, setTierDraft] = useState([]);
  const [savingTiers, setSavingTiers] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ ios: false, android: false });
  const iosRef = useRef(null);
  const androidRef = useRef(null);

  const load = async () => {
    try {
      const d = await levelService.getLevels();
      setData(d);
      setTierDraft(d.tiers.map((t) => ({ ...t })));
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load levels'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tierDirty = useMemo(
    () => JSON.stringify(tierDraft.map((t) => [t.color, t.label])) !== JSON.stringify(data.tiers.map((t) => [t.color, t.label])),
    [tierDraft, data.tiers],
  );

  const saveTiers = async () => {
    if (tierDraft.some((t) => !HEX.test(t.color))) {
      toast.error('Colors must be hex like #FF9800');
      return;
    }
    try {
      setSavingTiers(true);
      await levelService.saveTiers(tierDraft.map(({ tierKey, color, label }) => ({ tierKey, color, label })));
      toast.success('Tiers saved');
      await load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save tiers'));
    } finally {
      setSavingTiers(false);
    }
  };

  const openEdit = (row) => {
    const a = row.animation || {};
    setEditing(row);
    setForm({
      xpToNext: String(row.xpToNext),
      videoUrlIos: a.videoUrlIos || '',
      videoUrlAndroid: a.videoUrlAndroid || '',
      durationMs: a.durationMs ?? '',
      isActive: a.isActive === true,
    });
  };

  const handleUpload = async (e, platform) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const isIos = platform === 'ios';
    const name = file.name.toLowerCase();
    if (isIos && !name.endsWith('.mov')) {
      toast.error('iOS level video must be HEVC with alpha — upload a .mov file.');
    } else if (!isIos && !/\.(webm|mp4|m4v)$/.test(name)) {
      toast.error('Android level video must be a stacked luma-matte .mp4 (or .webm).');
    } else if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video is over ${MAX_VIDEO_MB} MB. Compress it before uploading.`);
    } else {
      try {
        setUploading((u) => ({ ...u, [platform]: true }));
        const result = await levelService.uploadVideo(file);
        const url = result?.url;
        if (!url) throw new Error('no url');
        setForm((f) => ({
          ...f,
          [isIos ? 'videoUrlIos' : 'videoUrlAndroid']: url,
          durationMs: typeof result.animationDurationMs === 'number' && result.animationDurationMs > 0 ? result.animationDurationMs : f.durationMs,
        }));
        toast.success(isIos ? 'iOS video uploaded' : 'Android video uploaded');
      } catch (err) {
        toast.error(errMsg(err, 'Upload failed'));
      }
      setUploading((u) => ({ ...u, [platform]: false }));
    }
    e.target.value = '';
  };

  const buildBody = () => {
    const body = {};
    const xp = Number(form.xpToNext);
    if (xp !== editing.xpToNext) body.xpToNext = xp;
    if (editing.level >= 2) {
      const a = editing.animation || {};
      const animation = {};
      if (form.videoUrlIos !== (a.videoUrlIos || '')) animation.videoUrlIos = form.videoUrlIos || null;
      if (form.videoUrlAndroid !== (a.videoUrlAndroid || '')) animation.videoUrlAndroid = form.videoUrlAndroid || null;
      const d = form.durationMs === '' ? null : Number(form.durationMs);
      if (d !== (a.durationMs ?? null)) animation.durationMs = d;
      if (form.isActive !== (a.isActive === true)) animation.isActive = form.isActive;
      if (Object.keys(animation).length) body.animation = animation;
    }
    return body;
  };

  const submit = async () => {
    const xp = Number(form.xpToNext);
    if (editing.level < 100 && (!Number.isInteger(xp) || xp < 1)) {
      toast.error('XP to next level must be a whole number of at least 1');
      return;
    }
    if (form.isActive && !form.videoUrlIos && !form.videoUrlAndroid) {
      toast.error('Upload at least one video before activating, or leave the animation inactive.');
      return;
    }
    const body = buildBody();
    if (!Object.keys(body).length) {
      setEditing(null);
      return;
    }
    try {
      setSaving(true);
      await levelService.updateLevel(editing.level, body);
      toast.success(`Level ${editing.level} saved`);
      setConfirmOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save level'));
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = () => {
    if (editing.level < 100 && Number(form.xpToNext) !== editing.xpToNext) setConfirmOpen(true);
    else submit();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Levels</h1>
        <p className="text-muted-foreground">XP per level, level-up animations and tier colors. Level is derived from lifetime XP.</p>
      </div>

      {!loading && !data.seeded && (
        <Card>
          <CardContent className="pt-6 text-sm text-amber-700">
            Levels are not seeded yet, so edits are disabled and the built-in defaults are in use. Run <code>npm run seed:levels</code> on the backend.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Total XP to level 100</CardTitle>
          <CardDescription>Read-only. Sum of XP to next level for levels 1–99.</CardDescription>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{fmt(data.totalXpToLevel100)}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiers</CardTitle>
          <CardDescription>Ranges are fixed. Color drives the name ring in live rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tierDraft.map((t, i) => (
            <div key={t.tierKey} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-sm font-medium">{t.levelMin}–{t.levelMax}</span>
              <input
                type="color"
                value={HEX.test(t.color) ? t.color : '#000000'}
                disabled={!data.seeded}
                onChange={(e) => setTierDraft((d) => d.map((x, j) => (j === i ? { ...x, color: e.target.value.toUpperCase() } : x)))}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                className="w-28"
                value={t.color}
                disabled={!data.seeded}
                onChange={(e) => setTierDraft((d) => d.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
              />
              <Input
                className="w-48"
                value={t.label}
                maxLength={40}
                disabled={!data.seeded}
                onChange={(e) => setTierDraft((d) => d.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
            </div>
          ))}
          <Button onClick={saveTiers} disabled={!tierDirty || savingTiers || !data.seeded}>
            {savingTiers ? 'Saving…' : 'Save tiers'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">XP to next</TableHead>
                <TableHead className="text-right">Cumulative XP</TableHead>
                <TableHead>Animation</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.levels.map((row) => {
                const tier = tierFor(data.tiers, row.level);
                const a = row.animation || {};
                return (
                  <TableRow key={row.level}>
                    <TableCell className="font-medium">{row.level}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border" style={{ background: tier?.color }} />
                        {tier?.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{row.level < 100 ? fmt(row.xpToNext) : '—'}</TableCell>
                    <TableCell className="text-right">{fmt(row.cumulativeXp)}</TableCell>
                    <TableCell>
                      {row.level < 2 ? (
                        '—'
                      ) : (
                        <span className="flex gap-1">
                          <Badge variant={a.videoUrlIos ? 'default' : 'outline'}>iOS</Badge>
                          <Badge variant={a.videoUrlAndroid ? 'default' : 'outline'}>Android</Badge>
                          <Badge variant={a.isActive ? 'default' : 'outline'}>{a.isActive ? 'Active' : 'Off'}</Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" disabled={!data.seeded} onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          {editing && form && (
            <>
              <DialogHeader>
                <DialogTitle>Edit level {editing.level}</DialogTitle>
                <DialogDescription>
                  {editing.updatedAt ? `Last edited ${new Date(editing.updatedAt).toLocaleString()}` : 'Using seeded defaults'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="xpToNext">XP to reach level {editing.level + 1}</Label>
                  <Input
                    id="xpToNext"
                    type="number"
                    min={1}
                    value={form.xpToNext}
                    disabled={editing.level >= 100}
                    onChange={(e) => setForm((f) => ({ ...f, xpToNext: e.target.value }))}
                  />
                </div>
                {editing.level >= 2 ? (
                  <>
                    {[
                      ['ios', 'iOS video — HEVC with alpha (.mov)', 'videoUrlIos', iosRef, 'video/quicktime,.mov'],
                      ['android', 'Android video — stacked luma-matte (.mp4)', 'videoUrlAndroid', androidRef, 'video/mp4,video/webm,.mp4,.webm'],
                    ].map(([platform, label, field, ref, accept]) => (
                      <div key={platform} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex items-center gap-3">
                          <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => handleUpload(e, platform)} />
                          <Button type="button" variant="outline" size="sm" disabled={uploading[platform]} onClick={() => ref.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading[platform] ? 'Uploading…' : form[field] ? 'Replace' : 'Upload'}
                          </Button>
                          <VideoPreview src={form[field]} />
                          {form[field] && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, [field]: '' }))}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor="durationMs">Duration (ms)</Label>
                      <Input
                        id="durationMs"
                        type="number"
                        min={0}
                        value={form.durationMs}
                        onChange={(e) => setForm((f) => ({ ...f, durationMs: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                      <Label>Active (included in app pre-download and played in rooms)</Label>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Level 1 is the starting level and has no animation.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={onSaveClick} disabled={saving || uploading.ios || uploading.android}>Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
        title="Change XP for this level?"
        description="This changes every user's level immediately."
        confirmText="Change XP"
        variant="warning"
        loading={saving}
      />
    </div>
  );
};

export default LevelManagement;
