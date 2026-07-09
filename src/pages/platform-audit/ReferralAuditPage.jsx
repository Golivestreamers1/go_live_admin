import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const ROW_HIGHLIGHT = {
  pending: 'bg-amber-50/60',
  cap_blocked: 'bg-amber-50/60',
  invalid: 'bg-red-50/60',
};

const ReferralAuditPage = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState('all');
  const [eligibility, setEligibility] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (queue !== 'all') params.queue = queue;
      if (eligibility !== 'all') params.eligibility = eligibility;

      const result = await platformAuditService.getReferrals(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load referral audit:', err);
      setError('Failed to load referral audit data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, page, queue, eligibility]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to, queue, eligibility]);

  const openDetail = async (row) => {
    try {
      setDetailLoading(true);
      const detail = await platformAuditService.getReferralDetail(row.id, row.recordType);
      setSelectedReferral(detail);
    } catch (err) {
      console.error('Failed to load referral detail:', err);
      setSelectedReferral({ ...row, error: 'Failed to load referral detail' });
    } finally {
      setDetailLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <Button className="mt-3" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  const summary = data?.summary ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only referral verification — tracks pending queue, eligibility criteria, monthly caps,
          and reward ledger links. Does not trigger referral payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <PlatformAuditMetricCard title="Total records" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Pending queue" value={formatNumber(summary.pending)} status="warning" loading={loading} />
        <PlatformAuditMetricCard title="Eligible" value={formatNumber(summary.eligible)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Rewarded" value={formatNumber(summary.rewarded)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Cap blocked" value={formatNumber(summary.capBlocked)} status="warning" loading={loading} />
        <PlatformAuditMetricCard title="Invalid" value={formatNumber(summary.invalid)} status="failed" loading={loading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Queue</label>
            <Select value={queue} onValueChange={setQueue}>
              <SelectItem value="all">All records</SelectItem>
              <SelectItem value="pending">Pending queue only</SelectItem>
              <SelectItem value="rewarded">Rewarded only</SelectItem>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Eligibility</label>
            <Select value={eligibility} onValueChange={setEligibility}>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">In progress</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="cap_blocked">Monthly cap reached</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="rewarded">Rewarded</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Referral audit records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading referrals…</p>
          ) : (data?.referrals ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No referral records match these filters.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred user</TableHead>
                      <TableHead>Eligibility</TableHead>
                      <TableHead className="text-right">Reward</TableHead>
                      <TableHead>Monthly cap</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.referrals.map((row) => (
                      <TableRow
                        key={`${row.recordType}-${row.id}`}
                        className={`cursor-pointer ${ROW_HIGHLIGHT[row.eligibilityStatus] ?? ''}`}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>
                          <p className="text-sm">{row.referrer?.username ?? row.referrer?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.referrer?.email ?? ''}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.referred?.username ?? row.referred?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.referred?.email ?? ''}</p>
                        </TableCell>
                        <TableCell>
                          <AuditStatusBadge status={row.eligibilityStatus} />
                          <p className="mt-1 text-xs capitalize text-muted-foreground">{row.recordType}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(row.rubiesAwarded ?? row.rewardAmount)} rubies
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.unlimitedRewards
                            ? 'Unlimited'
                            : `${row.rewardedThisMonth}/${row.monthlyRewardCap}`}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.referralCodeUsed ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDateTime(row.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data.pagination?.totalPages > 1 ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} ·{' '}
                    {formatNumber(data.pagination.total)} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
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

      <Dialog open={Boolean(selectedReferral)} onOpenChange={(open) => !open && setSelectedReferral(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Referral audit detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading detail…</p>
          ) : selectedReferral?.error ? (
            <p className="text-sm text-red-700">{selectedReferral.error}</p>
          ) : selectedReferral ? (
            <div className="space-y-4 text-sm">
              <AuditStatusBadge status={selectedReferral.eligibilityStatus} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Referrer</span>
                  <p>{selectedReferral.referrer?.username ?? selectedReferral.referrer?.name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Referred user</span>
                  <p>{selectedReferral.referred?.username ?? selectedReferral.referred?.name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reward amount</span>
                  <p>{formatNumber(selectedReferral.rubiesAwarded ?? selectedReferral.rewardAmount)} rubies</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly usage</span>
                  <p>
                    {selectedReferral.unlimitedRewards
                      ? 'Unlimited rewards'
                      : `${selectedReferral.rewardedThisMonth}/${selectedReferral.monthlyRewardCap} this month`}
                  </p>
                </div>
              </div>

              {selectedReferral.invalidReason ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
                  Invalid: {selectedReferral.invalidReason}
                </div>
              ) : null}

              {(selectedReferral.blockers ?? selectedReferral.criteriaProgress?.blockers ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Blockers</p>
                  <ul className="list-disc pl-5">
                    {(selectedReferral.blockers ?? selectedReferral.criteriaProgress?.blockers ?? []).map((item) => (
                      <li key={item}>{item.replaceAll('_', ' ')}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedReferral.walletTransaction ? (
                <div>
                  <p className="mb-2 font-medium">Reward transaction</p>
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedReferral.walletTransaction, null, 2)}
                  </pre>
                </div>
              ) : selectedReferral.recordType === 'rewarded' ? (
                <p className="text-muted-foreground">No linked wallet transaction found.</p>
              ) : null}

              {selectedReferral.criteriaProgress ? (
                <div>
                  <p className="mb-2 font-medium">Criteria progress</p>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedReferral.criteriaProgress, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

ReferralAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default ReferralAuditPage;
