import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectItem } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import payoutAnalyticsService from '../services/payoutAnalyticsService';

// Super-admin only (role === "admin"). Mirrors UserDetails.isCurrentUserSuperAdmin
// and the backend role gate that protects the assign-rubies endpoints.
function isCurrentUserSuperAdmin() {
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return false;
    const u = JSON.parse(raw);
    const roleField = u?.role;
    const name = (roleField?.name || roleField || '').toString().toUpperCase();
    const level = roleField?.level;
    return level >= 5 || name === 'ADMIN' || name === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

const DEFAULT_STREAM_SORT = 'streamEndedAt|desc';

const STREAM_SORT_OPTIONS = [
  { value: 'streamEndedAt|desc', label: 'Stream ended (newest first)' },
  { value: 'streamEndedAt|asc', label: 'Stream ended (oldest first)' },
  { value: 'streamStartedAt|desc', label: 'Stream started (newest first)' },
  { value: 'streamStartedAt|asc', label: 'Stream started (oldest first)' },
  { value: 'totalCoinsReceived|desc', label: 'Coins received (high → low)' },
  { value: 'totalCoinsReceived|asc', label: 'Coins received (low → high)' },
  { value: 'streamerRubies|desc', label: 'Rubies earned (high → low)' },
  { value: 'streamerRubies|asc', label: 'Rubies earned (low → high)' },
  { value: 'createdAt|desc', label: 'Earnings record (newest)' },
  { value: 'createdAt|asc', label: 'Earnings record (oldest)' },
];

const StreamerRubiesDetail = () => {
  const { streamerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [streamSortOption, setStreamSortOption] = useState(DEFAULT_STREAM_SORT);
  const [recon, setRecon] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const canAssign = isCurrentUserSuperAdmin();
  const [transfer, setTransfer] = useState(null); // { scope: 'stream'|'all', stream } | null
  const [transferEmail, setTransferEmail] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0);
  const formatUsd = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

  const load = async (page = 1, sortKey = streamSortOption) => {
    if (!streamerId) return;
    const [streamsSortBy, streamsSortOrder] = String(sortKey).split('|');
    try {
      setLoading(true);
      const res = await payoutAnalyticsService.getStreamerDetails(streamerId, {
        streamPage: page,
        streamLimit: 10,
        streamsSortBy,
        streamsSortOrder,
      });
      setData(res);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load streamer');
    } finally {
      setLoading(false);
    }
  };

  const loadRecon = async () => {
    if (!streamerId) return;
    try {
      const res = await payoutAnalyticsService.getStreamerUnassignedRubies(streamerId);
      setRecon(res);
    } catch (e) {
      // Non-fatal: the panel just won't render.
      toast.error(e?.response?.data?.message || 'Failed to load unassigned rubies');
    }
  };

  const promptReason = (message) => {
    const reason = window.prompt(message);
    if (reason == null) return null; // cancelled
    const trimmed = String(reason).trim();
    if (trimmed.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return null;
    }
    return trimmed;
  };

  const handleAssignStream = async (st) => {
    if (!canAssign || Number(st.owed) <= 0) return;
    const reason = promptReason(
      `Assign ${formatNumber(st.owed)} unassigned rubies for stream "${st.title || st.streamId}"?\n\nEnter a reason (min 10 characters) to confirm:`
    );
    if (!reason) return;
    try {
      setAssigningId(String(st.streamId));
      const res = await payoutAnalyticsService.assignStreamRubies(streamerId, st.streamId, reason);
      if (res?.assigned > 0) toast.success(`Assigned ${formatNumber(res.assigned)} rubies`);
      else toast.info('Already settled — nothing to assign');
      await Promise.all([load(1, streamSortOption), loadRecon()]);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to assign rubies');
    } finally {
      setAssigningId(null);
    }
  };

  const handleAssignAll = async () => {
    if (!canAssign) return;
    const totalOwed = Number(recon?.summary?.totalAssignableOwed) || 0;
    if (totalOwed <= 0) return;
    const reason = promptReason(
      `Assign ALL ${formatNumber(totalOwed)} unassigned rubies across ${recon?.summary?.unsettledCount || 0} stream(s)?\n\nEnter a reason (min 10 characters) to confirm:`
    );
    if (!reason) return;
    try {
      setAssigningId('all');
      const res = await payoutAnalyticsService.assignAllStreamerRubies(streamerId, reason);
      toast.success(
        `Assigned ${formatNumber(res?.totalAssigned || 0)} rubies across ${res?.streamsSettled || 0} stream(s)`
      );
      await Promise.all([load(1, streamSortOption), loadRecon()]);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to assign rubies');
    } finally {
      setAssigningId(null);
    }
  };

  const openTransfer = (scope, stream = null) => {
    setTransferEmail('');
    setTransferReason('');
    setTransfer({ scope, stream });
  };

  const handleTransferSubmit = async () => {
    if (!transfer) return;
    const email = transferEmail.trim();
    const reason = transferReason.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid target email');
      return;
    }
    if (reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    try {
      setTransferBusy(true);
      if (transfer.scope === 'stream') {
        const res = await payoutAnalyticsService.transferStreamRubies(streamerId, transfer.stream.streamId, {
          email,
          reason,
        });
        if (res?.assigned > 0)
          toast.success(`Transferred ${formatNumber(res.assigned)} rubies to ${res?.target?.email || email}`);
        else toast.info('Already settled — nothing to transfer');
      } else {
        const res = await payoutAnalyticsService.transferAllStreamerRubies(streamerId, { email, reason });
        toast.success(
          `Transferred ${formatNumber(res?.totalAssigned || 0)} rubies across ${res?.streamsSettled || 0} stream(s) to ${res?.target?.email || email}`
        );
      }
      setTransfer(null);
      await Promise.all([load(1, streamSortOption), loadRecon()]);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to transfer rubies');
    } finally {
      setTransferBusy(false);
    }
  };

  useEffect(() => {
    setStreamSortOption(DEFAULT_STREAM_SORT);
    load(1, DEFAULT_STREAM_SORT);
    loadRecon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamerId]);

  const s = data?.streamer;
  const sum = data?.summary || {};
  const streams = data?.streams || [];
  const sp = data?.streamPagination || { page: 1, totalPages: 1, totalCount: 0, limit: 10 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Streamer details</h1>
          <p className="text-gray-600 mt-1">Streams (paginated), per-stream gifters, link to reject gifts.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/streamers-rubies')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          All streamers
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !s ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">Streamer not found</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{s.name || s.username || 'Streamer'}</CardTitle>
              <CardDescription>{s.email || '—'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Wallet rubies</div>
                <div className="font-semibold text-lg">{formatNumber(s.rubies)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Lifetime rubies</div>
                <div className="font-semibold">{formatNumber(s.lifetimeRubies)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Rubies (all streams)</div>
                <div className="font-semibold">{formatNumber(sum.totalRubiesFromStreams)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Streams counted</div>
                <div className="font-semibold">{formatNumber(sum.streamsCount)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Coins from streams</div>
                <div className="font-semibold">{formatNumber(sum.totalCoinsFromStreams)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Purchased coins</div>
                <div className="font-semibold">{formatNumber(sum.totalPurchasedCoins)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Purchased USD</div>
                <div className="font-semibold">{formatUsd(sum.totalPurchasedUsd)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Withdraw requests</div>
                <div className="font-semibold">{formatNumber(sum.withdrawRequestsCount)}</div>
              </div>
            </CardContent>
          </Card>

          {recon && (
            <Card>
              <CardHeader>
                <CardTitle>Unsettled rubies</CardTitle>
                <CardDescription>
                  Streams that received gift coins but were never credited (e.g. the stream never ended/settled).
                  Computed from completed gifts (1 coin = 1 ruby). Owed = gift coins − already credited.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded border">
                    <div className="text-xs text-gray-500">Gifts received (all completed)</div>
                    <div className="font-semibold text-lg">{formatNumber(recon.summary?.totalGiftCoins)}</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="text-xs text-gray-500">Distinct streams</div>
                    <div className="font-semibold">{formatNumber(recon.summary?.streamCount)}</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="text-xs text-gray-500">Already credited</div>
                    <div className="font-semibold">{formatNumber(recon.summary?.totalCredited)}</div>
                  </div>
                  <div className="p-3 rounded border border-amber-300 bg-amber-50">
                    <div className="text-xs text-amber-700">Unassigned rubies (owed)</div>
                    <div className="font-semibold text-lg text-amber-800">
                      {formatNumber(recon.summary?.totalOwed)}
                    </div>
                  </div>
                </div>

                {canAssign && Number(recon.summary?.totalAssignableOwed) > 0 && (
                  <div className="flex items-center justify-between rounded border border-amber-300 bg-amber-50 p-3">
                    <div className="text-sm text-amber-800">
                      {formatNumber(recon.summary.totalAssignableOwed)} rubies can be assigned across{' '}
                      {formatNumber(recon.summary.unsettledCount)} stream(s).
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAssignAll} disabled={assigningId === 'all'}>
                        {assigningId === 'all' ? 'Assigning…' : 'Assign all'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTransfer('all')}
                        disabled={assigningId === 'all'}
                      >
                        Assign all to email
                      </Button>
                    </div>
                  </div>
                )}
                {!canAssign && Number(recon.summary?.totalOwed) > 0 && (
                  <div className="text-xs text-gray-500">Super-admin access is required to assign rubies.</div>
                )}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stream</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gift coins</TableHead>
                        <TableHead>Credited</TableHead>
                        <TableHead>Owed</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(recon.streams || []).filter((st) => Number(st.owed) > 0).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No unassigned rubies — everything is settled 🎉
                          </TableCell>
                        </TableRow>
                      ) : (
                        (recon.streams || [])
                          .filter((st) => Number(st.owed) > 0)
                          .map((st) => (
                            <TableRow key={String(st.streamId)}>
                              <TableCell>
                                <div className="font-medium">{st.title || 'Live stream'}</div>
                                <div className="text-xs text-gray-500">{String(st.streamId)}</div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {st.isLive ? (
                                  <span className="text-green-600">live</span>
                                ) : (
                                  st.status || '—'
                                )}
                                {st.isBoxChild ? (
                                  <span className="ml-1 text-xs text-gray-400">(box)</span>
                                ) : null}
                              </TableCell>
                              <TableCell>{formatNumber(st.giftCoins)}</TableCell>
                              <TableCell>{formatNumber(st.credited)}</TableCell>
                              <TableCell className="font-semibold text-amber-700">
                                {formatNumber(st.owed)}
                              </TableCell>
                              <TableCell className="text-right">
                                {!canAssign ? (
                                  <span className="text-xs text-gray-400">—</span>
                                ) : st.isLive ? (
                                  <span
                                    className="text-xs text-gray-400"
                                    title="End the stream first — it settles automatically on end"
                                  >
                                    settles on end
                                  </span>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleAssignStream(st)}
                                      disabled={assigningId === String(st.streamId)}
                                    >
                                      {assigningId === String(st.streamId) ? 'Assigning…' : 'Assign'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openTransfer('stream', st)}
                                      disabled={assigningId === String(st.streamId)}
                                    >
                                      To email
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Streams & gifters</CardTitle>
              <CardDescription>
                Each row lists gifters for that stream (aggregated). Use “Manage gifts” to paginate transactions
                and reject individual gifts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sort streams by</label>
                <Select
                  value={streamSortOption}
                  onValueChange={(v) => {
                    setStreamSortOption(v);
                    load(1, v);
                  }}
                  placeholder="Sort streams…"
                >
                  {STREAM_SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stream</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead>Coins</TableHead>
                      <TableHead>Rubies</TableHead>
                      <TableHead>Gifters</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {streams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          No stream earnings for this streamer yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      streams.map((st) => {
                        const gifters = st.gifters || [];
                        const preview = gifters
                          .slice(0, 3)
                          .map((g) => g.gifter?.name || g.gifter?.username || '—')
                          .join(', ');
                        return (
                          <TableRow key={String(st.streamId)}>
                            <TableCell>
                              <div className="font-medium">{st.title || 'Live stream'}</div>
                              <div className="text-xs text-gray-500">{String(st.streamId)}</div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {st.streamEndedAt
                                ? new Date(st.streamEndedAt).toLocaleString()
                                : st.streamStartedAt
                                  ? new Date(st.streamStartedAt).toLocaleString()
                                  : '—'}
                            </TableCell>
                            <TableCell>{formatNumber(st.totalCoinsReceived)}</TableCell>
                            <TableCell>{formatNumber(st.streamerRubies)}</TableCell>
                            <TableCell>
                              <div className="text-sm">{formatNumber(gifters.length)} gifter(s)</div>
                              {preview ? (
                                <div className="text-xs text-gray-500 truncate max-w-[220px]" title={preview}>
                                  {preview}
                                  {gifters.length > 3 ? '…' : ''}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  navigate(`/streamers-rubies/${streamerId}/streams/${st.streamId}`)
                                }
                              >
                                Manage gifts
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Streams page {sp.page} of {sp.totalPages} ({formatNumber(sp.totalCount)} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Number(sp.page) <= 1 || loading}
                    onClick={() => load(Number(sp.page) - 1, streamSortOption)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Number(sp.page) >= Number(sp.totalPages) || loading}
                    onClick={() => load(Number(sp.page) + 1, streamSortOption)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={!!transfer}
        onOpenChange={(o) => {
          if (!o && !transferBusy) setTransfer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transfer?.scope === 'all'
                ? 'Assign all unassigned rubies to another user'
                : 'Assign rubies to another user'}
            </DialogTitle>
            <DialogDescription>
              {transfer?.scope === 'all'
                ? `Transfer all ${formatNumber(recon?.summary?.totalAssignableOwed)} owed rubies — and the underlying streams + gift records — to the user with this email.`
                : `Transfer ${formatNumber(transfer?.stream?.owed)} owed rubies — and this stream + its gift records — to the user with this email.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="transfer-email">Target user email</Label>
              <Input
                id="transfer-email"
                type="email"
                placeholder="user@example.com"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="transfer-reason">Reason (min 10 characters)</Label>
              <Textarea
                id="transfer-reason"
                rows={3}
                placeholder="Why are you transferring these rubies?"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
            <p className="text-xs text-amber-700">
              The stream(s) and their gift records will move under the target user. This is hard to undo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransfer(null)} disabled={transferBusy}>
              Cancel
            </Button>
            <Button onClick={handleTransferSubmit} disabled={transferBusy}>
              {transferBusy ? 'Transferring…' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StreamerRubiesDetail;
