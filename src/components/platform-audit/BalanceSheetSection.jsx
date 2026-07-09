import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import DistributionDonut from './DistributionDonut';
import SectionDetailLink from './SectionDetailLink';
import { formatNumber } from './formatters';

const BalanceSheetSection = ({ data, loading, detailHref, detailLabel }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Economic Balance Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading balance sheet…</p>
        </CardContent>
      </Card>
    );
  }

  const coins = data?.coins;
  const rubies = data?.rubies;
  const combined = data?.combined;

  const coinSegments = [
    { label: 'In circulation', value: coins?.inCirculation ?? 0, color: '#3b82f6' },
    { label: 'Consumed', value: coins?.consumed?.total ?? 0, color: '#94a3b8' },
  ];

  const rubySegments = [
    { label: 'In circulation', value: rubies?.inCirculation ?? 0, color: '#8b5cf6' },
    { label: 'Consumed', value: rubies?.consumed?.total ?? 0, color: '#94a3b8' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Economic Balance Sheet</CardTitle>
          {!loading && detailHref ? (
            <SectionDetailLink href={detailHref} label={detailLabel} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Total purchased (coins)</p>
            <p className="font-bold text-gray-900">{formatNumber(combined?.totalPurchased)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Total received (coins + rubies)</p>
            <p className="font-bold text-gray-900">{formatNumber(combined?.totalIntroduced)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="font-bold text-gray-900">{formatNumber(combined?.totalConsumed)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">In circulation</p>
            <p className="font-bold text-gray-900">
              {formatNumber(combined?.inCirculation?.coins)} coins ·{' '}
              {formatNumber(combined?.inCirculation?.rubies)} rubies
            </p>
          </div>
        </div>

        <DistributionDonut
          title="Coin distribution"
          segments={coinSegments}
          centerLabel="Coins"
          centerValue={formatNumber(coins?.inCirculation)}
        />
        <DistributionDonut
          title="Ruby distribution"
          segments={rubySegments}
          centerLabel="Rubies"
          centerValue={formatNumber(rubies?.inCirculation)}
        />
      </CardContent>
    </Card>
  );
};

BalanceSheetSection.propTypes = {
  data: PropTypes.object,
  loading: PropTypes.bool,
  detailHref: PropTypes.string,
  detailLabel: PropTypes.string,
};

export default BalanceSheetSection;
