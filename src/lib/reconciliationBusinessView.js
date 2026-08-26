const VIEW_STORAGE_KEY = 'reconciliationView';

export const RECONCILIATION_VIEW = {
  BUSINESS: 'business',
  TECHNICAL: 'technical',
};

export function loadSavedView() {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === RECONCILIATION_VIEW.TECHNICAL) return RECONCILIATION_VIEW.TECHNICAL;
  } catch {
    /* ignore */
  }
  return RECONCILIATION_VIEW.BUSINESS;
}

export function saveView(view) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

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

function buildContext(report) {
  return {
    report,
    check: (id) => findCheck(report, id),
    wl: report?.economicExposure?.withdrawLiability ?? {},
    exposure: report?.economicExposure ?? {},
  };
}

const HEALTH_ROWS = [
  {
    id: 'coins-purchased',
    label: 'Coins purchased',
    evaluate(ctx) {
      const checks = ['E3_UNSETTLED_GIFTS', 'E4_GIFT_SETTLEMENT', 'E5_CONVERSION'].map(ctx.check);
      const fails = checks.filter((c) => c?.status === 'FAIL').length;
      const warns = checks.filter((c) => c?.status === 'WARN').length;
      if (fails > 0) return { status: 'issue', detail: `${fails} issue${fails > 1 ? 's' : ''}` };
      if (warns > 0) return { status: 'warn', detail: `${warns} item${warns > 1 ? 's' : ''} to review` };
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
  {
    id: 'withdraw-requests',
    label: 'Withdraw requests',
    evaluate(ctx) {
      const pending = num(ctx.wl.pendingUsd);
      const approvedUnpaid = num(ctx.wl.approvedUnpaidUsd);
      if (pending > 0 || approvedUnpaid > 0) {
        const parts = [];
        if (pending > 0) parts.push('pending review');
        if (approvedUnpaid > 0) parts.push('awaiting payment');
        return { status: 'warn', detail: parts.join(' · ') };
      }
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
  {
    id: 'referrals',
    label: 'Referrals',
    evaluate(ctx) {
      const e5 = ctx.check('E5_CONVERSION');
      if (e5?.status === 'FAIL') return { status: 'issue', detail: '1 issue' };
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
  {
    id: 'wallet-balances',
    label: 'Wallet balances',
    evaluate(ctx) {
      const i1 = ctx.check('I1_COIN_STOCK');
      const i2 = ctx.check('I2_RUBY_STOCK');
      const coinUsers = num(i1?.evidence?.usersWithCoinDrift);
      const rubyUsers = num(i2?.evidence?.usersWithRubyDrift);
      const affected = coinUsers + rubyUsers;
      const fails = [i1, i2].filter((c) => c?.status === 'FAIL').length;
      if (fails > 0) {
        return {
          status: 'issue',
          detail: affected > 0 ? `${affected} issue${affected > 1 ? 's' : ''}` : `${fails} issue`,
        };
      }
      if ([i1, i2].some((c) => c?.status === 'WARN')) {
        return { status: 'warn', detail: 'Review recommended' };
      }
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
  {
    id: 'spin-wheel',
    label: 'Spin wheel',
    evaluate(ctx) {
      const w1 = ctx.check('W1_SPIN_WHEEL');
      if (w1?.status === 'FAIL') return { status: 'warn', detail: 'Needs review' };
      if (w1?.status === 'WARN') return { status: 'warn', detail: 'Needs review' };
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
  {
    id: 'current-transactions',
    label: 'Current transactions',
    evaluate(ctx) {
      const i3 = ctx.check('I3_REFERENTIAL');
      const postCutoff = num(i3?.evidence?.postCutoffOrphans);
      if (postCutoff > 0) {
        return {
          status: 'issue',
          detail: `${postCutoff} issue${postCutoff > 1 ? 's' : ''}`,
        };
      }
      return { status: 'healthy', detail: 'Healthy' };
    },
  },
];

function healthHeadline(confidence) {
  switch (confidence) {
    case 'GREEN':
      return { emoji: '🟢', title: 'Healthy', tone: 'green' };
    case 'YELLOW':
      return { emoji: '🟡', title: 'Review Recommended', tone: 'amber' };
    default:
      return { emoji: '🔴', title: 'Needs Attention', tone: 'red' };
  }
}

function walletImpact(ctx, affectedUsers) {
  const pending = num(ctx.wl.pendingUsd);
  const approvedUnpaid = num(ctx.wl.approvedUnpaidUsd);
  if (pending === 0 && approvedUnpaid === 0) {
    return 'No active withdrawals affected.';
  }
  if (affectedUsers <= 2) return 'Low — limited to a small number of accounts.';
  return 'Review recommended before processing new withdrawals.';
}

function buildReassuranceSentence(ctx, healthRows, confidence) {
  if (confidence === 'GREEN') {
    return 'All monitored areas look healthy.';
  }

  const currentTx = healthRows.find((r) => r.id === 'current-transactions');
  const postCutoff = num(ctx.check('I3_REFERENTIAL')?.evidence?.postCutoffOrphans);

  if (currentTx?.status === 'healthy' && postCutoff === 0) {
    return 'Current customer transactions appear healthy.';
  }

  if (postCutoff > 0) {
    return 'Recent transaction records need review before confirming day-to-day activity.';
  }

  return 'Most platform activity is operating normally — review the items below.';
}

const I3_CATEGORY_LABELS = {
  I3a: 'Conversion',
  I3b: 'Withdrawals',
  I3c: 'Stream earnings',
  I3d: 'Live gifts',
  I3e: 'Purchases',
};

/**
 * Level-2 detail for the Historical Records business card (I3 pre-cutoff orphans only).
 */
export function buildHistoricalDetails(report) {
  const i3 = findCheck(report, 'I3_REFERENTIAL');
  const evidence = i3?.evidence ?? {};
  const cutoffDate = evidence.cutoffDate || report?.refIntegrityCutoffDate || '—';
  const subChecks = evidence.subChecks ?? {};

  const categories = Object.entries(I3_CATEGORY_LABELS)
    .map(([key, label]) => {
      const sub = subChecks[key] ?? {};
      const orphanCount = num(sub.orphanCount);
      const postCutoff = num(sub.postCutoffOrphans);
      const preCutoff = num(sub.preCutoffOrphans ?? Math.max(0, orphanCount - postCutoff));
      return {
        key,
        label,
        count: preCutoff,
        sampleIds: Array.isArray(sub.sampleIds) ? sub.sampleIds : [],
      };
    })
    .filter((c) => c.count > 0);

  const sampleIds = categories
    .flatMap((c) => c.sampleIds)
    .filter(Boolean)
    .slice(0, 8);

  return {
    cutoffDate,
    totalLegacy: num(evidence.preCutoffOrphans),
    postCutoff: num(evidence.postCutoffOrphans),
    categories,
    sampleIds,
  };
}

function buildActionCards(ctx) {
  const cards = [];
  const i1 = ctx.check('I1_COIN_STOCK');
  const i2 = ctx.check('I2_RUBY_STOCK');
  const i3 = ctx.check('I3_REFERENTIAL');
  const w1 = ctx.check('W1_SPIN_WHEEL');

  if (i1?.status === 'FAIL' || i2?.status === 'FAIL') {
    const coinUsers = num(i1?.evidence?.usersWithCoinDrift);
    const rubyUsers = num(i2?.evidence?.usersWithRubyDrift);
    const affected = Math.max(coinUsers + rubyUsers, 1);
    cards.push({
      id: 'wallet-balances',
      title: 'Wallet balance issue',
      description: "Some user balances don't match the audit ledger.",
      detail: `Affected users: ${affected}`,
      impact: walletImpact(ctx, affected),
      action: 'Review the affected users and confirm recent transactions.',
      severity: 'critical',
      ctaLabel: 'Review affected users →',
      ctaMode: 'link',
      ctaTo: '/integrity',
    });
  }

  if (w1?.status === 'FAIL') {
    cards.push({
      id: 'spin-wheel',
      title: 'Spin wheel transactions need review',
      description:
        'Wheel rewards and spins do not fully reconcile — this may reflect historical activity or expected timing differences.',
      detail: null,
      impact: 'Low — may not affect current customer activity.',
      action: 'Review recent wheel rewards and confirm they match recorded spins.',
      severity: 'critical',
      ctaLabel: 'Review wheel transactions →',
      ctaMode: 'technical',
      technicalAnchor: 'check-W1_SPIN_WHEEL',
    });
  }

  const postCutoff = num(i3?.evidence?.postCutoffOrphans);
  const preCutoff = num(i3?.evidence?.preCutoffOrphans);

  if (postCutoff > 0) {
    cards.push({
      id: 'current-transactions',
      title: 'Current transaction records',
      description: 'Some recent records are missing required links in the ledger.',
      detail: `${postCutoff} record${postCutoff > 1 ? 's' : ''} need review`,
      impact: 'Review recommended for recent activity.',
      action: 'Review recent ledger records and confirm linked purchases, gifts, or withdrawals.',
      severity: 'critical',
      ctaLabel: 'Review transaction records →',
      ctaMode: 'technical',
      technicalAnchor: 'check-I3_REFERENTIAL',
    });
  }

  if (preCutoff > 0) {
    cards.push({
      id: 'historical-records',
      title: 'Historical records',
      description: `${preCutoff} legacy record${preCutoff > 1 ? 's' : ''} need cleanup.`,
      detail: 'No impact on current transactions.',
      impact: 'None — legacy data only.',
      action: 'No immediate action required. Legacy data can be cleaned up later.',
      severity: 'info',
      ctaLabel: 'View details →',
      ctaMode: 'detail',
      detailPanel: 'historical',
    });
  }

  for (const { id, title, description, action, impact, checkId, ctaLabel } of [
    {
      id: 'gifts',
      title: 'Live gifts need review',
      description: 'Unsettled or mismatched live gift activity was detected.',
      action: 'Review unsettled gifts on active or recently ended streams.',
      impact: 'May affect stream earnings settlement.',
      checkId: 'E3_UNSETTLED_GIFTS',
      ctaLabel: 'Review live gifts →',
    },
    {
      id: 'gift-settlement',
      title: 'Gift settlement needs review',
      description: 'Settled gifts do not match stream earnings.',
      action: 'Review settled gift totals against stream earnings.',
      impact: 'May affect creator payouts.',
      checkId: 'E4_GIFT_SETTLEMENT',
      ctaLabel: 'Review gift settlement →',
    },
    {
      id: 'conversion',
      title: 'Coin conversion needs review',
      description: 'Ruby-to-coin conversion totals do not reconcile.',
      action: 'Review recent conversion activity and platform economics.',
      impact: 'Low — typically affects internal accounting.',
      checkId: 'E5_CONVERSION',
      ctaLabel: 'Review conversions →',
    },
  ]) {
    const check = ctx.check(checkId);
    if (check?.status === 'FAIL') {
      cards.push({
        id,
        title,
        description,
        detail: null,
        impact,
        action,
        severity: 'critical',
        ctaLabel,
        ctaMode: 'technical',
        technicalAnchor: `check-${checkId}`,
      });
    }
  }

  return cards;
}

/**
 * Derive executive / business summary from the same reconciliation API payload.
 */
export function buildBusinessSummary(report) {
  const ctx = buildContext(report);
  const healthRows = HEALTH_ROWS.map((row) => ({
    id: row.id,
    label: row.label,
    ...row.evaluate(ctx),
  }));

  const actionCards = buildActionCards(ctx);
  const criticalCount = actionCards.filter((c) => c.severity === 'critical').length;
  const reviewCount = actionCards.length;
  const headline = healthHeadline(report?.confidence);
  const reassurance = buildReassuranceSentence(ctx, healthRows, report?.confidence);

  const pendingUsd = num(ctx.wl.pendingUsd);
  const approvedUnpaidUsd = num(ctx.wl.approvedUnpaidUsd);
  const outstandingUsd = num(ctx.exposure.outstandingLiabilityUsd);

  return {
    healthRows,
    actionCards,
    historicalDetails: buildHistoricalDetails(report),
    criticalCount,
    reviewCount,
    headline,
    reassurance,
    withdrawal: {
      pendingUsd,
      approvedUnpaidUsd,
      paidUsd: num(ctx.wl.paidUsd),
      outstandingUsd,
      needsAttention: pendingUsd > 0 || approvedUnpaidUsd > 0,
    },
  };
}
