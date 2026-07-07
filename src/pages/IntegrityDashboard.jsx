import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import integrityService from '../services/integrityService';
import IntegritySubNav from '../components/integrity/IntegritySubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const FLAG_OPTIONS = [
  '',
  'BALANCE_DRIFT',
  'LIFETIME_DRIFT',
  'MYSTERY_BUG_ROW',
  'DUPLICATE_PENDING_WITHDRAW',
  'ADMIN_TRANSFER',
];

const CONFIDENCE_STYLES = {
  GREEN: 'bg-green-100 text-green-800 border-green-200',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-200',
  RED: 'bg-red-100 text-red-800 border-red-200',
};

const fmtNum = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

export default function IntegrityDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [history, setHistory] = useState([]);
  const [flagFilter, setFlagFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadAll = async (pageNum = page, flag = flagFilter, confidence = confidenceFilter) => {
    try {
      setLoading(true);
      const [summaryData, usersData, historyData] = await Promise.all([
        integrityService.getSummary(),
        integrityService.getFlaggedUsers({
          page: pageNum,
          limit: 20,
          flag: flag || undefined,
          confidence: confidence || undefined,
        }),
        integrityService.getHistory(30),
      ]);
      setSummary(summaryData);
      setFlagged(usersData.users || []);
      setPagination(usersData.pagination || { page: 1, totalPages: 1, totalCount: 0 });
      setHistory(historyData.snapshots || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load integrity dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(1, flagFilter, confidenceFilter);
    setPage(1);
  }, [flagFilter, confidenceFilter]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    loadAll(nextPage, flagFilter, confidenceFilter);
  };

  const countsByFlag = summary?.countsByFlag || {};

  return (
    <div className="space-y-6">
      <IntegritySubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="size-8 text-amber-600" />
            Integrity
          </h1>
          <p className="text-gray-600 mt-1">
            Fleet-wide wallet drift and flag monitoring — drill down to user Wallet tab.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadAll(page)} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
          Refresh scan
        </Button>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Users scanned</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{fmtNum(summary?.totalScanned)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Flagged users</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-rose-700">
                  {fmtNum(summary?.totalFlagged)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>RED confidence</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-red-700">
                  {fmtNum(summary?.countsByConfidence?.RED)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>GREEN (no flags)</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-green-700">
                  {fmtNum(summary?.countsByConfidence?.GREEN)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flags today</CardTitle>
                <CardDescription>
                  Audit v{summary?.auditVersion || '—'} · scanned {fmtDate(summary?.scannedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!Object.keys(countsByFlag).length ? (
                  <p className="text-sm text-muted-foreground">No flags detected.</p>
                ) : (
                  <ul className="space-y-2">
                    {Object.entries(countsByFlag)
                      .sort((a, b) => b[1] - a[1])
                      .map(([flag, count]) => (
                        <li key={flag} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                          <span className="font-mono">{flag}</span>
                          <Badge variant="outline">{count}</Badge>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily trend (snapshots)</CardTitle>
                <CardDescription>
                  Run <code className="text-xs">node scripts/snapshot-integrity-daily.js</code> nightly
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!history.length ? (
                  <p className="text-sm text-muted-foreground">No daily snapshots yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map((row) => (
                      <li
                        key={row.runDate}
                        className="flex items-center justify-between text-sm border rounded px-3 py-2"
                      >
                        <span>{row.runDate}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.totalFlagged} flagged / {row.totalScanned} scanned
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Flagged users</CardTitle>
                <CardDescription>Click a user to open Wallet + Ledger audit</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded border px-2 py-1.5 text-sm"
                  value={flagFilter}
                  onChange={(e) => setFlagFilter(e.target.value)}
                >
                  {FLAG_OPTIONS.map((f) => (
                    <option key={f || 'all'} value={f}>
                      {f || 'All flags'}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border px-2 py-1.5 text-sm"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                >
                  <option value="">All confidence</option>
                  <option value="RED">RED</option>
                  <option value="YELLOW">YELLOW</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Rubies</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagged.length ? (
                    flagged.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>
                          <p className="font-medium">{row.user?.name || row.user?.username || '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CONFIDENCE_STYLES[row.confidence] || ''}>
                            {row.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(row.flags || []).map((f) => (
                              <Badge key={f.id} variant="secondary" className="text-xs font-mono">
                                {f.id}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtNum(row.user?.rubies)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/users/${row.userId}?tab=wallet`}>Open user</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No flagged users match filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} users)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
