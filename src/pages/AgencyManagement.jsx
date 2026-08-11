import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Building2, Search, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { agencyAdminService } from '../services/agencyAdminService';

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (v === 'approved') return <Badge className="bg-emerald-600">Active</Badge>;
  if (v === 'suspended') return <Badge className="bg-amber-600">Suspended</Badge>;
  if (v === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">{s || '—'}</Badge>;
};

const AgencyManagement = () => {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalAgencies: 0,
  });

  const fetchAgencies = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await agencyAdminService.listAgencies({
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
        toast.error('Failed to load agencies');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    fetchAgencies(1);
  }, [fetchAgencies]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'pending', label: 'Pending' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-teal-700" />
            Agencies
          </h1>
          <p className="text-muted-foreground mt-1">
            View, search, and manage agencies — suspend or reactivate as needed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAgencies(pagination.current)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Agency directory</CardTitle>
          <CardDescription>
            {pagination.totalAgencies} agencies · click a row for details, wallet, withdrawals, and audit logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={statusFilter === f.key ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <form onSubmit={onSearchSubmit} className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search name or owner…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Recruiters</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : agencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No agencies found
                    </TableCell>
                  </TableRow>
                ) : (
                  agencies.map((agency) => {
                    const id = agency._id || agency.id;
                    const owner = agency.owner || {};
                    return (
                      <TableRow
                        key={id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`/agencies/${id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{agency.name}</div>
                          {agency.description ? (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
                              {agency.description}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{owner.name || owner.username || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {owner.email || owner.username || ''}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(agency.status)}</TableCell>
                        <TableCell className="text-right">{agency.memberCount ?? 0}</TableCell>
                        <TableCell className="text-right">{agency.recruiterCount ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {agency.createdAt
                            ? new Date(agency.createdAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/agencies/${id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {pagination.current} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading || pagination.current <= 1}
                onClick={() => fetchAgencies(pagination.current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || pagination.current >= pagination.total}
                onClick={() => fetchAgencies(pagination.current + 1)}
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

export default AgencyManagement;
