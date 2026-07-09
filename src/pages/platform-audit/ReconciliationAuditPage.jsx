import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import IntegrityOverview from '../../components/platform-audit/IntegrityOverview';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { getConfidenceLabel } from '../../components/platform-audit/integrityCheckCopy';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const CHECK_ORDER = [
  'I1_COIN_STOCK',
  'I2_RUBY_STOCK',
  'I3_REFERENTIAL',
  'E3_UNSETTLED_GIFTS',
  'E4_GIFT_SETTLEMENT',
  'E5_CONVERSION',
  'W1_SPIN_WHEEL',
];

const CHECK_META = {
  I1_COIN_STOCK: { shortId: 'I1', name: 'Coin Stock', panel: 'A' },
  I2_RUBY_STOCK: { shortId: 'I2', name: 'Ruby Stock', panel: 'A' },
  I3_REFERENTIAL: { shortId: 'I3', name: 'Referential Integrity', panel: 'A' },
  E3_UNSETTLED_GIFTS: { shortId: 'E3', name: 'Unsettled Gifts', panel: 'B' },
  E4_GIFT_SETTLEMENT: { shortId: 'E4', name: 'Gift Settlement', panel: 'B' },
  E5_CONVERSION: { shortId: 'E5', name: 'Conversion Conservation', panel: 'B' },
  W1_SPIN_WHEEL: { shortId: 'W1', name: 'Wheel Conservation', panel: 'B' },
};

function toDashboardStatus(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'WARN') return 'warning';
  if (status === 'NOT_APPLICABLE') return 'not_applicable';
  return 'failed';
}

function buildCheckSummary(check) {
  const evidence = check?.evidence ?? {};
  switch (check.id) {
    case 'I1_COIN_STOCK':
      return `Ledger ${evidence.ledgerCoinsTotal} vs stored ${evidence.storedCoinsTotal} (Δ ${evidence.diff})`;
    case 'I2_RUBY_STOCK':
      return `Ledger ${evidence.ledgerRubiesTotal} vs stored ${evidence.storedRubiesTotal} (Δ ${evidence.diff})`;
    case 'I3_REFERENTIAL':
      return `Post-cutoff orphans ${evidence.postCutoffOrphans}, pre-cutoff ${evidence.preCutoffOrphans}`;
    default:
      return check.status;
  }
}

function mapReportToIntegrityData(report) {
  const allChecks = [
    ...(report?.ledgerIntegrity?.checks ?? []),
    ...(report?.economicFlow?.checks ?? []),
  ];
  const byId = Object.fromEntries(allChecks.map((c) => [c.id, c]));
  const lastChecked = report?.generatedAt ?? null;

  const checks = CHECK_ORDER.filter((id) => byId[id]).map((id) => {
    const check = byId[id];
    const meta = CHECK_META[id] ?? { shortId: id, name: id, panel: '?' };
    return {
      id: check.id,
      shortId: meta.shortId,
      name: meta.name,
      panel: meta.panel,
      status: toDashboardStatus(check.status),
      result: check.status,
      lastChecked,
      summary: buildCheckSummary(check),
      details: check.evidence ?? {},
    };
  });

  const summary = { pass: 0, warning: 0, failed: 0, notApplicable: 0 };
  for (const check of checks) {
    if (check.status === 'pass') summary.pass += 1;
    else if (check.status === 'warning') summary.warning += 1;
    else if (check.status === 'not_applicable') summary.notApplicable += 1;
    else summary.failed += 1;
  }

  return {
    confidence: report?.confidence,
    lastReconciliationSnapshotAt: lastChecked,
    checks,
    summary,
  };
}

function confidenceToAuditScore(confidence) {
  if (confidence === 'GREEN') return { percentage: 100, status: 'healthy' };
  if (confidence === 'YELLOW') return { percentage: 85, status: 'attention' };
  return { percentage: 50, status: 'critical' };
}

function snapshotStatusBadge(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'WARN') return 'warning';
  if (status === 'NOT_APPLICABLE') return 'not_applicable';
  return 'failed';
}

