import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { referralService } from '../../services/referralService';
import { ReferralCriteriaProgress } from './ReferralCriteriaProgress';
import {
  ATTEMPT_STATUS_LABELS,
  SOURCE_LABELS,
  PENDING_STATUS_LABELS,
  journeySummary,
} from './referralDisplay';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString());

const SUMMARY_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  ready: 'border-blue-200 bg-blue-50 text-blue-900',
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  muted: 'border-slate-200 bg-slate-50 text-slate-800',
  neutral: 'border-muted bg-muted/30 text-foreground',
};

function SummaryBanner({ summary }) {
  const style = SUMMARY_STYLES[summary.tone] || SUMMARY_STYLES.neutral;
  const Icon =
    summary.tone === 'success'
      ? CheckCircle2
      : summary.tone === 'pending' || summary.tone === 'ready'
        ? Clock
        : AlertCircle;

  return (
    <div className={`rounded-lg border p-4 flex gap-3 ${style}`}>
      <Icon className="h-6 w-6 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-base">{summary.title}</p>
        <p className="text-sm mt-1 opacity-90">{summary.description}</p>
      </div>
    </div>
  );
}

export function ReferralJourneyDialog({ referredUserId, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!referredUserId) return;
    try {
      setLoading(true);
      const result = await referralService.getJourney(referredUserId);
      setData(result);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to load referral journey');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [referredUserId]);

  useEffect(() => {
    if (open && referredUserId) load();
    if (!open) setData(null);
  }, [open, referredUserId, load]);

  const referred = data?.referredUser;
  const referrer = data?.referrer;
  const payout = data?.payout;
  const summary = data ? journeySummary({ payout, pending: data.pending, progress: data.criteriaProgress }) : null;
  const alreadyPaid = payout && Number(payout.rubiesAwarded) > 0;
  const showLiveProgress = !alreadyPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral details</DialogTitle>
          <DialogDescription>
            See who referred this user, whether the referrer was paid, and what requirements are left.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4 text-sm">
            {summary && <SummaryBanner summary={summary} />}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Referred user
                </p>
                <p className="font-medium leading-snug">{referred?.name || '—'}</p>
                <p className="text-muted-foreground">@{referred?.username || '—'}</p>
                <p className="text-xs text-muted-foreground truncate" title={referred?.email}>
                  {referred?.email}
                </p>
                <Link to={`/users/${referred?._id}`} className="text-xs text-blue-600 hover:underline inline-block mt-1">
                  Open profile →
                </Link>
              </div>

              {referrer ? (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Referrer
                  </p>
                  <p className="font-medium leading-snug">{referrer.name}</p>
                  <p className="text-muted-foreground">
                    Code:{' '}
                    <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {referrer.referralCode}
                    </span>
                  </p>
                  <Link to={`/users/${referrer._id}`} className="text-xs text-blue-600 hover:underline inline-block mt-1">
                    Open referrer profile →
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 flex items-center text-muted-foreground text-sm">
                  No referrer linked yet
                </div>
              )}
            </div>

            {payout && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 space-y-2">
                <p className="font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Payout on record
                </p>
                <p className="text-emerald-900">
                  <strong>{fmtNum(payout.rubiesAwarded)} rubies</strong>
                  {Number(payout.rubiesAwarded) > 0 ? ' paid to referrer' : ' (linked only — no payment)'}
                  {' · '}
                  {fmtDate(payout.createdAt)}
                </p>
                {payout.referralCodeUsed && (
                  <p className="text-xs text-emerald-800">
                    Code used: <span className="font-mono">{payout.referralCodeUsed}</span>
                  </p>
                )}
              </div>
            )}

            {data.pending && data.pending.status === 'pending' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-amber-900">Invitation in progress</p>
                  <Badge variant="outline" className="border-amber-300 text-amber-900">
                    {PENDING_STATUS_LABELS[data.pending.status] || data.pending.status}
                  </Badge>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Code applied</dt>
                  <dd className="font-mono font-medium">{data.pending.referralCodeUsed}</dd>
                  <dt className="text-muted-foreground">When</dt>
                  <dd>{fmtDate(data.pending.createdAt)}</dd>
                  <dt className="text-muted-foreground">How</dt>
                  <dd>{SOURCE_LABELS[data.pending.source] || data.pending.source || '—'}</dd>
                </dl>
                <ReferralCriteriaProgress progress={data.pending.criteriaProgress} />
              </div>
            )}

            {showLiveProgress && !data.pending && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-semibold">Requirements checklist</p>
                <ReferralCriteriaProgress progress={data.criteriaProgress} />
              </div>
            )}

            {alreadyPaid && (
              <p className="text-xs text-muted-foreground flex items-start gap-2 rounded-md bg-muted/40 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                This referral is complete. The checklist above is hidden because the referrer was
                already paid.
              </p>
            )}

            {(data.attempts || []).length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="font-semibold mb-3">History ({data.attempts.length})</p>
                <ul className="space-y-2 max-h-52 overflow-y-auto">
                  {data.attempts.map((a) => (
                    <li
                      key={a._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-muted pb-2 last:border-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-normal">
                          {ATTEMPT_STATUS_LABELS[a.status] || a.status}
                        </Badge>
                        {a.referralCodeUsed && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {a.referralCodeUsed}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[a.source] || a.source} · {fmtDate(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.criteriaConfig && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Reward rules (admin)</summary>
                <p className="mt-2 pl-2 border-l-2 border-muted">
                  {data.criteriaConfig.minEngagementMinutes} minutes in app ·{' '}
                  {data.criteriaConfig.minCompletedStreams} completed streams{' '}
                  <em>or</em> {data.criteriaConfig.minLiveMinutes} minutes live · Email verify:{' '}
                  {data.criteriaConfig.requireVerified ? 'required' : 'optional'} ·{' '}
                  {data.criteriaConfig.rubiesPerReferral} rubies per rewarded referral · Max 3
                  rewarded referrals per referrer per month (unless unlimited flag is on).
                </p>
              </details>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReferralJourneyDialog;
