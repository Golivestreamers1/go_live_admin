import React, { useState, useEffect, useCallback } from 'react';
import { contestService } from '../services/contestService';
import { subscribeContestLeaderboard, FALLBACK_POLL_MS, CONTEST_LB_LIMIT } from '../services/contestSocket.service';
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
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  ListOrdered,
  Flag,
  Clock,
  X,
  Coins,
  Crown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

// Only "Rubies earned" is exposed in the admin UI for now (client decision).
// The backend fully supports stream_time / coins_received / hearts — they are
// intentionally kept there so we can re-enable them here later just by adding
// the rows back to this array; no backend change needed.
const METRICS = [
  { value: 'rubies', label: 'Rubies earned' },
  // { value: 'stream_time', label: 'Time streamed' },
  // { value: 'coins_received', label: 'Gifts / coins received' },
  // { value: 'hearts', label: 'Hearts / likes' },
];

// Full label map kept complete so existing/historic contests created with any
// metric still render a friendly name in the list/details, even though only
// "rubies" can be picked when creating a new contest.
const METRIC_LABEL = {
  rubies: 'Rubies earned',
  stream_time: 'Time streamed',
  coins_received: 'Gifts / coins received',
  hearts: 'Hearts / likes',
};

const STATUS_FILTERS = ['ALL', 'draft', 'scheduled', 'active', 'ended'];

const PAGE_LIMIT = 20;

const statusBadgeVariant = (s) =>
  ({ active: 'default', scheduled: 'secondary', ended: 'outline', draft: 'secondary' }[s] || 'secondary');

const emptyPrize = () => ({ rank: 1, label: '', coins: '' });

const emptyContest = {
  name: '',
  description: '',
  metric: 'rubies',
  status: 'scheduled',
  startAt: '',
  endAt: '',
  prizes: [emptyPrize()],
};

