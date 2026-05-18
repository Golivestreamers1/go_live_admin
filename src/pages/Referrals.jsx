import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Users,
  Search,
  RefreshCw,
  Gem,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { referralService } from '../services/referralService';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'hour', label: 'This hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range…' },
];

const PERIOD_LABEL = {
  all: 'all time',
  hour: 'this hour',
  day: 'today',
  week: 'last 7 days',
  month: 'last 30 days',
  year: 'last 12 months',
  custom: 'custom range',
};

const TOP_SORT_OPTIONS = [
  { value: 'count_desc', label: 'Referrals (high → low)' },
  { value: 'count_asc', label: 'Referrals (low → high)' },
  { value: 'rubies_desc', label: 'Rubies earned (high → low)' },
  { value: 'rubies_asc', label: 'Rubies earned (low → high)' },
  { value: 'recent_desc', label: 'Most recent activity' },
  { value: 'recent_asc', label: 'Oldest activity' },
  { value: 'name_asc', label: 'Name (A → Z)' },
];

const LOG_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'rubies_desc', label: 'Rubies (high → low)' },
  { value: 'rubies_asc', label: 'Rubies (low → high)' },
];

const ATTEMPT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'invalid_code', label: 'Invalid code' },
  { value: 'self_referral', label: 'Self-referral' },
  { value: 'already_referred', label: 'Already referred' },
  { value: 'error', label: 'Hard error' },
];

const STATUS_BADGE = {
  success: 'bg-emerald-600',
  invalid_code: 'bg-amber-500',
  self_referral: 'bg-amber-500',
  already_referred: 'bg-slate-500',
  error: 'bg-rose-700',
};

const STATUS_LABEL = {
  success: 'Success',
  invalid_code: 'Invalid code',
  self_referral: 'Self-referral',
  already_referred: 'Already referred',
  error: 'Hard error',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString();
}

const Copyable = ({ value, label, primary = false, truncate = 220 }) => {
  if (value === null || value === undefined || value === '') return null;
  const handleCopy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <div
      className={`group flex items-center gap-1 ${
        primary ? 'font-medium text-foreground' : 'text-xs text-muted-foreground'
      }`}
    >
      <span className="truncate" style={{ maxWidth: truncate }} title={String(value)}>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
};

