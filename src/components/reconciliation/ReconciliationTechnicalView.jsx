import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { buildAccountabilitySummary } from '../../lib/reconciliationAccountability';
import AccountabilityEquationsPanel from './AccountabilityEquationsPanel';

const CONFIDENCE_STYLES = {
  GREEN: 'bg-green-100 text-green-800 border-green-200',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-200',
  RED: 'bg-red-100 text-red-800 border-red-200',
};

const CHECK_STATUS_STYLES = {
  PASS: 'bg-green-50/80 text-green-900 border-green-200',
  WARN: 'bg-amber-50/80 text-amber-900 border-amber-200',
  FAIL: 'bg-red-50/80 text-red-900 border-red-200',
  NOT_APPLICABLE: 'bg-gray-50 text-gray-600 border-gray-200',
};

const CHECK_LEFT_BORDER = {
  PASS: 'border-l-4 border-l-green-500',
  WARN: 'border-l-4 border-l-amber-500',
  FAIL: 'border-l-4 border-l-red-500',
  NOT_APPLICABLE: 'border-l-4 border-l-gray-300',
};

const CHECK_STATUS_DOT = {
  PASS: '🟩',
  WARN: '🟨',
  FAIL: '🟥',
  NOT_APPLICABLE: '⬜',
};

const CHECK_LABELS = {
  I1_COIN_STOCK: 'I1 — Coin stock',
  I2_RUBY_STOCK: 'I2 — Ruby stock',
  I3_REFERENTIAL: 'I3 — Referential integrity',
  E3_UNSETTLED_GIFTS: 'E3 — Unsettled gifts',
  E4_GIFT_SETTLEMENT: 'E4 — Gift settlement',
  E5_CONVERSION: 'E5 — Conversion',
  W1_SPIN_WHEEL: 'W1 — Spin wheel',
};

const CHECK_PRIMARY_LABELS = {
  I1_COIN_STOCK: 'I1 Coin Stock',
  I2_RUBY_STOCK: 'I2 Ruby Stock',
  I3_REFERENTIAL: 'I3 Referential Integrity',
  E3_UNSETTLED_GIFTS: 'E3 Unsettled Gifts',
  E4_GIFT_SETTLEMENT: 'E4 Gift Settlement',
  E5_CONVERSION: 'E5 Conversion',
  W1_SPIN_WHEEL: 'W1 Spin Wheel',
};

const CHECK_ORDER = [
  'I1_COIN_STOCK',
  'I2_RUBY_STOCK',
  'I3_REFERENTIAL',
  'E3_UNSETTLED_GIFTS',
  'E4_GIFT_SETTLEMENT',
  'E5_CONVERSION',
  'W1_SPIN_WHEEL',
];

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-US');
const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtPct = (coverage) => {
  const scanned = Number(coverage?.walletTransactionsScanned) || 0;
  const classified = Number(coverage?.classified) || 0;
  if (!scanned) return '100%';
  return `${Math.round((classified / scanned) * 100)}%`;
};

function sortChecks(checks) {
  const order = new Map(CHECK_ORDER.map((id, i) => [id, i]));
  return [...checks].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

function getPrimaryFindings(checksA, checksB, confidence) {
  if (confidence === 'GREEN') return [];
  const status = confidence === 'YELLOW' ? 'WARN' : 'FAIL';
  const items = [...sortChecks(checksA), ...sortChecks(checksB)].filter((c) => c.status === status);
  return items.map((c) => CHECK_PRIMARY_LABELS[c.id] || c.id);
}

function formatEvidenceScalar(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return fmtNum(value);
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return fmtNum(Number(value));
  }
  return String(value);
}

function flattenEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return [];
  const rows = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (value == null) continue;
    if (key === 'subChecks' && typeof value === 'object') {
      for (const [subKey, subVal] of Object.entries(value)) {
        if (typeof subVal === 'object' && subVal != null) {
          rows.push([
            subKey,
            `orphans ${fmtNum(subVal.orphanCount ?? 0)} (post-cutoff ${fmtNum(subVal.postCutoffOrphans ?? 0)})`,
          ]);
        } else {
          rows.push([subKey, formatEvidenceScalar(subVal)]);
        }
      }
    } else if (typeof value !== 'object') {
      rows.push([key, formatEvidenceScalar(value)]);
    }
  }
  return rows;
}

function CheckList({ checks, cutoffNote }) {
  if (!checks?.length) {
    return <p className="text-sm text-muted-foreground">No checks.</p>;
  }

  return (
    <ul className="space-y-3">
      {sortChecks(checks).map((check) => {
        const evidenceRows = flattenEvidence(check.evidence);
        return (
          <li
            key={check.id}
            id={`check-${check.id}`}
            className={`rounded-lg border p-3 pl-3 scroll-mt-24 ${CHECK_STATUS_STYLES[check.status] || 'border-gray-200'} ${CHECK_LEFT_BORDER[check.status] || ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-sm flex items-center gap-2">
                <span aria-hidden="true">{CHECK_STATUS_DOT[check.status]}</span>
                {CHECK_LABELS[check.id] || check.id}
              </span>
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {check.status}
              </Badge>
            </div>
            {check.id === 'I3_REFERENTIAL' && cutoffNote ? (
              <p className="text-xs text-muted-foreground mt-2 ml-6">
                Legacy policy: orphans before {cutoffNote} → WARN only; on/after cutoff → FAIL.
              </p>
            ) : null}
            {evidenceRows.length ? (
              <dl className="mt-2 ml-6 grid gap-1 text-xs sm:grid-cols-2">
                {evidenceRows.map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="text-muted-foreground shrink-0">{key}:</dt>
                    <dd className="font-mono tabular-nums break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PlatformEconomicsBlock({ pe }) {
  const conversion = Number(pe.internalValueCapture?.conversionHaircutRubies) || 0;
  const giftCommission = Number(pe.internalValueCapture?.giftCommissionRubies) || 0;
  const captureTotal = conversion + giftCommission;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Internal value capture</h4>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Conversion haircut (rubies)</dt>
            <dd className="font-mono tabular-nums shrink-0">{fmtNum(conversion)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Gift commission (rubies)</dt>
            <dd className="font-mono tabular-nums shrink-0">{fmtNum(giftCommission)}</dd>
          </div>
        </dl>
        <div className="border-t pt-2 flex justify-between gap-4 text-sm font-semibold">
          <span>Total (rubies)</span>
          <span className="font-mono tabular-nums">{fmtNum(captureTotal)}</span>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Promotions cost</h4>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Referral rubies</dt>
            <dd className="font-mono tabular-nums shrink-0">
              {fmtNum(pe.promotionsCost?.referralRubies)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Raffle coins</dt>
            <dd className="font-mono tabular-nums shrink-0">{fmtNum(pe.promotionsCost?.raffleCoins)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Admin grant coins</dt>
            <dd className="font-mono tabular-nums shrink-0">
              {fmtNum(pe.promotionsCost?.adminGrantCoins)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function ReconciliationTechnicalView({ data }) {
  const checksA = data?.ledgerIntegrity?.checks || [];
  const checksB = data?.economicFlow?.checks || [];
  const allChecks = [...checksA, ...checksB];
  const fails = allChecks.filter((c) => c.status === 'FAIL').length;
  const warns = allChecks.filter((c) => c.status === 'WARN').length;
  const primaryFindings = getPrimaryFindings(checksA, checksB, data.confidence);
  const pe = data?.lifetimeFlow?.platformEconomics || {};
  const accountability = buildAccountabilitySummary(data);
  const exposure = data?.economicExposure || {};
  const wl = exposure.withdrawLiability || {};

  return (
    <div className="space-y-6 pt-2 border-t">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className={CONFIDENCE_STYLES[data.confidence] || ''}>
          <CardHeader className="pb-2">
            <CardDescription>Confidence</CardDescription>
            <CardTitle className="text-4xl font-bold tracking-tight">{data.confidence || '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Audit version</CardDescription>
            <CardTitle className="text-lg">{data.auditVersion || '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rows analyzed</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {fmtNum(data.coverage?.walletTransactionsScanned)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Coverage</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtPct(data.coverage)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Execution</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtNum(data.executionTimeMs)} ms</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Generated</CardDescription>
            <CardTitle className="text-sm font-normal">{fmtDate(data.generatedAt)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit summary</CardTitle>
          <CardDescription>Panels A & B only — failures drive RED</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  data.confidence === 'GREEN'
                    ? 'text-green-700'
                    : data.confidence === 'YELLOW'
                      ? 'text-amber-700'
                      : 'text-red-700'
                }`}
              >
                {data.confidence}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failures</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-700">{fmtNum(fails)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Warnings</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{fmtNum(warns)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Primary findings
            </p>
            {primaryFindings.length ? (
              <ul className="text-sm space-y-1">
                {primaryFindings.map((label) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No findings.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="panel-a">
          <CardHeader>
            <CardTitle>Panel A — Ledger integrity</CardTitle>
            <CardDescription>I1 coin stock · I2 ruby stock · I3 referential links</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckList checks={checksA} cutoffNote={data.refIntegrityCutoffDate} />
          </CardContent>
        </Card>

        <Card id="panel-b">
          <CardHeader>
            <CardTitle>Panel B — Economic flow</CardTitle>
            <CardDescription>E3 gifts · E4 settlement · E5 conversion · W1 wheel</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckList checks={checksB} />
          </CardContent>
        </Card>
      </div>

      <Card id="panel-c">
        <CardHeader>
          <CardTitle>Panel C — Platform accountability</CardTitle>
          <CardDescription>
            Lifetime balance equations — created must equal accounted for (informational)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AccountabilityEquationsPanel accountability={accountability} />
          <PlatformEconomicsBlock pe={pe} />
        </CardContent>
      </Card>

      <Card id="panel-d">
        <CardHeader>
          <CardTitle>Panel D — Economic exposure</CardTitle>
          <CardDescription>
            Estimate only — not a PASS/FAIL check. {exposure.disclaimer || ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardDescription>Pending withdraw</CardDescription>
                <CardTitle className="text-xl tabular-nums">{fmtUsd(wl.pendingUsd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                Rubies not yet deducted
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardDescription>Approved unpaid</CardDescription>
                <CardTitle className="text-xl tabular-nums">{fmtUsd(wl.approvedUnpaidUsd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                Rubies deducted · PayPal not sent
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardDescription>Paid (bookkeeping)</CardDescription>
                <CardTitle className="text-xl tabular-nums">{fmtUsd(wl.paidUsd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                PayPal marked sent in audit log
              </CardContent>
            </Card>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between border rounded px-3 py-2">
              <dt className="text-muted-foreground">USD in (purchases)</dt>
              <dd className="font-mono tabular-nums">{fmtUsd(exposure.usdIn)}</dd>
            </div>
            <div className="flex justify-between border rounded px-3 py-2">
              <dt className="text-muted-foreground">USD out (withdraws)</dt>
              <dd className="font-mono tabular-nums">{fmtUsd(exposure.usdOut)}</dd>
            </div>
            <div className="flex justify-between border rounded px-3 py-2">
              <dt className="text-muted-foreground">Outstanding liability</dt>
              <dd className="font-mono tabular-nums">{fmtUsd(exposure.outstandingLiabilityUsd)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Per-user drift and flags:{' '}
        <Link to="/integrity" className="text-amber-700 underline underline-offset-2">
          Open fleet integrity dashboard →
        </Link>
      </p>
    </div>
  );
}
