import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Gem, Coins, Radio, ArrowDownToLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
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
import { userService } from '../services/userService';
import payoutAnalyticsService from '../services/payoutAnalyticsService';

const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

function dateInputToStartOfDay(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dateInputToEndOfDay(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

// Super-admin only (role === "admin"). Matches the backend role gate on the assign endpoints.
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

const UserStreamEarnings = () => {
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [streams, setStreams] = useState([]);
  const [streamPagination, setStreamPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 15,
  });
  const [recon, setRecon] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const canAssign = isCurrentUserSuperAdmin();

  // Transfer-to-email modal state. transfer = { scope: 'stream'|'all'|'full' } | null
  const [transfer, setTransfer] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [walletPreview, setWalletPreview] = useState(null);
  const [walletPreviewLoading, setWalletPreviewLoading] = useState(false);

  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsStatus, setWithdrawalsStatus] = useState('');
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    current: 1,
    total: 1,
    totalItems: 0,
  });

  const [earningsStartDate, setEarningsStartDate] = useState('');
  const [earningsEndDate, setEarningsEndDate] = useState('');
  const [appliedEarningsRange, setAppliedEarningsRange] = useState({ start: '', end: '' });

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = search.trim();
    if (!q) {
      toast.error('Enter a name, username, or email to search');
      return;
    }
    try {
      setSearchLoading(true);
      const res = await userService.getAllUsers({ page: 1, limit: 15, search: q });
      setSearchResults(res.users || []);
      if ((res.users || []).length === 0) toast.info('No users found');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadStreams = async (
    userId,
    page = 1,
    range = appliedEarningsRange
  ) => {
    try {
      setDetailsLoading(true);
      const params = {
        streamPage: page,
        streamLimit: 15,
        streamsSortBy: 'streamEndedAt',
        streamsSortOrder: 'desc',
      };
      const start = dateInputToStartOfDay(range.start);
      const end = dateInputToEndOfDay(range.end);
      if (start) params.startDate = start.toISOString();
      if (end) params.endDate = end.toISOString();

      const res = await payoutAnalyticsService.getStreamerDetails(userId, params);
      setSelectedUser(res.streamer);
      setSummary(res.summary || {});
      setStreams(res.streams || []);
      setStreamPagination(res.streamPagination || { page: 1, totalPages: 1, totalCount: 0, limit: 15 });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load stream earnings');
    } finally {
      setDetailsLoading(false);
    }
  };

  const applyEarningsDateFilter = () => {
    const next = { start: earningsStartDate, end: earningsEndDate };
    setAppliedEarningsRange(next);
    if (selectedUserId) loadStreams(selectedUserId, 1, next);
  };

  const clearEarningsDateFilter = () => {
    setEarningsStartDate('');
    setEarningsEndDate('');
    const next = { start: '', end: '' };
    setAppliedEarningsRange(next);
    if (selectedUserId) loadStreams(selectedUserId, 1, next);
  };

  const loadWithdrawals = async (userId, page = 1, status = withdrawalsStatus) => {
    try {
      setWithdrawalsLoading(true);
      const res = await userService.getUserWithdrawals(userId, {
        page,
        limit: 10,
        status: status || undefined,
      });
      const requests = res.requests || res.data || [];
      setWithdrawals(requests);
      const p = res.pagination || {};
      setWithdrawalsPagination({
        current: Number(p.page) || page,
        total: Number(p.totalPages) || 1,
        totalItems: Number(p.totalCount) || requests.length,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load withdrawals');
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const loadRecon = async (userId) => {
    try {
      const res = await payoutAnalyticsService.getStreamerUnassignedRubies(userId);
      setRecon(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load unassigned rubies');
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
    if (!canAssign || Number(st.owed) <= 0 || !selectedUserId) return;
    const reason = promptReason(
      `Assign ${fmtNum(st.owed)} unassigned rubies for stream "${st.title || st.streamId}"?\n\nEnter a reason (min 10 characters) to confirm:`
    );
    if (!reason) return;
    try {
      setAssigningId(String(st.streamId));
      const res = await payoutAnalyticsService.assignStreamRubies(selectedUserId, st.streamId, reason);
      if (res?.assigned > 0) toast.success(`Assigned ${fmtNum(res.assigned)} rubies`);
      else toast.info('Already settled — nothing to assign');
      // loadStreams refreshes the wallet-rubies balance shown above from the DB.
      await Promise.all([
        loadStreams(selectedUserId, Number(streamPagination.page) || 1),
        loadRecon(selectedUserId),
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign rubies');
    } finally {
      setAssigningId(null);
    }
  };

  const handleAssignAll = async () => {
    if (!canAssign || !selectedUserId) return;
    const totalOwed = Number(recon?.summary?.totalAssignableOwed) || 0;
    if (totalOwed <= 0) return;
    const reason = promptReason(
      `Assign ALL ${fmtNum(totalOwed)} unassigned rubies across ${recon?.summary?.unsettledCount || 0} stream(s)?\n\nEnter a reason (min 10 characters) to confirm:`
    );
    if (!reason) return;
    try {
      setAssigningId('all');
      const res = await payoutAnalyticsService.assignAllStreamerRubies(selectedUserId, reason);
      toast.success(
        `Assigned ${fmtNum(res?.totalAssigned || 0)} rubies across ${res?.streamsSettled || 0} stream(s)`
      );
      await Promise.all([
        loadStreams(selectedUserId, Number(streamPagination.page) || 1),
        loadRecon(selectedUserId),
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign rubies');
    } finally {
      setAssigningId(null);
    }
  };

  const loadWalletPreview = async (userId) => {
    try {
      setWalletPreviewLoading(true);
      const res = await payoutAnalyticsService.getFullWalletTransferPreview(userId);
      setWalletPreview(res);
    } catch (err) {
      setWalletPreview(null);
      toast.error(err?.response?.data?.message || 'Failed to load wallet transfer preview');
    } finally {
      setWalletPreviewLoading(false);
    }
  };

  const openTransfer = (scope, stream = null) => {
    setTransferEmail('');
    setTransferReason('');
    setTransfer({ scope, stream });
  };

  const handleTransferSubmit = async () => {
    if (!selectedUserId || !transfer) return;
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
        const res = await payoutAnalyticsService.transferStreamRubies(selectedUserId, transfer.stream.streamId, {
          email,
          reason,
        });
        if (res?.assigned > 0)
          toast.success(`Transferred ${fmtNum(res.assigned)} rubies to ${res?.target?.email || email}`);
        else toast.info('Already settled — nothing to transfer');
      } else if (transfer.scope === 'all') {
        const res = await payoutAnalyticsService.transferAllStreamerRubies(selectedUserId, { email, reason });
        toast.success(
          `Transferred ${fmtNum(res?.totalAssigned || 0)} rubies across ${res?.streamsSettled || 0} stream(s) to ${res?.target?.email || email}`
        );
      } else if (transfer.scope === 'full') {
        const res = await payoutAnalyticsService.transferFullUserWallet(selectedUserId, { email, reason });
        toast.success(
          `Full wallet transferred to ${res?.target?.email || email}: ${fmtNum(res?.coinsMoved)} coins, ${fmtNum(res?.rubiesMoved)} rubies, ${fmtNum(res?.streamsMoved)} streams`
        );
      }
      setTransfer(null);
      await Promise.all([
        loadStreams(selectedUserId, Number(streamPagination.page) || 1),
        loadRecon(selectedUserId),
        loadWalletPreview(selectedUserId),
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to transfer rubies');
    } finally {
      setTransferBusy(false);
    }
  };

  const selectUser = async (user) => {
    const uid = user._id;
    setSelectedUserId(uid);
    setSelectedUser(user);
    setSearchResults([]);
    setWithdrawalsStatus('');
    setRecon(null);
    setWalletPreview(null);
    setEarningsStartDate('');
    setEarningsEndDate('');
    setAppliedEarningsRange({ start: '', end: '' });
    await Promise.all([
      loadStreams(uid, 1, { start: '', end: '' }),
      loadWithdrawals(uid, 1, ''),
      loadRecon(uid),
      loadWalletPreview(uid),
    ]);
  };

  useEffect(() => {
    if (!selectedUserId || !withdrawalsStatus) return;
    loadWithdrawals(selectedUserId, 1, withdrawalsStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawalsStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User stream earnings</h1>
        <p className="text-gray-600 mt-1">
          Search a user to view all streams, total rubies and coins from stream earnings (summed per
          stream — not lifetime rubies), and withdrawal history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search user</CardTitle>
          <CardDescription>Name, username, or email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              className="sm:flex-1"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="font-medium">{u.name || u.username || 'Unknown'}</div>
                        {u.username ? (
                          <div className="text-xs text-gray-500">@{u.username}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{u.email || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => selectUser(u)}>
                          View earnings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          {detailsLoading && !summary ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedUser?.name || selectedUser?.username || 'User'}</CardTitle>
                  <CardDescription>
                    {selectedUser?.email || '—'}
                    <span className="ml-2 text-xs text-gray-400">{String(selectedUserId)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-gray-50 p-3">
                    <div>
                      <label className="text-xs text-gray-500">Earnings from (stream ended)</label>
                      <Input
                        type="date"
                        className="mt-1 w-[160px] bg-white"
                        value={earningsStartDate}
                        max={earningsEndDate || undefined}
                        onChange={(e) => setEarningsStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Earnings to</label>
                      <Input
                        type="date"
                        className="mt-1 w-[160px] bg-white"
                        value={earningsEndDate}
                        min={earningsStartDate || undefined}
                        onChange={(e) => setEarningsEndDate(e.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={applyEarningsDateFilter} disabled={detailsLoading}>
                      Apply filter
                    </Button>
                    {(appliedEarningsRange.start || appliedEarningsRange.end) && (
                      <Button size="sm" variant="outline" onClick={clearEarningsDateFilter} disabled={detailsLoading}>
                        Clear
                      </Button>
                    )}
                    {(appliedEarningsRange.start || appliedEarningsRange.end) && (
                      <p className="text-xs text-gray-600">
                        Showing earnings for streams that ended between{' '}
                        <span className="font-medium">{appliedEarningsRange.start || '…'}</span> and{' '}
                        <span className="font-medium">{appliedEarningsRange.end || '…'}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border bg-rose-50 border-rose-100">
                    <div className="flex items-center gap-1 text-xs text-rose-700">
                      <Gem className="w-3 h-3" /> Rubies (streams total)
                    </div>
                    <div className="font-bold text-xl text-rose-800 mt-1">
                      {fmtNum(summary?.totalRubiesFromStreams)}
                    </div>
                    <div className="text-xs text-rose-600 mt-1">Sum of each stream&apos;s earnings</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Coins className="w-3 h-3" /> Coins (streams total)
                    </div>
                    <div className="font-semibold text-lg mt-1">
                      {fmtNum(summary?.totalCoinsFromStreams)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Radio className="w-3 h-3" /> Streams
                    </div>
                    <div className="font-semibold text-lg mt-1">{fmtNum(summary?.streamsCount)}</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ArrowDownToLine className="w-3 h-3" /> Withdrawals
                    </div>
                    <div className="font-semibold text-lg mt-1">
                      {fmtNum(summary?.withdrawRequestsCount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Approved: {fmtUsd(summary?.totalWithdrawApprovedUsd)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border col-span-2 md:col-span-4 bg-gray-50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Wallet rubies (current balance)</div>
                        <div className="font-medium">{fmtNum(selectedUser?.rubies)}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Coins: {fmtNum(selectedUser?.coins)} · Lifetime rubies:{' '}
                          {fmtNum(selectedUser?.lifetimeRubies)}
                        </div>
                      </div>
                      {canAssign ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTransfer('full')}
                          disabled={walletPreviewLoading}
                        >
                          Transfer full wallet to email
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>

              {recon && (
                <Card>
                  <CardHeader>
                    <CardTitle>Unassigned rubies</CardTitle>
                    <CardDescription>
                      Rubies this user received in gifts but were never added to their balance (streams that
                      took coins but never settled). Computed from completed gifts — 1 coin = 1 ruby.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Coins className="w-3 h-3" /> Gifts received (all completed)
                        </div>
                        <div className="font-semibold text-lg mt-1">
                          {fmtNum(recon.summary?.totalGiftCoins)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Radio className="w-3 h-3" /> Distinct streams
                        </div>
                        <div className="font-semibold text-lg mt-1">{fmtNum(recon.summary?.streamCount)}</div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Gem className="w-3 h-3" /> Already credited
                        </div>
                        <div className="font-semibold text-lg mt-1">{fmtNum(recon.summary?.totalCredited)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-amber-300 bg-amber-50">
                        <div className="text-xs text-amber-700">Unassigned rubies (owed)</div>
                        <div className="font-bold text-xl text-amber-800 mt-1">
                          {fmtNum(recon.summary?.totalOwed)}
                        </div>
                      </div>
                    </div>

                    {canAssign && Number(recon.summary?.totalAssignableOwed) > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                        <div className="text-sm text-amber-800">
                          {fmtNum(recon.summary.totalAssignableOwed)} rubies can be added to this user&apos;s
                          balance across {fmtNum(recon.summary.unsettledCount)} stream(s).
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
                            <TableHead className="text-right">Gift coins</TableHead>
                            <TableHead className="text-right">Credited</TableHead>
                            <TableHead className="text-right">Owed</TableHead>
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
                                  <TableCell className="text-right tabular-nums">
                                    {fmtNum(st.giftCoins)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmtNum(st.credited)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold text-amber-700">
                                    {fmtNum(st.owed)}
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
                  <CardTitle>All streams</CardTitle>
                  <CardDescription>
                    Per-stream coins received and rubies earned. Totals above are the sum of these rows.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stream</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Ended</TableHead>
                          <TableHead className="text-right">Coins</TableHead>
                          <TableHead className="text-right">Rubies</TableHead>
                          <TableHead className="text-right">Gifters</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {streams.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                              No stream earnings for this user
                            </TableCell>
                          </TableRow>
                        ) : (
                          streams.map((st) => (
                            <TableRow key={String(st.streamId)}>
                              <TableCell>
                                <div className="font-medium">{st.title || 'Live stream'}</div>
                                <div className="text-xs text-gray-500">{String(st.streamId)}</div>
                              </TableCell>
                              <TableCell className="text-sm">{fmtDate(st.streamStartedAt)}</TableCell>
                              <TableCell className="text-sm">{fmtDate(st.streamEndedAt)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtNum(st.totalCoinsReceived)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium text-rose-700">
                                {fmtNum(st.streamerRubies)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtNum((st.gifters || []).length)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Page {streamPagination.page} of {streamPagination.totalPages} (
                      {fmtNum(streamPagination.totalCount)} streams)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Number(streamPagination.page) <= 1 || detailsLoading}
                        onClick={() => loadStreams(selectedUserId, Number(streamPagination.page) - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          Number(streamPagination.page) >= Number(streamPagination.totalPages) ||
                          detailsLoading
                        }
                        onClick={() => loadStreams(selectedUserId, Number(streamPagination.page) + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Withdrawals</CardTitle>
                      <CardDescription>
                        {fmtNum(withdrawalsPagination.totalItems)} withdrawal request(s) for this user
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                        value={withdrawalsStatus}
                        onChange={(e) => {
                          const v = e.target.value;
                          setWithdrawalsStatus(v);
                          if (!v) loadWithdrawals(selectedUserId, 1, '');
                        }}
                        disabled={withdrawalsLoading}
                      >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadWithdrawals(selectedUserId, 1, withdrawalsStatus)}
                        disabled={withdrawalsLoading}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {withdrawalsLoading && withdrawals.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : withdrawals.length === 0 ? (
                    <p className="text-center py-10 text-sm text-gray-500">No withdrawal requests</p>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">USD</TableHead>
                              <TableHead className="text-right">Rubies</TableHead>
                              <TableHead>PayPal</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawals.map((w) => (
                              <TableRow key={w._id}>
                                <TableCell className="text-sm">{fmtDate(w.createdAt)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {fmtUsd(w.amountUsd)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {fmtNum(w.rubiesAmount)}
                                </TableCell>
                                <TableCell className="text-sm">{w.paypalEmail || '—'}</TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      w.status === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : w.status === 'rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }
                                  >
                                    {w.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Link to={`/withdraw-requests/${w._id}`}>
                                    <Button size="sm" variant="outline">
                                      Open
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {withdrawalsPagination.total > 1 ? (
                        <div className="flex items-center justify-between mt-4 text-sm">
                          <span className="text-gray-500">
                            Page {withdrawalsPagination.current} of {withdrawalsPagination.total}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                withdrawalsLoading || withdrawalsPagination.current <= 1
                              }
                              onClick={() =>
                                loadWithdrawals(
                                  selectedUserId,
                                  withdrawalsPagination.current - 1,
                                  withdrawalsStatus
                                )
                              }
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                withdrawalsLoading ||
                                withdrawalsPagination.current >= withdrawalsPagination.total
                              }
                              onClick={() =>
                                loadWithdrawals(
                                  selectedUserId,
                                  withdrawalsPagination.current + 1,
                                  withdrawalsStatus
                                )
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
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
              {transfer?.scope === 'full'
                ? 'Transfer full wallet to another user'
                : transfer?.scope === 'all'
                ? 'Assign all unassigned rubies to another user'
                : 'Assign rubies to another user'}
            </DialogTitle>
            <DialogDescription>
              {transfer?.scope === 'full' ? (
                <>
                  Move this user&apos;s entire wallet and stream history to the account with the target
                  email — coins, rubies, lifetime rubies, all streams, gift records, wallet transactions,
                  and withdrawal requests.
                  {walletPreview ? (
                    <span className="block mt-2 text-gray-700">
                      Preview: {fmtNum(walletPreview.wallet?.coins)} coins ·{' '}
                      {fmtNum(walletPreview.wallet?.rubies)} rubies ·{' '}
                      {fmtNum(walletPreview.streamsCount)} streams ·{' '}
                      {fmtNum(walletPreview.unassigned?.totalAssignableOwed)} unassigned rubies ·{' '}
                      {fmtNum(walletPreview.walletTransactionsCount)} wallet txs ·{' '}
                      {fmtNum(walletPreview.withdrawRequestsCount)} withdrawals
                      {walletPreview.liveStreamsCount > 0 ? (
                        <span className="block text-amber-700 mt-1">
                          Includes {fmtNum(walletPreview.liveStreamsCount)} live stream(s) — ownership
                          moves immediately.
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </>
              ) : transfer?.scope === 'all' ? (
                `Transfer all ${fmtNum(recon?.summary?.totalAssignableOwed)} owed rubies — and the underlying streams + gift records — to the user with this email.`
              ) : (
                `Transfer ${fmtNum(transfer?.stream?.owed)} owed rubies — and this stream + its gift records — to the user with this email.`
              )}
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
              {transfer?.scope === 'full'
                ? 'This reassigns all stream/gift/ledger rows and moves wallet balances. It is very hard to undo — double-check the target email.'
                : 'The stream(s) and their gift records will move under the target user. This is hard to undo.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransfer(null)} disabled={transferBusy}>
              Cancel
            </Button>
            <Button onClick={handleTransferSubmit} disabled={transferBusy}>
              {transferBusy
                ? 'Transferring…'
                : transfer?.scope === 'full'
                  ? 'Transfer full wallet'
                  : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserStreamEarnings;
