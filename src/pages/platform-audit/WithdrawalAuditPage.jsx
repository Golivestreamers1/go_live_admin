import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import { withdrawRequestService } from '../../services/withdrawRequestService';
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

const REQUEST_STATUS_CLASS = {
  pending: 'bg-amber-50/60',
  rejected: 'bg-red-50/40',
};

const confidenceToBadge = (confidence) => {
  const key = String(confidence || 'GREEN').toUpperCase();
  if (key === 'YELLOW') return 'warning';
  if (key === 'RED') return 'failed';
  return 'pass';
};

const WithdrawalAuditPage = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [requestStatus, setRequestStatus] = useState('all');
  const [auditConfidence, setAuditConfidence] = useState('all');
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (requestStatus !== 'all') params.status = requestStatus;
      if (auditConfidence !== 'all') params.auditConfidence = auditConfidence;

      const result = await platformAuditService.getWithdrawals(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load withdrawal audit:', err);
      setError('Failed to load withdrawal audit data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, page, requestStatus, auditConfidence]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to, requestStatus, auditConfidence]);

  const openDetail = async (row) => {
    try {
      setDetailLoading(true);
      const detail = await withdrawRequestService.getAudit(row.id);
      setSelectedAudit(detail);
    } catch (err) {
      console.error('Failed to load withdrawal audit detail:', err);
      setSelectedAudit({ withdrawRequest: { _id: row.id }, error: 'Failed to load audit packet' });
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
          Read-only withdrawal verification — reviews integrity confidence per streamer before payout.
          Approve or reject from the existing withdraw requests page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <PlatformAuditMetricCard title="Total requests" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Pending" value={formatNumber(summary.pending)} status="warning" loading={loading} />
        <PlatformAuditMetricCard title="Approved" value={formatNumber(summary.approved)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Rejected" value={formatNumber(summary.rejected)} status={summary.rejected > 0 ? 'warning' : 'pass'} loading={loading} />
        <PlatformAuditMetricCard title="Audit OK" value={formatNumber(summary.auditGreen)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Needs review" value={formatNumber(summary.auditYellow + summary.auditRed)} status={summary.auditRed > 0 ? 'failed' : 'warning'} loading={loading} />
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
            <label className="mb-2 block text-sm font-medium">Request status</label>
            <Select value={requestStatus} onValueChange={setRequestStatus}>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Audit confidence</label>
            <Select value={auditConfidence} onValueChange={setAuditConfidence}>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="GREEN">OK (green)</SelectItem>
              <SelectItem value="YELLOW">Review (yellow)</SelectItem>
              <SelectItem value="RED">Issue (red)</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Withdrawal requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading withdrawals…</p>
          ) : (data?.withdrawals ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawal requests match these filters.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Streamer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Audit</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                      <TableHead className="text-right">Rubies</TableHead>
                      <TableHead>PayPal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.withdrawals.map((row) => (
                      <TableRow
                        key={row.id}
                        className={`cursor-pointer ${REQUEST_STATUS_CLASS[row.requestStatus] ?? ''}`}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>
                          <p className="font-mono text-xs">{row.requestId.slice(-8)}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.user?.username ?? row.user?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.user?.email ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-sm">{row.requestStatusLabel}</TableCell>
                        <TableCell>
                          <AuditStatusBadge status={row.auditStatus} />
                          {row.flagCount > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">{row.flagCount} flag(s)</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-medium">${formatNumber(row.amountUsd)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.rubiesAmount)}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs">{row.paypalEmail ?? '—'}</TableCell>
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

      <Dialog open={Boolean(selectedAudit)} onOpenChange={(open) => !open && setSelectedAudit(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Withdrawal audit proof</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit packet…</p>
          ) : selectedAudit?.error ? (
            <p className="text-sm text-red-700">{selectedAudit.error}</p>
          ) : selectedAudit ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AuditStatusBadge status={confidenceToBadge(selectedAudit.confidence)} />
                {selectedAudit.withdrawRequest?._id ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/withdraw-requests/${selectedAudit.withdrawRequest._id}`}>
                      Open withdraw page
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Streamer</span>
                  <p>{selectedAudit.user?.username ?? selectedAudit.user?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{selectedAudit.user?.email ?? ''}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Request status</span>
                  <p>{selectedAudit.withdrawRequest?.status ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p>
                    ${formatNumber(selectedAudit.withdrawRequest?.amountUsd)} ·{' '}
                    {formatNumber(selectedAudit.withdrawRequest?.rubiesAmount)} rubies
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">PayPal</span>
                  <p>{selectedAudit.withdrawRequest?.paypalEmail ?? selectedAudit.user?.paypalEmail ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                <div>
                  <span className="text-muted-foreground">Stored rubies</span>
                  <p>{formatNumber(selectedAudit.balances?.storedRubies)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ledger rubies</span>
                  <p>{formatNumber(selectedAudit.balances?.ledgerRubies)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lifetime expected</span>
                  <p>{formatNumber(selectedAudit.lifetime?.expected)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lifetime diff</span>
                  <p>{formatNumber(selectedAudit.lifetime?.diff)}</p>
                </div>
              </div>

              {selectedAudit.projection ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium">Approval projection</p>
                  <p className="mt-1">
                    Rubies after approval: {formatNumber(selectedAudit.projection.rubiesAfterApproval)} ·{' '}
                    {selectedAudit.projection.sufficientBalance ? 'Sufficient balance' : 'Insufficient balance'}
                  </p>
                </div>
              ) : null}

              {(selectedAudit.flags ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Integrity flags</p>
                  <ul className="space-y-2">
                    {selectedAudit.flags.map((flag) => (
                      <li key={flag.id} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                        <p className="font-medium">{flag.id}</p>
                        <p>{flag.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground">No integrity flags detected.</p>
              )}

              {(selectedAudit.ledgerExcerpt ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Recent ledger excerpt</p>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedAudit.ledgerExcerpt, null, 2)}
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

WithdrawalAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default WithdrawalAuditPage;
