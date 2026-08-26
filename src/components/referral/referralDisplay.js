/** Human-readable labels for referral admin UI */

export const BLOCKER_LABELS = {
  email_not_verified: 'Email is not verified yet',
  engagement_below_minimum: 'Needs more time using the app',
  live_activity_below_minimum: 'Needs more live streaming or watching',
};

export function friendlyBlockers(blockers = []) {
  return blockers.map((b) => BLOCKER_LABELS[b] || String(b).replace(/_/g, ' '));
}

export const ATTEMPT_STATUS_LABELS = {
  success: 'Completed',
  invalid_code: 'Invalid code',
  self_referral: 'Own code (not allowed)',
  already_referred: 'Already used a code',
  already_pending: 'Code already applied',
  pending_engagement: 'Waiting for app usage',
  error: 'System error',
};

export const SOURCE_LABELS = {
  signup: 'During sign-up',
  manual_apply: 'Entered in app',
};

export const PENDING_STATUS_LABELS = {
  pending: 'Waiting for requirements',
  completed: 'Requirements met',
  invalid: 'Invalid',
};

/** Per-referral rubies (must match backend REFERRAL_RUBIES). */
export const REFERRAL_RUBIES_PER_REWARD = 500;

/**
 * Normalize referrer drill-down summary (handles older API that only sent count + rubies).
 */
/** Format API range `{ from, to }` ISO strings for admin UI (UTC). */
export function formatStatsRangeUtc(range) {
  if (!range) return '—';
  if (!range.from && !range.to) return 'All dates';

  const opts = {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const fromStr = range.from
    ? new Date(range.from).toLocaleString(undefined, opts)
    : 'Beginning';
  const toStr = range.to
    ? new Date(range.to).toLocaleString(undefined, opts)
    : 'Now';

  return `${fromStr} → ${toStr}`;
}

export function normalizeReferrerSummary(summary) {
  if (!summary) return null;

  const count = Number(summary.count) || 0;
  const rubies = Number(summary.rubies) || 0;

  let rewardedCount =
    summary.rewardedCount != null && summary.rewardedCount !== ''
      ? Number(summary.rewardedCount)
      : null;
  let linkedCount =
    summary.linkedCount != null && summary.linkedCount !== ''
      ? Number(summary.linkedCount)
      : null;
  let pendingCount =
    summary.pendingCount != null && summary.pendingCount !== ''
      ? Number(summary.pendingCount)
      : null;

  if (rewardedCount == null || Number.isNaN(rewardedCount)) {
    const inferred =
      REFERRAL_RUBIES_PER_REWARD > 0
        ? Math.floor(rubies / REFERRAL_RUBIES_PER_REWARD)
        : 0;
    rewardedCount = Math.min(Math.max(0, inferred), count);
  }
  if (linkedCount == null || Number.isNaN(linkedCount)) {
    linkedCount = Math.max(0, count - rewardedCount);
  }
  if (pendingCount == null || Number.isNaN(pendingCount)) {
    pendingCount = null;
  }

  return {
    count,
    rubies,
    rewardedCount,
    linkedCount,
    pendingCount,
  };
}

export function journeySummary({ payout, pending, progress }) {
  if (payout) {
    if (Number(payout.rubiesAwarded) > 0) {
      return {
        tone: 'success',
        title: 'Referrer was paid',
        description: `${Number(payout.rubiesAwarded).toLocaleString()} rubies sent to the referrer.`,
      };
    }
    return {
      tone: 'muted',
      title: 'Linked — no rubies paid',
      description:
        'This user counts as a referral, but the referrer did not receive rubies (e.g. monthly reward limit reached).',
    };
  }
  if (pending?.status === 'pending') {
    if (progress?.readyForPayout) {
      return {
        tone: 'ready',
        title: 'Ready to pay referrer',
        description: 'All requirements are met. Payout should process on the next cron run.',
      };
    }
    return {
      tone: 'pending',
      title: 'Waiting on this user',
      description: 'Code is applied. The referred user still needs to complete the requirements below.',
    };
  }
  return {
    tone: 'neutral',
    title: 'No payout yet',
    description: 'No successful referral payout recorded for this user.',
  };
}
