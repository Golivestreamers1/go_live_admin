import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Bell, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import SectionDetailLink from './SectionDetailLink';
import AlertSeverityBadge from './AlertSeverityBadge';
import AuditStatusBadge from './AuditStatusBadge';
import { formatDateTime } from './formatters';

const ActiveAlertsPanel = ({ alerts, loading, detailHref, detailLabel, onResolve }) => {
  const items = alerts ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Active Alerts</CardTitle>
          </div>
          {!loading && detailHref ? (
            <SectionDetailLink href={detailHref} label={detailLabel} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading alerts…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium text-gray-900">No active alerts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reconciliation failures, fleet RED users, and settlement gaps surface here automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((alert) => (
              <li key={alert.id} className="px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertSeverityBadge severity={alert.severity} />
                      {alert.status && alert.status !== 'open' ? (
                        <AuditStatusBadge status={alert.status === 'investigating' ? 'warning' : alert.status} />
                      ) : null}
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.createdAt ? (
                      <p className="text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {alert.investigationLink ? (
                      <Link
                        to={alert.investigationLink}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Investigate
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                    {onResolve ? (
                      <button
                        type="button"
                        onClick={() => onResolve(alert)}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Resolve
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

ActiveAlertsPanel.propTypes = {
  alerts: PropTypes.array,
  loading: PropTypes.bool,
  detailHref: PropTypes.string,
  detailLabel: PropTypes.string,
  onResolve: PropTypes.func,
};

export default ActiveAlertsPanel;
