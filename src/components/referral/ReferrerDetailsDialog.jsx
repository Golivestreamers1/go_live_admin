import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { referralService } from '../../services/referralService';
import { ReferralJourneyDialog } from './ReferralJourneyDialog';
import { normalizeReferrerSummary, formatStatsRangeUtc } from './referralDisplay';
import { ReferrerPeriodStats } from './ReferrerPeriodStats';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtNum = (n, { allowNull = false } = {}) => {
  if (n == null || n === '') return allowNull ? '—' : '0';
  if (Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString();
};

const REWARD_TABS = [
  { value: 'all', label: 'All completed', countKey: 'count' },
  { value: 'rewarded', label: 'Paid', countKey: 'rewardedCount' },
  { value: 'linked_no_reward', label: 'Linked only', countKey: 'linkedCount' },
  { value: 'pending', label: 'Pending', countKey: 'pendingCount' },
];

const REWARD_STATUS_BADGE = {
  rewarded: { label: 'Paid', className: 'bg-emerald-600' },
  linked_no_reward: { label: 'Linked only', className: 'bg-slate-500' },
  pending: { label: 'Pending', className: 'bg-amber-500' },
};

export function ReferrerDetailsDialog({ referrerId, filters, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rewardStatus, setRewardStatus] = useState('all');
  const [listPeriod, setListPeriod] = useState('selected');
  const [journeyUserId, setJourneyUserId] = useState(null);

  const load = useCallback(
    async (p = 1, status = rewardStatus, periodKey = listPeriod) => {
      if (!referrerId) return;
      try {
        setLoading(true);
        const result = await referralService.getReferrerDetails(referrerId, {
          page: p,
          limit: 20,
          rewardStatus: status,
          listPeriod: periodKey,
          period: filters?.period === 'custom' ? undefined : filters?.period,
          startDate: filters?.period === 'custom' ? filters?.startDate : undefined,
          endDate: filters?.period === 'custom' ? filters?.endDate : undefined,
        });
        setData(result);
        setPage(result.pagination?.page || p);
        if (result.listPeriod) setListPeriod(result.listPeriod);
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load referrer details');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [referrerId, rewardStatus, listPeriod, filters?.period, filters?.startDate, filters?.endDate]
  );

  useEffect(() => {
    if (open && referrerId) {
      setRewardStatus('all');
      setListPeriod('selected');
      load(1, 'all', 'selected');
    }
    if (!open) {
      setData(null);
      setPage(1);
      setRewardStatus('all');
      setListPeriod('selected');
    };
  }, [open, referrerId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset filter when dialog opens

  const handleFilterChange = (value) => {
    setRewardStatus(value);
    load(1, value, listPeriod);
  };

  const handleListPeriodChange = (periodKey) => {
    setListPeriod(periodKey);
    load(1, rewardStatus, periodKey);
  };

  const referrer = data?.referrer;
  const summary = normalizeReferrerSummary(data?.summary);
  const rows = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Referrer details</DialogTitle>
            <DialogDescription>
              Monthly, yearly, and all-time stats (UTC). Click a period card to filter the table;
              use tabs below for payout status.
            </DialogDescription>
          </DialogHeader>

          {loading && !data && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && referrer && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{referrer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{referrer.username} • Code:{' '}
                    <span className="font-mono">{referrer.referralCode || '—'}</span>
                  </p>
                  {referrer.referralUnlimitedRewards && (
                    <Badge className="mt-1 bg-violet-600">Unlimited monthly rewards</Badge>
                  )}
                </div>
                <Link to={`/users/${referrer._id}`}>
                  <Button size="sm" variant="outline">
                    Full profile
                  </Button>
                </Link>
              </div>

              <ReferrerPeriodStats
                breakdown={data?.periodBreakdown}
                listPeriod={listPeriod}
                onSelectListPeriod={handleListPeriodChange}
              />

              {summary && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Table period: </span>
                  {data?.listPeriodLabel || 'Selected'}{' '}
                  <span className="text-[11px]">({formatStatsRangeUtc(data?.listRange)})</span>
                </div>
              )}

              <Tabs value={rewardStatus} onValueChange={handleFilterChange} className="w-full">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                    {REWARD_TABS.map((tab) => {
                      const raw = summary?.[tab.countKey];
                      const showCount =
                        tab.countKey === 'pendingCount'
                          ? summary.pendingCount != null
                          : raw != null;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="text-xs sm:text-sm data-[state=active]:bg-background"
                        >
                          {tab.label}
                          {showCount && (
                            <span className="ml-1 tabular-nums opacity-70">({fmtNum(raw)})</span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => load(page, rewardStatus, listPeriod)}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                    </Button>
                    {pagination?.total != null && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtNum(pagination.total)} shown
                      </span>
                    )}
                  </div>
                </div>
              </Tabs>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referred user</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Rubies</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No referrals match this filter.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((r) => {
                      const u = r.referredUserId;
                      const uid = u?._id || u;
                      const statusKey = r.rewardStatus || (r.rubiesAwarded > 0 ? 'rewarded' : 'linked_no_reward');
                      const badge = REWARD_STATUS_BADGE[statusKey] || REWARD_STATUS_BADGE.linked_no_reward;
                      return (
                        <TableRow key={String(r._id)}>
                          <TableCell>
                            <div className="text-sm font-medium">{u?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">@{u?.username || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.referralCodeUsed || '—'}</TableCell>
                          <TableCell className="tabular-nums">
                            {statusKey === 'pending' ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              fmtNum(r.rubiesAwarded)
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
                          <TableCell>
                            {uid && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => setJourneyUserId(String(uid))}
                              >
                                Journey
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1 || loading}
                      onClick={() => load(page - 1, rewardStatus, listPeriod)}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= pagination.totalPages || loading}
                      onClick={() => load(page + 1, rewardStatus, listPeriod)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReferralJourneyDialog
        referredUserId={journeyUserId}
        open={Boolean(journeyUserId)}
        onOpenChange={(v) => !v && setJourneyUserId(null)}
      />
    </>
  );
}

export default ReferrerDetailsDialog;
