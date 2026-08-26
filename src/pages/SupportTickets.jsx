import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useListQueryState } from '../hooks/useListQueryState';
import { useNavigateWithReturn } from '../hooks/useListNavigation';
import {
  supportService,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  SUPPORT_PRIORITIES,
  categoryLabel,
  statusMeta,
} from '../services/supportService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Search, Inbox, RefreshCw, Filter, Download } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: 'All' },
  ...SUPPORT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

function toneClasses(tone) {
  switch (tone) {
    case 'blue': return 'bg-blue-100 text-blue-800';
    case 'amber': return 'bg-amber-100 text-amber-800';
    case 'purple': return 'bg-purple-100 text-purple-800';
    case 'green': return 'bg-green-100 text-green-800';
    case 'gray':
    default: return 'bg-gray-100 text-gray-700';
  }
}

function priorityClasses(p) {
  if (p === 'urgent') return 'bg-red-100 text-red-800';
  if (p === 'high') return 'bg-orange-100 text-orange-800';
  if (p === 'normal') return 'bg-gray-100 text-gray-700';
  return 'bg-slate-100 text-slate-600';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const SupportTickets = () => {
  const { params, setQuery } = useListQueryState({
    filterKeys: ['status', 'category', 'priority', 'source', 'q'],
  });
  const navigateWithReturn = useNavigateWithReturn();
  const [q, setQ] = useState(params.q);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ open: 0, in_progress: 0, awaiting_user: 0, resolved: 0, closed: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = {
        page: params.page,
        limit: 20,
      };
      if (params.status) query.status = params.status;
      if (params.category) query.category = params.category;
      if (params.priority) query.priority = params.priority;
      if (params.source) query.source = params.source;
      if (params.q) query.q = params.q;
      const [list, counts] = await Promise.all([
        supportService.listTickets(query),
        supportService.getStats(),
      ]);
      setTickets(list.tickets || []);
      setPagination(list.pagination || pagination);
      setStats(counts || stats);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.status, params.category, params.priority, params.source, params.q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== params.q) setQuery({ page: 1, q });
    }, 300);
    return () => clearTimeout(t);
  }, [q, params.q, setQuery]);

  useEffect(() => {
    setQ(params.q);
  }, [params.q]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    try {
      setExporting(true);
      const exportParams = {};
      if (params.status) exportParams.status = params.status;
      if (params.category) exportParams.category = params.category;
      if (params.priority) exportParams.priority = params.priority;
      if (params.source) exportParams.source = params.source;
      if (params.q) exportParams.q = params.q;
      const blob = await supportService.exportCsv(exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Triage and respond to user tickets from web, app, and admin intake.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SUPPORT_STATUSES.map((s) => (
          <Card key={s.value} className="cursor-pointer hover:shadow-md transition" onClick={() => setQuery({ page: 1, status: s.value })}>
            <CardContent className="p-4">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${toneClasses(s.tone)}`}>{s.label}</div>
              <div className="text-2xl font-bold mt-2">{stats[s.value] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((t) => (
              <Button
                key={t.value || 'all'}
                size="sm"
                variant={params.status === t.value ? 'default' : 'outline'}
                onClick={() => setQuery({ page: 1, status: t.value })}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search ticket #, email, subject"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Select value={params.category || 'all'} onValueChange={(v) => setQuery({ page: 1, category: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={params.priority || 'all'} onValueChange={(v) => setQuery({ page: 1, priority: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {SUPPORT_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={params.source || 'all'} onValueChange={(v) => setQuery({ page: 1, source: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {(params.status || params.category || params.priority || params.source || params.q || q) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setQ('');
                setQuery({
                  page: 1,
                  status: '',
                  category: '',
                  priority: '',
                  source: '',
                  q: '',
                });
              }}>
                <Filter className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-3">
              <Inbox className="w-10 h-10 text-gray-300" />
              <div>No tickets match your filters.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => {
                  const s = statusMeta(t.status);
                  const lastUpdate = t.lastAdminReplyAt || t.lastUserReplyAt || t.updatedAt || t.createdAt;
                  return (
                    <TableRow
                      key={t._id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigateWithReturn(`/support/${t._id}`)}
                    >
                      <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                      <TableCell className="max-w-[320px] truncate font-medium">{t.subject}</TableCell>
                      <TableCell>
                        <div className="text-sm">{t.submitterUser?.name || t.name || '—'}</div>
                        <div className="text-xs text-gray-500">{t.email}</div>
                      </TableCell>
                      <TableCell><span className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">{categoryLabel(t.category)}</span></TableCell>
                      <TableCell><span className={`text-xs rounded px-2 py-0.5 ${priorityClasses(t.priority)}`}>{t.priority}</span></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{t.source}</Badge></TableCell>
                      <TableCell><span className={`text-xs rounded px-2 py-0.5 ${toneClasses(s.tone)}`}>{s.label}</span></TableCell>
                      <TableCell className="text-sm text-gray-600">{timeAgo(lastUpdate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setQuery({ page: pagination.page - 1 })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setQuery({ page: pagination.page + 1 })}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
