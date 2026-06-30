import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useListQueryState } from '../hooks/useListQueryState';
import { useNavigateWithReturn } from '../hooks/useListNavigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectItem } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import payoutAnalyticsService from '../services/payoutAnalyticsService';

const SORT_OPTIONS = [
  { value: 'rubies|desc', label: 'Wallet rubies (high → low)' },
  { value: 'rubies|asc', label: 'Wallet rubies (low → high)' },
  { value: 'lifetimeRubies|desc', label: 'Lifetime rubies (high → low)' },
  { value: 'lifetimeRubies|asc', label: 'Lifetime rubies (low → high)' },
  { value: 'name|asc', label: 'Name (A–Z)' },
  { value: 'name|desc', label: 'Name (Z–A)' },
  { value: 'username|asc', label: 'Username (A–Z)' },
  { value: 'username|desc', label: 'Username (Z–A)' },
  { value: 'email|asc', label: 'Email (A–Z)' },
  { value: 'email|desc', label: 'Email (Z–A)' },
  { value: 'createdAt|desc', label: 'Account created (newest)' },
  { value: 'createdAt|asc', label: 'Account created (oldest)' },
];

const StreamerRubiesList = () => {
  const { params, setQuery } = useListQueryState({ filterKeys: ['search', 'sort'] });
  const navigateWithReturn = useNavigateWithReturn();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState(params.search);
  const sortOption = params.sort || 'rubies|desc';
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
  });

  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

  const fetchData = async (page = 1, q = search, sortKey = sortOption) => {
    try {
      setLoading(true);
      const [sortBy, sortOrder] = String(sortKey).split('|');
      const data = await payoutAnalyticsService.getStreamers({
        page,
        limit: 20,
        search: q?.trim() || undefined,
        sortBy,
        sortOrder,
      });
      setRows(data.streamers || []);
      const p = data.pagination || {};
      setPagination({
        page: Number(p.page) || 1,
        limit: Number(p.limit) || 20,
        totalCount: Number(p.totalCount) || 0,
        totalPages: Number(p.totalPages) || 1,
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load streamers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch(params.search);
  }, [params.search]);

  useEffect(() => {
    fetchData(params.page, params.search, sortOption);
  }, [params.page, params.search, sortOption]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setQuery({ page: 1, search: search.trim(), sort: sortOption });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Streamers & rubies</h1>
        <p className="text-gray-600 mt-1">
          All streamers with wallet rubies and earnings from completed streams. Open details to paginate
          streams, see gifters, and remove individual gifts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Streamer directory</CardTitle>
          <CardDescription>
            Search by name, username, or email. Sort is applied on the server before pagination.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              className="sm:flex-1"
              placeholder="Search streamers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="w-full sm:w-64">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sort by</label>
              <Select
                value={sortOption}
                onValueChange={(v) => setQuery({ page: 1, sort: v, search: params.search })}
                placeholder="Sort…"
              >
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Streamer</TableHead>
                      <TableHead>Wallet rubies</TableHead>
                      <TableHead>Lifetime rubies</TableHead>
                      <TableHead>Rubies (streams)</TableHead>
                      <TableHead>Streams</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          No streamers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const u = row.user || {};
                        const sid = u._id;
                        const sum = row.summary || {};
                        return (
                          <TableRow key={String(sid)}>
                            <TableCell>
                              <div className="font-medium">{u.name || u.username || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{u.email || '—'}</div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatNumber(u.rubies)}</TableCell>
                            <TableCell>{formatNumber(u.lifetimeRubies)}</TableCell>
                            <TableCell>{formatNumber(sum.totalRubiesFromStreams)}</TableCell>
                            <TableCell>{formatNumber(sum.streamsCount)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigateWithReturn(`/streamers-rubies/${sid}`)}
                              >
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} — {formatNumber(pagination.totalCount)}{' '}
                  streamers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setQuery({ page: pagination.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setQuery({ page: pagination.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamerRubiesList;