/** ISO string -> value for <input type="datetime-local"> in local time. */
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/** datetime-local value (local) -> ISO string. */
function localInputToIso(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function formatDuration(ms) {
  const n = Number(ms) || 0;
  const totalMin = Math.floor(n / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(n / 1000)}s`;
}

/** Format a standings `value` for display by metricType. */
function formatValue(value, metricType) {
  if (metricType === 'time_ms') return formatDuration(value);
  const n = Number(value) || 0;
  return n.toLocaleString();
}

const valueColumnLabel = (metric) =>
  ({ rubies: 'Rubies', stream_time: 'Time', coins_received: 'Coins', hearts: 'Hearts' }[metric] || 'Score');

const ContestManagement = () => {
  const [contests, setContests] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyContest });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [finalizeTarget, setFinalizeTarget] = useState(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // Details viewer (full contest + standings + prize payouts)
  const [detailsContest, setDetailsContest] = useState(null);
  const [standings, setStandings] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Prize disbursement
  const [disburseTarget, setDisburseTarget] = useState(null); // { prize, recipient }
  const [disburseLoading, setDisburseLoading] = useState(false);

  // Editing prize rewards on an ended (frozen) contest, before payout.
  const [editingPrizes, setEditingPrizes] = useState(false);
  const [prizeDraft, setPrizeDraft] = useState([]);
  const [savingPrizes, setSavingPrizes] = useState(false);

  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contestService.getContests({
        status: statusFilter,
        search: search || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setContests(Array.isArray(data?.contests) ? data.contests : []);
      setPagination(data?.pagination ?? { current: 1, pages: 1, total: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch contests');
      setContests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  // Reset to page 1 whenever the filter or search changes.
  const changeStatusFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyContest, prizes: [emptyPrize()] });
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name ?? '',
      description: c.description ?? '',
      metric: c.metric ?? 'rubies',
      status: c.status === 'ended' ? 'ended' : c.status ?? 'scheduled',
      startAt: isoToLocalInput(c.startAt),
      endAt: isoToLocalInput(c.endAt),
      prizes:
        Array.isArray(c.prizes) && c.prizes.length
          ? c.prizes.map((p) => ({ rank: p.rank, label: p.label, coins: p.coins || '' }))
          : [emptyPrize()],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyContest });
  };

  const setPrize = (idx, patch) =>
    setForm((f) => ({
      ...f,
      prizes: f.prizes.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const addPrize = () =>
    setForm((f) => ({ ...f, prizes: [...f.prizes, { rank: f.prizes.length + 1, label: '', coins: '' }] }));

  const removePrize = (idx) =>
    setForm((f) => ({ ...f, prizes: f.prizes.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = String(form.name).trim();
    if (!name) {
      toast.error('Contest name is required');
      return;
    }
    const startIso = localInputToIso(form.startAt);
    const endIso = localInputToIso(form.endAt);
    if (!startIso || !endIso) {
      toast.error('Start and end date/time are required');
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('End must be after start');
      return;
    }
    const prizes = form.prizes
      .filter((p) => String(p.label).trim())
      .map((p) => ({
        rank: Number(p.rank) || 1,
        label: String(p.label).trim(),
        coins: Math.max(0, Math.floor(Number(p.coins) || 0)),
      }));

    const body = {
      name,
      description: String(form.description).trim(),
      metric: form.metric,
      status: form.status,
      startAt: startIso,
      endAt: endIso,
      prizes,
    };
    try {
      setSubmitting(true);
      if (editing?._id) {
        await contestService.updateContest(editing._id, body);
        toast.success('Contest updated');
      } else {
        await contestService.createContest(body);
        toast.success('Contest created');
      }
      closeDialog();
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save contest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?._id) return;
    try {
      setDeleteLoading(true);
      await contestService.deleteContest(deleteTarget._id);
      toast.success('Contest deleted');
      setDeleteTarget(null);
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete contest');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFinalizeConfirm = async () => {
    if (!finalizeTarget?._id) return;
    try {
      setFinalizeLoading(true);
      await contestService.finalizeContest(finalizeTarget._id);
      toast.success('Contest finalized — winner declared');
      setFinalizeTarget(null);
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalize contest');
    } finally {
      setFinalizeLoading(false);
    }
  };

  const loadDetails = useCallback(async (id) => {
    setDetailsLoading(true);
    try {
      // Match the socket push size so the standings table doesn't oscillate
      // between the REST top-N and the live socket top-50 for active contests.
      const data = await contestService.getContest(id, { limit: CONTEST_LB_LIMIT });
      setDetailsContest(data?.contest ?? null);
      setStandings(Array.isArray(data?.standings?.list) ? data.standings.list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load contest details');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const openDetails = (c) => {
    setDetailsContest(c);
    setStandings([]);
    setEditingPrizes(false);
    loadDetails(c._id);
  };

  const closeDetails = () => {
    setDetailsContest(null);
    setEditingPrizes(false);
  };

  // Live standings for an ACTIVE contest: subscribe to the realtime feed so the
  // admin sees the leaderboard move as gifts arrive — no need for streamers to
  // end their streams. Ended contests keep their frozen REST standings.
  const detailsContestId = detailsContest?._id;
  const detailsIsActive = detailsContest?.status === 'active';
  useEffect(() => {
    if (!detailsContestId || !detailsIsActive) return undefined;
    const unsubscribe = subscribeContestLeaderboard(detailsContestId, (payload) => {
      if (!payload || payload.__disconnected) return;
      if (String(payload.contestId) !== String(detailsContestId)) return;
      if (Array.isArray(payload.list)) setStandings(payload.list);
    });
    return unsubscribe;
  }, [detailsContestId, detailsIsActive]);

  // REST fallback while watching a live contest (covers a dropped socket). Skips
  // while editing prizes so it doesn't clobber the in-progress draft/meta.
  useEffect(() => {
    if (!detailsContestId || !detailsIsActive || editingPrizes) return undefined;
    const id = setInterval(() => loadDetails(detailsContestId), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [detailsContestId, detailsIsActive, editingPrizes, loadDetails]);

  const startEditPrizes = () => {
    setPrizeDraft(
      [...(detailsContest?.prizes || [])]
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({ rank: p.rank, label: p.label, coins: p.coins || '' }))
    );
    setEditingPrizes(true);
  };

  const setDraftPrize = (idx, patch) =>
    setPrizeDraft((d) => d.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const addDraftPrize = () =>
    setPrizeDraft((d) => [...d, { rank: d.length + 1, label: '', coins: '' }]);

  const removeDraftPrize = (idx) =>
    setPrizeDraft((d) => d.filter((_, i) => i !== idx));

  const savePrizes = async () => {
    if (!detailsContest?._id) return;
    const prizes = prizeDraft
      .filter((p) => String(p.label).trim())
      .map((p) => ({
        rank: Number(p.rank) || 1,
        label: String(p.label).trim(),
        coins: Math.max(0, Math.floor(Number(p.coins) || 0)),
      }));
    try {
      setSavingPrizes(true);
      await contestService.updateContest(detailsContest._id, { prizes });
      toast.success('Prizes updated');
      setEditingPrizes(false);
      await loadDetails(detailsContest._id);
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update prizes');
    } finally {
      setSavingPrizes(false);
    }
  };

  const handleDisburseConfirm = async () => {
    if (!detailsContest?._id || !disburseTarget?.prize) return;
    try {
      setDisburseLoading(true);
      await contestService.disbursePrize(detailsContest._id, disburseTarget.prize.rank);
      toast.success(
        `Paid ${Number(disburseTarget.prize.coins).toLocaleString()} coins to ${
          disburseTarget.recipient?.name || 'the winner'
        }`
      );
      setDisburseTarget(null);
      await loadDetails(detailsContest._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disburse prize');
    } finally {
      setDisburseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Contests
            </CardTitle>
            <CardDescription>
              Run time-boxed streamer competitions. A contest ranks streamers by the chosen metric over
              its window; the timer auto-starts and auto-declares a winner at the end. Coin prizes are paid
              out manually by an admin after the contest ends.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New contest
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeStatusFilter(s)}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <form onSubmit={submitSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name"
                  className="pl-8 w-48"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading contests...</div>
          ) : contests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No contests found. Click &quot;New contest&quot; to create one.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prizes</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests.map((c) => {
                    const coinPrizes = (c.prizes || []).filter((p) => p.coins > 0).length;
                    const paid = (c.prizeAwards || []).length;
                    return (
                      <TableRow key={c._id} className="cursor-pointer" onClick={() => openDetails(c)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{METRIC_LABEL[c.metric] || c.metric}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {(c.prizes || []).length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              {coinPrizes > 0 && <Coins className="h-3.5 w-3.5 text-amber-500" />}
                              {(c.prizes || []).length} prize{(c.prizes || []).length > 1 ? 's' : ''}
                              {coinPrizes > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({paid}/{coinPrizes} paid)
                                </span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDateTime(c.startAt)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDateTime(c.endAt)}</TableCell>
                        <TableCell
                          className="text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm" className="mr-1" onClick={() => openDetails(c)} title="View details">
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          {c.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-1"
                              onClick={() => setFinalizeTarget(c)}
                              title="End now & declare winner"
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status !== 'ended' && (
                            <Button variant="ghost" size="sm" className="mr-1" onClick={() => openEdit(c)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination — contest history can grow large. */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.current} of {pagination.pages} · {pagination.total} total
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.current <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={pagination.current >= pagination.pages || loading}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <StreamTimeStatsCard />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit contest' : 'New contest'}</DialogTitle>
            <DialogDescription>
              The timer auto-activates at the start time and auto-finalizes (declares the winner) at the
              end time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contest name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Summer Ruby Rush"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details shown to streamers."
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric">Contest type (ranking metric) *</Label>
              <select
                id="metric"
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                required
                disabled={METRICS.length <= 1}
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Streamers are ranked by how much of this they accumulate during the contest window.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startAt">Starts *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">Ends *</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="scheduled">Scheduled (timer will start it)</option>
                <option value="draft">Draft (not scheduled yet)</option>
                {editing && <option value="active">Active</option>}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prizes (per rank)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPrize}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set an optional <strong>coin reward</strong> per rank. The winner is declared automatically;
                coins are paid out manually by an admin from the contest details after it ends. Leave coins
                at 0 for a display-only / externally-paid prize.
              </p>
              <div className="grid grid-cols-[3rem_1fr_6.5rem_2rem] items-center gap-2 text-xs text-muted-foreground px-1">
                <span>Rank</span>
                <span>Prize description</span>
                <span>Coins</span>
                <span />
              </div>
              {form.prizes.map((p, i) => (
                <div key={i} className="grid grid-cols-[3rem_1fr_6.5rem_2rem] items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={p.rank}
                    onChange={(e) => setPrize(i, { rank: e.target.value })}
                    placeholder="#"
                  />
                  <Input
                    value={p.label}
                    onChange={(e) => setPrize(i, { label: e.target.value })}
                    placeholder="e.g. Grand prize + featured banner"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={p.coins}
                    onChange={(e) => setPrize(i, { coins: e.target.value })}
                    placeholder="0"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePrize(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details viewer — meta, prizes + payout, standings */}
      <Dialog open={!!detailsContest} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {detailsContest?.name}
            </DialogTitle>
            <DialogDescription>
              {detailsContest?.description || 'Contest details, prizes, and standings.'}
            </DialogDescription>
          </DialogHeader>

          {detailsContest && (
            <div className="space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetaTile label="Metric" value={METRIC_LABEL[detailsContest.metric] || detailsContest.metric} />
                <MetaTile
                  label="Status"
                  value={<Badge variant={statusBadgeVariant(detailsContest.status)}>{detailsContest.status}</Badge>}
                />
                <MetaTile label="Starts" value={formatDateTime(detailsContest.startAt)} small />
                <MetaTile label="Ends" value={formatDateTime(detailsContest.endAt)} small />
              </div>

              {detailsContest.metric === 'stream_time' && detailsContest.status === 'ended' && (
                <MetaTile
                  label="App-wide time streamed (window)"
                  value={formatDuration(detailsContest.appWideTotal)}
                />
              )}

              {/* Prizes + payout */}
              {(detailsContest.status === 'ended' || (detailsContest.prizes || []).length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Coins className="h-4 w-4 text-amber-500" /> Prizes
                    </div>
                    {detailsContest.status === 'ended' && !editingPrizes && (
                      <Button variant="outline" size="sm" onClick={startEditPrizes}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit prizes
                      </Button>
                    )}
                  </div>
                  {detailsContest.status !== 'ended' && (
                    <p className="text-xs text-muted-foreground">
                      Coin prizes can be paid out once the contest has ended and the winner is declared.
                    </p>
                  )}

                  {editingPrizes ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Standings are frozen — only the prize rewards are editable. Set the coin amount per
                        rank, then pay out. Ranks already paid are not charged again.
                      </p>
                      <div className="grid grid-cols-[3rem_1fr_6.5rem_2rem] items-center gap-2 text-xs text-muted-foreground px-1">
                        <span>Rank</span>
                        <span>Prize description</span>
                        <span>Coins</span>
                        <span />
                      </div>
                      {prizeDraft.map((p, i) => (
                        <div key={i} className="grid grid-cols-[3rem_1fr_6.5rem_2rem] items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={p.rank}
                            onChange={(e) => setDraftPrize(i, { rank: e.target.value })}
                            placeholder="#"
                          />
                          <Input
                            value={p.label}
                            onChange={(e) => setDraftPrize(i, { label: e.target.value })}
                            placeholder="e.g. Grand prize"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={p.coins}
                            onChange={(e) => setDraftPrize(i, { coins: e.target.value })}
                            placeholder="0"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeDraftPrize(i)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={addDraftPrize}>
                          <Plus className="h-3 w-3 mr-1" /> Add prize
                        </Button>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingPrizes(false)}>
                            Cancel
                          </Button>
                          <Button type="button" size="sm" onClick={savePrizes} disabled={savingPrizes}>
                            {savingPrizes ? 'Saving...' : 'Save prizes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (detailsContest.prizes || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No prizes set yet. Click &quot;Edit prizes&quot; to add a coin reward before paying out.
                    </p>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Rank</TableHead>
                        <TableHead>Prize</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead className="text-right">Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...detailsContest.prizes]
                        .sort((a, b) => a.rank - b.rank)
                        .map((prize) => {
                          const recipient = (detailsContest.finalStandings || []).find(
                            (s) => Number(s.rank) === Number(prize.rank)
                          );
                          const award = (detailsContest.prizeAwards || []).find(
                            (a) => Number(a.rank) === Number(prize.rank)
                          );
                          const isEnded = detailsContest.status === 'ended';
                          const hasCoins = prize.coins > 0;
                          return (
                            <TableRow key={prize.rank}>
                              <TableCell className="font-semibold">#{prize.rank}</TableCell>
                              <TableCell>
                                <div>{prize.label}</div>
                                {hasCoins && (
                                  <div className="text-xs text-amber-600 flex items-center gap-1">
                                    <Coins className="h-3 w-3" />
                                    {Number(prize.coins).toLocaleString()} coins
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {isEnded ? (
                                  recipient ? (
                                    <span className="flex items-center gap-1">
                                      {prize.rank === 1 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                                      {recipient.name || 'User'}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">No streamer placed</span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">TBD</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {!hasCoins ? (
                                  <span className="text-xs text-muted-foreground">Manual / display only</span>
                                ) : award ? (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                    Paid ✓
                                  </Badge>
                                ) : isEnded && recipient ? (
                                  <Button
                                    size="sm"
                                    onClick={() => setDisburseTarget({ prize, recipient })}
                                  >
                                    <Coins className="h-3.5 w-3.5 mr-1" />
                                    Give prize
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {isEnded ? 'No recipient' : 'After it ends'}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  )}
                </div>
              )}

              {/* Standings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered className="h-4 w-4" />
                  {detailsContest.status === 'ended' ? 'Final standings' : 'Live standings'}
                  <span className="text-xs font-normal text-muted-foreground">
                    by {METRIC_LABEL[detailsContest.metric] || detailsContest.metric}
                  </span>
                </div>
                {detailsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading standings...</div>
                ) : standings.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No participants yet for this window.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Rank</TableHead>
                        <TableHead>Streamer</TableHead>
                        <TableHead className="text-right">
                          {valueColumnLabel(detailsContest.metric)}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((s) => (
                        <TableRow key={String(s.userId)}>
                          <TableCell className="font-semibold">#{s.rank}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            {s.profilePicture ? (
                              <img src={s.profilePicture} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted" />
                            )}
                            {s.name || 'User'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValue(s.value, s.metricType)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete contest"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleteLoading}
      />

      <ConfirmationDialog
        isOpen={!!finalizeTarget}
        onClose={() => setFinalizeTarget(null)}
        onConfirm={handleFinalizeConfirm}
        title="End contest now"
        description={`End "${finalizeTarget?.name}" immediately and declare the current leader the winner? The standings will be frozen.`}
        confirmText="End & declare winner"
        cancelText="Cancel"
        loading={finalizeLoading}
      />

      <ConfirmationDialog
        isOpen={!!disburseTarget}
        onClose={() => setDisburseTarget(null)}
        onConfirm={handleDisburseConfirm}
        title="Pay out coin prize"
        description={
          disburseTarget
            ? `Credit ${Number(disburseTarget.prize.coins).toLocaleString()} coins to ${
                disburseTarget.recipient?.name || 'the winner'
              } (rank #${disburseTarget.prize.rank})? This is recorded in the wallet ledger and the user is notified. It can only be done once per rank.`
            : ''
        }
        confirmText="Give prize"
        cancelText="Cancel"
        loading={disburseLoading}
      />
    </div>
  );
};

