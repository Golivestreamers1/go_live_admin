import React from 'react';
import PropTypes from 'prop-types';
import { Coins, Gem } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AuditStatusBadge from './AuditStatusBadge';
import LedgerBalanceCheck from './LedgerBalanceCheck';
import { formatNumber } from './formatters';

const COIN_INTRODUCED = [
  ['coinsPurchased', 'Purchased by users'],
  ['adminCoinCredits', 'Admin credits'],
  ['rubyToCoinConversions', 'From ruby conversion'],
];

const COIN_CONSUMED = [
  ['giftsSent', 'Gifts sent'],
  ['coinToRubyConversions', 'Converted to rubies'],
  ['refundClawbacks', 'Refund clawbacks'],
  ['adminCoinDebits', 'Admin debits'],
];

const RUBY_GENERATED = [
  ['streamEarnings', 'Stream earnings'],
  ['referralRewards', 'Referrals'],
  ['coinToRubyConversions', 'Coin → ruby'],
  ['adminRubyCredits', 'Admin credits'],
];

const RUBY_CONSUMED = [
  ['withdrawals', 'Withdrawals'],
  ['rubyToCoinConversions', 'Ruby → coin'],
  ['giftReversals', 'Gift reversals'],
  ['fraudReversals', 'Fraud reversals'],
  ['adminRubyDebits', 'Admin debits'],
];

function FlowRows({ rows, data }) {
  return (
    <div className="space-y-1.5">
      {rows.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-gray-900">{formatNumber(data?.[key])}</span>
        </div>
      ))}
    </div>
  );
}

FlowRows.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.array).isRequired,
  data: PropTypes.object,
};

const LedgerSummaryPanel = ({ variant, data, loading }) => {
  const isCoin = variant === 'coin';
  const Icon = isCoin ? Coins : Gem;
  const inflow = isCoin ? data?.introduced : data?.generated;
  const outflow = isCoin ? data?.consumed : data?.consumed;
  const inflowLabel = isCoin ? 'Coins received' : 'Rubies earned';
  const outflowLabel = isCoin ? 'Coins spent' : 'Rubies spent';
  const inflowRows = isCoin ? COIN_INTRODUCED : RUBY_GENERATED;
  const outflowRows = isCoin ? COIN_CONSUMED : RUBY_CONSUMED;
  const reconciliation = data?.reconciliation;
  const reconciled = reconciliation?.difference === 0 && reconciliation?.ledgerStatus === 'pass';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{isCoin ? 'Coin Ledger' : 'Ruby Ledger'}</CardTitle>
          </div>
          {!loading && reconciliation ? (
            <AuditStatusBadge status={reconciled ? 'pass' : reconciliation.ledgerStatus ?? 'failed'} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading ledger summary…</p>
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {inflowLabel}
                </p>
                <p className="text-sm font-bold text-gray-900">{formatNumber(inflow?.total)}</p>
              </div>
              <FlowRows rows={inflowRows} data={inflow} />
              {isCoin ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Coins are not minted by the platform — they enter when users purchase them
                  (plus rare admin credits or ruby conversions).
                </p>
              ) : null}
            </div>

            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {outflowLabel}
                </p>
                <p className="text-sm font-bold text-gray-900">{formatNumber(outflow?.total)}</p>
              </div>
              <FlowRows rows={outflowRows} data={outflow} />
            </div>

            <LedgerBalanceCheck
              variant={variant}
              inflowTotal={inflow?.total}
              outflowTotal={outflow?.total}
              reconciliation={reconciliation}
              inCirculation={data?.inCirculation}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

LedgerSummaryPanel.propTypes = {
  variant: PropTypes.oneOf(['coin', 'ruby']).isRequired,
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default LedgerSummaryPanel;
