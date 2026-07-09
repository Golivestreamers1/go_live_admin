import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AuditStatusBadge from './AuditStatusBadge';
import { formatDateTime } from './formatters';
import {
  getConfidenceLabel,
  getPlainSummary,
  INTEGRITY_CHECK_LABELS,
  SUMMARY_PILL_LABELS,
} from './integrityCheckCopy';

const STATUS_ICON = {
  pass: CheckCircle2,
  warning: AlertCircle,
  failed: XCircle,
  not_applicable: MinusCircle,
};

const STATUS_ICON_CLASS = {
  pass: 'text-emerald-600',
  warning: 'text-amber-600',
  failed: 'text-red-600',
  not_applicable: 'text-gray-400',
};

const IntegrityOverview = ({ data, auditScore, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading checks…</p>
        </CardContent>
      </Card>
    );
  }

  const checks = data?.checks ?? [];
  const summary = data?.summary ?? {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Platform Checks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Overall: {getConfidenceLabel(data?.confidence)}
              {data?.lastReconciliationSnapshotAt
                ? ` · Last checked ${formatDateTime(data.lastReconciliationSnapshotAt)}`
                : ''}
            </p>
          </div>
          {auditScore ? (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{auditScore.percentage}%</p>
              <AuditStatusBadge status={auditScore.status} />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
            {summary.pass ?? 0} {SUMMARY_PILL_LABELS.pass}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
            {summary.warning ?? 0} {SUMMARY_PILL_LABELS.warning}
          </span>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
            {summary.failed ?? 0} {SUMMARY_PILL_LABELS.failed}
          </span>
        </div>

        <ul className="divide-y rounded-lg border">
          {checks.map((check) => {
            const Icon = STATUS_ICON[check.status] ?? AlertCircle;
            const iconClass = STATUS_ICON_CLASS[check.status] ?? 'text-gray-500';
            const label = INTEGRITY_CHECK_LABELS[check.id] ?? check.name;
            const description = getPlainSummary(check);

            return (
              <li key={check.id} className="flex items-start gap-3 px-3 py-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <AuditStatusBadge status={check.status} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

IntegrityOverview.propTypes = {
  data: PropTypes.object,
  auditScore: PropTypes.object,
  loading: PropTypes.bool,
};

export default IntegrityOverview;