const ReconciliationAuditPage = () => {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, historyData] = await Promise.all([
        platformAuditService.getReconciliationSummary(),
        platformAuditService.getReconciliationHistory({ days: 30 }),
      ]);
      setSummary(summaryData);
      setHistory(historyData?.snapshots ?? []);
    } catch (err) {
      console.error('Failed to load reconciliation audit:', err);
      setError('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const integrityData = useMemo(() => mapReportToIntegrityData(summary), [summary]);
  const auditScore = useMemo(
    () => confidenceToAuditScore(summary?.confidence),
    [summary?.confidence]
  );

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <Button className="mt-3" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  const lifetimeFlow = summary?.lifetimeFlow;
  const exposure = summary?.economicExposure;
  const fleet = summary?.fleetIntegrity;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only platform reconciliation — verifies ledger integrity and economic flow.
          Generated live from the wallet audit engine; does not modify balances.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          <PlatformAuditMetricCard
            title="Confidence"
            value={loading ? '—' : getConfidenceLabel(summary?.confidence)}
            status={auditScore.status === 'healthy' ? 'pass' : auditScore.status === 'attention' ? 'warning' : 'failed'}
            loading={loading}
          />
          <PlatformAuditMetricCard
            title="Checks run"
            value={formatNumber(integrityData.checks.length)}
            loading={loading}
          />
          <PlatformAuditMetricCard
            title="Execution time"
            value={loading ? '—' : `${formatNumber(summary?.executionTimeMs ?? 0)} ms`}
            loading={loading}
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <IntegrityOverview data={integrityData} auditScore={auditScore} loading={loading} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reconciliation history (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily snapshots recorded yet.</p>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>I1 Coins</TableHead>
                    <TableHead>I2 Rubies</TableHead>
                    <TableHead>I3 Links</TableHead>
                    <TableHead>Coin lifetime Δ</TableHead>
                    <TableHead>Ruby lifetime Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.runDate ?? row._id}>
                      <TableCell className="text-sm">{row.runDate}</TableCell>
                      <TableCell>
                        <AuditStatusBadge
                          status={
                            row.confidence === 'GREEN'
                              ? 'pass'
                              : row.confidence === 'YELLOW'
                                ? 'warning'
                                : 'failed'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <AuditStatusBadge status={snapshotStatusBadge(row.checkStatuses?.I1_COIN_STOCK)} />
                      </TableCell>
                      <TableCell>
                        <AuditStatusBadge status={snapshotStatusBadge(row.checkStatuses?.I2_RUBY_STOCK)} />
                      </TableCell>
                      <TableCell>
                        <AuditStatusBadge status={snapshotStatusBadge(row.checkStatuses?.I3_REFERENTIAL)} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(row.lifetimeFlow?.coinLifetimeDiff ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(row.lifetimeFlow?.rubyLifetimeDiff ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowDetails((v) => !v)}
          >
            <CardTitle className="text-base">Details</CardTitle>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {showDetails ? (
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Generated at</span>
                <p>{formatDateTime(summary?.generatedAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Audit version</span>
                <p>{summary?.auditVersion ?? '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Transactions scanned</span>
                <p>{formatNumber(summary?.coverage?.walletTransactionsScanned ?? 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unsupported types</span>
                <p>{formatNumber(summary?.coverage?.unsupportedTypes ?? 0)}</p>
              </div>
            </div>

            {lifetimeFlow ? (
              <div>
                <p className="mb-2 font-medium">Lifetime flow</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(lifetimeFlow, null, 2)}
                </pre>
              </div>
            ) : null}

            {exposure ? (
              <div>
                <p className="mb-2 font-medium">Economic exposure</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(exposure, null, 2)}
                </pre>
              </div>
            ) : null}

            {fleet ? (
              <div>
                <p className="mb-2 font-medium">Fleet integrity scan</p>
                <p>
                  Scanned {formatNumber(fleet.scannedUsers)} users ·{' '}
                  {formatNumber(fleet.green)} OK · {formatNumber(fleet.yellow)} review ·{' '}
                  {formatNumber(fleet.red)} issue
                </p>
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
};

export default ReconciliationAuditPage;
