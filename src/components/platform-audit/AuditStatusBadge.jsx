import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  attention: 'border-amber-200 bg-amber-50 text-amber-700',
  incorrect: 'border-amber-200 bg-amber-50 text-amber-700',
  cap_blocked: 'border-amber-200 bg-amber-50 text-amber-700',
  eligible: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rewarded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  missing: 'border-red-200 bg-red-50 text-red-700',
  duplicate: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
  not_applicable: 'border-gray-200 bg-gray-50 text-gray-600',
};

const STATUS_LABELS = {
  pass: 'OK',
  verified: 'Verified',
  settled: 'Settled',
  healthy: 'Healthy',
  warning: 'Review',
  attention: 'Review',
  incorrect: 'Incorrect',
  cap_blocked: 'Cap reached',
  eligible: 'Eligible',
  rewarded: 'Rewarded',
  failed: 'Issue',
  missing: 'Missing',
  duplicate: 'Duplicate',
  critical: 'Critical',
  not_applicable: 'N/A',
};

const AuditStatusBadge = ({ status, className }) => {
  if (!status) return null;

  const key = String(status).toLowerCase();
  const label = STATUS_LABELS[key] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        STATUS_STYLES[key] ?? 'border-gray-200 bg-gray-50 text-gray-700',
        className
      )}
    >
      {label}
    </span>
  );
};

AuditStatusBadge.propTypes = {
  status: PropTypes.string,
  className: PropTypes.string,
};

export default AuditStatusBadge;
