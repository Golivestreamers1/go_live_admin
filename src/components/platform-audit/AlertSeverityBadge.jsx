import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-blue-200 bg-blue-50 text-blue-700',
};

const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const AlertSeverityBadge = ({ severity, className }) => {
  if (!severity) return null;
  const key = String(severity).toLowerCase();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        SEVERITY_STYLES[key] ?? 'border-gray-200 bg-gray-50 text-gray-700',
        className
      )}
    >
      {SEVERITY_LABELS[key] ?? severity}
    </span>
  );
};

AlertSeverityBadge.propTypes = {
  severity: PropTypes.string,
  className: PropTypes.string,
};

export default AlertSeverityBadge;
