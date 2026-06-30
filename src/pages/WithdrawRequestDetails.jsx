import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useListBack, useNavigateWithReturn } from '../hooks/useListNavigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { withdrawRequestService } from '../services/withdrawRequestService';
import payoutAnalyticsService from '../services/payoutAnalyticsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const WithdrawRequestDetails = () => {
  const navigateWithReturn = useNavigateWithReturn();
  const goBack = useListBack('/withdraw-requests');
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [streamStatsLoading, setStreamStatsLoading] = useState(false);
  const [streamStats, setStreamStats] = useState(null);
  const [streamsPage, setStreamsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);

  const STREAMS_PAGE_SIZE = 10;
  const PURCHASES_PAGE_SIZE = 10;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await withdrawRequestService.getRequestById(id);
        setRequest(data);
        const streamerId = data?.user?._id;
        if (streamerId) {
          setStreamStatsLoading(true);
          try {
            const stats = await payoutAnalyticsService.getStreamerDetails(streamerId, {
              streamPage: 1,
              streamLimit: 50,
            });
            setStreamStats(stats);
          } catch (streamError) {
            setStreamStats(null);
            toast.error(
              streamError?.response?.data?.message || 'Failed to load stream earnings details'
            );
          } finally {
            setStreamStatsLoading(false);
          }
        } else {
          setStreamStats(null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load withdraw request details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

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

  const allStreams = streamStats?.streams || [];
  const streamsTotalPages = Math.max(1, Math.ceil(allStreams.length / STREAMS_PAGE_SIZE));
  const currentStreamsPage = Math.min(streamsPage, streamsTotalPages);
  const paginatedStreams = allStreams.slice(
    (currentStreamsPage - 1) * STREAMS_PAGE_SIZE,
    currentStreamsPage * STREAMS_PAGE_SIZE
  );

  const allPurchases = streamStats?.recentPurchases || [];
  const purchasesTotalPages = Math.max(1, Math.ceil(allPurchases.length / PURCHASES_PAGE_SIZE));
  const currentPurchasesPage = Math.min(purchasesPage, purchasesTotalPages);
  const paginatedPurchases = allPurchases.slice(
    (currentPurchasesPage - 1) * PURCHASES_PAGE_SIZE,
    currentPurchasesPage * PURCHASES_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdraw Request Details</h1>
          <p className="text-gray-600 mt-1">Basic checkout request information.</p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !request ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">Request not found</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Request #{request._id}</CardTitle>
              <CardDescription>
                Requested on {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">User</div>
                  <div className="font-medium">{request.user?.name || request.user?.username || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{request.user?.email || '-'}</div>
                </div>
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">Amount (USD)</div>
                  <div className="font-semibold">{formatCurrency(request.amountUsd)}</div>
                </div>
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">Rubies</div>
                  <div className="font-semibold">{formatNumber(request.rubiesAmount)}</div>
                </div>
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">PayPal Email</div>
                  <div className="font-semibold break-all">{request.paypalEmail || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">Reviewed At</div>
                  <div className="font-medium">
                    {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}
                  </div>
                </div>
                <div className="p-3 rounded border">
                  <div className="text-xs text-gray-500">Reviewed By</div>
                  <div className="font-medium">
                    {request.reviewedBy?.name || request.reviewedBy?.username || '-'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Admin Notes</div>
                <div className="font-medium whitespace-pre-wrap">{request.adminNotes || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Stream Earnings</CardTitle>
              <CardDescription>
                Total streams and earnings breakdown by stream.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {streamStatsLoading ? (
                <div className="text-sm text-gray-500">Loading stream earnings...</div>
              ) : !streamStats ? (
                <div className="text-sm text-gray-500">No stream earnings data found.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded border">
                      <div className="text-xs text-gray-500">Total Streams</div>
                      <div className="font-semibold">{formatNumber(streamStats.summary?.streamsCount)}</div>
                    </div>
                    <div className="p-3 rounded border">
                      <div className="text-xs text-gray-500">Total Stream Coins</div>
                      <div className="font-semibold">{formatNumber(streamStats.summary?.totalCoinsFromStreams)}</div>
                    </div>
                    <div className="p-3 rounded border">
                      <div className="text-xs text-gray-500">Total Stream Rubies</div>
                      <div className="font-semibold">{formatNumber(streamStats.summary?.totalRubiesFromStreams)}</div>
                    </div>
                  </div>

                  <div className="rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stream</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Ended</TableHead>
                          <TableHead>Coins</TableHead>
                          <TableHead>Rubies</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStreams.length ? (
                          paginatedStreams.map((stream) => (
                            <TableRow key={stream.streamId}>
                              <TableCell>{stream.title || 'Live Stream'}</TableCell>
                              <TableCell>
                                {stream.streamStartedAt
                                  ? new Date(stream.streamStartedAt).toLocaleString()
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {stream.streamEndedAt
                                  ? new Date(stream.streamEndedAt).toLocaleString()
                                  : '-'}
                              </TableCell>
                              <TableCell>{formatNumber(stream.totalCoinsReceived)}</TableCell>
                              <TableCell>{formatNumber(stream.streamerRubies)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigateWithReturn(`/withdraw-requests/${id}/streams/${stream.streamId}`)}
                                >
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                              No streams found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-500">
                      Page {currentStreamsPage} of {streamsTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentStreamsPage <= 1}
                        onClick={() => setStreamsPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentStreamsPage >= streamsTotalPages}
                        onClick={() => setStreamsPage((p) => Math.min(streamsTotalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coin Purchase History</CardTitle>
              <CardDescription>
                Recent coin purchases made by this streamer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {streamStatsLoading ? (
                <div className="text-sm text-gray-500">Loading purchase history...</div>
              ) : !streamStats || !(streamStats.recentPurchases || []).length ? (
                <div className="text-sm text-gray-500">No coin purchase history found.</div>
              ) : (
                <div>
                  <div className="rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Coins Bought</TableHead>
                          <TableHead>Amount (USD)</TableHead>
                          <TableHead>Store Transaction ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPurchases.map((purchase) => (
                          <TableRow key={purchase._id}>
                            <TableCell>
                              {purchase.createdAt ? new Date(purchase.createdAt).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell>{formatNumber(purchase.coins)}</TableCell>
                            <TableCell>{formatCurrency(purchase.usd)}</TableCell>
                            <TableCell>{purchase.metadata?.storeTransactionId || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-500">
                      Page {currentPurchasesPage} of {purchasesTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPurchasesPage <= 1}
                        onClick={() => setPurchasesPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPurchasesPage >= purchasesTotalPages}
                        onClick={() => setPurchasesPage((p) => Math.min(purchasesTotalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WithdrawRequestDetails;
