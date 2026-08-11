import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Loader2,
  RefreshCw,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
import { agencyAdminService } from '../services/agencyAdminService';

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (v === 'approved') return <Badge className="bg-emerald-600">Active</Badge>;
  if (v === 'suspended') return <Badge className="bg-amber-600">Suspended</Badge>;
  if (v === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  if (v === 'processed') return <Badge className="bg-emerald-600">Processed</Badge>;
  if (v === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  if (v === 'active') return <Badge className="bg-emerald-600">Active</Badge>;
  return <Badge variant="outline">{s || '—'}</Badge>;
};

const AgencyDetails = () => {
  const { agencyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noteDialog, setNoteDialog] = useState({ open: false, mode: null });
  const [note, setNote] = useState('');
  const [withdrawalBusy, setWithdrawalBusy] = useState(null);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agencyAdminService.getAgency(agencyId);
      setDetails(data);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to load agency');
      navigate('/agencies');
    } finally {
      setLoading(false);
    }
  }, [agencyId, navigate]);

  const loadMembers = useCallback(async () => {
    try {
      setTabLoading(true);
      const data = await agencyAdminService.getMembers(agencyId, {
        status: 'all',
        limit: 50,
      });
      setMembers(data.list || []);
    } catch (e) {
      toast.error('Failed to load members');
    } finally {
      setTabLoading(false);
    }
  }, [agencyId]);

  const loadWithdrawals = useCallback(async () => {
    try {
      setTabLoading(true);
      const data = await agencyAdminService.getWithdrawals(agencyId, {
        status: 'all',
        limit: 50,
      });
      setWithdrawals(data.list || []);
    } catch (e) {
      toast.error('Failed to load withdrawals');
    } finally {
      setTabLoading(false);
    }
  }, [agencyId]);

  const loadAudit = useCallback(async () => {
    try {
      setTabLoading(true);
      const data = await agencyAdminService.getAuditLogs(agencyId, { limit: 50 });
      setAuditLogs(data.list || []);
    } catch (e) {
      toast.error('Failed to load audit logs');
    } finally {
      setTabLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const openAction = (mode) => {
    setNote('');
    setNoteDialog({ open: true, mode });
  };

  const confirmStatusAction = async () => {
    try {
      setBusy(true);
      if (noteDialog.mode === 'suspend') {
        await agencyAdminService.suspendAgency(agencyId, { note: note || undefined });
        toast.success('Agency suspended');
      } else {
        await agencyAdminService.reactivateAgency(agencyId, { note: note || undefined });
        toast.success('Agency reactivated');
      }
      setNoteDialog({ open: false, mode: null });
      await loadDetails();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawal = async (row, action) => {
    const id = row._id || row.id;
    if (!id) return;
    try {
      setWithdrawalBusy(id);
      if (action === 'approve') {
        await agencyAdminService.approveWithdrawal(id);
        toast.success('Withdrawal approved');
      } else {
        await agencyAdminService.rejectWithdrawal(id, { remarks: 'Rejected by admin' });
        toast.success('Withdrawal rejected');
      }
      await loadWithdrawals();
      await loadDetails();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Withdrawal update failed');
    } finally {
      setWithdrawalBusy(null);
    }
  };

  if (loading || !details) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading agency…
      </div>
    );
  }

  const agency = details.agency || {};
  const owner = details.owner || agency.owner || {};
  const wallet = details.walletSummary || {};
  const commissions = details.commissionSummary || {};
  const withdrawalsSummary = details.withdrawalSummary || {};
  const status = agency.status || details.currentStatus;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/agencies">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to agencies
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="h-7 w-7 text-teal-700" />
            <h1 className="text-2xl font-bold tracking-tight">{agency.name}</h1>
            {statusBadge(status)}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {agency.description || 'No description'}
          </p>
          <p className="text-sm text-muted-foreground">
            Owner:{' '}
            <span className="font-medium text-foreground">
              {owner.name || owner.username || '—'}
            </span>
            {owner.email ? ` · ${owner.email}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadDetails} disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {status === 'suspended' ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openAction('reactivate')}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
          ) : status !== 'rejected' ? (
            <Button size="sm" variant="destructive" onClick={() => openAction('suspend')}>
              <Ban className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">{details.memberCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recruiters</CardDescription>
            <CardTitle className="text-2xl">{details.recruiterCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available balance</CardDescription>
            <CardTitle className="text-2xl">{money(wallet.availableBalance)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending withdrawals</CardDescription>
            <CardTitle className="text-2xl">
              {money(withdrawalsSummary.pendingAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === 'members' && !members.length) loadMembers();
          if (v === 'withdrawals' && !withdrawals.length) loadWithdrawals();
          if (v === 'audit' && !auditLogs.length) loadAudit();
        }}
      >
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Commission summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">This month</span>
                  <span>{money(commissions.thisMonth?.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last month</span>
                  <span>{money(commissions.lastMonth?.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending commission</span>
                  <span>{money(commissions.pendingCommissionAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifetime (non-reversed)</span>
                  <span>{money(commissions.lifetimeNonReversed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active configs</span>
                  <span>{commissions.activeConfigs ?? 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest audit events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(details.recentActivity || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  (details.recentActivity || []).slice(0, 8).map((row) => (
                    <div key={row._id} className="text-sm border-b last:border-0 pb-2">
                      <div className="font-medium">{row.action}</div>
                      <div className="text-muted-foreground text-xs">
                        {row.description || '—'} ·{' '}
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Members & recruiters</CardTitle>
                <CardDescription>All membership records for this agency</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadMembers} disabled={tabLoading}>
                <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {tabLoading ? 'Loading…' : 'No members'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((m) => {
                        const u = m.recruiterId || {};
                        return (
                          <TableRow key={m._id}>
                            <TableCell>
                              <div className="font-medium">{u.name || u.username || '—'}</div>
                              <div className="text-xs text-muted-foreground">{u.email || ''}</div>
                            </TableCell>
                            <TableCell>{m.memberRole || '—'}</TableCell>
                            <TableCell>{statusBadge(m.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {m.joinedAt || m.createdAt
                                ? new Date(m.joinedAt || m.createdAt).toLocaleDateString()
                                : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
              <CardDescription>
                Status: {wallet.status || '—'} · Agency status: {status}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">{money(wallet.pendingBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-xl font-semibold">{money(wallet.availableBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Withdrawn</p>
                <p className="text-xl font-semibold">{money(wallet.withdrawnBalance)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Withdrawal requests</CardTitle>
                <CardDescription>Approve or reject pending requests</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadWithdrawals} disabled={tabLoading}>
                <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested by</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {tabLoading ? 'Loading…' : 'No withdrawals'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      withdrawals.map((w) => {
                        const id = w._id;
                        const requester = w.requestedBy || {};
                        return (
                          <TableRow key={id}>
                            <TableCell className="font-medium">{money(w.amount)}</TableCell>
                            <TableCell>{statusBadge(w.status)}</TableCell>
                            <TableCell>{requester.name || requester.username || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {w.createdAt ? new Date(w.createdAt).toLocaleString() : '—'}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {w.status === 'pending' ? (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={withdrawalBusy === id}
                                    onClick={() => handleWithdrawal(w, 'approve')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={withdrawalBusy === id}
                                    onClick={() => handleWithdrawal(w, 'reject')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Audit logs</CardTitle>
                <CardDescription>Append-only history of agency actions</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadAudit} disabled={tabLoading}>
                <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {tabLoading ? 'Loading…' : 'No audit logs'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((row) => {
                        const actor = row.actorId || {};
                        return (
                          <TableRow key={row._id}>
                            <TableCell>
                              <div className="font-medium">{row.action}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.description || ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              {actor.name || actor.username || row.actorRole || '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.resourceType || '—'}
                              {row.resourceId ? ` · ${String(row.resourceId).slice(-6)}` : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => !busy && setNoteDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteDialog.mode === 'suspend' ? 'Suspend agency' : 'Reactivate agency'}
            </DialogTitle>
            <DialogDescription>
              {noteDialog.mode === 'suspend'
                ? 'Members, wallet, ledger, and audit history are preserved. Normal agency operations will be blocked.'
                : 'Restores normal agency operations (status → approved / active).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this action…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setNoteDialog({ open: false, mode: null })}
            >
              Cancel
            </Button>
            <Button
              variant={noteDialog.mode === 'suspend' ? 'destructive' : 'default'}
              disabled={busy}
              onClick={confirmStatusAction}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencyDetails;
