import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { usePolling } from '../../hooks/usePolling';
import RefreshControl from './RefreshControl';

const SEVERITY = {
  critical: {
    icon: AlertCircle,
    badge: 'destructive',
    rowCls: 'bg-red-50 border-red-200',
    iconCls: 'text-red-600',
    label: 'Critical',
  },
  warn: {
    icon: AlertTriangle,
    badge: 'secondary',
    rowCls: 'bg-amber-50 border-amber-200',
    iconCls: 'text-amber-600',
    label: 'Warning',
  },
  info: {
    icon: Info,
    badge: 'outline',
    rowCls: 'bg-blue-50 border-blue-200',
    iconCls: 'text-blue-600',
    label: 'Info',
  },
};

const AlertsCard = () => {
  const polling = usePolling(() => dashboardService.getDashboardAlerts(), {
    defaultIntervalMs: 60_000,
  });
  const { data } = polling;
  const alerts = data?.alerts || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            System Alerts
            {data && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {data.summary.critical} critical · {data.summary.warn} warn · {data.summary.info} info
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Threshold-based on host, mongo, and live snapshots
          </CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
            All systems within thresholds.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => {
              const cfg = SEVERITY[a.severity] || SEVERITY.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={`${a.code}-${i}`}
                  className={`flex items-start justify-between gap-3 rounded-md border p-3 ${cfg.rowCls}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${cfg.iconCls} mt-0.5`} />
                    <div>
                      <p className="text-sm font-medium">{a.message}</p>
                      <p className="text-xs text-muted-foreground">{a.code}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.badge} className="capitalize">
                    {cfg.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsCard;