const UserCell = ({ user, fallbackId }) => {
  if (!user) {
    return <span className="text-muted-foreground text-xs">user {String(fallbackId || '').slice(-6) || '—'}</span>;
  }
  return (
    <div className="space-y-0.5 min-w-[200px]">
      <Copyable value={user.name} label="Name" primary />
      {user.username && <Copyable value={`@${user.username}`} label="Username" />}
      <Copyable value={user.email} label="Email" />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
 * Shared filter bar
 * ────────────────────────────────────────────────────────── */
const FilterBar = ({
  searchInput,
  setSearchInput,
  onSearch,
  searchPlaceholder,
  period,
  onPeriodChange,
  sort,
  onSortChange,
  sortOptions,
  status,
  onStatusChange,
  statusOptions,
  onRefresh,
  loading,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}) => {
  const isCustom = period === 'custom';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Input
            placeholder={searchPlaceholder || 'Search…'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button type="button" variant="secondary" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-44">
          <Select value={period} onValueChange={onPeriodChange} placeholder="Period">
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        {sortOptions && (
          <div className="w-56">
            <Select value={sort} onValueChange={onSortChange} placeholder="Sort">
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
        {statusOptions && (
          <div className="w-48">
            <Select value={status} onValueChange={onStatusChange} placeholder="Status">
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
        <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isCustom && (
        <div className="flex flex-wrap gap-2 items-center bg-muted/40 rounded-md p-3">
          <span className="text-sm text-muted-foreground">Range:</span>
          <Input
            type="datetime-local"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[220px]"
            aria-label="Start date and time"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="datetime-local"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[220px]"
            aria-label="End date and time"
          />
          {(startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear
            </Button>
          )}
          {!startDate && !endDate && (
            <span className="text-xs text-muted-foreground">
              Pick a start, end, or both. Empty = open-ended.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const Pager = ({ pagination, onPageChange, loading }) => {
  if (!pagination) return null;
  const { page = 1, totalPages = 1, total = 0 } = pagination;
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Page {page} of {totalPages} • {fmtNumber(total)} total
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
 * Stats overview cards
 * ────────────────────────────────────────────────────────── */
const StatsOverview = ({ filters }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await referralService.getStats({
        period: filters.period === 'custom' ? undefined : filters.period,
        startDate: filters.period === 'custom' ? filters.startDate : undefined,
        endDate: filters.period === 'custom' ? filters.endDate : undefined,
      });
      setStats(data);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to load referral stats');
    } finally {
      setLoading(false);
    }
  }, [filters.period, filters.startDate, filters.endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel =
    filters.period === 'custom'
      ? 'custom range'
      : PERIOD_LABEL[filters.period || 'all'] || 'all time';

  const tiles = [
    {
      title: 'Successful referrals',
      value: stats ? fmtNumber(stats.successfulReferrals) : '—',
      hint: periodLabel,
      icon: CheckCircle2,
      tone: 'text-emerald-600',
    },
    {
      title: 'Rubies paid',
      value: stats ? fmtNumber(stats.rubiesPaid) : '—',
      hint: stats ? `@ ${fmtNumber(stats.perReferralRubies)} per referral` : '',
      icon: Gem,
      tone: 'text-rose-600',
    },
    {
      title: 'Unique referrers',
      value: stats ? fmtNumber(stats.uniqueReferrers) : '—',
      hint: periodLabel,
      icon: Users,
      tone: 'text-blue-600',
    },
    {
      title: 'Failed attempts',
      value: stats
        ? fmtNumber(
            (stats.attempts?.invalidCode || 0) +
              (stats.attempts?.selfReferral || 0) +
              (stats.attempts?.alreadyReferred || 0) +
              (stats.attempts?.error || 0)
          )
        : '—',
      hint: stats
        ? `invalid ${stats.attempts.invalidCode} • self ${stats.attempts.selfReferral} • dup ${stats.attempts.alreadyReferred} • err ${stats.attempts.error}`
        : '',
      icon: AlertTriangle,
      tone: 'text-amber-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Card key={t.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.title}</CardTitle>
              <Icon className={`h-5 w-5 ${t.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '…' : t.value}</div>
              {t.hint && <p className="text-xs text-muted-foreground mt-1">{t.hint}</p>}
            </CardContent>
          </Card>
        );
      })}
      {stats?.lifetime && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="pt-6 flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-muted-foreground">Users with referral code (lifetime)</div>
              <div className="font-semibold">{fmtNumber(stats.lifetime.usersWithCode)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Users referred (lifetime)</div>
              <div className="font-semibold">{fmtNumber(stats.lifetime.usersReferred)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Range</div>
              <div className="font-semibold">
                {stats.range?.from ? formatDate(stats.range.from) : 'open'} →{' '}
                {stats.range?.to ? formatDate(stats.range.to) : 'now'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
 * Top referrers tab
 * ────────────────────────────────────────────────────────── */
const TopReferrersTab = ({ filters, onPeriodChange, onRangeChange, periodLabel }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('count_desc');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchPage = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await referralService.getTopReferrers({
          page,
          limit: 20,
          search: search || undefined,
          sort,
          period: filters.period === 'custom' ? undefined : filters.period,
          startDate: filters.period === 'custom' ? filters.startDate : undefined,
          endDate: filters.period === 'custom' ? filters.endDate : undefined,
        });
        setRows(result.data || []);
        setPagination({
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load top referrers');
      } finally {
        setLoading(false);
      }
    },
    [search, sort, filters.period, filters.startDate, filters.endDate]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleSearch = () => setSearch(searchInput.trim());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <CardTitle>Top Referrers</CardTitle>
        </div>
        <CardDescription>
          Ranked by number of successful referrals within the selected period. Click a row to drill
          into who they referred.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearch={handleSearch}
          searchPlaceholder="Search referrer name, username, email, code…"
          period={filters.period}
          onPeriodChange={onPeriodChange}
          sort={sort}
          onSortChange={setSort}
          sortOptions={TOP_SORT_OPTIONS}
          onRefresh={() => fetchPage(pagination.page)}
          loading={loading}
          startDate={filters.startDate}
          endDate={filters.endDate}
          setStartDate={(v) => onRangeChange({ startDate: v })}
          setEndDate={(v) => onRangeChange({ endDate: v })}
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Referrals ({periodLabel})</TableHead>
                <TableHead>Rubies earned ({periodLabel})</TableHead>
                <TableHead>Last referral</TableHead>
                <TableHead>Wallet rubies</TableHead>
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
                    No referrers match these filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((r, idx) => {
                  const rank = (pagination.page - 1) * 20 + idx + 1;
                  return (
                    <TableRow key={String(r.referrerId)}>
                      <TableCell className="text-muted-foreground">{rank}</TableCell>
                      <TableCell>
                        <UserCell user={r} fallbackId={r.referrerId} />
                      </TableCell>
                      <TableCell>
                        {r.referralCode ? (
                          <Copyable value={r.referralCode} label="Referral code" primary />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{fmtNumber(r.count)}</TableCell>
                      <TableCell>{fmtNumber(r.rubies)}</TableCell>
                      <TableCell>{formatDate(r.lastReferralAt)}</TableCell>
                      <TableCell>{fmtNumber(r.currentRubies)}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/users/${r.referrerId}`}>
                          <Button size="sm" variant="outline">
                            Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        <Pager pagination={pagination} onPageChange={(p) => fetchPage(p)} loading={loading} />
      </CardContent>
    </Card>
  );
};

/* ──────────────────────────────────────────────────────────
 * Referral logs (successful payouts) tab
 * ────────────────────────────────────────────────────────── */
const LogsTab = ({ filters, onPeriodChange, onRangeChange }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchPage = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await referralService.getLogs({
          page,
          limit: 25,
          search: search || undefined,
          sort,
          period: filters.period === 'custom' ? undefined : filters.period,
          startDate: filters.period === 'custom' ? filters.startDate : undefined,
          endDate: filters.period === 'custom' ? filters.endDate : undefined,
        });
        setRows(result.data || []);
        setPagination({
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load referral logs');
      } finally {
        setLoading(false);
      }
    },
    [search, sort, filters.period, filters.startDate, filters.endDate]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <CardTitle>Successful referrals</CardTitle>
        </div>
        <CardDescription>
          Every credited referral — who referred who, the code used, rubies awarded, and exact time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearch={() => setSearch(searchInput.trim())}
          searchPlaceholder="Search by either user (name, email, code)…"
          period={filters.period}
          onPeriodChange={onPeriodChange}
          sort={sort}
          onSortChange={setSort}
          sortOptions={LOG_SORT_OPTIONS}
          onRefresh={() => fetchPage(pagination.page)}
          loading={loading}
          startDate={filters.startDate}
          endDate={filters.endDate}
          setStartDate={(v) => onRangeChange({ startDate: v })}
          setEndDate={(v) => onRangeChange({ endDate: v })}
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred user</TableHead>
                <TableHead>Code used</TableHead>
                <TableHead>Rubies</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No referrals match these filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((r) => (
                  <TableRow key={String(r._id)}>
                    <TableCell>
                      <div>
                        <UserCell user={r.referrerId} fallbackId={r.referrerId?._id} />
                        {r.referrerId?._id && (
                          <Link
                            to={`/users/${r.referrerId._id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View profile
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <UserCell user={r.referredUserId} fallbackId={r.referredUserId?._id} />
                        {r.referredUserId?._id && (
                          <Link
                            to={`/users/${r.referredUserId._id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View profile
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.referralCodeUsed ? (
                        <Copyable value={r.referralCodeUsed} label="Code" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmtNumber(r.rubiesAwarded)}
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <Pager pagination={pagination} onPageChange={(p) => fetchPage(p)} loading={loading} />
      </CardContent>
    </Card>
  );
};

/* ──────────────────────────────────────────────────────────
 * Failed attempts tab
 * ────────────────────────────────────────────────────────── */
const AttemptsTab = ({ filters, onPeriodChange, onRangeChange }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchPage = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await referralService.getAttempts({
          page,
          limit: 25,
          search: search || undefined,
          status,
          period: filters.period === 'custom' ? undefined : filters.period,
          startDate: filters.period === 'custom' ? filters.startDate : undefined,
          endDate: filters.period === 'custom' ? filters.endDate : undefined,
        });
        setRows(result.data || []);
        setPagination({
          page: result.pagination?.page || 1,
          totalPages: result.pagination?.totalPages || 1,
          total: result.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load referral attempts');
      } finally {
        setLoading(false);
      }
    },
    [search, status, filters.period, filters.startDate, filters.endDate]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle>Referral attempts</CardTitle>
        </div>
        <CardDescription>
          Every apply attempt — successful or not. Use this to see invalid codes, self-referral
          attempts, duplicate uses, and any hard errors that need investigation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearch={() => setSearch(searchInput.trim())}
          searchPlaceholder="Search by user, email, or code…"
          period={filters.period}
          onPeriodChange={onPeriodChange}
          status={status}
          onStatusChange={setStatus}
          statusOptions={ATTEMPT_STATUS_OPTIONS}
          onRefresh={() => fetchPage(pagination.page)}
          loading={loading}
          startDate={filters.startDate}
          endDate={filters.endDate}
          setStartDate={(v) => onRangeChange({ startDate: v })}
          setEndDate={(v) => onRangeChange({ endDate: v })}
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Code tried</TableHead>
                <TableHead>Referred user</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Note</TableHead>
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
                    No attempts match these filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((r) => (
                  <TableRow key={String(r._id)}>
                    <TableCell>
                      <Badge className={STATUS_BADGE[r.status] || 'bg-slate-500'}>
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.referralCodeUsed ? (
                        <Copyable value={r.referralCodeUsed} label="Code" primary />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <UserCell user={r.referredUserId} fallbackId={r.referredUserId?._id} />
                        {r.referredUserId?._id && (
                          <Link
                            to={`/users/${r.referredUserId._id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View profile
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.referrerId ? (
                        <div>
                          <UserCell user={r.referrerId} fallbackId={r.referrerId?._id} />
                          {r.referrerId?._id && (
                            <Link
                              to={`/users/${r.referrerId._id}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View profile
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.source || 'signup'}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={r.errorMessage || ''}>
                      {r.errorMessage || '—'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <Pager pagination={pagination} onPageChange={(p) => fetchPage(p)} loading={loading} />
      </CardContent>
    </Card>
  );
};

/* ──────────────────────────────────────────────────────────
 * Page
 * ────────────────────────────────────────────────────────── */
const Referrals = () => {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tab, setTab] = useState('top');

  const periodLabel = useMemo(() => {
    if (period === 'custom' && (startDate || endDate)) {
      const fmt = (v) => (v ? new Date(v).toLocaleString() : '…');
      return `${fmt(startDate)} → ${fmt(endDate)}`;
    }
    return PERIOD_LABEL[period] || 'all time';
  }, [period, startDate, endDate]);

  const handlePeriodChange = (v) => {
    setPeriod(v);
    if (v !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleRangeChange = ({ startDate: s, endDate: e }) => {
    if (s !== undefined) setStartDate(s);
    if (e !== undefined) setEndDate(e);
  };

  const filters = { period, startDate, endDate };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Track who referred who, sort top referrers, and diagnose failed referral attempts. Date
          filter applies across all tabs.
        </p>
      </div>

      <StatsOverview filters={filters} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="top">Top referrers</TabsTrigger>
          <TabsTrigger value="logs">Successful referrals</TabsTrigger>
          <TabsTrigger value="attempts">Attempts &amp; failures</TabsTrigger>
        </TabsList>
        <TabsContent value="top" className="mt-4">
          <TopReferrersTab
            filters={filters}
            onPeriodChange={handlePeriodChange}
            onRangeChange={handleRangeChange}
            periodLabel={periodLabel}
          />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <LogsTab
            filters={filters}
            onPeriodChange={handlePeriodChange}
            onRangeChange={handleRangeChange}
          />
        </TabsContent>
        <TabsContent value="attempts" className="mt-4">
          <AttemptsTab
            filters={filters}
            onPeriodChange={handlePeriodChange}
            onRangeChange={handleRangeChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Referrals;
