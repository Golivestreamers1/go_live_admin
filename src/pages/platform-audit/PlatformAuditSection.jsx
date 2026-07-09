import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import PlatformAuditLayout from '../../components/platform-audit/PlatformAuditLayout';
import PlatformAuditDateRange from '../../components/platform-audit/PlatformAuditDateRange';
import { getDefaultDateRange } from '../../components/platform-audit/formatters';
import { getPlatformAuditPageMeta } from '../../config/platformAuditNav';
import PlatformAuditDashboard from './PlatformAuditDashboard';
import LedgerDetailPage from './LedgerDetailPage';
import PurchaseAuditPage from './PurchaseAuditPage';
import StreamSettlementAuditPage from './StreamSettlementAuditPage';
import WithdrawalAuditPage from './WithdrawalAuditPage';
import ReferralAuditPage from './ReferralAuditPage';
import AdminActionsAuditPage from './AdminActionsAuditPage';
import FraudReversalsAuditPage from './FraudReversalsAuditPage';
import ReconciliationAuditPage from './ReconciliationAuditPage';

const LEDGER_PATHS = {
  '/platform-audit/coin-ledger': 'coin',
  '/platform-audit/ruby-ledger': 'ruby',
};

const DATE_FILTER_PATHS = new Set([
  '/platform-audit',
  '/platform-audit/coin-ledger',
  '/platform-audit/ruby-ledger',
  '/platform-audit/purchases',
  '/platform-audit/stream-settlements',
  '/platform-audit/withdrawals',
  '/platform-audit/referrals',
  '/platform-audit/admin-actions',
  '/platform-audit/fraud',
]);

const PlatformAuditSection = () => {
  const { pathname } = useLocation();
  const meta = getPlatformAuditPageMeta(pathname);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [activePreset, setActivePreset] = useState('7d');

  if (!meta) {
    return null;
  }

  const isDashboard = pathname === '/platform-audit';
  const ledgerVariant = LEDGER_PATHS[pathname];
  const isPurchaseAudit = pathname === '/platform-audit/purchases';
  const isStreamSettlementAudit = pathname === '/platform-audit/stream-settlements';
  const isWithdrawalAudit = pathname === '/platform-audit/withdrawals';
  const isReferralAudit = pathname === '/platform-audit/referrals';
  const isAdminActionsAudit = pathname === '/platform-audit/admin-actions';
  const isFraudAudit = pathname === '/platform-audit/fraud';
  const isReconciliationAudit = pathname === '/platform-audit/reconciliation';
  const showDateToolbar = DATE_FILTER_PATHS.has(pathname);

  const toolbar = showDateToolbar ? (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <PlatformAuditDateRange
        value={dateRange}
        onChange={setDateRange}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled title="Advanced filters on each page">
          Filters
        </Button>
        <Button size="sm" disabled title="Coming in Phase 7">
          Export Report
        </Button>
      </div>
    </div>
  ) : null;

  let content;
  if (isDashboard) {
    content = <PlatformAuditDashboard dateRange={dateRange} />;
  } else if (ledgerVariant) {
    content = <LedgerDetailPage variant={ledgerVariant} dateRange={dateRange} />;
  } else if (isPurchaseAudit) {
    content = <PurchaseAuditPage dateRange={dateRange} />;
  } else if (isStreamSettlementAudit) {
    content = <StreamSettlementAuditPage dateRange={dateRange} />;
  } else if (isWithdrawalAudit) {
    content = <WithdrawalAuditPage dateRange={dateRange} />;
  } else if (isReferralAudit) {
    content = <ReferralAuditPage dateRange={dateRange} />;
  } else if (isAdminActionsAudit) {
    content = <AdminActionsAuditPage dateRange={dateRange} />;
  } else if (isFraudAudit) {
    content = <FraudReversalsAuditPage dateRange={dateRange} />;
  } else if (isReconciliationAudit) {
    content = <ReconciliationAuditPage />;
  } else {
    content = (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-gray-900">Coming soon</p>
        <p className="mt-2 text-sm text-gray-500">
          {meta.name} will be built in the Platform Audit module rollout.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Backend audit engine is active — UI landing in upcoming phases.
        </p>
      </div>
    );
  }

  return (
    <PlatformAuditLayout title={meta.name} subtitle={meta.description} toolbar={toolbar}>
      {content}
    </PlatformAuditLayout>
  );
};

export default PlatformAuditSection;
