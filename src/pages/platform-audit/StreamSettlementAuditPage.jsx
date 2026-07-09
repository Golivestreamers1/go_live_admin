import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const STATUS_ROW_CLASS = {
  missing: 'bg-red-50/60',
  duplicate: 'bg-red-50/60',
  incorrect: 'bg-amber-50/60',
};

const StreamSettlementAuditPage = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [settlementStatus, setSettlementStatus] = useState('all');
  const [selectedStream, setSelectedStream] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const streamId = params.get('streamId');
    if (!streamId) return;

    platformAuditService
      .getStreamSettlementDetail(streamId)
      .then(setSelectedStream)
      .catch((err) => console.error('Failed to load stream from alert link:', err));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (settlementStatus !== 'all') params.settlementStatus = settlementStatus;

      const result = await platformAuditService.getStreamSettlements(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load stream settlement audit:', err);
      setError('Failed to load stream settlement audit data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, page, settlementStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to, settlementStatus]);

  const openDetail = async (row) => {
    try {
      const detail = await platformAuditService.getStreamSettlementDetail(row.streamId);
      setSelectedStream(detail);
    } catch (err) {
      console.error('Failed to load stream settlement detail:', err);
      setSelectedStream(row);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <Button className="mt-3" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  const summary = data?.summary ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only stream settlement verification — compares ended streams against
          stream_earnings ledger rows. Does not modify streams or balances.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PlatformAuditMetricCard title="Ended streams" value={formatNumber(summary.total)} loading={loading} />
        <PlatformAuditMetricCard title="Settled" value={formatNumber(summary.settled)} status="pass" loading={loading} />
        <PlatformAuditMetricCard title="Missing" value={formatNumber(summary.missing)} status="failed" loading={loading} />
        <PlatformAuditMetricCard title="Duplicate" value={formatNumber(summary.duplicate)} status="critical" loading={loading} />
        <PlatformAuditMetricCard title="Incorrect" value={formatNumber(summary.incorrect)} status="warning" loading={loading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Settlement status</label>
            <Select value={settlementStatus} onValueChange={setSettlementStatus}>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="settled">Settled only</SelectItem>
              <SelectItem value="missing">Missing only</SelectItem>
              <SelectItem value="duplicate">Duplicate only</SelectItem>
              <SelectItem value="incorrect">Incorrect only</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stream settlements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading stream settlements…</p>
          ) : (data?.settlements ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No ended streams match these filters.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stream</TableHead>
                      <TableHead>Streamer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Coins</TableHead>
                      <TableHead className="text-right">Expected rubies</TableHead>
                      <TableHead className="text-right">Actual rubies</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.settlements.map((row) => (
                      <TableRow
                        key={row.id}
                        className={`cursor-pointer ${STATUS_ROW_CLASS[row.settlementStatus] ?? ''}`}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>
                          <p className="font-mono text-xs">{row.streamId.slice(-8)}</p>
                          <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {row.title || 'Untitled stream'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.streamer?.username ?? row.streamer?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{row.streamer?.email ?? ''}</p>
                        </TableCell>
                        <TableCell>
                          <AuditStatusBadge status={row.settlementStatus} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(row.totalCoins)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.expectedRubies)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.actualRubies)}</TableCell>
                        <TableCell className="text-xs">{formatDateTime(row.endedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data.pagination?.totalPages > 1 ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} ·{' '}
                    {formatNumber(data.pagination.total)} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedStream)} onOpenChange={(open) => !open && setSelectedStream(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Stream settlement detail</DialogTitle>
          </DialogHeader>
          {selectedStream ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AuditStatusBadge status={selectedStream.settlementStatus} />
                {selectedStream.streamDetailPath ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={selectedStream.streamDetailPath}>
                      Open stream detail
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Stream ID</span>
                  <p className="font-mono text-xs break-all">{selectedStream.streamId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Streamer</span>
                  <p>{selectedStream.streamer?.username ?? selectedStream.streamer?.name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Coins received</span>
                  <p>{formatNumber(selectedStream.totalCoins)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected / actual rubies</span>
                  <p>
                    {formatNumber(selectedStream.expectedRubies)} / {formatNumber(selectedStream.actualRubies)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ended</span>
                  <p>{formatDateTime(selectedStream.endedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ledger transactions</span>
                  <p>{selectedStream.earningsTxnCount ?? selectedStream.earningsTransactions?.length ?? 0}</p>
                </div>
              </div>

              {(selectedStream.issues ?? []).length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="mb-1 font-medium">Issues detected</p>
                  <ul className="list-disc pl-5">
                    {selectedStream.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedStream.earningsRecord ? (
                <div>
                  <p className="mb-2 font-medium">StreamEarnings record</p>
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedStream.earningsRecord, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">No StreamEarnings record found.</p>
              )}

              {(selectedStream.earningsTransactions ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">stream_earnings transactions</p>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedStream.earningsTransactions, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

StreamSettlementAuditPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default StreamSettlementAuditPage;
