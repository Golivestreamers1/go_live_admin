function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function findCheck(report, id) {
  const all = [
    ...(report?.ledgerIntegrity?.checks ?? []),
    ...(report?.economicFlow?.checks ?? []),
  ];
  return all.find((c) => c.id === id) ?? null;
}

function buildAssetAccountability({ created, destinations, lifetimeBalanced, lifetimeDiff }) {
  const explainedTotal = destinations.reduce((sum, d) => sum + num(d.value), 0);
  const needsReconciliation = num(lifetimeDiff);
  const balanced = Boolean(lifetimeBalanced) && needsReconciliation === 0;

  return {
    created,
    destinations,
    explainedTotal,
    needsReconciliation,
    balanced,
  };
}

/**
 * Contextual copy when explained-destination breakdown may look incomplete to a client.
 */
export function getExplainedDestinationsNote(data) {
  const destinations = data?.destinations ?? [];
  const nonZero = destinations.filter((d) => num(d.value) > 0);
  const zero = destinations.filter((d) => num(d.value) === 0);

  const onlyRemaining =
    nonZero.length === 1 && nonZero[0].label.toLowerCase().includes('remaining');

  if (onlyRemaining && zero.length > 0) {
    const zeroNames = zero.map((d) => d.label.replace(/\s*\([^)]*\)/g, '').trim()).join(', ');
    return {
      short:
        'Explained destinations currently reflect wallet balances only — gifts, wheel, conversions, and withdrawals are tracked and will appear when non-zero.',
      expanded: `This dataset currently shows only remaining wallet balances. ${zeroNames} read as zero for the analyzed data. The reconciliation engine tracks these flows; they will appear automatically when present.`,
    };
  }

  if (zero.length > 0) {
    return {
      short:
        'Only destinations currently tracked by the reconciliation are shown. Additional types appear automatically when present.',
      expanded:
        'Only destinations currently tracked by the reconciliation are shown. Additional destination types will appear automatically when present.',
    };
  }

  return null;
}

function buildCoinAccountability(coins) {
  const created =
    num(coins.purchased) +
    num(coins.raffleMinted) +
    num(coins.adminGranted) +
    num(coins.convertedFromRubies) +
    num(coins.wheelWon);

  const destinations = [
    { label: 'Remaining (in user wallets)', value: num(coins.remaining) },
    { label: 'Gifted & spent', value: num(coins.giftedAndSpent) },
    { label: 'Wheel spent', value: num(coins.wheelSpent) },
    { label: 'Converted to rubies', value: num(coins.convertedOut) },
  ];

  return buildAssetAccountability({
    created,
    destinations,
    lifetimeBalanced: coins.lifetimeBalanced,
    lifetimeDiff: coins.lifetimeDiff,
  });
}

function buildRubyAccountability(rubies) {
  const created = num(rubies.earnedAllTime);

  const destinations = [
    { label: 'Remaining (in user wallets)', value: num(rubies.remaining) },
    { label: 'Withdrawn', value: num(rubies.withdrawn) },
    { label: 'Converted to coins', value: num(rubies.convertedToCoins) },
  ];

  return buildAssetAccountability({
    created,
    destinations,
    lifetimeBalanced: rubies.lifetimeBalanced,
    lifetimeDiff: rubies.lifetimeDiff,
  });
}

function buildWithdrawalAccountability(report, wl) {
  const i3 = findCheck(report, 'I3_REFERENTIAL');
  const i3b = i3?.evidence?.subChecks?.I3b ?? {};
  const unlinked = num(i3b.postCutoffOrphans);
  const balanced = unlinked === 0;

  return {
    pendingUsd: num(wl.pendingUsd),
    approvedUnpaidUsd: num(wl.approvedUnpaidUsd),
    paidUsd: num(wl.paidUsd),
    unlinked,
    balanced,
  };
}

function buildInvestigationLinks(report, coin, ruby) {
  const links = [];
  const i1 = findCheck(report, 'I1_COIN_STOCK');
  const i2 = findCheck(report, 'I2_RUBY_STOCK');
  const w1 = findCheck(report, 'W1_SPIN_WHEEL');

  if (!coin.balanced) {
    if (i1?.status === 'FAIL' || i2?.status === 'FAIL') {
      links.push({
        asset: 'coins',
        label: 'Wallet balance issue',
        cardId: 'wallet-balances',
      });
    }
    if (w1?.status === 'FAIL') {
      links.push({
        asset: 'coins',
        label: 'Spin wheel transactions need review',
        cardId: 'spin-wheel',
      });
    }
  }

  if (!ruby.balanced && i2?.status === 'FAIL') {
    links.push({
      asset: 'rubies',
      label: 'Wallet balance issue',
      cardId: 'wallet-balances',
    });
  }

  return links;
}

/**
 * Platform accountability summary — lifetime balance equations + withdrawal pipeline.
 */
export function buildAccountabilitySummary(report) {
  const coins = report?.lifetimeFlow?.coins ?? {};
  const rubies = report?.lifetimeFlow?.rubies ?? {};
  const wl = report?.economicExposure?.withdrawLiability ?? {};

  const coin = buildCoinAccountability(coins);
  const ruby = buildRubyAccountability(rubies);
  const withdrawal = buildWithdrawalAccountability(report, wl);
  const investigationLinks = buildInvestigationLinks(report, coin, ruby);

  const allBalanced = coin.balanced && ruby.balanced && withdrawal.balanced;

  return {
    allBalanced,
    coin,
    ruby,
    withdrawal,
    investigationLinks,
    verifiedAt: report?.generatedAt ?? null,
  };
}
