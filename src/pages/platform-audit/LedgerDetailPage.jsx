import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import LedgerSummaryPanel from '../../components/platform-audit/LedgerSummaryPanel';
import LedgerBalanceCheck from '../../components/platform-audit/LedgerBalanceCheck';
import DistributionDonut from '../../components/platform-audit/DistributionDonut';
import DailyFlowChart from '../../components/platform-audit/DailyFlowChart';
import TrendLineChart from '../../components/platform-audit/TrendLineChart';
import LedgerHistoryTable from '../../components/platform-audit/LedgerHistoryTable';
import { formatNumber } from '../../components/platform-audit/formatters';

const LedgerDetailPage = ({ variant, dateRange }) => {
  const isCoin = variant === 'coin';
  const unit = isCoin ? 'coins' : 'rubies';
  const fetchFn = isCoin ? platformAuditService.getCoinLedger : platformAuditService.getRubyLedger;

  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      const result = await fetchFn(params);
      setData(result);
    } catch (err) {
      console.error(`Failed to load ${variant} ledger:`, err);
      setError(`Failed to load ${isCoin ? 'coin' : 'ruby'} ledger data`);
    } finally {
      setLoading(false);
    }
  }, [variant, dateRange?.from, dateRange?.to, page, fetchFn, isCoin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const inflow = isCoin ? data?.introduced : data?.generated;
  const outflow = data?.consumed;
  const distributionSegments = (data?.distributionByType ?? []).map((row, index) => ({
    label: row.type,
    value: row.volume,
    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][index % 6],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only audit view — this page analyzes existing transactions and wallet balances.
          It never changes user {unit} or writes to the ledger.
        </p>
      </div>

      <LedgerSummaryPanel variant={variant} data={data} loading={loading} />

      {isCoin ? null : !loading && data?.subBreakdowns ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {[
            ['Stream earnings', data.subBreakdowns.streamEarnings],
            ['Referrals', data.subBreakdowns.referralRewards],
            ['From coin conversion', data.subBreakdowns.coinToRubyConversions],
            ['Withdrawals', data.subBreakdowns.withdrawals],
            ['To coin conversion', data.subBreakdowns.rubyToCoinConversions],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-white p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-bold text-gray-900">{formatNumber(value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DailyFlowChart data={data?.dailyFlow} unit={unit} loading={loading} />
        <TrendLineChart data={data?.trend} unit={unit} loading={loading} />
      </div>

      {!loading && data ? (
        <LedgerBalanceCheck
          variant={variant}
          inflowTotal={inflow?.total}
          outflowTotal={outflow?.total}
          reconciliation={data.reconciliation}
          inCirculation={data.inCirculation}
        />
      ) : null}

      {!loading && distributionSegments.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <DistributionDonut
            title={`${isCoin ? 'Coin' : 'Ruby'} activity by type`}
            segments={distributionSegments}
            centerLabel="Volume"
            centerValue={formatNumber(distributionSegments.reduce((s, x) => s + x.value, 0))}
          />
        </div>
      ) : null}

      <LedgerHistoryTable
        history={data?.history}
        unit={unit}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
};

LedgerDetailPage.propTypes = {
  variant: PropTypes.oneOf(['coin', 'ruby']).isRequired,
  dateRange: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
};

export default LedgerDetailPage;
