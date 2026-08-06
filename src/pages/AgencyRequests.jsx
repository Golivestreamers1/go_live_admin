import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Building2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { agencyAdminService } from '../services/agencyAdminService';

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (v === 'approved') return <Badge className="bg-emerald-600">Approved</Badge>;
  if (v === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">{s || '—'}</Badge>;
};

const AgencyRequests = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalAgencies: 0,
  });
  const [busyId, setBusyId] = useState(null);

  const fetchRequests = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await agencyAdminService.getRequests({
          page,
          limit: 15,
          status: statusFilter,
          search: search || undefined,
        });
        setAgencies(result.agencies || []);
        setPagination({
          current: result.pagination?.current || 1,
          total: result.pagination?.total || 1,
          totalAgencies: result.pagination?.totalAgencies ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load agency requests');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const handleReview = async (agency, status) => {
    const id = agency._id || agency.id;
    if (!id) return;
    try {
      setBusyId(id);
      await agencyAdminService.reviewRequest(id, { status });
      toast.success(status === 'approved' ? 'Agency approved' : 'Agency rejected');
      fetchRequests(pagination.current);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-teal-700" />
            Agency requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Review user requests to create an agency. Approve to make the agency live.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRequests(pagination.current)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Users submit name and description from the app. Pending requests need approve or reject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'pending', label: 'Pending' },
                { key: 'approved', label: 'Approved' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'all', label: 'All' },
              ].map((t) => (
                <Button
                  key={t.key}
                  variant={statusFilter === t.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <form onSubmit={onSearchSubmit} className="flex w-full max-w-md gap-2">
              <Input
                placeholder="Search agency, owner name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && agencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : agencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      {search ? 'No requests matched that search' : 'No agency requests found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  agencies.map((a) => {
                    const id = a._id || a.id;
                    const busy = busyId === id;
                    const owner = a.owner || {};
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <div className="font-medium">{a.name}</div>
                          {a.description ? (
                            <div className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                              {a.description}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {owner.name || owner.username || '—'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {owner.email || owner.username || ''}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(a.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {a.createdAt
                            ? new Date(a.createdAt).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {a.status === 'pending' || a.status === 'rejected' ? (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => handleReview(a, 'approved')}
                              >
                                Approve
                              </Button>
                            ) : null}
                            {a.status === 'pending' || a.status === 'approved' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => handleReview(a, 'rejected')}
                              >
                                Reject
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {pagination.totalAgencies} total · page {pagination.current} of{' '}
              {pagination.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || pagination.current <= 1}
                onClick={() => fetchRequests(pagination.current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || pagination.current >= pagination.total}
                onClick={() => fetchRequests(pagination.current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyRequests;
