import React from 'react';
import PropTypes from 'prop-types';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import SectionDetailLink from './SectionDetailLink';

const ActiveAlertsPanel = ({ alerts, loading, detailHref, detailLabel }) => {
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
              Alert generation arrives in Phase 6 — dashboard is wired and ready.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((alert) => (
              <li key={alert.id} className="px-3 py-2.5 text-sm">
                {alert.description ?? alert.title}
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
};

export default ActiveAlertsPanel;
