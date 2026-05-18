import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { fraudCascadeService } from '../services/fraudCascadeService';

const STAGE = {
  INPUT: 'input',
  PREVIEW: 'preview',
  EXECUTING: 'executing',
  RESULT: 'result',
};

const fmtNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';

const actionLabel = (a) =>
  ({
    debit_balance: 'Debit balance',
    reverse_gift: 'Reverse gift',
    reverse_conversion: 'Reverse conversion',
    flag_withdraw: 'Flag withdrawal (irrecoverable)',
    reconcile_lifetime_rubies: 'Lifetime rubies reconcile',
  })[a] || a;

// Render a user as "Display Name · shortId". Display name falls back
// through name → email → username → "unknown". Short id is the last 8 chars
// of the ObjectId so admins can still correlate with raw Mongo records.
function renderUser(userId, usersMap) {
  const short = String(userId || '').slice(-8);
  const u = usersMap?.[String(userId)];
  const display = u?.name || u?.email || u?.username || null;
  return { display, short, user: u || null };
}

export default function FraudCascadeDialog({
  open,
  onClose,
  initialTxnId = '',
  existingCascadeId = null,
  onCompleted,
}) {
  const [stage, setStage] = useState(STAGE.INPUT);
  const [rootTransactionId, setRootTransactionId] = useState(initialTxnId);
  const [reason, setReason] = useState('');
  const [notifyAffectedUsers, setNotifyAffectedUsers] = useState(true);
  const [planData, setPlanData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Confirm-execute nested dialog. Admin must type "EXECUTE" here, same as
  // the previous window.prompt, just not ugly.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState('');

  // Reset every time the dialog opens, then — if opened with an
  // existingCascadeId — load that cascade's saved plan and jump to PREVIEW.
  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setNotifyAffectedUsers(true);
    setResultData(null);
    setSubmitting(false);

    if (existingCascadeId) {
      setStage(STAGE.PREVIEW);
      setPlanData(null);
      setLoadingExisting(true);
      fraudCascadeService
        .getById(existingCascadeId)
        .then((doc) => {
          if (doc.status !== 'plan_ready') {
            toast.error(
              `Cascade is in status "${doc.status}" — can only resume plan_ready`,
            );
            onClose?.();
            return;
          }
          // Shape the data so the PREVIEW renderer works the same as after
          // a fresh computePlan call. Include the `users` map so the preview
          // table shows names instead of just short IDs.
          setPlanData({
            cascadeId: doc._id,
            status: doc.status,
            plan: doc.plan,
            warnings: doc.plan?.warnings || [],
            users: doc.users || {},
          });
          setRootTransactionId(String(doc.rootTransactionId || ''));
        })
        .catch((err) => {
          toast.error(
            `Failed to load cascade: ${err?.response?.data?.message || err?.message}`,
          );
          onClose?.();
        })
        .finally(() => setLoadingExisting(false));
    } else {
      setStage(STAGE.INPUT);
      setRootTransactionId(initialTxnId);
      setPlanData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTxnId, existingCascadeId]);

  const handleCancel = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleComputePlan = async () => {
    const trimmedReason = reason.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(String(rootTransactionId))) {
      toast.error('Root transaction ID must be a 24-char hex ObjectId');
      return;
    }
    if (trimmedReason.length < 20) {
      toast.error('Reason must be at least 20 characters');
      return;
    }
    setSubmitting(true);
    try {
      const data = await fraudCascadeService.plan({
        rootTransactionId,
        reason: trimmedReason,
        notifyAffectedUsers,
      });
      setPlanData(data);
      setStage(STAGE.PREVIEW);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Plan failed';
      toast.error(`Plan failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecute = () => {
    if (!planData?.cascadeId) return;
    setConfirmTyped('');
    setConfirmOpen(true);
  };

  const executeNow = async () => {
    setConfirmOpen(false);
    setStage(STAGE.EXECUTING);
    try {
      const data = await fraudCascadeService.execute(planData.cascadeId);
      setResultData(data);
      setStage(STAGE.RESULT);
      onCompleted?.(data);
      toast.success(`Cascade executed: ${data.successCount} steps succeeded, ${data.failedCount} failed`);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Execute failed';
      toast.error(`Execute failed: ${msg}`);
      setStage(STAGE.PREVIEW);
    }
  };

  const renderInput = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          New fraud cascade
        </DialogTitle>
        <DialogDescription>
          Enter the transaction ID of the tainted credit. The system will compute a plan showing every
          downstream effect — you will review and confirm before any balance changes.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="rootTxn">Root transaction ID</Label>
          <Input
            id="rootTxn"
            value={rootTransactionId}
            onChange={(e) => setRootTransactionId(e.target.value.trim())}
            placeholder="24-char ObjectId"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">
            Reason <span className="text-xs text-gray-500">(min 20 chars)</span>
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. PayPal chargeback, fraudulent top-up verified by support ticket #1234"
            rows={4}
            maxLength={2000}
          />
          <div className="text-xs text-gray-500 text-right">{reason.trim().length}/20 min</div>
        </div>
        <div className="flex items-center justify-between rounded border p-3">
          <div>
            <Label htmlFor="notify">Notify affected users</Label>
            <div className="text-xs text-gray-500">In-app + email: "Your balance was adjusted…"</div>
          </div>
          <Switch id="notify" checked={notifyAffectedUsers} onCheckedChange={setNotifyAffectedUsers} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleComputePlan} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Computing…
            </>
          ) : (
            'Compute plan'
          )}
        </Button>
      </DialogFooter>
    </>
  );

  const renderPreview = () => {
    if (loadingExisting || !planData) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Loading plan…</DialogTitle>
            <DialogDescription>Fetching saved cascade plan from the server.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </>
      );
    }
    const totals = planData?.plan?.totals || {};
    const nodes = planData?.plan?.nodes || [];
    const warnings = planData?.plan?.warnings || [];
    const writeOffTotal =
      Number(totals.coinsWrittenOff || 0) + Number(totals.rubiesWrittenOff || 0);
    const showWriteOff = writeOffTotal > 0;
    const lifetimeDebit = Number(totals.lifetimeRubiesReconciled || 0);
    return (
      <>
        <DialogHeader>
          <DialogTitle>Plan preview — review before executing</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <div>
                This cascade will affect <b>{fmtNumber(totals.usersAffected)}</b> user(s), reverse{' '}
                <b>{fmtNumber(totals.coinsReversed)} coins</b> and{' '}
                <b>{fmtNumber(totals.rubiesReversed)} rubies</b>, and flag{' '}
                <b>${fmtNumber(totals.usdWithdrawnLeaked)}</b> of already-withdrawn funds as
                irrecoverable. Max depth reached: <b>{totals.maxDepthReached}</b>.
              </div>
              {lifetimeDebit > 0 && (
                <div className="text-xs text-gray-600">
                  Will also reduce <b>lifetimeRubies</b> by{' '}
                  <b>{fmtNumber(lifetimeDebit)}</b> across affected streamers (paired
                  reconcile entries).
                </div>
              )}
              {showWriteOff && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Projected write-off (P1 floor-at-zero, balances too low):{' '}
                  <b>{fmtNumber(totals.coinsWrittenOff || 0)} coins</b>,{' '}
                  <b>{fmtNumber(totals.rubiesWrittenOff || 0)} rubies</b> — not recoverable.
                </div>
              )}
              {Number(totals.epsilonSkipped || 0) > 0 && (
                <div className="text-[11px] text-gray-500">
                  Sub-unit tainted portions dropped during PTT walk:{' '}
                  <b>{fmtNumber(totals.epsilonSkipped)}</b> (noise floor, expected).
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {warnings.length > 0 && (
          <div className="rounded border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Warnings
            </div>
            {warnings.map((w, i) => (
              <div key={i} className="font-mono">
                • {w}
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[40vh] overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="p-2 text-left">Depth</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Currency</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n, i) => {
                const u = renderUser(n.userId, planData?.users);
                return (
                <tr key={n.stepId || i} className="border-t">
                  <td className="p-2">{n.depth}</td>
                  <td className="p-2">{actionLabel(n.action)}</td>
                  <td className="p-2">
                    {u.display ? (
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium truncate max-w-[14rem]" title={u.user?.email || u.user?.username || ''}>
                          {u.display}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500">…{u.short}</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-gray-500">…{u.short}</span>
                    )}
                  </td>
                  <td className="p-2">{n.currency}</td>
                  <td className="p-2 text-right">{fmtNumber(n.amount)}</td>
                  <td className="p-2 text-gray-500 truncate max-w-[12rem]">{n.notes || '—'}</td>
                </tr>
                );
              })}
              {nodes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Plan has no nodes. Nothing to reverse.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleExecute} disabled={nodes.length === 0}>
            Execute cascade
          </Button>
        </DialogFooter>
      </>
    );
  };

  const renderExecuting = () => (
    <>
      <DialogHeader>
        <DialogTitle>Executing…</DialogTitle>
        <DialogDescription>Writing reversal entries. Do not close this window.</DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
      </div>
    </>
  );

  const renderResult = () => {
    const finalOk = resultData?.finalStatus === 'completed';
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {finalOk ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Cascade {resultData?.finalStatus}
          </DialogTitle>
          <DialogDescription>
            {resultData?.successCount} succeeded · {resultData?.failedCount} failed ·{' '}
            {resultData?.skippedCount} skipped
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="max-h-[40vh] overflow-y-auto space-y-1 text-xs font-mono">
          {(resultData?.executedSteps || []).map((s) => (
            <div key={s.stepId} className="flex items-start gap-2 py-1">
              <Badge variant={s.status === 'done' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'}>
                {s.status}
              </Badge>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500">{s.stepId}</div>
                {s.error && <div className="text-red-500">{s.error}</div>}
                {s.skippedReason && <div className="text-gray-500">{s.skippedReason}</div>}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleCancel}>Close</Button>
        </DialogFooter>
      </>
    );
  };

  const totalsForConfirm = planData?.plan?.totals || {};
  const confirmValid = confirmTyped.trim().toUpperCase() === 'EXECUTE';

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent className="max-w-3xl">
          {stage === STAGE.INPUT && renderInput()}
          {stage === STAGE.PREVIEW && renderPreview()}
          {stage === STAGE.EXECUTING && renderExecuting()}
          {stage === STAGE.RESULT && renderResult()}
        </DialogContent>
      </Dialog>

      {/* Styled confirm-execute dialog, replaces the old window.prompt.
          Nested inside so it stays on top of the main dialog when open. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Confirm execute
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  This will write <b>{fmtNumber(totalsForConfirm.usersAffected)}</b> affected-user
                  debits and reverse{' '}
                  <b>{fmtNumber(totalsForConfirm.coinsReversed)}</b> coins +{' '}
                  <b>{fmtNumber(totalsForConfirm.rubiesReversed)}</b> rubies. Flagged as irrecoverable
                  USD: <b>${fmtNumber(totalsForConfirm.usdWithdrawnLeaked)}</b>.
                </div>
                <div className="text-gray-600">
                  The cascade can be undone later, but every reversal is a real ledger write.
                  Type <b>EXECUTE</b> below to confirm.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Label htmlFor="confirm-execute-input" className="sr-only">
              Type EXECUTE to confirm
            </Label>
            <Input
              id="confirm-execute-input"
              value={confirmTyped}
              onChange={(e) => setConfirmTyped(e.target.value)}
              placeholder="EXECUTE"
              autoFocus
              autoComplete="off"
              className={confirmValid ? 'border-red-400' : ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmValid) executeNow();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmValid}
              onClick={executeNow}
            >
              Execute cascade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
