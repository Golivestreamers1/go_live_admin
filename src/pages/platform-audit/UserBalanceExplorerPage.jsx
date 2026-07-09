import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Loader2,
  Coins,
  Gem,
  Trophy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import PlatformAuditMetricCard from '../../components/platform-audit/PlatformAuditMetricCard';
import LedgerSummaryPanel from '../../components/platform-audit/LedgerSummaryPanel';
import AuditStatusBadge from '../../components/platform-audit/AuditStatusBadge';
import { formatDateTime, formatNumber } from '../../components/platform-audit/formatters';
import { getConfidenceLabel } from '../../components/platform-audit/integrityCheckCopy';
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

const FLAG_LABELS = {
  BALANCE_DRIFT: 'Spendable balance mismatch',
  LIFETIME_DRIFT: 'Lifetime rubies mismatch',
  MYSTERY_BUG_ROW: 'Mystery wheel over-credit',
  DUPLICATE_PENDING_WITHDRAW: 'Multiple pending withdrawals',
  ADMIN_TRANSFER: 'Admin coin adjustments',
};

const confidenceToBadge = (confidence) => {
  const key = String(confidence || 'GREEN').toUpperCase();
  if (key === 'YELLOW') return 'warning';
  if (key === 'RED') return 'failed';
  return 'pass';
};

const UserBalanceExplorerPage = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [proof, setProof] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState(null);

  const loadBalanceProof = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setProofLoading(true);
      setProofError(null);
      const data = await platformAuditService.getBalanceProof(userId);
      setProof(data);
      setSelectedUserId(userId);
    } catch (err) {
      console.error('Failed to load balance proof:', err);
      setProof(null);
      setProofError('Failed to load balance proof for this user');
    } finally {
      setProofLoading(false);
    }
  }, []);

  const runSearch = async (event) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters to search');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);
      const data = await platformAuditService.searchUsers(trimmed);
      setSearchResults(data);

      if (data.users?.length === 1) {
        await loadBalanceProof(data.users[0].id);
      } else {
        setProof(null);
        setSelectedUserId(null);
      }
    } catch (err) {
      console.error('User search failed:', err);
      setSearchResults(null);
      setSearchError(err?.response?.data?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    if (userId) {
      loadBalanceProof(userId);
    }
  }, [loadBalanceProof]);

  const wallet = proof?.currentWallet ?? {};
  const integrity = proof?.integrity ?? {};
  const confidence = integrity.confidence ?? 'GREEN';

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Read-only balance explorer — search any user and verify coins, rubies, and lifetime
          rubies against their full ledger history. Does not modify balances.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search users</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email, name, username, or user ID"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
          {searchError ? (
            <p className="mt-3 text-sm text-red-600">{searchError}</p>
          ) : null}
        </CardContent>
      </Card>

      {searchResults?.users?.length > 1 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {searchResults.count} match{searchResults.count === 1 ? '' : 'es'} for &ldquo;
              {searchResults.query}&rdquo;
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Coins</TableHead>
                  <TableHead className="text-right">Rubies</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{user.name || '—'}</p>
                        {user.username ? (
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right">{formatNumber(user.coins)}</TableCell>
                    <TableCell className="text-right">{formatNumber(user.rubies)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={selectedUserId === user.id ? 'default' : 'outline'}
                        onClick={() => loadBalanceProof(user.id)}
                      >
                        View proof
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {searchResults?.users?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-muted-foreground">No users matched your search.</p>
        </div>
      ) : null}

      {proofLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-white p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading balance proof…
        </div>
      ) : null}

      {proofError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">{proofError}</p>
        </div>
      ) : null}

      {proof && !proofLoading ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{proof.user?.name || 'User'}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{proof.user?.email}</p>
                  {proof.user?.username ? (
                    <p className="text-xs text-muted-foreground">@{proof.user.username}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    User ID: {proof.user?.id} · Joined {formatDateTime(proof.user?.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AuditStatusBadge status={confidenceToBadge(confidence)} />
                  <span className="text-sm text-muted-foreground">
                    {getConfidenceLabel(confidence)}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/users/${proof.user?.id}`}>
                      Full user ledger
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PlatformAuditMetricCard
                  title="Coins (stored)"
                  value={formatNumber(wallet.coins)}
                  status={proof.integrity?.balance?.coinsDrift === 0 ? 'pass' : 'failed'}
                />
                <PlatformAuditMetricCard
                  title="Rubies (stored)"
                  value={formatNumber(wallet.rubies)}
                  status={proof.integrity?.balance?.drift === 0 ? 'pass' : 'failed'}
                />
                <PlatformAuditMetricCard
                  title="Lifetime rubies"
                  value={formatNumber(wallet.lifetimeRubies)}
                  status={proof.balanceProof?.lifetime?.difference === 0 ? 'pass' : 'failed'}
                />
                <PlatformAuditMetricCard
                  title="Ledger rows"
                  value={formatNumber(proof.transactionCount)}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    Ledger coins
                  </div>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(proof.integrity?.balance?.ledgerCoins)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drift {formatNumber(proof.integrity?.balance?.coinsDrift)}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gem className="h-4 w-4" />
                    Ledger rubies
                  </div>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(proof.integrity?.balance?.ledgerRubies)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drift {formatNumber(proof.integrity?.balance?.drift)}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    Expected lifetime
                  </div>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(proof.balanceProof?.lifetime?.expected)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Δ {formatNumber(proof.balanceProof?.lifetime?.difference)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {integrity.flags?.length > 0 ? (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-base">Integrity flags</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrity.flags.map((flag) => (
                  <div key={flag.id} className="rounded-lg border bg-amber-50/50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {FLAG_LABELS[flag.id] ?? flag.id}
                      </span>
                      <AuditStatusBadge
                        status={flag.severity === 'high' ? 'failed' : 'warning'}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{flag.message}</p>
                    {flag.evidence ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-gray-700">
                        {JSON.stringify(flag.evidence, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LedgerSummaryPanel variant="coin" data={proof.balanceProof?.coins} />
            <LedgerSummaryPanel variant="ruby" data={proof.balanceProof?.rubies} />
          </div>

          {proof.balanceProof?.lifetime?.creditsByType?.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lifetime rubies by source</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Rubies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proof.balanceProof.lifetime.creditsByType.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.rubies)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {proof.categories?.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ledger breakdown by type</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Net coins</TableHead>
                      <TableHead className="text-right">Net rubies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proof.categories.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{row.label}</p>
                            <p className="text-xs text-muted-foreground">{row.type}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.netCoins)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.netRubies)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Balance proof generated {formatDateTime(proof.generatedAt)}
          </p>
        </>
      ) : null}
    </div>
  );
};

export default UserBalanceExplorerPage;
