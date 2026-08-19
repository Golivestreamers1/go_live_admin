import { Card, CardContent } from "../ui/card";

/**
 * One headline figure.
 *
 * Extracted because three private copies of this already exist across the admin
 * (FinanceOverview, UserDetails, SupportTickets), each slightly different.
 */
export default function StatCard({ label, value, hint, tone }) {
  const toneClass =
    tone === "bad" ? "text-destructive" : tone === "good" ? "text-emerald-600" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-2 text-3xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
