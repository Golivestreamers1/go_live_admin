import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { fraudCascadeService } from '../../services/fraudCascadeService';
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

const STATUS_BADGE = {
  planning: 'warning',
  plan_ready: 'warning',
  executing: 'warning',
  completed: 'pass',
  failed: 'failed',
  undone: 'not_applicable',
};

function inDateRange(iso, dateRange) {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (dateRange?.from && ts < new Date(dateRange.from).getTime()) return false;
  if (dateRange?.to && ts > new Date(dateRange.to).getTime()) return false;
  return true;
}

const FraudReversalsAuditPage = ({ dateRange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCascade, setSelectedCascade] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fraudCascadeService.list({
        status: statusFilter === 'all' ? null : statusFilter,
        page: 1,
        limit: 100,
      });
      setItems(data?.items ?? []);
      setFeatureDisabled(false);
    } catch (err) {
      if (err?.response?.status === 404) {
        setFeatureDisabled(true);
        setItems([]);
      } else {
        console.error('Failed to load fraud cascades:', err);
        setError('Failed to load fraud cascade data');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(
    () => items.filter((row) => inDateRange(row.createdAt, dateRange)),
    [items, dateRange?.from, dateRange?.to]
  );

  const summary = useMemo(() => {
    const counts = {
      total: filteredItems.length,
      completed: 0,
      planReady: 0,
      failed: 0,
      undone: 0,
    };
    for (const row of filteredItems) {
      if (row.status === 'completed') counts.completed += 1;
      if (row.status === 'plan_ready') counts.planReady += 1;
      if (row.status === 'failed') counts.failed += 1;
      if (row.status === 'undone') counts.undone += 1;
    }
    return counts;
  }, [filteredItems]);

  const openDetail = async (row) => {
    try {
      setDetailLoading(true);
      const detail = await fraudCascadeService.getById(row._id);
      setSelectedCascade(detail);
    } catch (err) {
      console.error('Failed to load cascade detail:', err);
      setSelectedCascade({ _id: row._id, error: 'Failed to load cascade detail' });
    } finally {
      setDetailLoading(false);
    }
  };

  if (featureDisabled) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
        Fraud cascade is disabled on this backend (FRAUD_CASCADE_ENABLED).
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only fraud reversal audit — reviews cascade plans and linked ledger reversals.
          Execute or undo from the existing fraud cascade page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PlatformAuditMetricCard title="Total cascades" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Completed" value={formatNumber(summary.completed)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Plan ready" value={formatNumber(summary.planReady)} status="warning" loading={loading} />
        <PlatformAuditMetricCard title="Failed" value={formatNumber(summary.failed)} status="failed" loading={loading} />
        <PlatformAuditMetricCard title="Undone" value={formatNumber(summary.undone)} loading={loading} />
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
        <CardContent>
          <div className="max-w-xs">
            <label className="mb-2 block text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="plan_ready">Plan ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="undone">Undone</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fraud cascades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading cascades…</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cascades match these filters.</p>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cascade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Taint</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Coins reversed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((row) => (
                    <TableRow key={row._id} className="cursor-pointer" onClick={() => openDetail(row)}>
                      <TableCell>
                        <p className="font-mono text-xs">{String(row._id).slice(-8)}</p>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">{row.reason ?? '—'}</p>
                      </TableCell>
                      <TableCell>
                        <AuditStatusBadge status={STATUS_BADGE[row.status] ?? row.status} />
                        <p className="mt-1 text-xs capitalize text-muted-foreground">{row.status}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatNumber(row.taintAmount)} {row.taintCurrency ?? ''}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.plan?.totals?.usersAffected ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.plan?.totals?.coinsReversed ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedCascade)} onOpenChange={(open) => !open && setSelectedCascade(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Fraud cascade detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading cascade detail…</p>
          ) : selectedCascade?.error ? (
            <p className="text-sm text-red-700">{selectedCascade.error}</p>
          ) : selectedCascade ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AuditStatusBadge status={STATUS_BADGE[selectedCascade.status] ?? selectedCascade.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/fraud-cascade/${selectedCascade._id}`}>
                    Open cascade page
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Cascade ID</span>
                  <p className="font-mono text-xs break-all">{selectedCascade._id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Root transaction</span>
                  <p className="font-mono text-xs break-all">
                    {selectedCascade.rootTransaction?._id ?? selectedCascade.rootTransactionId ?? '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Taint</span>
                  <p>
                    {formatNumber(selectedCascade.taintAmount)} {selectedCascade.taintCurrency ?? ''}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Triggered by</span>
                  <p>{selectedCascade.triggeringAdmin?.username ?? selectedCascade.triggeringAdmin?.name ?? '—'}</p>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Reason</span>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-3">
                  {selectedCascade.reason || '—'}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium">
                  Reversal chain ({selectedCascade.ledgerEntries?.length ?? 0} ledger rows)
                </p>
                {(selectedCascade.ledgerEntries ?? []).length === 0 ? (
                  <p className="text-muted-foreground">No ledger entries linked to this cascade yet.</p>
                ) : (
                  <div className="overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Coins</TableHead>
                          <TableHead className="text-right">Rubies</TableHead>
                          <TableHead>Reason code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCascade.ledgerEntries.map((entry) => (
                          <TableRow key={entry._id}>
                            <TableCell className="font-mono text-xs">{String(entry._id).slice(-8)}</TableCell>
                            <TableCell>{entry.type}</TableCell>
                            <TableCell className="text-right">{formatNumber(entry.coins)}</TableCell>
                            <TableCell className="text-right">{formatNumber(entry.rubies)}</TableCell>
                            <TableCell className="text-xs">{entry.cascadeReasonCode ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

FraudReversalsAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default FraudReversalsAuditPage;
