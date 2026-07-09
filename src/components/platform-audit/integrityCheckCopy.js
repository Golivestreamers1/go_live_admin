import { formatNumber } from './formatters';

/** Plain-language labels for admin-facing integrity checks. */
export const INTEGRITY_CHECK_LABELS = {
  I1_COIN_STOCK: 'Coins on platform match records',
  I2_RUBY_STOCK: 'Rubies on platform match records',
  I3_REFERENTIAL: 'Transaction links are valid',
  E3_UNSETTLED_GIFTS: 'Live gifts are accounted for',
  E4_GIFT_SETTLEMENT: 'Gifts paid out to streamers',
  E5_CONVERSION: 'Coin ↔ Ruby conversions balance',
  W1_SPIN_WHEEL: 'Spin wheel payouts are fair',
};

const CONFIDENCE_LABELS = {
  GREEN: 'Healthy',
  YELLOW: 'Review recommended',
  RED: 'Needs attention',
};

export function getConfidenceLabel(confidence) {
  return CONFIDENCE_LABELS[confidence] ?? confidence ?? '—';
}

export function getPlainSummary(check) {
  const evidence = check?.details ?? {};
  const diff = Math.abs(Number(evidence.diff ?? 0));

  switch (check?.id) {
    case 'I1_COIN_STOCK':
      if (check.status === 'pass') return 'Wallet balances match the coin transaction history.';
      return `${formatNumber(diff)} coins difference between user wallets and transaction records.`;
    case 'I2_RUBY_STOCK':
      if (check.status === 'pass') return 'Wallet balances match the ruby transaction history.';
      return `${formatNumber(diff)} rubies difference between user wallets and transaction records.`;
    case 'I3_REFERENTIAL': {
      const recent = Number(evidence.postCutoffOrphans ?? 0);
      const older = Number(evidence.preCutoffOrphans ?? 0);
      if (recent === 0 && older === 0) return 'All transactions link to valid purchases, streams, and withdrawals.';
      if (recent > 0) {
        return `${formatNumber(recent)} recent transaction${recent === 1 ? '' : 's'} missing a linked record.`;
      }
      return `${formatNumber(older)} older unlinked transaction${older === 1 ? '' : 's'} found (before audit baseline).`;
    }
    case 'E3_UNSETTLED_GIFTS': {
      const pending = Number(evidence.pendingCoins ?? 0);
      if (check.status === 'pass') return 'All live gifts have been settled to streamers.';
      return `${formatNumber(pending)} coins in gifts still waiting to be paid out to streamers.`;
    }
    case 'E4_GIFT_SETTLEMENT':
      if (check.status === 'pass') return 'Gift-to-earnings payouts are complete.';
      return 'Some gifts have not yet been converted to streamer earnings.';
    case 'E5_CONVERSION':
      if (check.status === 'pass') return 'Coin and ruby conversions add up correctly.';
      return 'Coin ↔ ruby conversions do not balance — review conversion activity.';
    case 'W1_SPIN_WHEEL':
      if (check.status === 'pass') return 'Spin wheel prizes match the coins players spent.';
      return 'Spin wheel gave out more prizes than coins collected — review wheel activity.';
    default:
      return check?.summary ?? '';
  }
}

export const SUMMARY_PILL_LABELS = {
  pass: 'OK',
  warning: 'Review',
  failed: 'Issue',
};
