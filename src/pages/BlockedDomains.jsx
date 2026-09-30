import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Ban, Plus, RefreshCw, Search, ShieldAlert, Trash2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { blockedDomainService } from '../services/blockedDomainService';
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
import { Textarea } from '../components/ui/textarea';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

const BlockedDomains = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, limit: 50, total: 1, totalCount: 0 });

  const [addOpen, setAddOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDomains = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await blockedDomainService.list({ page, limit: 50, query: searchQuery });
      setDomains(data.domains || []);
      setPagination(data.pagination || { current: 1, limit: 50, total: 1, totalCount: 0 });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load blocked domains');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDomains(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchDomains]);

  const handleCreate = async () => {
    const raw = domainInput.trim();
    if (!raw) {
      toast.error('Please enter at least one domain name.');
      return;
    }

    const domainList = raw
      .split(/[\n,\s]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    if (domainList.length === 0) {
      toast.error('Please enter a valid domain name.');
      return;
    }

    try {
      setSaving(true);
      const res = await blockedDomainService.create({
        domains: domainList,
        description: descriptionInput.trim() || 'Added via Admin Panel',
      });

      const addedCount = res?.added?.length || 0;
      const skippedCount = res?.skipped?.length || 0;
      const errorCount = res?.errors?.length || 0;

      let msg = `${addedCount} domain(s) successfully blocked.`;
      if (skippedCount > 0) msg += ` (${skippedCount} already existed)`;
      if (errorCount > 0) msg += ` (${errorCount} invalid format)`;

      toast.success(msg);
      setAddOpen(false);
      setDomainInput('');
      setDescriptionInput('');
      fetchDomains(1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to add blocked domain');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await blockedDomainService.delete(deleteTarget._id);
      toast.success(`Removed @${deleteTarget.domain} from blocklist`);
      setDeleteTarget(null);
      fetchDomains(pagination.current);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to delete blocked domain');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Ban className="h-6 w-6 text-red-500" />
            Blocked Email Domains
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage disposable, spam, or temporary email domains to reject unverified user signups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDomains(pagination.current)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Blocked Domain
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total Blocked Domains</CardDescription>
            <CardTitle className="text-3xl font-bold text-red-500">
              {pagination.totalCount || domains.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Emails from these domains will be rejected during signup
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Bulk Action & Protection</CardDescription>
            <CardTitle className="text-lg font-medium text-foreground">
              Zero-Latency In-Memory Filtering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Domains added here are checked instantly. Supports bulk domain addition (comma or newline separated).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domain (e.g. mailinator.com, tempmail)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Domain</TableHead>
                  <TableHead>Reason / Description</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Added Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading blocked domains...
                    </TableCell>
                  </TableRow>
                ) : domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No blocked domains found.
                    </TableCell>
                  </TableRow>
                ) : (
                  domains.map((item) => (
                    <TableRow key={item._id} className="border-border hover:bg-muted/40">
                      <TableCell className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-red-400" />
                        @{item.domain}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.description || <span className="italic">No description</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.createdBy?.name ? (
                          <Badge variant="outline" className="font-normal text-xs">
                            {item.createdBy.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">System / Admin</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.total > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {pagination.current} of {pagination.total} ({pagination.totalCount} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current <= 1 || loading}
                  onClick={() => fetchDomains(pagination.current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current >= pagination.total || loading}
                  onClick={() => fetchDomains(pagination.current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Ban className="h-5 w-5 text-red-500" />
              Add Blocked Email Domain(s)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter domain name(s) to block. You can paste multiple domains separated by commas or newlines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Domain Name(s) *
              </label>
              <Textarea
                placeholder="tempmail.com&#10;guerrillamail.com, 10minutemail.com"
                rows={4}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="bg-background border-border font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Description / Reason (Optional)
              </label>
              <Input
                placeholder="Disposable provider / spam bot source"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Adding...' : 'Block Domain(s)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unblock Domain
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to remove <span className="font-semibold text-foreground">@{deleteTarget?.domain}</span> from the blocklist? Users with emails from this domain will be allowed to sign up.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Removing...' : 'Unblock & Allow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlockedDomains;
