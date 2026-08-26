import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { friendlyBlockers } from './referralDisplay';

function Check({ ok, label, detail }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className={`flex gap-2 text-sm ${ok ? 'text-emerald-800' : 'text-foreground'}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`} />
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, label }) {
  const safeMax = Math.max(Number(max) || 1, 0.001);
  const safeVal = Math.max(0, Number(value) || 0);
  const pct = Math.min(100, Math.round((safeVal / safeMax) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-foreground">
          {safeVal} / {max} min ({pct}%)
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReferralCriteriaProgress({ progress, compact = false }) {
  if (!progress) {
    return <span className="text-xs text-muted-foreground">No progress data</span>;
  }

  const em = progress.engagementMinutes || {};
  const cfg = progress.config || {};
  const minApp = cfg.minEngagementMinutes ?? 60;
  const minStreams = cfg.minCompletedStreams ?? 2;
  const minLive = cfg.minLiveMinutes ?? 15;
  const appDone = em.total ?? 0;
  const streamsDone = progress.completedStreamCount ?? 0;
  const liveDone = em.live ?? 0;
  const blockers = friendlyBlockers(progress.blockers);

  if (compact) {
    return (
      <div className="space-y-1.5">
        {progress.readyForPayout ? (
          <Badge className="bg-emerald-600">Ready to pay</Badge>
        ) : (
          <Badge variant="outline" className="text-amber-800 border-amber-300">
            In progress
          </Badge>
        )}
        {blockers.length > 0 && (
          <ul className="text-[11px] text-muted-foreground list-disc pl-3.5 space-y-0.5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {progress.readyForPayout ? (
          <Badge className="bg-emerald-600 text-sm px-3 py-1">All requirements met</Badge>
        ) : (
          <Badge variant="outline" className="text-amber-900 border-amber-300 bg-amber-50 text-sm px-3 py-1">
            Requirements not complete yet
          </Badge>
        )}
        {progress.isVerified === false && cfg.requireVerified && (
          <Badge variant="outline" className="text-amber-800">
            Email not verified
          </Badge>
        )}
      </div>

      <div className="space-y-3 rounded-lg bg-muted/40 p-3">
        <Check
          ok={progress.verifiedMet}
          label={cfg.requireVerified ? 'Email verified' : 'Email verification (optional)'}
          detail={
            progress.verifiedMet
              ? 'Account is verified.'
              : cfg.requireVerified
                ? 'User must verify their email before the referrer can be paid.'
                : 'Not required for payout.'
          }
        />

        <div className="space-y-2 pl-6 border-l-2 border-muted ml-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            App usage
          </p>
          <ProgressBar value={appDone} max={minApp} label="Time in app since code was applied" />
        </div>

        <div className="space-y-2 pl-6 border-l-2 border-muted ml-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Live activity (either one counts)
          </p>
          <Check
            ok={progress.liveActivityMet}
            label="Streaming or watching live"
            detail={`Option A: Complete ${minStreams} live stream(s) — currently ${streamsDone}. Option B: Spend ${minLive} min watching or broadcasting — currently ${liveDone} min.`}
          />
          {!progress.liveActivityMet && (
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="rounded border bg-background p-2">
                <span className="text-muted-foreground">Streams</span>
                <p className="font-semibold tabular-nums">
                  {streamsDone} / {minStreams}
                </p>
              </div>
              <div className="rounded border bg-background p-2">
                <span className="text-muted-foreground">Live minutes</span>
                <p className="font-semibold tabular-nums">
                  {liveDone} / {minLive} min
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {!progress.readyForPayout && progress.remainingMinutes > 0 && (
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            About <strong>{progress.remainingMinutes} more minutes</strong> of app time needed
            {blockers.length > 0 ? ', plus the live activity above.' : '.'}
          </span>
        </p>
      )}

      {blockers.length > 0 && !progress.readyForPayout && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900 mb-1.5">What&apos;s still needed</p>
          <ul className="text-sm text-amber-900/90 list-disc pl-4 space-y-1">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ReferralCriteriaProgress;
