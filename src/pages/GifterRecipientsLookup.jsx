import React, { useEffect, useState } from 'react';
import { Search, Gift, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ReturnLink } from '../components/ReturnLink';
import { useListQueryState } from '../hooks/useListQueryState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import payoutAnalyticsService from '../services/payoutAnalyticsService';

const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

const GifterRecipientsLookup = () => {
  const { params, setQuery } = useListQueryState({ filterKeys: ['email'] });
  const [email, setEmail] = useState(params.email);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    setEmail(params.email);
  }, [params.email]);

  const fetchRecipients = async (page = params.page, emailValue = params.email) => {
    const q = (emailValue || '').trim().toLowerCase();
    if (!q) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      const res = await payoutAnalyticsService.getGifterRecipientsByEmail(q, { page, limit: 20 });
      setData(res);
      if (!res?.recipients?.length) toast.info('No gifting recipients found for this user');
    } catch (err) {
      setData(null);
      toast.error(err?.response?.data?.message || 'Failed to fetch gifting recipients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.email) {
      fetchRecipients(params.page, params.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.email]);

  const handleSearch = (e) => {
    e?.preventDefault();
    const q = email.trim().toLowerCase();
    if (!q) {
      toast.error('Enter a user email to search');
      return;
    }
    setQuery({ page: 1, email: q });
  };

  const gifter = data?.gifter;
  const summary = data?.summary || {};
  const recipients = data?.recipients || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gifter Recipients</h1>
        <p className="text-gray-600 mt-1">
          Enter a user&apos;s email to see everyone they have gifted during live streams.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search by email
          </CardTitle>
          <CardDescription>Look up live stream coin gifts sent by this user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sm:max-w-md"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {gifter && (
        <Card>
          <CardHeader>
            <CardTitle>{gifter.name || gifter.username || 'Gifter'}</CardTitle>
            <CardDescription>{gifter.email || '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Unique recipients</div>
                <div className="font-semibold">{fmtNum(summary.recipientsCount)}</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Total coins gifted</div>
                <div className="font-semibold">{fmtNum(summary.totalCoinsGifted)}</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Gift items</div>
                <div className="font-semibold">{fmtNum(summary.totalGiftItems)}</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs text-gray-500">Transactions</div>
                <div className="font-semibold">{fmtNum(summary.giftTransactionsCount)}</div>
              </div>
            </div>
            <div className="mt-4">
              <ReturnLink
                to={`/withdraw-requests/gifters/${gifter._id}`}
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                View full gifting history
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </ReturnLink>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Recipients
            </CardTitle>
            <CardDescription>
              Users who received gifts from {gifter?.email || 'this gifter'}, sorted by total coins received.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total coins</TableHead>
                    <TableHead>Gift items</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>First gift</TableHead>
                    <TableHead>Last gift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length ? (
                    recipients.map((row) => (
                      <TableRow key={row.recipient?._id || row.recipient?.username}>
                        <TableCell>
                          <div className="font-medium">
                            {row.recipient?.name || row.recipient?.username || 'Unknown'}
                          </div>
                          {row.recipient?.username && (
                            <div className="text-xs text-gray-500">@{row.recipient.username}</div>
                          )}
                          {row.recipient?.deleted && (
                            <div className="text-xs text-amber-600">Deleted account</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {row.recipient?.email || '—'}
                        </TableCell>
                        <TableCell>{fmtNum(row.totalCoinsGifted)}</TableCell>
                        <TableCell>{fmtNum(row.totalGiftItems)}</TableCell>
                        <TableCell>{fmtNum(row.giftTransactionsCount)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(row.firstGiftAt)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(row.lastGiftAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                        No recipients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} ({fmtNum(pagination.totalCount)} recipients)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || pagination.page <= 1}
                    onClick={() => setQuery({ page: pagination.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || pagination.page >= pagination.totalPages}
                    onClick={() => setQuery({ page: pagination.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GifterRecipientsLookup;
