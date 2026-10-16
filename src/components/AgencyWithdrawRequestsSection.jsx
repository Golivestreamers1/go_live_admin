import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { agencyAdminService } from '../services/agencyAdminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Building2, Check, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
const STATUSES = ['pending', 'approved', 'processed', 'rejected', 'cancelled', 'all'];

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (v === 'approved') return <Badge className="bg-green-600">Approved</Badge>;
  if (v === 'processed') return <Badge className="bg-emerald-600">Processed</Badge>;
  if (v === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  if (v === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="outline">{s || '—'}</Badge>;
};

/**
 * All agencies' cashout (withdrawal) requests in one list — previously only reachable by opening
 * each agency and its Withdrawals tab. Uses the existing admin endpoints:
 *   GET  /admin/agencies/withdrawals?status=&page=&limit=
 *   POST /admin/agencies/withdrawals/:id/approve | /reject
 */
const AgencyWithdrawRequestsSection = () => {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({ open: false, type: null, row: null });
  const [remarks, setRemarks] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agencyAdminService.listAllWithdrawals({ status, page, limit: PAGE_SIZE });
      setRows(data?.list || []);
      setTotal(Number(data?.total) || 0);
      setTotalPages(Number(data?.pagination?.total) || 1);
    } catch (e) {
      console.error('Failed to fetch agency withdrawals:', e);
      toast.error(e?.response?.data?.message || 'Failed to fetch agency withdrawal requests');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (type, row) => {
    setDialog({ open: true, type, row });
    setRemarks('');
    setTransactionId('');
  };
  const closeDialog = () => setDialog({ open: false, type: null, row: null });

  const handleConfirm = async () => {
    const id = dialog.row?._id;
    if (!id) return;
    try {
      setSubmitting(true);
      if (dialog.type === 'approve') {
        await agencyAdminService.approveWithdrawal(id, {
          transactionId: transactionId.trim() || undefined,
          remarks: remarks.trim() || undefined,
        });
        toast.success('Agency withdrawal approved');
      } else {
        await agencyAdminService.rejectWithdrawal(id, {
          remarks: remarks.trim() || 'Rejected by admin',
        });
        toast.success('Agency withdrawal rejected');
      }
      closeDialog();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Withdrawal update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const row = dialog.row;
  const agency = row?.agencyId && typeof row.agencyId === 'object' ? row.agencyId : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Agency cashout requests</CardTitle>
          <CardDescription>
            Withdrawal requests from every agency (owner and recruiter payouts).
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount (USD)</TableHead>
                <TableHead>PayPal Email</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    {loading ? 'Loading…' : 'No agency withdrawal requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((w) => {
                  const a = w.agencyId && typeof w.agencyId === 'object' ? w.agencyId : null;
                  const agencyId = a?._id || (typeof w.agencyId === 'string' ? w.agencyId : null);
                  const requester = w.requestedBy || {};
                  return (
                    <TableRow key={w._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-purple-600" />
                          </div>
                          {agencyId ? (
                            <Link
                              to={`/agencies/${agencyId}`}
                              className="font-medium text-gray-900 hover:underline"
                            >
                              {a?.name || 'Agency'}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{a?.name || 'Agency'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 capitalize">
                        {w.kind || 'owner'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">{money(w.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{w.paypalEmail || '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {requester.name || requester.username || '—'}
                        </div>
                        <div className="text-sm text-gray-500">{requester.email || '-'}</div>
                      </TableCell>
                      <TableCell>{statusBadge(w.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {w.createdAt ? new Date(w.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {w.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openDialog('approve', w)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDialog('reject', w)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {w.processedAt ? new Date(w.processedAt).toLocaleString() : '—'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {from} to {to} of {total} requests
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.type === 'approve' ? 'Approve agency withdrawal' : 'Reject agency withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {dialog.type === 'approve'
                ? 'Make sure the PayPal payout has been sent before approving.'
                : 'The request will be marked as rejected and the amount stays in the agency wallet.'}
            </DialogDescription>
          </DialogHeader>
          {row && (
            <div className="space-y-2 py-2">
              <p className="text-sm">
                <span className="font-medium">Agency:</span> {agency?.name || '—'} ({row.kind || 'owner'})
              </p>
              <p className="text-sm">
                <span className="font-medium">Amount:</span> {money(row.amount)}
              </p>
              <p className="text-sm">
                <span className="font-medium">PayPal:</span> {row.paypalEmail || '-'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Requested by:</span>{' '}
                {row.requestedBy?.name || row.requestedBy?.username || '—'}
                {row.requestedBy?.email ? ` (${row.requestedBy.email})` : ''}
              </p>
              {dialog.type === 'approve' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    PayPal transaction ID (optional)
                  </label>
                  <Input
                    className="mt-1"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 8XY12345AB678901C"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {dialog.type === 'approve' ? 'Remarks (optional)' : 'Reason (optional)'}
                </label>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional note for records"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={dialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : dialog.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AgencyWithdrawRequestsSection;
