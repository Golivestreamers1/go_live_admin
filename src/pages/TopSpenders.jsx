import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Select, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Crown, Search, RefreshCw, CrownIcon, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { topSpendersService } from '../services/topSpendersService';

const SORT_OPTIONS = [
  { value: 'usd_desc', label: 'USD (high → low)' },
  { value: 'usd_asc', label: 'USD (low → high)' },
  { value: 'coins_desc', label: 'Coins (high → low)' },
  { value: 'coins_asc', label: 'Coins (low → high)' },
  { value: 'rubies_desc', label: 'Rubies (high → low)' },
  { value: 'rubies_asc', label: 'Rubies (low → high)' },
  { value: 'name_asc', label: 'Name (A → Z)' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All spenders' },
  { value: 'ruby', label: 'With Ruby Crown' },
  { value: 'no_ruby', label: 'Without Ruby Crown' },
  { value: 'has_coins', label: 'Has coins (> 0)' },
  { value: 'no_coins', label: 'No coins (= 0)' },
  { value: 'has_rubies', label: 'Has rubies (> 0)' },
  { value: 'no_rubies', label: 'No rubies (= 0)' },
];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'hour', label: 'This hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const PERIOD_LABEL = {
  all: 'all time',
  hour: 'this hour',
  day: 'today',
  week: 'this week',
  month: 'this month',
};

const CROWN_TIER_OPTIONS = [
  { value: 'all', label: 'All tiers' },
  { value: '4', label: 'Ruby' },
  { value: '3', label: 'Gold' },
  { value: '2', label: 'Silver' },
  { value: '1', label: 'Bronze' },
];

const CROWN_SORT_OPTIONS = [
  { value: 'expires_asc', label: 'Expires soonest' },
  { value: 'expires_desc', label: 'Expires latest' },
  { value: 'tier_desc', label: 'Tier (Ruby → Bronze)' },
  { value: 'tier_asc', label: 'Tier (Bronze → Ruby)' },
  { value: 'name_asc', label: 'Name (A → Z)' },
  { value: 'coins_desc', label: 'Coins (high → low)' },
  { value: 'rubies_desc', label: 'Rubies (high → low)' },
];

const TIER_BADGE_CLASS = {
  1: 'bg-amber-700',
  2: 'bg-slate-400',
  3: 'bg-yellow-500',
  4: 'bg-rose-700',
};

const TIER_NAME = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Ruby',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
}

