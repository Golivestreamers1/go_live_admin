import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import PlatformAuditLayout from '../../components/platform-audit/PlatformAuditLayout';
import PlatformAuditDateRange from '../../components/platform-audit/PlatformAuditDateRange';
import { getDefaultDateRange } from '../../components/platform-audit/formatters';
import { getPlatformAuditPageMeta } from '../../config/platformAuditNav';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditDashboard from './PlatformAuditDashboard';
import LedgerDetailPage from './LedgerDetailPage';
import PurchaseAuditPage from './PurchaseAuditPage';
import StreamSettlementAuditPage from './StreamSettlementAuditPage';
import WithdrawalAuditPage from './WithdrawalAuditPage';
import ReferralAuditPage from './ReferralAuditPage';
import AdminActionsAuditPage from './AdminActionsAuditPage';
import FraudReversalsAuditPage from './FraudReversalsAuditPage';
import ReconciliationAuditPage from './ReconciliationAuditPage';
import UserBalanceExplorerPage from './UserBalanceExplorerPage';
import InvestigationPage from './InvestigationPage';
import AuditLogsPage from './AuditLogsPage';
import AuditReportsPage from './AuditReportsPage';
import AuditSettingsPage from './AuditSettingsPage';

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
  '/platform-audit/logs',
  '/platform-audit/reports',
]);

const PlatformAuditSection = () => {
  const { pathname } = useLocation();

  // Alert investigate links may use API-style paths — redirect to real UI routes.
  const balanceProofMatch = pathname.match(/^\/platform-audit\/users\/([^/]+)\/balance-proof$/);
  if (balanceProofMatch) {
    return <Navigate to={`/platform-audit/balance-explorer?userId=${balanceProofMatch[1]}`} replace />;
  }

  const streamDetailMatch = pathname.match(/^\/platform-audit\/stream-settlements\/([^/]+)$/);
  if (streamDetailMatch) {
    return (
      <Navigate to={`/platform-audit/stream-settlements?streamId=${streamDetailMatch[1]}`} replace />
    );
  }

  const meta = getPlatformAuditPageMeta(pathname);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [activePreset, setActivePreset] = useState('7d');
  const [exporting, setExporting] = useState(false);

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
  const isBalanceExplorer = pathname === '/platform-audit/balance-explorer';
  const isInvestigation = pathname === '/platform-audit/investigation';
  const isAuditLogs = pathname === '/platform-audit/logs';
  const isAuditReports = pathname === '/platform-audit/reports';
  const isAuditSettings = pathname === '/platform-audit/settings';
  const showDateToolbar = DATE_FILTER_PATHS.has(pathname);

  const handleDashboardExport = async () => {
    try {
      setExporting(true);
      await platformAuditService.exportDashboardReport(dateRange);
      toast.success('Platform economy report downloaded');
    } catch (err) {
      console.error('Dashboard export failed:', err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

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
        <Button
          size="sm"
          disabled={!isDashboard || exporting}
          onClick={handleDashboardExport}
          title={isDashboard ? 'Export platform economy CSV for current date range' : 'Available on Audit Overview'}
        >
          <Download className={`mr-2 h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
          {exporting ? 'Exporting…' : 'Export Report'}
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
  } else if (isBalanceExplorer) {
    content = <UserBalanceExplorerPage />;
  } else if (isInvestigation) {
    content = <InvestigationPage />;
  } else if (isAuditLogs) {
    content = <AuditLogsPage dateRange={dateRange} />;
  } else if (isAuditReports) {
    content = <AuditReportsPage dateRange={dateRange} />;
  } else if (isAuditSettings) {
    content = <AuditSettingsPage />;
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
