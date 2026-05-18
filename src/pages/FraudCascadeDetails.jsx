import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fraudCascadeService } from '../services/fraudCascadeService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Undo2,
  ExternalLink,
  Network,
} from 'lucide-react';
import { toast } from 'sonner';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtNum = (n) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '0';
const shortId = (id) => String(id || '').slice(-6);

const statusVariant = (status) =>
  ({
    planning: 'secondary',
    plan_ready: 'secondary',
    executing: 'secondary',
    completed: 'default',
    failed: 'destructive',
    undone: 'outline',
  })[status] || 'secondary';

const actionLabel = (a) =>
  ({
    debit_balance: 'Debit balance',
    reverse_gift: 'Reverse gift',
    reverse_conversion: 'Reverse conversion',
    flag_withdraw: 'Flag withdraw',
    reconcile_lifetime_rubies: 'Reconcile lifetime rubies',
  })[a] || a;

const renderUser = (userId, users) => {
  if (!userId) return '—';
  const u = users?.[String(userId)];
  if (!u) return <span className="font-mono text-xs">{shortId(userId)}</span>;
  return (
    <div className="flex flex-col">
      <Link
        to={`/users/${userId}`}
        className="text-sm font-medium hover:underline"
      >
        {u.name || u.username || 'Unnamed'}
      </Link>
      <span className="text-[10px] text-muted-foreground font-mono">
        {u.email || shortId(userId)}
      </span>
    </div>
  );
};

