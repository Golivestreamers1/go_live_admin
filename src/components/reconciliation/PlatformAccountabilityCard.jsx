import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import AccountabilityAssetFlow from './AccountabilityAssetFlow';

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-US');
const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const fmtShortDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

function SummaryRow({ label, balanced, needsReconciliation, unit }) {
  if (balanced) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-sm font-medium text-green-700">✓ Fully reconciled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <span className="text-sm text-right">
        <span className="block font-medium text-amber-800">Requires reconciliation</span>
        <span className="block text-sm font-bold tabular-nums text-amber-900">
          {fmtNum(needsReconciliation)} {unit}
        </span>
      </span>
    </div>
  );
}

function WithdrawalSummaryRow({ balanced, unlinked }) {
  if (balanced) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
        <span className="text-sm font-medium text-gray-900">Withdrawals</span>
        <span className="text-sm font-medium text-green-700">✓ Fully accounted for</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <span className="text-sm font-medium text-gray-900">Withdrawals</span>
      <span className="text-sm font-medium text-red-700">
        {fmtNum(unlinked)} unlinked record{unlinked > 1 ? 's' : ''}
      </span>
    </div>
  );
}

export default function PlatformAccountabilityCard({
  accountability,
  onShowTechnical,
  onInvestigate,
}) {
  const { allBalanced, coin, ruby, withdrawal, investigationLinks, verifiedAt } = accountability;

  return (
    <Card className="border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-semibold tracking-tight">Platform accountability</CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Every coin and ruby should have an owner — created must equal explained destinations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-gray-50/80 px-4 py-1">
          <SummaryRow
            label="Coins"
            balanced={coin.balanced}
            needsReconciliation={coin.needsReconciliation}
            unit="coins"
          />
          <SummaryRow
            label="Rubies"
            balanced={ruby.balanced}
            needsReconciliation={ruby.needsReconciliation}
            unit="rubies"
          />
          <WithdrawalSummaryRow balanced={withdrawal.balanced} unlinked={withdrawal.unlinked} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AccountabilityAssetFlow
            title="Coins"
            asset="coins"
            data={coin}
            investigationLinks={investigationLinks}
            onInvestigate={onInvestigate}
            onShowTechnical={onShowTechnical}
            variant="business"
            defaultExpanded={!coin.balanced}
          />
          <AccountabilityAssetFlow
            title="Rubies"
            asset="rubies"
            data={ruby}
            investigationLinks={investigationLinks}
            onInvestigate={onInvestigate}
            onShowTechnical={onShowTechnical}
            variant="business"
            defaultExpanded={!ruby.balanced}
          />
        </div>

        {!allBalanced && investigationLinks.length > 0 ? (
          <p className="text-sm text-gray-600 border-l-2 border-amber-300 pl-3">
            Unexplained amounts often tie to specific checks below — follow the investigate links
            under each asset, then review platform health.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3 text-sm border rounded-lg p-3 bg-white">
          <div>
            <p className="text-xs text-muted-foreground">Withdrawals requested</p>
            <p className="font-semibold tabular-nums mt-0.5">{fmtUsd(withdrawal.pendingUsd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approved, unpaid</p>
            <p className="font-semibold tabular-nums mt-0.5">{fmtUsd(withdrawal.approvedUnpaidUsd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold tabular-nums mt-0.5">{fmtUsd(withdrawal.paidUsd)}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Last verified: <span className="text-gray-900">{fmtShortDate(verifiedAt)}</span>
        </p>

        {!allBalanced ? (
          <Button
            variant="outline"
            size="sm"
            className="font-medium"
            onClick={() => onShowTechnical('panel-c')}
          >
            Review full equations in technical view →
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
