import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Coins,
  Gem,
  HeartPulse,
  Users,
  ArrowDownToLine,
} from 'lucide-react';
import PropTypes from 'prop-types';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import LedgerSummaryPanel from '../../components/platform-audit/LedgerSummaryPanel';
import BalanceSheetSection from '../../components/platform-audit/BalanceSheetSection';
import IntegrityOverview from '../../components/platform-audit/IntegrityOverview';
import ActiveAlertsPanel from '../../components/platform-audit/ActiveAlertsPanel';
import AuditLogsTable from '../../components/platform-audit/AuditLogsTable';
import TransactionCategoriesTable from '../../components/platform-audit/TransactionCategoriesTable';
import { formatNumber } from '../../components/platform-audit/formatters';
import platformAuditService from '../../services/platformAuditService';
import dashboardService from '../../services/dashboardService';

const PlatformAuditDashboard = ({ dateRange }) => {
  const [dashboard, setDashboard] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;

      const [dashboardData, statsData] = await Promise.all([
        platformAuditService.getDashboard(params),
        dashboardService.getStats().catch(() => null),
      ]);

      setDashboard(dashboardData);
      setActiveUsers(statsData?.activeUsers?.count ?? null);
    } catch (err) {
      console.error('Failed to load platform audit dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const integrity = dashboard?.platformIntegrity;
  const coinLedger = dashboard?.coinLedger;
  const rubyLedger = dashboard?.rubyLedger;
  const auditScore = integrity?.overallAuditScore;
  const alertCount = dashboard?.activeAlerts?.length ?? 0;

  const cards = [
    {
      key: 'economic-health',
      title: 'Economic Health',
      value: auditScore ? `${auditScore.percentage}%` : '—',
      subtitle: auditScore?.lastAuditTime
        ? `Last audit ${new Date(auditScore.lastAuditTime).toLocaleDateString()}`
        : 'Platform reconciliation score',
      icon: HeartPulse,
      status: auditScore?.status,
      href: '/platform-audit/reconciliation',
      linkLabel: 'View reconciliation',
    },
    {
      key: 'coins-purchased',
      title: 'Total Coins Purchased',
      value: formatNumber(coinLedger?.introduced?.coinsPurchased),
      subtitle: integrity?.coinLedger
        ? `Stored ${formatNumber(integrity.coinLedger.actual)} · Δ ${formatNumber(integrity.coinLedger.difference)}`
        : 'Lifetime coin purchases',
      icon: Coins,
      status: integrity?.coinLedger?.status,
      href: '/platform-audit/purchases',
      linkLabel: 'View purchase audit',
    },
    {
      key: 'rubies-generated',
      title: 'Total Rubies Generated',
      value: formatNumber(rubyLedger?.generated?.total),
      subtitle: integrity?.rubyLedger
        ? `Stored ${formatNumber(integrity.rubyLedger.actual)} · Δ ${formatNumber(integrity.rubyLedger.difference)}`
        : 'Stream, referral, and conversion inflows',
      icon: Gem,
      status: integrity?.rubyLedger?.status,
      href: '/platform-audit/ruby-ledger',
      linkLabel: 'View ruby ledger',
    },
    {
      key: 'total-withdrawn',
      title: 'Total Withdrawn',
      value: formatNumber(rubyLedger?.consumed?.withdrawals),
      subtitle: integrity?.withdrawalProcessing
        ? `${formatNumber(integrity.withdrawalProcessing.completed)} completed · ${formatNumber(integrity.withdrawalProcessing.pending)} pending`
        : 'Rubies withdrawn from platform',
      icon: ArrowDownToLine,
      status:
        integrity?.withdrawalProcessing?.failed > 0
          ? 'failed'
          : integrity?.withdrawalProcessing?.pending > 0
            ? 'warning'
            : 'pass',
      href: '/platform-audit/withdrawals',
      linkLabel: 'View withdrawal audit',
    },
    {
      key: 'active-users',
      title: 'Active Users',
      value: activeUsers != null ? formatNumber(activeUsers) : '—',
      subtitle: 'Users active in the last 30 days',
      icon: Users,
      status: null,
      href: '/platform-audit/balance-explorer',
      linkLabel: 'Explore balances',
    },
    {
      key: 'audit-alerts',
      title: 'Audit Alerts',
      value: formatNumber(alertCount),
      subtitle: alertCount === 0 ? 'No open audit alerts' : 'Open issues requiring review',
      icon: alertCount > 0 ? AlertTriangle : Activity,
      status: alertCount === 0 ? 'pass' : alertCount > 5 ? 'critical' : 'warning',
      href: '/platform-audit/logs',
      linkLabel: 'View audit logs',
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {cards.map((card) => (
            <PlatformAuditMetricCard
              key={card.key}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              status={card.status}
              loading={loading}
              href={card.href}
              linkLabel={card.linkLabel}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LedgerSummaryPanel
          variant="coin"
          data={coinLedger}
          loading={loading}
          detailHref="/platform-audit/coin-ledger"
          detailLabel="Open coin ledger"
        />
        <LedgerSummaryPanel
          variant="ruby"
          data={rubyLedger}
          loading={loading}
          detailHref="/platform-audit/ruby-ledger"
          detailLabel="Open ruby ledger"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BalanceSheetSection
          data={dashboard?.balanceSheet}
          loading={loading}
          detailHref="/platform-audit/reconciliation"
          detailLabel="View reconciliation"
        />
        <IntegrityOverview
          data={dashboard?.integrityChecks}
          auditScore={auditScore}
          loading={loading}
          detailHref="/platform-audit/reconciliation"
          detailLabel="Full reconciliation"
        />
      </section>

      <section>
        <ActiveAlertsPanel
          alerts={dashboard?.activeAlerts}
          loading={loading}
          detailHref="/platform-audit/logs"
          detailLabel="View audit logs"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AuditLogsTable
          data={dashboard?.auditLogs}
          loading={loading}
          detailHref="/platform-audit/logs"
          detailLabel="All audit logs"
        />
        <TransactionCategoriesTable
          data={dashboard?.transactionCategories}
          loading={loading}
          detailHref="/platform-audit/coin-ledger"
          detailLabel="Browse ledger"
        />
      </section>
    </div>
  );
};

PlatformAuditDashboard.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default PlatformAuditDashboard;
