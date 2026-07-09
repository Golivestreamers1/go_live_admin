import React from 'react';
import { useLocation } from 'react-router-dom';
import PlatformAuditLayout from '../../components/platform-audit/PlatformAuditLayout';
import { getPlatformAuditPageMeta } from '../../config/platformAuditNav';

const PlatformAuditSection = () => {
  const { pathname } = useLocation();
  const meta = getPlatformAuditPageMeta(pathname);

  if (!meta) {
    return null;
  }

  return (
    <PlatformAuditLayout
      title={meta.name}
      subtitle={meta.description}
    >
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-gray-900">Coming soon</p>
        <p className="mt-2 text-sm text-gray-500">
          {meta.name} will be built in the Platform Audit module rollout.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Backend audit engine is active — UI landing in upcoming phases.
        </p>
      </div>
    </PlatformAuditLayout>
  );
};

export default PlatformAuditSection;
