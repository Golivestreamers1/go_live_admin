import { Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const fmtNum = (n) => Number(n || 0).toLocaleString();

const CONFIDENCE_STYLES = {
  GREEN: 'bg-green-100 text-green-800 border-green-200',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-200',
  RED: 'bg-red-100 text-red-800 border-red-200',
};

const FLAG_SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-gray-200 bg-gray-50',
};

function EvidenceTable({ evidence }) {
  if (!evidence || typeof evidence !== 'object') return null;
  return (
    <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
      {Object.entries(evidence).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="text-muted-foreground shrink-0">{key}:</dt>
          <dd className="font-mono tabular-nums break-all">
            {value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
              ? new Date(value).toLocaleString()
              : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function EarningsSummaryPanel({
  lifetimeAudit,
  integrityCheck,
  loading,
  reconciling,
  onRefresh,
  onReconcile,
  allowReconcile = true,
  title = 'Earnings & integrity',
  description = 'Ledger-backed earnings summary, spendable balance drift, and integrity flags with numeric evidence.',
}) {
  const confidence = integrityCheck?.confidence || '—';
  const balance = integrityCheck?.balance;
  const flags = integrityCheck?.flags || [];
  const canReconcile = lifetimeAudit && lifetimeAudit.lifetimeRubies?.diff !== 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              {integrityCheck ? (
                <Badge
                  variant="outline"
                  className={`text-sm font-semibold ${CONFIDENCE_STYLES[confidence] || ''}`}
                >
                  {confidence === 'GREEN' ? '🟢' : confidence === 'YELLOW' ? '🟡' : '🔴'}{' '}
                  {confidence}
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Refresh'}
            </Button>
            {allowReconcile ? (
              <Button size="sm" onClick={onReconcile} disabled={reconciling || !canReconcile}>
                {reconciling ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1" /> Reconciling
                  </>
                ) : (
                  'Reconcile lifetime'
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !lifetimeAudit && !integrityCheck ? (
          <div className="flex justify-center p-6">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : !lifetimeAudit && !integrityCheck ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Click Refresh to load the audit.
          </p>
        ) : (
          <>
            {balance ? (
              <div className="rounded-md border p-3">
                <p className="text-sm font-semibold mb-2">Spendable rubies (balance)</p>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Stored (user.rubies)</p>
                    <p className="font-bold tabular-nums">{fmtNum(balance.storedRubies)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ledger sum</p>
                    <p className="font-bold tabular-nums text-blue-700">{fmtNum(balance.ledgerRubies)}</p>
                  </div>
                  <div
                    className={
                      balance.drift === 0 ? 'text-green-700' : 'text-rose-700'
                    }
                  >
                    <p className="text-xs text-muted-foreground">Drift</p>
                    <p className="font-bold tabular-nums">
                      {balance.drift > 0 ? '+' : ''}
                      {fmtNum(balance.drift)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {lifetimeAudit ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Lifetime stored</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                      {fmtNum(lifetimeAudit.lifetimeRubies?.stored)}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Lifetime expected</p>
                    <p className="mt-1 text-xl font-bold text-blue-700 tabular-nums">
                      {fmtNum(lifetimeAudit.lifetimeRubies?.expected)}
                    </p>
                  </div>
                  <div
                    className={`rounded-md border p-3 ${
                      lifetimeAudit.lifetimeRubies?.diff === 0
                        ? 'bg-green-50'
                        : lifetimeAudit.lifetimeRubies?.diff > 0
                          ? 'bg-amber-50'
                          : 'bg-rose-50'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">Lifetime diff</p>
                    <p
                      className={`mt-1 text-xl font-bold tabular-nums ${
                        lifetimeAudit.lifetimeRubies?.diff === 0
                          ? 'text-green-700'
                          : lifetimeAudit.lifetimeRubies?.diff > 0
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {lifetimeAudit.lifetimeRubies?.diff > 0 ? '+' : ''}
                      {fmtNum(lifetimeAudit.lifetimeRubies?.diff)}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border p-3 text-sm">
                  <p className="font-semibold mb-2">Earnings by type</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">stream_earnings</p>
                      <p className="font-medium tabular-nums">
                        +{fmtNum(lifetimeAudit.breakdown?.creditsByType?.stream_earnings?.rubies)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">spin_wheel_win</p>
                      <p className="font-medium tabular-nums text-purple-700">
                        +{fmtNum(lifetimeAudit.breakdown?.creditsByType?.spin_wheel_win?.rubies)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">conversion</p>
                      <p className="font-medium tabular-nums">
                        +{fmtNum(lifetimeAudit.breakdown?.creditsByType?.conversion?.rubies)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">gift_received</p>
                      <p className="font-medium tabular-nums">
                        +{fmtNum(lifetimeAudit.breakdown?.creditsByType?.gift_received?.rubies)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">referral</p>
                      <p className="font-medium tabular-nums">
                        +{fmtNum(lifetimeAudit.breakdown?.creditsByType?.referral?.rubies)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total credits</p>
                      <p className="font-medium tabular-nums">
                        +{fmtNum(lifetimeAudit.breakdown?.totalCredits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Post-settlement reversals (
                        {lifetimeAudit.breakdown?.postSettlementReversalsCount || 0})
                      </p>
                      <p className="font-medium tabular-nums text-rose-700">
                        −{fmtNum(lifetimeAudit.breakdown?.postSettlementReversalsTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">= Expected lifetime</p>
                      <p className="font-semibold tabular-nums text-blue-700">
                        {fmtNum(lifetimeAudit.lifetimeRubies?.expected)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="rounded-md border p-3">
              <p className="text-sm font-semibold mb-2">
                Integrity flags {flags.length ? `(${flags.length})` : ''}
              </p>
              {flags.length === 0 ? (
                <p className="text-sm text-green-700">No flags — system checks passed.</p>
              ) : (
                <ul className="space-y-3">
                  {flags.map((flag) => (
                    <li
                      key={flag.id}
                      className={`rounded-md border p-3 ${FLAG_SEVERITY_STYLES[flag.severity] || ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {flag.id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {flag.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm">{flag.message}</p>
                      <EvidenceTable evidence={flag.evidence} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
