import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { UserPlus, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { iconRecruiterService } from '../services/iconRecruiterService';
import { CreateUserDialog } from '../components/CreateUserDialog';

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (v === 'accepted') return <Badge className="bg-emerald-600">Accepted</Badge>;
  if (v === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  if (v === 'none' || !v) return <Badge variant="outline">Not applied</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

const IconRecruiterApplications = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalUsers: 0,
  });
  const [busyId, setBusyId] = useState(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await iconRecruiterService.getApplications({
          page,
          limit: 15,
          status: statusFilter,
          search: search || undefined,
        });
        setUsers(result.users || []);
        setPagination({
          current: result.pagination?.current || 1,
          total: result.pagination?.total || 1,
          totalUsers: result.pagination?.totalUsers ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load icon recruiter applications');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleAccept = async (user) => {
    const id = user._id || user.id;
    if (!id) return;
    try {
      setBusyId(id);
      await iconRecruiterService.reviewApplication(id, {
        iconRecruiterStatus: 'accepted',
        iconRecruiterActive: true,
      });
      toast.success('Recruiter accepted and activated');
      fetchUsers(pagination.current);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (user) => {
    const id = user._id || user.id;
    if (!id) return;
    try {
      setBusyId(id);
      await iconRecruiterService.reviewApplication(id, {
        iconRecruiterStatus: 'rejected',
        iconRecruiterActive: false,
      });
      toast.success('Application rejected');
      fetchUsers(pagination.current);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user, checked) => {
    const id = user._id || user.id;
    if (!id) return;
    try {
      setBusyId(id);
      await iconRecruiterService.reviewApplication(id, {
        iconRecruiterActive: checked,
      });
      toast.success(checked ? 'Recruiter active' : 'Recruiter paused');
      fetchUsers(pagination.current);
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
            <UserPlus className="h-7 w-7 text-rose-600" />
            Icon Recruiter
          </h1>
          <p className="text-muted-foreground mt-1">
            Review sponsored-icon applications to become recruiters. Approved recruiters can invite new hosts (48h window).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRegisterDialogOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Register User
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.current)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Only sponsored icons can apply. Accept to unlock host invites; they earn 5% of host cashouts for 18 months.
            Register new users here so recruiters can invite them within the 48-hour window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'rejected', label: 'Rejected' },
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
                placeholder="Search name or email…"
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
                  <TableHead>Sponsored</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {search
                        ? 'No users matched that name or email'
                        : 'No applications found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const id = user._id || user.id;
                    const busy = busyId === id;
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <div className="font-medium">{user.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username || '—'} · {user.email || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.sponsoredStatus === 'accepted' && user.sponsoredActive !== false ? (
                            <Badge className="bg-violet-600">Sponsored</Badge>
                          ) : (
                            <Badge variant="outline">{user.sponsoredStatus || '—'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(user.iconRecruiterStatus)}</TableCell>
                        <TableCell>
                          {user.iconRecruiterStatus === 'accepted' ? (
                            <Switch
                              checked={!!user.iconRecruiterActive}
                              disabled={busy}
                              onCheckedChange={(c) => handleToggleActive(user, c)}
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          ${Number(user.iconRecruiterEarningsUsd || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {user.iconRecruiterStatus === 'pending' && (
                            <>
                              <Button size="sm" disabled={busy} onClick={() => handleAccept(user)}>
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => handleReject(user)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {user.iconRecruiterStatus === 'rejected' && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => handleAccept(user)}>
                              Accept
                            </Button>
                          )}
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
              Page {pagination.current} of {pagination.total} · {pagination.totalUsers} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current <= 1 || loading}
                onClick={() => fetchUsers(pagination.current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current >= pagination.total || loading}
                onClick={() => fetchUsers(pagination.current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog
        isOpen={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        variant="icon-recruiter-verified"
        onUserCreated={(user) => {
          toast.info(
            `${user?.name || user?.email || 'User'} is verified. Recruiters can invite within 48 hours.`,
            { duration: 8000 }
          );
        }}
      />
    </div>
  );
};

export default IconRecruiterApplications;