export default function FraudCascadeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cascade, setCascade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fraudCascadeService.getById(id);
      setCascade(data);
    } catch (err) {
      toast.error(
        `Load failed: ${err?.response?.data?.message || err?.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUndo = async () => {
    const reason = window.prompt(
      'Reason for undoing this cascade (min 20 chars):',
    );
    if (!reason || reason.trim().length < 20) {
      toast.info('Undo cancelled — reason too short');
      return;
    }
    setUndoing(true);
    try {
      const res = await fraudCascadeService.undo(id, reason.trim());
      toast.success(
        `Undo ${res.finalStatus}: ${res.successCount} reversed, ${res.failedCount} failed`,
      );
      fetchData();
    } catch (err) {
      toast.error(
        `Undo failed: ${err?.response?.data?.message || err?.message}`,
      );
    } finally {
      setUndoing(false);
    }
  };

  // Group plan nodes per affected user with aggregate intent / downstream
  // action summary — this is the "who did we touch, how much" view an admin
  // usually wants first.
  const perUser = useMemo(() => {
    if (!cascade) return [];
    const byUser = new Map();
    for (const n of cascade.plan?.nodes || []) {
      const k = String(n.userId);
      if (!byUser.has(k))
        byUser.set(k, {
          userId: k,
          nodes: [],
          coinsIntent: 0,
          rubiesIntent: 0,
          usdLeaked: 0,
          maxDepth: 0,
        });
      const entry = byUser.get(k);
      entry.nodes.push(n);
      if (n.action === 'debit_balance') {
        if (n.currency === 'coins') entry.coinsIntent += Number(n.amount || 0);
        if (n.currency === 'rubies') entry.rubiesIntent += Number(n.amount || 0);
      }
      entry.usdLeaked += Number(n.usdAmount || 0);
      entry.maxDepth = Math.max(entry.maxDepth, Number(n.depth || 0));
    }

    // Ledger-entry rollup per user (what ACTUALLY moved at execute time).
    const ledgerByUser = new Map();
    for (const e of cascade.ledgerEntries || []) {
      const k = String(e.userId);
      if (!ledgerByUser.has(k))
        ledgerByUser.set(k, { coins: 0, rubies: 0, usd: 0, lifetimeDelta: 0, entries: 0 });
      const l = ledgerByUser.get(k);
      l.coins += Number(e.coins || 0);
      l.rubies += Number(e.rubies || 0);
      l.usd += Number(e.usd || 0);
      l.lifetimeDelta += Number(e.metadata?.lifetimeRubiesDelta || 0);
      l.entries += 1;
    }

    return [...byUser.values()]
      .map((e) => ({
        ...e,
        ledger: ledgerByUser.get(e.userId) || {
          coins: 0,
          rubies: 0,
          usd: 0,
          lifetimeDelta: 0,
          entries: 0,
        },
      }))
      .sort((a, b) => a.maxDepth - b.maxDepth);
  }, [cascade]);

  const executedByStepId = useMemo(() => {
    const m = new Map();
    for (const s of cascade?.executedSteps || []) m.set(s.stepId, s);
    return m;
  }, [cascade]);

  if (loading || !cascade) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading cascade…
      </div>
    );
  }

  const totals = cascade.plan?.totals || {};
  const users = cascade.users || {};
  const undoable =
    (cascade.status === 'completed' || cascade.status === 'failed') &&
    !cascade.undoneBy &&
    !cascade.undoOf;

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/fraud-cascade')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cascade #{shortId(cascade._id)}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant={statusVariant(cascade.status)}>{cascade.status}</Badge>
              <span>created {fmtDate(cascade.createdAt)}</span>
              {cascade.undoOf ? (
                <span className="text-xs">
                  (undo of{' '}
                  <Link
                    to={`/fraud-cascade/${cascade.undoOf}`}
                    className="underline"
                  >
                    #{shortId(cascade.undoOf)}
                  </Link>
                  )
                </span>
              ) : null}
              {cascade.undoneBy ? (
                <span className="text-xs text-amber-700">
                  (undone by{' '}
                  <Link
                    to={`/fraud-cascade/${cascade.undoneBy}`}
                    className="underline"
                  >
                    #{shortId(cascade.undoneBy)}
                  </Link>
                  )
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {undoable ? (
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoing}>
              {undoing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
              Undo cascade
            </Button>
          ) : null}
        </div>
      </div>

      {/* Meta summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cascade metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <MetaRow label="Root transaction">
              {cascade.rootTransaction ? (
                <div>
                  <code className="text-xs">{String(cascade.rootTransaction._id)}</code>
                  <div className="text-xs text-muted-foreground">
                    {cascade.rootTransaction.type} · coins={fmtNum(cascade.rootTransaction.coins)} · usd=$
                    {fmtNum(cascade.rootTransaction.usd)} · {fmtDate(cascade.rootTransaction.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {cascade.rootTransaction.description}
                  </div>
                </div>
              ) : (
                <code className="text-xs">{String(cascade.rootTransactionId)}</code>
              )}
            </MetaRow>
            <MetaRow label="Taint">
              {fmtNum(cascade.taintAmount)} {cascade.taintCurrency}
            </MetaRow>
            <MetaRow label="Root user">{renderUser(cascade.rootUserId, users)}</MetaRow>
            <MetaRow label="Triggered by">
              {cascade.triggeringAdmin ? (
                <div>
                  <div className="text-sm font-medium">
                    {cascade.triggeringAdmin.name || cascade.triggeringAdmin.username}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {cascade.triggeringAdmin.email || shortId(cascade.triggeringAdmin.id)}
                  </div>
                </div>
              ) : (
                <span className="font-mono text-xs">{shortId(cascade.triggeredBy)}</span>
              )}
            </MetaRow>
            <MetaRow label="Planned at">{fmtDate(cascade.plannedAt)}</MetaRow>
            <MetaRow label="Executed at">{fmtDate(cascade.executedAt)}</MetaRow>
            <MetaRow label="Completed at">{fmtDate(cascade.completedAt)}</MetaRow>
            <MetaRow label="Notify users">{cascade.notifyAffectedUsers ? 'yes' : 'no'}</MetaRow>
            <MetaRow label="Reason" full>
              <div className="text-sm whitespace-pre-wrap">{cascade.reason}</div>
            </MetaRow>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" /> Plan totals
          </CardTitle>
          <CardDescription>
            Projected recoverable amount (after P1 floor-at-zero at plan time) and write-offs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Users affected" value={fmtNum(totals.usersAffected)} />
            <Stat label="Max depth" value={fmtNum(totals.maxDepthReached)} />
            <Stat label="Coins reversed" value={fmtNum(totals.coinsReversed)} />
            <Stat label="Coins written off" value={fmtNum(totals.coinsWrittenOff)} />
            <Stat label="Rubies reversed" value={fmtNum(totals.rubiesReversed)} />
            <Stat label="Rubies written off" value={fmtNum(totals.rubiesWrittenOff)} />
            <Stat
              label="Lifetime rubies reconciled"
              value={fmtNum(totals.lifetimeRubiesReconciled)}
            />
            <Stat label="USD leaked" value={`$${fmtNum(totals.usdWithdrawnLeaked)}`} />
          </div>
          {cascade.plan?.warnings?.length ? (
            <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Warnings ({cascade.plan.warnings.length}):</strong>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {cascade.plan.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Per-user summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affected users</CardTitle>
          <CardDescription>
            Plan intent vs what was actually moved at execute time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Depth</TableHead>
                <TableHead className="text-right">Coins intent</TableHead>
                <TableHead className="text-right">Rubies intent</TableHead>
                <TableHead className="text-right">Actually moved (coins)</TableHead>
                <TableHead className="text-right">Actually moved (rubies)</TableHead>
                <TableHead className="text-right">Lifetime Δ</TableHead>
                <TableHead className="text-right">USD leaked</TableHead>
                <TableHead className="text-right">Ledger entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perUser.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>{renderUser(u.userId, users)}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.maxDepth}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(u.coinsIntent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(u.rubiesIntent)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${u.ledger.coins < 0 ? 'text-red-600' : u.ledger.coins > 0 ? 'text-green-600' : ''}`}
                  >
                    {u.ledger.coins ? (u.ledger.coins > 0 ? `+${fmtNum(u.ledger.coins)}` : fmtNum(u.ledger.coins)) : '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${u.ledger.rubies < 0 ? 'text-red-600' : u.ledger.rubies > 0 ? 'text-green-600' : ''}`}
                  >
                    {u.ledger.rubies ? (u.ledger.rubies > 0 ? `+${fmtNum(u.ledger.rubies)}` : fmtNum(u.ledger.rubies)) : '—'}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${u.ledger.lifetimeDelta < 0 ? 'text-red-600' : u.ledger.lifetimeDelta > 0 ? 'text-green-600' : ''}`}>
                    {u.ledger.lifetimeDelta ? (u.ledger.lifetimeDelta > 0 ? `+${fmtNum(u.ledger.lifetimeDelta)}` : fmtNum(u.ledger.lifetimeDelta)) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.usdLeaked ? `$${fmtNum(u.usdLeaked)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.ledger.entries}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan nodes tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan nodes</CardTitle>
          <CardDescription>
            PTT walk output. Each node is a single step; depth shows how many hops from the root.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(cascade.plan?.nodes || []).map((n, idx) => {
                const exec = executedByStepId.get(n.stepId);
                return (
                  <TableRow key={n.stepId}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{n.depth}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {actionLabel(n.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderUser(n.userId, users)}</TableCell>
                    <TableCell className="text-xs">{n.currency}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(Math.round(Number(n.amount || 0)))}
                      {n.action === 'flag_withdraw' && n.usdAmount ? (
                        <span className="ml-1 text-xs text-muted-foreground">(${fmtNum(n.usdAmount)})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {exec ? (
                        <Badge
                          variant={
                            exec.status === 'done'
                              ? 'default'
                              : exec.status === 'skipped'
                                ? 'outline'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {exec.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {exec?.error ? (
                        <div className="text-[10px] text-red-600 mt-0.5">{exec.error}</div>
                      ) : null}
                      {exec?.skippedReason ? (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {exec.skippedReason}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-xs">
                      {n.notes || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ledger entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger entries written</CardTitle>
          <CardDescription>
            Every WalletTransaction stamped with this cascadeId — the authoritative record of what execute did.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead className="text-right">Rubies</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead>Reason code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(cascade.ledgerEntries || []).map((e) => (
                <TableRow key={e._id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {e.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderUser(e.userId, users)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${e.coins < 0 ? 'text-red-600' : e.coins > 0 ? 'text-green-600' : ''}`}
                  >
                    {e.coins ? (e.coins > 0 ? `+${fmtNum(e.coins)}` : fmtNum(e.coins)) : '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${e.rubies < 0 ? 'text-red-600' : e.rubies > 0 ? 'text-green-600' : ''}`}
                  >
                    {e.rubies ? (e.rubies > 0 ? `+${fmtNum(e.rubies)}` : fmtNum(e.rubies)) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.usd ? `$${fmtNum(e.usd)}` : '—'}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {e.cascadeReasonCode || '—'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[11px]">{e.description}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {fmtDate(e.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(cascade.ledgerEntries || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ledger entries written yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

const MetaRow = ({ label, children, full = false }) => (
  <div className={`flex gap-3 ${full ? 'md:col-span-2' : ''}`}>
    <span className="w-32 shrink-0 text-xs uppercase tracking-wide text-muted-foreground pt-0.5">
      {label}
    </span>
    <div className="flex-1">{children}</div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-md border p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
  </div>
);
