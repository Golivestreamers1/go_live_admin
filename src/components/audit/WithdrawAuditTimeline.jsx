import { Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtNum = (n) => Number(n || 0).toLocaleString();

function actorLabel(event) {
  if (event.actorType === 'system') return 'System';
  const a = event.actor;
  if (!a) return '—';
  return a.name || a.username || a.email || 'Unknown';
}

function eventDetailLine(event) {
  const { detail } = event;
  if (!detail) return null;

  if (event.action === 'withdraw_requested') {
    return `${fmtUsd(detail.amountUsd)} · ${fmtNum(detail.rubiesAmount)} rubies`;
  }
  if (event.action === 'withdraw_approved' || event.action === 'withdraw_rejected') {
    const parts = [];
    if (detail.amountUsd != null) parts.push(fmtUsd(detail.amountUsd));
    if (detail.rubiesAmount != null) parts.push(`${fmtNum(detail.rubiesAmount)} rubies`);
    if (detail.note) parts.push(`"${detail.note}"`);
    return parts.join(' · ') || null;
  }
  if (event.action === 'withdraw_audit_viewed') return 'Opened See Audit proof screen';
  if (event.action === 'withdraw_snapshot_saved') {
    return detail.snapshotId ? `Snapshot ${detail.snapshotId}` : 'Frozen audit JSON saved';
  }
  if (event.action === 'withdraw_paypal_sent') return 'Manual PayPal payout confirmed';
  if (detail.note) return detail.note;
  return null;
}

const ACTION_BADGE = {
  withdraw_requested: 'outline',
  withdraw_audit_viewed: 'secondary',
  withdraw_approved: 'default',
  withdraw_rejected: 'destructive',
  withdraw_snapshot_saved: 'secondary',
  withdraw_paypal_sent: 'default',
};

/**
 * Ops accountability timeline — separate from wallet Ledger Explorer.
 */
export default function WithdrawAuditTimeline({
  timeline,
  loading,
  onRefresh,
  onMarkPaypalSent,
  markingPaypal,
  canMarkPaypal,
}) {
  const events = timeline?.events || [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Audit timeline</CardTitle>
          <CardDescription>
            Who did what on this withdraw — separate from the wallet ledger.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Refresh'}
          </Button>
          {canMarkPaypal ? (
            <Button size="sm" onClick={onMarkPaypalSent} disabled={markingPaypal || timeline?.paypalSent}>
              {markingPaypal ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" /> Saving
                </>
              ) : timeline?.paypalSent ? (
                'PayPal sent'
              ) : (
                'Mark PayPal sent'
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading && !timeline ? (
          <div className="flex justify-center p-6">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : !events.length ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {events.map((event) => {
              const detail = eventDetailLine(event);
              return (
                <li key={event.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-gray-300 border-2 border-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(event.occurredAt)}
                    </span>
                    <Badge variant={ACTION_BADGE[event.action] || 'outline'} className="text-xs">
                      {event.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{actorLabel(event)}</p>
                  {detail ? <p className="text-sm text-muted-foreground mt-0.5">{detail}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
