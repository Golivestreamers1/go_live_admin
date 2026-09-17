import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Trash2, Plus, CalendarDays, GripVertical, ListOrdered, RefreshCw, Eye } from 'lucide-react';
import dashboardService from '../services/dashboardService';

// ── Streamer autocomplete ─────────────────────────────────────────────────────

function StreamerAutocomplete({ onSelect, placeholder = 'Search by name or username…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const users = await dashboardService.searchStreamers(q);
      setResults(users);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const pick = (u) => {
    onSelect({ streamerId: String(u._id), streamerName: u.username || u.name || '' });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input value={query} onChange={handleChange} onFocus={() => results.length && setOpen(true)} placeholder={placeholder} className="text-sm" />
      {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-auto">
          {results.map((u) => (
            <li key={String(u._id)} onMouseDown={(e) => { e.preventDefault(); pick(u); }}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent">
              <span className="font-medium">{u.username || u.name}</span>
              {u.username && u.name && <span className="text-muted-foreground text-xs">{u.name}</span>}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{String(u._id).slice(-6)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmt(d) { return d ? new Date(d).toLocaleString() : '—'; }

const now = () => new Date();
const isActive = (s) => new Date(s.startsAt) <= now() && new Date(s.endsAt) >= now();
const isPast = (s) => new Date(s.endsAt) < now();
const isUpcoming = (s) => new Date(s.startsAt) > now();

// ── Schedules tab ─────────────────────────────────────────────────────────────

function SchedulesTab() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ streamerId: '', streamerName: '', priority: 0, startsAt: '', endsAt: '' });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dashboardService.getStreamSchedules();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.streamerId || !form.startsAt || !form.endsAt) {
      toast.error('Streamer, start time and end time are required');
      return;
    }
    setSaving(true);
    try {
      await dashboardService.createStreamSchedule({
        streamerId: form.streamerId,
        priority: Number(form.priority) || 0,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success(`Schedule created for ${form.streamerName || 'streamer'}`);
      setForm({ streamerId: '', streamerName: '', priority: 0, startsAt: '', endsAt: '' });
      load();
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await dashboardService.deleteStreamSchedule(toDelete._id);
      toast.success('Schedule deleted');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setDeleting(false); setToDelete(null); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Schedule a streamer to appear at the top of the home screen during a time window. When they go live inside that window, their stream is automatically ranked second (below manual pins).
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5"><Plus className="h-4 w-4" />New schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Streamer *</label>
              <StreamerAutocomplete onSelect={({ streamerId: id, streamerName: name }) => { set('streamerId', id); if (name) set('streamerName', name); }} />
              {form.streamerId && <p className="text-xs text-muted-foreground font-mono">{form.streamerId}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Priority (0 = top)</label>
              <Input type="number" min={0} value={form.priority} onChange={(e) => set('priority', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Starts at *</label>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Ends at *</label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
            </div>
          </div>
          <Button onClick={create} disabled={saving || !form.streamerId}>
            {saving ? 'Creating…' : 'Create schedule'}
          </Button>
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : schedules.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No schedules yet.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Streamer</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={String(s._id)} className={isPast(s) ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="font-medium text-sm">{s.streamerId?.username || s.streamerId?.name || '—'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{String(s.streamerId?._id || s.streamerId).slice(-8)}</div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{fmt(s.startsAt)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmt(s.endsAt)}</TableCell>
                  <TableCell className="text-sm">{s.priority}</TableCell>
                  <TableCell>
                    {isActive(s) ? (
                      <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                    ) : isPast(s) ? (
                      <Badge variant="outline" className="text-muted-foreground">Past</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-0">Upcoming</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the schedule for <strong>{toDelete?.streamerId?.username || toDelete?.streamerId?.name || 'this streamer'}</strong> ({fmt(toDelete?.startsAt)} → {fmt(toDelete?.endsAt)}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Manual pins tab ───────────────────────────────────────────────────────────

function ManualTab() {
  const [pinned, setPinned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamerId, setStreamerId] = useState('');
  const [streamerName, setStreamerName] = useState('');
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toUnpin, setToUnpin] = useState(null);
  const [unpinning, setUnpinning] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dashboardService.getStreamOrderConfig();
      setPinned(Array.isArray(data) ? data.filter((s) => s.orderMode === 'manual') : []);
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pin = async () => {
    if (!streamerId) { toast.error('Select a streamer first'); return; }
    setSaving(true);
    try {
      await dashboardService.pinManualStream(streamerId, Number(priority) || 0);
      toast.success(`${streamerName || 'Streamer'} pinned`);
      setStreamerId(''); setStreamerName(''); setPriority(0);
      load();
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const confirmUnpin = async () => {
    if (!toUnpin) return;
    setUnpinning(true);
    try {
      await dashboardService.unpinStream(String(toUnpin._id));
      toast.success('Stream unpinned');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setUnpinning(false); setToUnpin(null); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Manually pin a currently-live stream to the very top of the home screen. Highest priority — sits above scheduled streams.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5"><GripVertical className="h-4 w-4 text-purple-500" />Pin live stream</CardTitle>
          <CardDescription className="text-xs">The streamer must be live right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium">Streamer *</label>
              <StreamerAutocomplete onSelect={({ streamerId: id, streamerName: name }) => { setStreamerId(id); setStreamerName(name); }} />
              {streamerId && <p className="text-xs text-muted-foreground font-mono">{streamerId} — {streamerName}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Priority (0 = top)</label>
              <Input type="number" min={0} value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>
          <Button onClick={pin} disabled={saving || !streamerId}>
            {saving ? 'Pinning…' : 'Pin stream'}
          </Button>
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : pinned.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No streams manually pinned.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Streamer</TableHead>
                <TableHead>Stream title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Live since</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...pinned].sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0)).map((s) => (
                <TableRow key={String(s._id)}>
                  <TableCell>
                    <div className="font-medium text-sm">{s.streamer?.username || s.streamer?.name || '—'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{String(s._id).slice(-8)}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.title || '—'}</TableCell>
                  <TableCell className="text-sm">{s.orderPriority ?? 0}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmt(s.startedAt)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToUnpin(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!toUnpin} onOpenChange={(v) => !v && !unpinning && setToUnpin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove pin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpin <strong>{toUnpin?.streamer?.username || toUnpin?.streamer?.name || 'this stream'}</strong> and return it to default ordering.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpinning}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unpinning} onClick={(e) => { e.preventDefault(); void confirmUnpin(); }}>
              {unpinning ? 'Removing…' : 'Remove pin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Preview tab ───────────────────────────────────────────────────────────────

function PreviewTab() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.previewStreamOrder();
      setPreview(data.streams || []);
    } catch (e) { toast.error(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Shows the exact order the home screen would display right now.</p>
      <Button variant="outline" onClick={load} disabled={loading}>
        <Eye className="h-4 w-4 mr-1" />{loading ? 'Loading…' : 'Load preview'}
      </Button>
      {preview && (preview.length === 0 ? (
        <p className="text-sm text-muted-foreground">No streams are live right now.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Streamer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Viewers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((s) => (
                <TableRow key={s.streamId}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.position}</TableCell>
                  <TableCell className="font-medium text-sm">{s.streamerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{s.title || '—'}</TableCell>
                  <TableCell>
                    {s.orderMode === 'manual' ? (
                      <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Manual</Badge>
                    ) : s.orderMode === 'scheduled' ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Scheduled</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.viewerCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'schedules', label: 'Schedules', icon: CalendarDays },
  { key: 'manual', label: 'Manual Pins', icon: GripVertical },
  { key: 'preview', label: 'Preview', icon: Eye },
];

export default function StreamOrderManagement() {
  const [tab, setTab] = useState('schedules');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ListOrdered className="h-6 w-6" />Stream Order
        </h1>
        <p className="text-muted-foreground text-sm">
          Control which streams appear at the top of the home screen.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <Badge className="bg-purple-100 text-purple-700 border-0">Manual</Badge>
          Highest priority — admin pins a live stream now
        </span>
        <span className="flex items-center gap-1.5">
          <Badge className="bg-blue-100 text-blue-700 border-0">Scheduled</Badge>
          Second priority — applied automatically when streamer goes live in the window
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="outline">Default</Badge>
          Popular score / latest-first
        </span>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {tab === 'schedules' && <SchedulesTab />}
        {tab === 'manual' && <ManualTab />}
        {tab === 'preview' && <PreviewTab />}
      </div>
    </div>
  );
}
