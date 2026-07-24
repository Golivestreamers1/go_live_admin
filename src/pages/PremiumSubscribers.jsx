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
import { Crown, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { premiumSubscribersService } from '../services/premiumSubscribersService';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const platformBadge = (p) => {
  const v = (p || '').toLowerCase();
  if (v === 'google') return <Badge className="bg-emerald-600">Google Play</Badge>;
  if (v === 'apple') return <Badge className="bg-slate-800">App Store</Badge>;
  return <Badge variant="outline">—</Badge>;
};

const PremiumSubscribers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stats, setStats] = useState({ activeTotal: 0, everTotal: 0 });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalUsers: 0,
  });

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await premiumSubscribersService.getPremiumSubscribers({
          page,
          limit: 15,
          status: statusFilter,
          search: search || undefined,
        });
        setUsers(result.users || []);
        setStats({
          activeTotal: result.stats?.activeTotal ?? 0,
          everTotal: result.stats?.everTotal ?? 0,
        });
        setPagination({
          current: result.pagination?.current || 1,
          total: result.pagination?.total || 1,
          totalUsers: result.pagination?.totalUsers ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load premium subscribers');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" />
            Premium subscribers
          </h1>
          <p className="text-muted-foreground mt-1">
            Users who purchased the Premium monthly subscription via Google Play or the App Store.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(pagination.current)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Currently active</CardDescription>
            <CardTitle className="text-3xl">{stats.activeTotal}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ever subscribed</CardDescription>
            <CardTitle className="text-3xl">{stats.everTotal}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Subscribers</CardTitle>
          <CardDescription>
            Only users with at least one completed Premium purchase appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'expired', label: 'Expired' },
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
                placeholder="Search name, username or email…"
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
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Auto-renew</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No premium subscribers for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const id = u._id || u.id;
                    const p = u.premium || {};
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <div className="font-medium">{u.name || u.username || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.email || (u.username ? `@${u.username}` : '—')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.active ? (
                            <Badge className="bg-emerald-600">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                        </TableCell>
                        <TableCell>{platformBadge(p.platform)}</TableCell>
                        <TableCell>
                          <div className="text-sm">{p.productId || '—'}</div>
                          {p.basePlanId ? (
                            <div className="text-xs text-muted-foreground">{p.basePlanId}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{fmtDate(p.subscribedAt)}</TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(p.expiresAt)}
                          {p.cancelledAt ? (
                            <div className="text-xs text-destructive">
                              cancelled {fmtDate(p.cancelledAt)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {p.autoRenewing ? (
                            <Badge variant="outline">On</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Off
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.total > 1 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                Page {pagination.current} of {pagination.total} ({pagination.totalUsers} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || pagination.current <= 1}
                  onClick={() => fetchUsers(pagination.current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || pagination.current >= pagination.total}
                  onClick={() => fetchUsers(pagination.current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumSubscribers;
