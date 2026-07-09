import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Bell, ExternalLink, RefreshCw, ScrollText } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import ActiveAlertsPanel from '../../components/platform-audit/ActiveAlertsPanel';
import AlertSeverityBadge from '../../components/platform-audit/AlertSeverityBadge';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const STATUS_FILTER_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All statuses' },
];

const LOG_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'reconciliation_run', label: 'Reconciliation' },
  { value: 'integrity_scan', label: 'Integrity scan' },
  { value: 'withdraw_snapshot', label: 'Withdraw snapshot' },
  { value: 'alert_batch', label: 'Alert batch' },
];

const AuditLogsPage = ({ dateRange }) => {
  const [alerts, setAlerts] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState(null);
  const [alertStatus, setAlertStatus] = useState('open');
  const [alertPage, setAlertPage] = useState(1);
  const [logType, setLogType] = useState('all');
  const [logPage, setLogPage] = useState(1);

  const loadAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const params = { page: alertPage, limit: 10 };
      if (alertStatus === 'open') params.status = 'active';
      else if (alertStatus !== 'all') params.status = alertStatus;
      const result = await platformAuditService.getAlerts(params);
      setAlerts(result);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoadingAlerts(false);
    }
  }, [alertPage, alertStatus]);

  const loadLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const params = { page: logPage, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      if (logType !== 'all') params.auditType = logType;
      const result = await platformAuditService.getAuditLogs(params);
      setLogs(result);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [dateRange?.from, dateRange?.to, logPage, logType]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setAlertPage(1);
  }, [alertStatus]);

  useEffect(() => {
    setLogPage(1);
  }, [dateRange?.from, dateRange?.to, logType]);

  const handleResolve = async (alert) => {
    try {
      await platformAuditService.updateAlert(alert.id, { status: 'resolved' });
      await loadAlerts();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const refreshAll = () => {
    setError(null);
    loadAlerts();
    loadLogs();
  };

  const openAlerts = alerts?.alerts ?? [];

  if (error && !alerts && !logs) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <Button className="mt-3" onClick={refreshAll}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <ScrollText className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Immutable audit operation log plus active alerts from reconciliation, fleet scans, stream
          settlements, and refund monitoring. Resolving an alert marks it closed without deleting history.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Alerts</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={alertStatus} onValueChange={setAlertStatus}>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loadingAlerts}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingAlerts ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {alertStatus === 'open' || alertStatus === 'all' ? (
          <ActiveAlertsPanel
            alerts={alertStatus === 'open' ? openAlerts : alerts?.alerts}
            loading={loadingAlerts}
            onResolve={alertStatus === 'open' ? handleResolve : undefined}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              {loadingAlerts ? (
                <p className="text-sm text-muted-foreground">Loading alerts…</p>
              ) : (alerts?.alerts?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts match this filter.</p>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Alert</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <AlertSeverityBadge severity={alert.severity} />
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{alert.title}</p>
                            <p className="text-xs text-muted-foreground">{alert.description}</p>
                          </TableCell>
                          <TableCell>
                            <AuditStatusBadge
                              status={
                                alert.status === 'resolved'
                                  ? 'pass'
                                  : alert.status === 'investigating'
                                    ? 'warning'
                                    : 'critical'
                              }
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDateTime(alert.createdAt)}
                          </TableCell>
                          <TableCell>
                            {alert.investigationLink ? (
                              <Link
                                to={alert.investigationLink}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                Investigate
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {alerts?.pagination?.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page {alerts.pagination.page} of {alerts.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={alertPage <= 1}
                onClick={() => setAlertPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={alertPage >= alerts.pagination.totalPages}
                onClick={() => setAlertPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Audit Operation Logs</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={logType} onValueChange={setLogType}>
                  {LOG_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <p className="text-sm text-muted-foreground">Loading operation logs…</p>
            ) : (logs?.logs?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No operation logs in this range.</p>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(log.executedAt)}
                        </TableCell>
                        <TableCell className="text-xs">{log.auditTypeLabel}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-gray-900">{log.summary}</p>
                          {log.executedBy?.name ? (
                            <p className="text-xs text-muted-foreground">By {log.executedBy.name}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">System</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <AuditStatusBadge
                            status={
                              log.status === 'success'
                                ? 'pass'
                                : log.status === 'warning'
                                  ? 'warning'
                                  : 'critical'
                            }
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.executionTimeMs ? `${log.executionTimeMs} ms` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {logs?.pagination?.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page {logs.pagination.page} of {logs.pagination.totalPages} · {logs.pagination.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={logPage >= logs.pagination.totalPages}
                onClick={() => setLogPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

AuditLogsPage.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }),
};

export default AuditLogsPage;
