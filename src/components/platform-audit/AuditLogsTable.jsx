import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import AuditStatusBadge from './AuditStatusBadge';
import SectionDetailLink from './SectionDetailLink';
import { formatDateTime } from './formatters';

const SOURCE_LABELS = {
  reconciliation: 'Reconciliation',
  integrity: 'Integrity scan',
  admin: 'Admin action',
};

const AuditLogsTable = ({ data, loading, detailHref, detailLabel }) => {
  const logs = data?.logs ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Recent Audit Logs</CardTitle>
          {!loading && detailHref ? (
            <SectionDetailLink href={detailHref} label={detailLabel} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading audit logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs in this range.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(log.occurredAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {SOURCE_LABELS[log.source] ?? log.source}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">{log.title}</p>
                      <p className="text-xs text-muted-foreground">{log.description}</p>
                    </TableCell>
                    <TableCell>
                      {log.severity ? (
                        <AuditStatusBadge
                          status={
                            log.severity === 'GREEN'
                              ? 'pass'
                              : log.severity === 'YELLOW'
                                ? 'warning'
                                : log.severity === 'RED'
                                  ? 'critical'
                                  : null
                          }
                        />
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
  );
};

AuditLogsTable.propTypes = {
  data: PropTypes.object,
  loading: PropTypes.bool,
  detailHref: PropTypes.string,
  detailLabel: PropTypes.string,
};

export default AuditLogsTable;
