import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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

const AdminActionsAuditPage = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (action !== 'all') params.action = action;
      if (search) params.search = search;

      const result = await platformAuditService.getAdminActions(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load admin actions audit:', err);
      setError('Failed to load admin actions data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, page, action, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to, action, search]);

  const openDetail = async (row) => {
    try {
      const detail = await platformAuditService.getAdminActionDetail(row.id);
      setSelectedAction(detail);
    } catch (err) {
      console.error('Failed to load admin action detail:', err);
      setSelectedAction(row);
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
          Read-only admin activity log — every coin adjustment and sensitive admin operation with
          before/after balances, reason, and IP. Does not modify balances.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PlatformAuditMetricCard title="Total actions" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Coin adjustments" value={formatNumber(summary.coinAdjust)} loading={loading} />
        <PlatformAuditMetricCard title="Fraud actions" value={formatNumber(summary.fraudActions)} loading={loading} />
        <PlatformAuditMetricCard title="Credits" value={formatNumber(summary.credits)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Debits" value={formatNumber(summary.debits)} status="warning" loading={loading} />
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
            <label className="mb-2 block text-sm font-medium">Action type</label>
            <Select value={action} onValueChange={setAction}>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="coin_adjust">Coin adjustment</SelectItem>
              <SelectItem value="fraud_cascade_plan">Fraud cascade planned</SelectItem>
              <SelectItem value="fraud_cascade_execute">Fraud cascade executed</SelectItem>
              <SelectItem value="fraud_cascade_undo">Fraud cascade undone</SelectItem>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Search admin / user / reason</label>
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, email, reason…"
              />
              <Button
                variant="outline"
                onClick={() => setSearch(searchInput.trim())}
              >
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Admin actions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading admin actions…</p>
          ) : (data?.actions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions match these filters.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target user</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.actions.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(row)}
                      >
                        <TableCell className="text-xs">{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>
                          <p className="text-sm">{row.admin?.username ?? row.admin?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.admin?.email ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-sm">{row.actionLabel}</TableCell>
                        <TableCell>
                          <p className="text-sm">{row.targetUser?.username ?? row.targetUser?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.targetUser?.email ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {row.direction ? `${row.direction} ${formatNumber(row.amount)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {row.previousBalance != null && row.newBalance != null
                            ? `${formatNumber(row.previousBalance)} → ${formatNumber(row.newBalance)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.ip ?? '—'}</TableCell>
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

      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Admin action detail</DialogTitle>
          </DialogHeader>
          {selectedAction ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Action</span>
                  <p>{selectedAction.actionLabel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp</span>
                  <p>{formatDateTime(selectedAction.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Admin</span>
                  <p>{selectedAction.admin?.username ?? selectedAction.admin?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{selectedAction.admin?.email ?? ''}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target user</span>
                  <p>{selectedAction.targetUser?.username ?? selectedAction.targetUser?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{selectedAction.targetUser?.email ?? ''}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Direction / amount</span>
                  <p>
                    {selectedAction.direction
                      ? `${selectedAction.direction} ${formatNumber(selectedAction.amount)}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance change</span>
                  <p>
                    {selectedAction.previousBalance != null && selectedAction.newBalance != null
                      ? `${formatNumber(selectedAction.previousBalance)} → ${formatNumber(selectedAction.newBalance)}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP address</span>
                  <p className="font-mono text-xs">{selectedAction.ip ?? '—'}</p>
                </div>
                {selectedAction.ticketReference ? (
                  <div>
                    <span className="text-muted-foreground">Ticket reference</span>
                    <p className="font-mono text-xs">{selectedAction.ticketReference}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <span className="text-muted-foreground">Reason</span>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-3">
                  {selectedAction.reason || '—'}
                </p>
              </div>

              {(selectedAction.walletTransactionId ||
                selectedAction.cascadeId ||
                selectedAction.withdrawRequestId) && (
                <div className="grid grid-cols-1 gap-2 rounded-md border p-3 text-xs">
                  {selectedAction.walletTransactionId ? (
                    <p>
                      Wallet transaction:{' '}
                      <span className="font-mono">{selectedAction.walletTransactionId}</span>
                    </p>
                  ) : null}
                  {selectedAction.cascadeId ? (
                    <p>
                      Cascade: <span className="font-mono">{selectedAction.cascadeId}</span>
                    </p>
                  ) : null}
                  {selectedAction.withdrawRequestId ? (
                    <p>
                      Withdraw request:{' '}
                      <span className="font-mono">{selectedAction.withdrawRequestId}</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

AdminActionsAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default AdminActionsAuditPage;
