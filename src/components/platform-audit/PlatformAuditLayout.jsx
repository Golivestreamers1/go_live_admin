import React from 'react';
import PropTypes from 'prop-types';
import { Shield } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Shared header for all Platform Audit pages.
 */
const PlatformAuditLayout = ({ title, subtitle, toolbar, children }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {toolbar ?? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Last 7 days
              </Button>
              <Button variant="outline" size="sm" disabled>
                Filters
              </Button>
              <Button size="sm" disabled title="Coming in Phase 7">
                Export Report
              </Button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

PlatformAuditLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  toolbar: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default PlatformAuditLayout;
