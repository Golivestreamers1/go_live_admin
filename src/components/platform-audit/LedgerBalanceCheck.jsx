import React from 'react';
import PropTypes from 'prop-types';
import { formatNumber } from './formatters';

function formatSignedNumber(value) {
  const n = Number(value ?? 0);
  const formatted = formatNumber(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `−${formatted}`;
  return formatted;
}

const LedgerBalanceCheck = ({ variant, inflowTotal, outflowTotal, reconciliation, inCirculation }) => {
  const isCoin = variant === 'coin';
  const unit = isCoin ? 'coins' : 'rubies';
  const inflowLabel = isCoin ? 'Coins received' : 'Rubies earned';
  const outflowLabel = isCoin ? 'Coins spent' : 'Rubies spent';
  const expected = reconciliation?.expected ?? 0;
  const actual = reconciliation?.actual ?? 0;
  const difference = reconciliation?.difference ?? 0;

  let meaning;
  if (difference === 0) {
    meaning = `Everything matches — user wallets hold exactly the ${unit} we'd expect from transaction history.`;
  } else if (difference < 0) {
    meaning = `Users hold ${formatNumber(Math.abs(difference))} fewer ${unit} than transaction history suggests should still be on the platform.`;
  } else {
    meaning = `Users hold ${formatNumber(difference)} more ${unit} than transaction history suggests should still be on the platform.`;
  }

  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Balance check
      </p>

      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-medium text-muted-foreground">Step 1 — What we expect</p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-gray-900 sm:text-sm">
            Expected = {inflowLabel} − {outflowLabel}
          </p>
          <p className="font-mono text-xs leading-relaxed text-gray-900 sm:text-sm">
            Expected = {formatNumber(inflowTotal)} − {formatNumber(outflowTotal)}
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            Expected = {formatNumber(expected)} {unit}
          </p>
        </div>

        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-medium text-muted-foreground">Step 2 — What users actually hold</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Actual = total {unit} in all user wallets right now
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            Actual = {formatNumber(actual)} {unit}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            (Same as in circulation: {formatNumber(inCirculation)} {unit})
          </p>
        </div>

        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-medium text-muted-foreground">Step 3 — The gap</p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-gray-900 sm:text-sm">
            Difference = Actual − Expected
          </p>
          <p className="font-mono text-xs leading-relaxed text-gray-900 sm:text-sm">
            Difference = {formatNumber(actual)} − {formatNumber(expected)}
          </p>
          <p
            className={`mt-1 text-base font-bold ${
              difference === 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            Difference = {formatSignedNumber(difference)} {unit}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{meaning}</p>
    </div>
  );
};

LedgerBalanceCheck.propTypes = {
  variant: PropTypes.oneOf(['coin', 'ruby']).isRequired,
  inflowTotal: PropTypes.number,
  outflowTotal: PropTypes.number,
  reconciliation: PropTypes.object,
  inCirculation: PropTypes.number,
};

export default LedgerBalanceCheck;
