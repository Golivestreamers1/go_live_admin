import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, Plus, RefreshCw, Search, ShieldOff, AlertTriangle } from 'lucide-react';
import { ipBanService } from '../services/ipBanService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

const IpBans = () => {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [addOpen, setAddOpen] = useState(false);
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [liftTarget, setLiftTarget] = useState(null);
  const [lifting, setLifting] = useState(false);

  const fetchBans = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await ipBanService.list({ page, limit: 20, q });
      setBans(data.bans || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load IP bans');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchBans(1);
  }, [fetchBans]);

  const runLookup = async () => {
    if (!ip.trim()) return;
    try {
      setLookingUp(true);
      const data = await ipBanService.lookup(ip.trim());
      setLookup(data);
    } catch (e) {
      setLookup(null);
      toast.error(e?.response?.data?.message || 'Lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const handleCreate = async () => {
    if (!ip.trim()) {
      toast.error('Enter an IP address');
      return;
    }
    try {
      setSaving(true);
      const payload = { ip: ip.trim(), reason: reason.trim() };
      if (duration !== 'permanent') payload.durationDays = Number(duration);
      await ipBanService.create(payload);
      toast.success(`Banned ${ip.trim()}`);
      setAddOpen(false);
      setIp('');
      setReason('');
      setDuration('permanent');
      setLookup(null);
      fetchBans(1);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to ban IP');
    } finally {
      setSaving(false);
    }
  };

  const handleLift = async () => {
    if (!liftTarget?._id) return;
    try {
      setLifting(true);
      await ipBanService.lift(liftTarget._id);
      toast.success(`Lifted ban on ${liftTarget.ip}`);
      setLiftTarget(null);
      fetchBans(pagination.page);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to lift ban');
    } finally {
      setLifting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IP Bans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Block login, signup, API, and sockets from a client IP. Mobile carriers may share IPs — check lookup before banning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchBans(pagination.page)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ban IP
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Filter by IP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchBans(1);
              }}
            />
          </div>
          <Button variant="secondary" onClick={() => fetchBans(1)}>Search</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-4 w-4" />
            Active bans
          </CardTitle>
          <CardDescription>{pagination.total} total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : bans.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No active IP bans.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bans.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="font-mono text-sm">{b.ip}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                      {b.reason || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.createdBy?.name || b.createdBy?.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(b.createdAt)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {b.expiresAt ? fmtDate(b.expiresAt) : <Badge variant="destructive">Permanent</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLiftTarget(b)}
                      >
                        <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                        Lift
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchBans(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchBans(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add ban */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setAddOpen(open);
            if (!open) {
              setLookup(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ban IP address</DialogTitle>
            <DialogDescription>
              Blocks this network from the app API and sockets. Admin panel stays reachable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 203.0.113.42"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="font-mono"
              />
              <Button type="button" variant="secondary" onClick={runLookup} disabled={lookingUp || !ip.trim()}>
                {lookingUp ? '…' : 'Lookup'}
              </Button>
            </div>
            {lookup ? (
              <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-950">
                <div className="mb-1 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {lookup.userCount} user(s) with this last-login IP · {lookup.sessionCount} session(s)
                </div>
                {lookup.isBanned ? (
                  <p className="text-xs">This IP is already banned.</p>
                ) : null}
                {lookup.users?.length ? (
                  <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs">
                    {lookup.users.slice(0, 10).map((u) => (
                      <li key={u._id}>
                        <Link className="underline" to={`/users/${u._id}`} onClick={() => setAddOpen(false)}>
                          {u.name || u.username || u.email}
                        </Link>
                        {u.email ? ` · ${u.email}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No matching users found for this IP.</p>
                )}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
              <Textarea
                rows={3}
                placeholder="e.g. Sexual content / spam farm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={handleCreate}>
              {saving ? 'Banning…' : 'Ban IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift ban */}
      <Dialog open={Boolean(liftTarget)} onOpenChange={(o) => !lifting && !o && setLiftTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift IP ban?</DialogTitle>
            <DialogDescription>
              Allow <span className="font-mono font-medium">{liftTarget?.ip}</span> to use the app again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={lifting} onClick={() => setLiftTarget(null)}>Cancel</Button>
            <Button disabled={lifting} onClick={handleLift}>
              {lifting ? 'Lifting…' : 'Lift ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IpBans;
