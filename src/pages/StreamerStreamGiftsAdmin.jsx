import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useListBack, useNavigateWithReturn } from '../hooks/useListNavigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import payoutAnalyticsService from '../services/payoutAnalyticsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

/** Stream gifting admin for a single stream (from Streamers & rubies hub). */
const StreamerStreamGiftsAdmin = () => {
  const { streamerId, streamId } = useParams();
  const goBack = useListBack(streamerId ? `/streamers-rubies/${streamerId}` : '/streamers-rubies');
  const navigateWithReturn = useNavigateWithReturn();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rejectingGiftId, setRejectingGiftId] = useState(null);
  const [rejectingSelectedGifters, setRejectingSelectedGifters] = useState(false);
  const [selectedGifters, setSelectedGifters] = useState([]);
  const [giftersPage, setGiftersPage] = useState(1);
  const GIFTERS_PAGE_SIZE = 10;

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const allGifters = data?.gifters || [];
  const giftersTotalPages = Math.max(1, Math.ceil(allGifters.length / GIFTERS_PAGE_SIZE));
  const currentGiftersPage = Math.min(giftersPage, giftersTotalPages);
  const paginatedGifters = allGifters.slice(
    (currentGiftersPage - 1) * GIFTERS_PAGE_SIZE,
    currentGiftersPage * GIFTERS_PAGE_SIZE,
  );

  const reload = async () => {
    if (!streamId) return;
    const result = await payoutAnalyticsService.getStreamDetails(streamId);
    setData(result);
  };

  useEffect(() => {
    const run = async () => {
      if (!streamId) return;
      try {
        setLoading(true);
        await reload();
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load stream gifting details');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [streamId]);

  const handleRejectGift = async (giftLogId) => {
    const reason = window.prompt('Enter rejection reason for this gift transaction');
    if (!reason || !String(reason).trim()) return;
    try {
      setRejectingGiftId(giftLogId);
      await payoutAnalyticsService.rejectGiftTransaction(giftLogId, String(reason).trim());
      toast.success('Gift transaction rejected successfully');
      await reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject gift transaction');
    } finally {
      setRejectingGiftId(null);
    }
  };

  const toggleGifter = (gifterId) => {
    if (!gifterId) return;
    setSelectedGifters((prev) =>
      prev.includes(gifterId) ? prev.filter((id) => id !== gifterId) : [...prev, gifterId],
    );
  };

  const toggleSelectPageGifters = () => {
    const pageIds = paginatedGifters.map((g) => g.gifter?._id).filter(Boolean);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedGifters.includes(id));
    if (allSelected) {
      setSelectedGifters((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedGifters((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleRejectSelectedGifters = async () => {
    if (!selectedGifters.length) {
      toast.error('Select at least one gifter');
      return;
    }
    const reason = window.prompt(
      'Enter rejection reason. This will reject gifting for selected gifter(s) on this stream.',
    );
    if (!reason || !String(reason).trim()) return;
    try {
      setRejectingSelectedGifters(true);
      await payoutAnalyticsService.rejectStreamGiftTransactionsByGifters(
        streamId,
        selectedGifters,
        String(reason).trim(),
      );
      toast.success('Selected gifter gifting rejected successfully');
      await reload();
      setSelectedGifters([]);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject selected gifter gifting');
    } finally {
      setRejectingSelectedGifters(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stream gifts</h1>
          <p className="text-gray-600 mt-1">Reject individual transactions or selected gifters.</p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to streamer
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">No data found</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.stream?.title || 'Live Stream'}</CardTitle>
              <CardDescription>
                Streamer: {data.stream?.streamer?.name || data.stream?.streamer?.username || 'Unknown'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Coins Received</div>
                <div className="font-semibold">{formatNumber(data.stream?.totalCoinsReceived)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Rubies Earned</div>
                <div className="font-semibold">{formatNumber(data.stream?.streamerRubies)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Total Gifters</div>
                <div className="font-semibold">{formatNumber(data.gifterSummary?.totalGifters)}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-xs text-gray-500">Gift Transactions</div>
                <div className="font-semibold">{formatNumber(data.gifterSummary?.totalGiftTransactions)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Gifters</CardTitle>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!selectedGifters.length || rejectingSelectedGifters}
                  onClick={handleRejectSelectedGifters}
                >
                  {rejectingSelectedGifters
                    ? 'Rejecting…'
                    : `Reject selected (${selectedGifters.length})`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={
                            paginatedGifters.length > 0 &&
                            paginatedGifters
                              .map((g) => g.gifter?._id)
                              .filter(Boolean)
                              .every((gid) => selectedGifters.includes(gid))
                          }
                          onChange={toggleSelectPageGifters}
                        />
                      </TableHead>
                      <TableHead>Gifter</TableHead>
                      <TableHead>Coins Gifted</TableHead>
                      <TableHead>Gift Items</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGifters.length ? (
                      paginatedGifters.map((row) => {
                        const gid = row.gifter?._id ? String(row.gifter._id) : `row-${row.totalCoinsGifted}`;
                        return (
                          <TableRow key={gid}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                disabled={!row.gifter?._id}
                                checked={row.gifter?._id ? selectedGifters.includes(String(row.gifter._id)) : false}
                                onChange={() => toggleGifter(String(row.gifter._id))}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {row.gifter?.name || row.gifter?.username || 'Unknown'}
                                {row.gifter?.deleted ? (
                                  <span className="ml-2 text-xs text-amber-600">(deleted)</span>
                                ) : null}
                              </div>
                              <div className="text-xs text-gray-500">{row.gifter?.email || '—'}</div>
                            </TableCell>
                            <TableCell>{formatNumber(row.totalCoinsGifted)}</TableCell>
                            <TableCell>{formatNumber(row.totalGiftItems)}</TableCell>
                            <TableCell>{formatNumber(row.giftsTransactionsCount)}</TableCell>
                            <TableCell className="text-right">
                              {row.gifter?._id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    navigateWithReturn(
                                      `/withdraw-requests/gifters/${row.gifter._id}?streamId=${streamId}`,
                                    )
                                  }
                                >
                                  Gifter details
                                </Button>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No gifting found for this stream
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  Page {currentGiftersPage} of {giftersTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentGiftersPage <= 1}
                    onClick={() => setGiftersPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentGiftersPage >= giftersTotalPages}
                    onClick={() => setGiftersPage((p) => Math.min(giftersTotalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gift transactions</CardTitle>
              <CardDescription>Remove invalid gifting with a reason (adjusts balances).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gifter</TableHead>
                      <TableHead>Gift</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total coins</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.giftTransactions || []).length ? (
                      (data.giftTransactions || []).map((row) => (
                        <TableRow key={row._id}>
                          <TableCell>
                            <div className="font-medium">
                              {row.sender?.name || row.sender?.username || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">{row.sender?.email || '—'}</div>
                          </TableCell>
                          <TableCell>{row.gift?.name || 'Gift'}</TableCell>
                          <TableCell>{formatNumber(row.quantity)}</TableCell>
                          <TableCell>{formatNumber(row.totalCoins)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                row.status === 'rejected'
                                  ? 'inline-flex px-2 py-0.5 rounded text-xs bg-red-100 text-red-700'
                                  : 'inline-flex px-2 py-0.5 rounded text-xs bg-green-100 text-green-700'
                              }
                            >
                              {row.status === 'rejected' ? 'Rejected' : 'Completed'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.rejectionReason || '—'}>
                            {row.rejectionReason || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={rejectingGiftId === row._id || row.status === 'rejected'}
                              onClick={() => handleRejectGift(row._id)}
                            >
                              {row.status === 'rejected'
                                ? 'Rejected'
                                : rejectingGiftId === row._id
                                  ? 'Rejecting…'
                                  : 'Reject'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No gift transactions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StreamerStreamGiftsAdmin;
