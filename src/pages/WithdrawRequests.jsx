import React, { useState, useEffect } from 'react';
import { withdrawRequestService } from '../services/withdrawRequestService';
import { useListQueryState } from '../hooks/useListQueryState';
import { useNavigateWithReturn } from '../hooks/useListNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Wallet, User, Check, X, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const WithdrawRequests = () => {
  const { params, setQuery } = useListQueryState({ filterKeys: ['status', 'search'] });
  const navigateWithReturn = useNavigateWithReturn();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.search);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalCount: 0,
    totalPages: 1,
  });

  const [actionDialog, setActionDialog] = useState({ open: false, type: null, request: null });
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async (page = 1, status = '', searchText = search) => {
    try {
      setLoading(true);
      const result = await withdrawRequestService.getWithdrawRequests({
        page,
        limit: 10,
        status: status || undefined,
        search: searchText || undefined,
      });
      setRequests(result.requests || []);
      const incomingPagination = result.pagination || {};
      setPagination({
        page: Number(incomingPagination.page) || 1,
        limit: Number(incomingPagination.limit) || 10,
        totalCount: Number(incomingPagination.totalCount) || 0,
        total: Number(incomingPagination.totalCount) || 0,
        totalPages: Number(incomingPagination.totalPages) || 1,
      });
    } catch (error) {
      console.error('Failed to fetch withdraw requests:', error);
      toast.error('Failed to fetch withdraw requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch(params.search);
  }, [params.search]);

  useEffect(() => {
    fetchRequests(params.page, params.status, params.search);
  }, [params.page, params.status, params.search]);

  const handleStatusFilter = (status) => {
    setQuery({ page: 1, status, search: params.search });
  };

  const handlePageChange = (newPage) => {
    setQuery({ page: newPage });
  };

  const handleSearch = () => {
    setQuery({ page: 1, search, status: params.status });
  };

  const openApprove = (request) => {
    setActionDialog({ open: true, type: 'approve', request });
    setAdminNotes('');
  };

  const openReject = (request) => {
    setActionDialog({ open: true, type: 'reject', request });
    setAdminNotes('');
  };

  const openDelete = (request) => {
    setActionDialog({ open: true, type: 'delete', request });
    setAdminNotes('');
  };

  const closeDialog = () => {
    setActionDialog({ open: false, type: null, request: null });
    setAdminNotes('');
  };

  const openDetails = (request) => {
    const requestId = request?._id;
    if (!requestId) {
      toast.error('Request details unavailable');
      return;
    }
    navigateWithReturn(`/withdraw-requests/${requestId}`);
  };

  const handleConfirm = async () => {
    const { type, request } = actionDialog;
    if (!request?._id) return;
    try {
      setSubmitting(true);
      if (type === 'approve') {
        await withdrawRequestService.approveRequest(request._id, adminNotes || undefined);
        toast.success('Withdraw request approved. Rubies have been deducted from the user.');
      } else if (type === 'reject') {
        await withdrawRequestService.rejectRequest(request._id, adminNotes || undefined);
        toast.success('Withdraw request rejected.');
      } else if (type === 'delete') {
        await withdrawRequestService.deleteRequest(request._id);
        toast.success('Withdraw request deleted.');
      }
      closeDialog();
      fetchRequests(pagination.page, params.status, params.search);
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(error.response?.data?.message || error.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Withdraw Requests</h1>
        <p className="text-gray-600 mt-1">
          Review and manage user cashout requests. Approving a request will deduct rubies from the user's balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cashout requests</CardTitle>
          <CardDescription>Users requesting to convert their rubies to USD via PayPal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by user name, username, email, PayPal"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>
          <div className="flex gap-2 mb-6">
            {['', 'pending', 'approved', 'rejected'].map((s) => (
              <Button
                key={s}
                variant={params.status === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter(s)}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount (USD)</TableHead>
                  <TableHead>Rubies</TableHead>
                  <TableHead>PayPal Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No withdraw requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {req.user?.name || req.user?.username || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {req.user?.email || '-'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {formatCurrency(req.amountUsd)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatNumber(req.rubiesAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {req.paypalEmail || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(req)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          {req.status !== 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDelete(req)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        {req.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openApprove(req)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openReject(req)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        </div>
                        {req.status === 'pending' && (
                          null
                        )}
                        {req.status !== 'pending' && req.reviewedAt && (
                          <div className="text-xs text-gray-400">
                            {new Date(req.reviewedAt).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              {(() => {
                const pageNum = Number(pagination.page) || 1;
                const pageLimit = Number(pagination.limit) || 10;
                const totalCount = Number(pagination.totalCount ?? pagination.total) || 0;
                const from = totalCount === 0 ? 0 : ((pageNum - 1) * pageLimit) + 1;
                const to = totalCount === 0 ? 0 : Math.min(pageNum * pageLimit, totalCount);
                return `Showing ${from} to ${to} of ${totalCount} requests`;
              })()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve'
                ? 'Approve withdraw request'
                : actionDialog.type === 'reject'
                  ? 'Reject withdraw request'
                  : 'Delete withdraw request'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve'
                ? 'Approving will deduct the rubies from the user\'s balance. Make sure the PayPal payout has been processed.'
                : actionDialog.type === 'reject'
                  ? 'The request will be marked as rejected. No rubies will be deducted.'
                  : 'This will permanently remove the request (non-pending only). This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.request && (
            <div className="space-y-2 py-2">
              <p className="text-sm">
                <span className="font-medium">User:</span> {actionDialog.request.user?.name || actionDialog.request.user?.username} ({actionDialog.request.user?.email})
              </p>
              <p className="text-sm">
                <span className="font-medium">Amount:</span> {formatCurrency(actionDialog.request.amountUsd)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Rubies to deduct:</span> {formatNumber(actionDialog.request.rubiesAmount)}
              </p>
              <p className="text-sm">
                <span className="font-medium">PayPal:</span> {actionDialog.request.paypalEmail}
              </p>
              {actionDialog.type !== 'delete' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Admin notes (optional)</label>
                  <textarea
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Optional note for records"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting
                ? 'Processing...'
                : actionDialog.type === 'approve'
                  ? 'Approve'
                  : actionDialog.type === 'reject'
                    ? 'Reject'
                    : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawRequests;
