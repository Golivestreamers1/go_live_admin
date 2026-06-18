import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Gem, Coins, Radio, ArrowDownToLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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

  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsStatus, setWithdrawalsStatus] = useState('');
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    current: 1,
    total: 1,
    totalItems: 0,
  });

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

  const loadStreams = async (userId, page = 1) => {
    try {
      setDetailsLoading(true);
      const res = await payoutAnalyticsService.getStreamerDetails(userId, {
        streamPage: page,
        streamLimit: 15,
        streamsSortBy: 'streamEndedAt',
        streamsSortOrder: 'desc',
      });
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

  const selectUser = async (user) => {
    const uid = user._id;
    setSelectedUserId(uid);
    setSelectedUser(user);
    setSearchResults([]);
    setWithdrawalsStatus('');
    await Promise.all([loadStreams(uid, 1), loadWithdrawals(uid, 1, '')]);
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
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <div className="text-xs text-gray-500">Wallet rubies (current balance)</div>
                    <div className="font-medium">{fmtNum(selectedUser?.rubies)}</div>
                  </div>
                </CardContent>
              </Card>

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
    </div>
  );
};

export default UserStreamEarnings;
