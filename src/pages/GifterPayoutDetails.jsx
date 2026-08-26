import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useListBack } from "../hooks/useListNavigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import payoutAnalyticsService from "../services/payoutAnalyticsService";

const GifterPayoutDetails = () => {
  const { gifterId } = useParams();
  const goBack = useListBack("/gifter-recipients");
  const [searchParams] = useSearchParams();
  const streamId = searchParams.get("streamId") || "";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const formatUsd = (value) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const response = await payoutAnalyticsService.getGifterDetails(gifterId, {
        page,
        limit: 20,
        ...(streamId ? { streamId } : {}),
      });
      setData(response);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch gifter details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [gifterId, streamId]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gifter Details</h1>
          <p className="text-gray-600 mt-1">
            {streamId
              ? "Showing gifting done by this user for the selected stream."
              : "Detailed gifting and coin purchase history of this user."}
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center">Loading...</CardContent>
        </Card>
      ) : !data ? null : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.gifter?.name || data.gifter?.username || "Gifter"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">{data.gifter?.email || "-"}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">Coins Gifted</div>
                  <div className="font-semibold">{formatNumber(data.summary?.totalCoinsGifted)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">Gift Transactions</div>
                  <div className="font-semibold">{formatNumber(data.summary?.giftTransactionsCount)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">Purchase USD</div>
                  <div className="font-semibold">{formatUsd(data.summary?.totalPurchasedUsd)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">Purchased Coins</div>
                  <div className="font-semibold">{formatNumber(data.summary?.totalPurchasedCoins)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gifting History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Receiver</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead>Gift Qty</TableHead>
                      <TableHead>Coins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.giftingHistory?.length ? (
                      data.giftingHistory.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell>{new Date(row.giftedAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {row.receiver?.name || row.receiver?.username || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">{row.receiver?.email || "-"}</div>
                          </TableCell>
                          <TableCell>{row.streamTitle || "Live Stream"}</TableCell>
                          <TableCell>{formatNumber(row.quantity)}</TableCell>
                          <TableCell>{formatNumber(row.totalCoins)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No gifting history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between mt-4">
                <span className="text-sm text-gray-500">
                  Page {data.giftingPagination?.page || 1} of {data.giftingPagination?.totalPages || 1}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(data.giftingPagination?.page || 1) <= 1}
                    onClick={() => fetchData((data.giftingPagination?.page || 1) - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      (data.giftingPagination?.page || 1) >= (data.giftingPagination?.totalPages || 1)
                    }
                    onClick={() => fetchData((data.giftingPagination?.page || 1) + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Coin Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Coins</TableHead>
                      <TableHead>USD</TableHead>
                      <TableHead>Store Txn ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentPurchases?.length ? (
                      data.recentPurchases.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{formatNumber(row.coins)}</TableCell>
                          <TableCell>{formatUsd(row.usd)}</TableCell>
                          <TableCell>{row.metadata?.storeTransactionId || "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No purchase history found
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

export default GifterPayoutDetails;
