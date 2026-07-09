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

const PurchaseAuditPage = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('all');
  const [verificationStatus, setVerificationStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (platform !== 'all') params.platform = platform;
      if (verificationStatus !== 'all') params.verificationStatus = verificationStatus;
      if (paymentStatus !== 'all') params.paymentStatus = paymentStatus;

      const result = await platformAuditService.getPurchases(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load purchase audit:', err);
      setError('Failed to load purchase audit data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, page, platform, verificationStatus, paymentStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to, platform, verificationStatus, paymentStatus]);

  const openDetail = async (purchase) => {
    try {
      const detail = await platformAuditService.getPurchaseDetail(purchase.id);
      setSelectedPurchase(detail);
    } catch (err) {
      console.error('Failed to load purchase detail:', err);
      setSelectedPurchase(purchase);
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
          Read-only purchase verification — reviews IAP, PayPal, and store receipts.
          Does not process payments or change user balances.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PlatformAuditMetricCard title="Total purchases" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Verified" value={formatNumber(summary.verified)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Needs review" value={formatNumber(summary.warning)} status="warning" loading={loading} />
        <PlatformAuditMetricCard title="Unverified" value={formatNumber(summary.failed)} status="failed" loading={loading} />
        <PlatformAuditMetricCard title="Refunded" value={formatNumber(summary.refunded)} status={summary.refunded > 0 ? 'warning' : 'pass'} loading={loading} />
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
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="ios">iOS</SelectItem>
              <SelectItem value="android">Android</SelectItem>
              <SelectItem value="web_paypal">PayPal (web)</SelectItem>
              <SelectItem value="web_stripe">Stripe (web)</SelectItem>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Verification</label>
            <Select value={verificationStatus} onValueChange={setVerificationStatus}>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified only</SelectItem>
              <SelectItem value="failed">Unverified only</SelectItem>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Payment status</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Purchase transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading purchases…</p>
          ) : (data?.purchases ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases match these filters.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-right">Coins</TableHead>
                      <TableHead>Refund / chargeback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchases.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>
                          <p className="font-mono text-xs">{row.transactionId.slice(-8)}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-sm">{row.platformLabel}</TableCell>
                        <TableCell>
                          <AuditStatusBadge status={row.verificationStatus} />
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.user?.username ?? row.user?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.user?.email ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-sm">{row.package?.name ?? row.package?.productId ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(row.coins)}</TableCell>
                        <TableCell className="text-xs">
                          {row.isRefunded ? 'Refunded' : '—'}
                          {row.chargebackLinked ? ' · Chargeback linked' : ''}
                        </TableCell>
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

      <Dialog open={Boolean(selectedPurchase)} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Purchase detail</DialogTitle>
          </DialogHeader>
          {selectedPurchase ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Transaction ID</span><p className="font-mono text-xs break-all">{selectedPurchase.transactionId}</p></div>
                <div><span className="text-muted-foreground">Platform</span><p>{selectedPurchase.platformLabel}</p></div>
                <div><span className="text-muted-foreground">Verification</span><p>{selectedPurchase.verificationLabel} ({selectedPurchase.verificationMode})</p></div>
                <div><span className="text-muted-foreground">Coins</span><p>{formatNumber(selectedPurchase.coins)}</p></div>
                <div><span className="text-muted-foreground">USD</span><p>{formatNumber(selectedPurchase.usd)}</p></div>
                <div><span className="text-muted-foreground">Payment status</span><p>{selectedPurchase.paymentStatus}</p></div>
              </div>
              {selectedPurchase.isRefunded ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Refunded{selectedPurchase.refundReason ? `: ${selectedPurchase.refundReason}` : ''}
                </div>
              ) : null}
              <div>
                <p className="mb-2 font-medium">Store / payment metadata</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(selectedPurchase.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

PurchaseAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default PurchaseAuditPage;