function MetaTile({ label, value, small }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={small ? 'text-sm font-medium mt-0.5' : 'text-base font-semibold mt-0.5'}>{value}</div>
    </div>
  );
}

/**
 * App-wide stream-time stats over an arbitrary window — "track time streamed as
 * a totality" plus the top streamers, independent of any contest.
 */
function StreamTimeStatsCard() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const s = localInputToIso(start);
    const e = localInputToIso(end);
    if (!s || !e) {
      toast.error('Pick a start and end date/time');
      return;
    }
    if (new Date(e) <= new Date(s)) {
      toast.error('End must be after start');
      return;
    }
    try {
      setLoading(true);
      const data = await contestService.getStreamTimeStats({ start: s, end: e, limit: 50 });
      setStats(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load stream-time stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" />
          App-wide stream time
        </CardTitle>
        <CardDescription>
          Total time streamed across the whole app for any window, plus the top streamers by time. Use
          this to plan or verify &quot;most time streamed&quot; contests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="st-start">From</Label>
            <Input id="st-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-end">To</Label>
            <Input id="st-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? 'Loading...' : 'Run'}
          </Button>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Total streamed</div>
                <div className="text-lg font-semibold">{formatDuration(stats.totalMs)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Streams</div>
                <div className="text-lg font-semibold">{(stats.streamCount ?? 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Streamers</div>
                <div className="text-lg font-semibold">{(stats.streamerCount ?? 0).toLocaleString()}</div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Streamer</TableHead>
                  <TableHead className="text-right">Time streamed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.list || []).map((s) => (
                  <TableRow key={String(s.userId)}>
                    <TableCell className="font-semibold">#{s.rank}</TableCell>
                    <TableCell>{s.name || 'User'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(s.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ContestManagement;
