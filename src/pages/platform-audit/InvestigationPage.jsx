import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Loader2,
  ExternalLink,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const MATCH_LABELS = {
  transaction: 'Wallet transaction',
  user: 'User',
  stream: 'Stream',
  gift: 'Live gift',
  withdrawal: 'Withdrawal',
  purchase: 'Purchase',
  cascade: 'Fraud cascade',
};

const ISSUE_LABELS = {
  missing_reversal_target: 'Missing reversal target',
  missing_gift_pair: 'No paired stream earnings',
  MISSING_STREAM_EARNINGS: 'Missing stream earnings',
  DUPLICATE_STREAM_EARNINGS: 'Duplicate stream earnings',
  MISSING_GIFT_LEDGER: 'Missing gift ledger row',
  MISSING_WITHDRAW_LEDGER: 'Missing withdraw ledger row',
};

function PrimaryEntityCard({ primary, matchType }) {
  if (!primary) return null;

  const title =
    primary.label ||
    primary.name ||
    primary.title ||
    primary.email ||
    primary.id ||
    'Primary entity';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {MATCH_LABELS[matchType] ?? matchType}
            </p>
            <CardTitle className="mt-1 text-lg">{title}</CardTitle>
            {primary.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{primary.subtitle}</p>
            ) : null}
            {primary.email ? (
              <p className="mt-1 text-sm text-muted-foreground">{primary.email}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">ID: {primary.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {primary.status ? <AuditStatusBadge status={primary.status} /> : null}
            {primary.nodeType === 'wallet_transaction' && primary.userId ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/platform-audit/balance-explorer?userId=${primary.userId}`}>
                  Balance proof
                </Link>
              </Button>
            ) : null}
            {primary.nodeType === 'user' && primary.userId ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/users/${primary.userId}`}>
                  User details
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
            {primary.nodeType === 'cascade' && primary.cascadeId ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/fraud-cascade/${primary.cascadeId}`}>
                  Cascade detail
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        {primary.type ? (
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{primary.type}</p>
          </div>
        ) : null}
        {primary.amountUsd != null ? (
          <div>
            <p className="text-muted-foreground">Amount USD</p>
            <p className="font-medium">${Number(primary.amountUsd).toFixed(2)}</p>
          </div>
        ) : null}
        {primary.rubiesAmount != null ? (
          <div>
            <p className="text-muted-foreground">Rubies</p>
            <p className="font-medium">{formatNumber(primary.rubiesAmount)}</p>
          </div>
        ) : null}
        {primary.totalCoins != null ? (
          <div>
            <p className="text-muted-foreground">Gift coins</p>
            <p className="font-medium">{formatNumber(primary.totalCoins)}</p>
          </div>
        ) : null}
        {primary.createdAt ? (
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{formatDateTime(primary.createdAt)}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const InvestigationPage = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runInvestigation = useCallback(async (searchQuery) => {
    const trimmed = String(searchQuery ?? '').trim();
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters to investigate');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await platformAuditService.investigate(trimmed);
      setResult(data);
    } catch (err) {
      console.error('Investigation failed:', err);
      setResult(null);
      setError(err?.response?.data?.message || 'Investigation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    runInvestigation(query);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      runInvestigation(q);
    }
  }, [runInvestigation]);

  const stats = result?.stats ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only investigation workspace — trace linked wallet transactions, reversals,
          cascades, gifts, streams, and withdrawals from a single search.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Investigate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Transaction ID, user email, stream ID, gift ID, withdrawal ID, PayPal order ID"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Investigate'}
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-white p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building transaction graph…
        </div>
      ) : null}

      {result && !loading ? (
        <>
          <PrimaryEntityCard primary={result.primary} matchType={result.matchType} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PlatformAuditMetricCard title="Transactions" value={formatNumber(stats.transactionCount)} />
            <PlatformAuditMetricCard title="Linked entities" value={formatNumber(stats.entityCount)} />
            <PlatformAuditMetricCard title="Graph edges" value={formatNumber(stats.edgeCount)} />
            <PlatformAuditMetricCard
              title="Inconsistencies"
              value={formatNumber(stats.inconsistencyCount)}
              status={stats.inconsistencyCount > 0 ? 'failed' : 'pass'}
            />
          </div>

          {result.inconsistencies?.length > 0 ? (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-base">Inconsistencies</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.inconsistencies.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="rounded-lg border bg-amber-50/50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {ISSUE_LABELS[item.code] ?? item.code}
                      </span>
                      <AuditStatusBadge status="warning" />
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <CardTitle className="text-base">Related transactions</CardTitle>
              </div>
              {stats.capped ? (
                <p className="text-xs text-amber-700">
                  Graph capped at {formatNumber(stats.transactionCount)} transactions for performance.
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="p-0">
              {result.transactions?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Coins</TableHead>
                      <TableHead className="text-right">Rubies</TableHead>
                      <TableHead>Links</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.transactions.map((txn) => {
                      const hasIssues = txn.issues?.length > 0;
                      return (
                        <TableRow
                          key={txn.id}
                          className={hasIssues ? 'bg-amber-50/60' : undefined}
                        >
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(txn.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{txn.label}</p>
                              <p className="text-xs text-muted-foreground">{txn.type}</p>
                              <p className="text-xs text-muted-foreground">{txn.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {txn.userId ? (
                              <Link
                                to={`/platform-audit/balance-explorer?userId=${txn.userId}`}
                                className="text-sm text-primary hover:underline"
                              >
                                {txn.userId.slice(-8)}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(txn.coins)}</TableCell>
                          <TableCell className="text-right">{formatNumber(txn.rubies)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="space-y-1">
                              {txn.reversalOfTransactionId ? (
                                <p>Reversal of …{txn.reversalOfTransactionId.slice(-6)}</p>
                              ) : null}
                              {txn.cascadeId ? <p>Cascade …{txn.cascadeId.slice(-6)}</p> : null}
                              {txn.streamId ? <p>Stream …{txn.streamId.slice(-6)}</p> : null}
                              {txn.giftId ? <p>Gift …{txn.giftId.slice(-6)}</p> : null}
                              {txn.withdrawRequestId ? (
                                <p>Withdraw …{txn.withdrawRequestId.slice(-6)}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasIssues ? (
                              <div className="space-y-1">
                                {txn.issues.map((issue) => (
                                  <p key={issue} className="text-xs font-medium text-amber-800">
                                    {ISSUE_LABELS[issue] ?? issue}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <AuditStatusBadge status="pass" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No related transactions found.</p>
              )}
            </CardContent>
          </Card>

          {result.edges?.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Graph edges (v1)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>Relation</TableHead>
                      <TableHead>To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.edges.slice(0, 50).map((edge, index) => (
                      <TableRow key={`${edge.from}-${edge.to}-${edge.relation}-${index}`}>
                        <TableCell className="font-mono text-xs">{edge.from}</TableCell>
                        <TableCell className="text-sm">{edge.relation}</TableCell>
                        <TableCell className="font-mono text-xs">{edge.to}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Investigation generated {formatDateTime(result.generatedAt)} · match type{' '}
            {result.matchType}
          </p>
        </>
      ) : null}
    </div>
  );
};

export default InvestigationPage;
