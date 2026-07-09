import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FileText, Download, RefreshCw } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import { formatDateTime } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const REPORT_TYPES = [
  { value: 'platform-economy', label: 'Platform Economy' },
  { value: 'coin-ledger', label: 'Coin Ledger' },
  { value: 'ruby-ledger', label: 'Ruby Ledger' },
  { value: 'purchase', label: 'Purchase Audit' },
  { value: 'settlement', label: 'Stream Settlement' },
  { value: 'withdrawal', label: 'Withdrawal Audit' },
  { value: 'fraud', label: 'Fraud & Reversals' },
  { value: 'admin-activity', label: 'Admin Activity' },
];

const REPORT_TYPE_LABELS = Object.fromEntries(REPORT_TYPES.map((t) => [t.value, t.label]));

const AuditReportsPage = ({ dateRange }) => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('platform-economy');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 20 };
      if (typeFilter !== 'all') params.type = typeFilter;
      const result = await platformAuditService.listReports(params);
      setReports(result);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load report history');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const payload = { type: reportType };
      if (dateRange?.from) payload.from = dateRange.from;
      if (dateRange?.to) payload.to = dateRange.to;
      await platformAuditService.generateReport(payload);
      setPage(1);
      await loadReports();
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      await platformAuditService.downloadReportCsv(report.id, report.title);
    } catch (err) {
      console.error('Failed to download report:', err);
      setError('Failed to download CSV');
    }
  };

  if (error && !reports) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <Button className="mt-3" onClick={loadReports}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Generate read-only audit reports from existing platform audit aggregators. Reports are
          stored with JSON payloads and downloadable as CSV for Excel or Numbers.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Report type</label>
            <Select value={reportType} onValueChange={setReportType}>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </CardContent>
        {dateRange?.from || dateRange?.to ? (
          <CardContent className="border-t pt-4 text-xs text-muted-foreground">
            Date range: {dateRange.from ? formatDateTime(dateRange.from) : '—'} →{' '}
            {dateRange.to ? formatDateTime(dateRange.to) : '—'}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Report History</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectItem value="all">All types</SelectItem>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={loadReports} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading reports…</p>
          ) : (reports?.reports?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generated</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {report.summary || report.title}
                      </TableCell>
                      <TableCell className="text-sm">{report.rowCount}</TableCell>
                      <TableCell>
                        <AuditStatusBadge
                          status={report.status === 'ready' ? 'pass' : 'failed'}
                        />
                      </TableCell>
                      <TableCell>
                        {report.status === 'ready' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(report)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {reports?.pagination?.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {reports.pagination.page} of {reports.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= reports.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

AuditReportsPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }),
};

export default AuditReportsPage;
