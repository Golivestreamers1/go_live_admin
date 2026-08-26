import { Link } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import EarningsSummaryPanel from './EarningsSummaryPanel';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const fmtNum = (n) => Number(n || 0).toLocaleString();
const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

/**
 * Maps withdraw audit API payload into shapes expected by EarningsSummaryPanel.
 */
function mapAuditToPanelProps(audit) {
  if (!audit) return { lifetimeAudit: null, integrityCheck: null };
  return {
    lifetimeAudit: {
      lifetimeRubies: {
        stored: audit.lifetime?.stored,
        expected: audit.lifetime?.expected,
        diff: audit.lifetime?.diff,
      },
      breakdown: {
        creditsByType: audit.lifetime?.creditsByType,
        totalCredits: audit.lifetime?.totalCredits,
        postSettlementReversalsTotal: audit.lifetime?.postSettlementReversalsTotal,
        postSettlementReversalsCount: audit.lifetime?.postSettlementReversalsCount,
      },
    },
    integrityCheck: {
      confidence: audit.confidence,
      balance: audit.balances,
      flags: audit.flags,
    },
  };
}

/**
 * Withdraw audit screen — live "See Audit" (pending) or frozen approval snapshot (approved).
 * Read-only; does not approve or change balances.
 */
export default function WithdrawAuditView({
  audit,
  loading,
  onRefresh,
  userId,
  frozenSnapshot = null,
}) {
  const isFrozen = Boolean(frozenSnapshot);
  const auditData = frozenSnapshot?.auditPayload || audit;
  const { lifetimeAudit, integrityCheck } = mapAuditToPanelProps(auditData);
  const wr = auditData?.withdrawRequest;
  const projection = auditData?.projection;
  const auditVersion = frozenSnapshot?.auditVersion || auditData?.auditVersion;

  return (
    <div className="space-y-4">
      {isFrozen ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Lock className="size-4 text-emerald-700" />
              <CardTitle className="text-lg">Approval audit snapshot</CardTitle>
              <Badge variant="outline" className="text-xs">
                Immutable
              </Badge>
            </div>
            <CardDescription>
              Audit v{auditVersion || '—'} · approved {fmtDate(frozenSnapshot?.approvedAt)} · balances
              frozen at pre-deduct state
            </CardDescription>
          </CardHeader>
          {frozenSnapshot?.approvalNote ? (
            <CardContent>
              <p className="text-xs text-muted-foreground">Approval note</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{frozenSnapshot.approvalNote}</p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card className={isFrozen ? 'border-gray-200' : 'border-blue-200 bg-blue-50/30'}>
        <CardHeader>
          <CardTitle className="text-lg">
            {isFrozen ? 'Withdraw approved' : 'Withdraw under review'}
          </CardTitle>
          <CardDescription>
            Audit v{auditVersion || '—'} ·{' '}
            {isFrozen
              ? `captured ${auditData?.generatedAt ? fmtDate(auditData.generatedAt) : '—'}`
              : `generated ${auditData?.generatedAt ? fmtDate(auditData.generatedAt) : '—'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Cashout (USD)</p>
            <p className="font-bold">{fmtUsd(wr?.amountUsd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rubies requested</p>
            <p className="font-bold tabular-nums">{fmtNum(wr?.rubiesAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isFrozen ? 'Rubies after approval (at review)' : 'Rubies after approval'}
            </p>
            <p
              className={`font-bold tabular-nums ${
                projection?.sufficientBalance ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {fmtNum(projection?.rubiesAfterApproval)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">PayPal</p>
            <p className="font-medium break-all text-xs">{wr?.paypalEmail || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <EarningsSummaryPanel
        lifetimeAudit={lifetimeAudit}
        integrityCheck={integrityCheck}
        loading={loading}
        reconciling={false}
        onRefresh={onRefresh}
        onReconcile={() => {}}
        allowReconcile={false}
        title="Streamer earnings & integrity"
        description={
          isFrozen
            ? 'Frozen calculator output from approval time — not recalculated from live ledger.'
            : 'Same calculators as the user Wallet tab — use this to verify the cashout is explainable from the ledger.'
        }
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Recent ledger (excerpt)</CardTitle>
            <CardDescription>Newest {auditData?.ledgerExcerpt?.length || 0} wallet rows</CardDescription>
          </div>
          {userId ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/users/${userId}?tab=ledger`}>Open full ledger</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading && !auditData ? (
            <div className="flex justify-center p-6">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          ) : !auditData?.ledgerExcerpt?.length ? (
            <p className="text-sm text-muted-foreground">No ledger rows.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Rubies</TableHead>
                  <TableHead className="text-right">Coins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.ledgerExcerpt.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{row.label || row.type}</p>
                      {row.subtitle ? (
                        <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.rubies ? (row.rubies > 0 ? `+${fmtNum(row.rubies)}` : fmtNum(row.rubies)) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.coins ? (row.coins > 0 ? `+${fmtNum(row.coins)}` : fmtNum(row.coins)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isFrozen && auditData?.relatedPendingWithdraws?.length > 0 ? (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base">Other pending withdraws</CardTitle>
            <CardDescription>Same user has additional pending requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditData.relatedPendingWithdraws.map((row) => (
              <div key={row._id} className="flex flex-wrap items-center gap-2 text-sm border rounded p-2">
                <Badge variant="outline">{fmtUsd(row.amountUsd)}</Badge>
                <span className="tabular-nums">{fmtNum(row.rubiesAmount)} rubies</span>
                <span className="text-muted-foreground text-xs">{fmtDate(row.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