const TopSpendersTab = ({ onAction }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('usd_desc');
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchList = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await topSpendersService.getTopSpenders({
          page,
          limit: 15,
          search: search || undefined,
          sort,
          filter,
          period,
        });
        setRows(result.data || []);
        setPagination({
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load top spenders');
      } finally {
        setLoading(false);
      }
    },
    [search, sort, filter, period]
  );

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const handleSearch = () => setSearch(searchInput.trim());
  const usdHeader = `USD (${PERIOD_LABEL[period] || 'all time'})`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-rose-600" />
          <CardTitle>Top Spenders</CardTitle>
        </div>
        <CardDescription>
          Users who made coin purchases in the selected period, sorted by USD spend. Pick a period (hourly → all time),
          sort, and filter below. Admin can grant or revoke the Ruby Crown on any user — no threshold, no rank, no slot
          check.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Input
              placeholder="Search name, username, email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="button" variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-40">
            <Select value={period} onValueChange={setPeriod} placeholder="Period">
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select value={sort} onValueChange={setSort} placeholder="Sort">
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select value={filter} onValueChange={setFilter} placeholder="Filter">
              {FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => fetchList(pagination.page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>{usdHeader}</TableHead>
                <TableHead>Wallet (coins)</TableHead>
                <TableHead>Rubies</TableHead>
                <TableHead>Ruby Crown</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No spenders match these filters for this period.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((u) => {
                  const id = u._id || u.id;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{u.name || '—'}</TableCell>
                      <TableCell>{u.username || '—'}</TableCell>
                      <TableCell>
                        {typeof u.totalUsd === 'number'
                          ? `$${u.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {typeof u.coins === 'number' ? u.coins.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        {typeof u.rubies === 'number' ? u.rubies.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        {u.hasActiveRuby ? (
                          <Badge className="bg-rose-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.hasActiveRuby ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onAction({ mode: 'revoke', user: u, refresh: () => fetchList(pagination.page) })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onAction({ mode: 'assign', user: u, refresh: () => fetchList(pagination.page) })}
                          >
                            <CrownIcon className="h-4 w-4 mr-1" />
                            Give Ruby
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchList(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchList(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CrownsTab = ({ onAction }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('expires_asc');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchList = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await topSpendersService.getCrownHolders({
          page,
          limit: 15,
          search: search || undefined,
          tier,
          sort,
        });
        setRows(result.data || []);
        setPagination({
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load crown holders');
      } finally {
        setLoading(false);
      }
    },
    [search, tier, sort]
  );

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const handleSearch = () => setSearch(searchInput.trim());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CrownIcon className="h-6 w-6 text-yellow-500" />
          <CardTitle>Active Crowns</CardTitle>
        </div>
        <CardDescription>
          Every user with an active crown right now (Bronze, Silver, Gold, or Ruby) — independent of recent spending.
          Filter by tier, search, and revoke or upgrade Ruby Crowns directly from this list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Input
              placeholder="Search name, username, email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="button" variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-40">
            <Select value={tier} onValueChange={setTier} placeholder="Tier">
              {CROWN_TIER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <Select value={sort} onValueChange={setSort} placeholder="Sort">
              {CROWN_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => fetchList(pagination.page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Wallet (coins)</TableHead>
                <TableHead>Rubies</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No active crowns match these filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((u) => {
                  const id = u._id || u.id;
                  const cls = TIER_BADGE_CLASS[u.tier] || 'bg-slate-500';
                  const tierName = TIER_NAME[u.tier] || u.tierLabel || `Tier ${u.tier}`;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{u.name || '—'}</TableCell>
                      <TableCell>{u.username || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cls}>{tierName}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.expiresAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{u.source || '—'}</TableCell>
                      <TableCell>{typeof u.coins === 'number' ? u.coins.toLocaleString() : '—'}</TableCell>
                      <TableCell>{typeof u.rubies === 'number' ? u.rubies.toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right">
                        {u.hasActiveRuby ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onAction({ mode: 'revoke', user: u, refresh: () => fetchList(pagination.page) })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onAction({ mode: 'assign', user: u, refresh: () => fetchList(pagination.page) })}
                          >
                            <CrownIcon className="h-4 w-4 mr-1" />
                            Give Ruby
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchList(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchList(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TopSpenders = () => {
  const [dialog, setDialog] = useState(null); // { mode, user, refresh }
  const [acting, setActing] = useState(false);

  const closeDialog = () => {
    if (!acting) setDialog(null);
  };

  const confirmAction = async () => {
    if (!dialog) return;
    const id = dialog.user._id || dialog.user.id;
    if (!id) return;
    try {
      setActing(true);
      if (dialog.mode === 'assign') {
        await topSpendersService.assignRuby(id);
        toast.success('Ruby Crown assigned (30 days)');
      } else {
        await topSpendersService.revokeRuby(id);
        toast.success('Ruby Crown revoked');
      }
      const refresh = dialog.refresh;
      setDialog(null);
      if (typeof refresh === 'function') refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="spenders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spenders">Top Spenders</TabsTrigger>
          <TabsTrigger value="crowns">Active Crowns</TabsTrigger>
        </TabsList>
        <TabsContent value="spenders">
          <TopSpendersTab onAction={setDialog} />
        </TabsContent>
        <TabsContent value="crowns">
          <CrownsTab onAction={setDialog} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {dialog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialog.mode === 'assign' ? 'Give Ruby Crown' : 'Revoke Ruby Crown'}
                </DialogTitle>
                <DialogDescription>
                  {dialog.mode === 'assign'
                    ? `Grant a 30-day Ruby Crown to ${dialog.user.name || dialog.user.username || 'this user'}? This bypasses the monthly USD / rank / slot rules.`
                    : `Remove the active Ruby Crown from ${dialog.user.name || dialog.user.username || 'this user'}? They will lose the crown immediately.`}
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>Username: <span className="text-foreground">{dialog.user.username || '—'}</span></div>
                {typeof dialog.user.totalUsd === 'number' && (
                  <div>
                    USD spent:{' '}
                    <span className="text-foreground">
                      ${dialog.user.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {dialog.user.tier ? (
                  <div>
                    Current crown:{' '}
                    <span className="text-foreground">
                      {TIER_NAME[dialog.user.tier] || dialog.user.tierLabel || `Tier ${dialog.user.tier}`}
                    </span>
                  </div>
                ) : null}
                <div>
                  Wallet:{' '}
                  <span className="text-foreground">
                    {typeof dialog.user.coins === 'number' ? dialog.user.coins.toLocaleString() : '—'} coins
                  </span>
                </div>
                <div>
                  Rubies:{' '}
                  <span className="text-foreground">
                    {typeof dialog.user.rubies === 'number' ? dialog.user.rubies.toLocaleString() : '—'}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={acting}>
                  Cancel
                </Button>
                <Button
                  variant={dialog.mode === 'revoke' ? 'destructive' : 'default'}
                  onClick={confirmAction}
                  disabled={acting}
                >
                  {acting ? 'Working…' : dialog.mode === 'assign' ? 'Give Ruby Crown' : 'Revoke Ruby Crown'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopSpenders;
