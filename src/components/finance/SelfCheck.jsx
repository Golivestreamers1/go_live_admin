import { useState } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "../ui/card";

/**
 * The page auditing itself, in public.
 *
 * The backend has always computed these invariants and returned them on every
 * response — and the UI threw all of them away. On a page whose entire purpose
 * is to be believed, "the chart adds up to the headline above it" is not a
 * developer's debug flag; it is the single most useful thing the page can say.
 *
 * Behaviour is asymmetric on purpose: quiet when healthy (one line, collapsed),
 * loud and pre-expanded the moment anything fails. A panel that looks identical
 * whether or not the books close is decoration.
 */

/*
 * Every key the backend can send, in the order a reader would care about them.
 * Unknown keys still render (humanised) rather than being silently dropped —
 * a new invariant should appear here the day it is added to the service, not
 * the day someone remembers to update this map.
 */
const LABELS = {
  bottomLineCloses: "Money in − fees − paid out = what we kept",
  monthlySumsToHeadline: "The month-by-month chart adds up to the headline",
  waterfallEndsAtKept: "The gross-to-net waterfall lands on the same number",
  channelsSumToGross: "Apple + Google + PayPal = total money in",
  everyPurchaseAccountedFor: "Every payment is either counted or explained",
  rateUsedMatchesRateShown: "The ruby rate in the maths is the rate on the page",
  giftRateIsOneToOne: "1 gifted coin becomes exactly 1 ruby",
};

const humanise = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();

export default function SelfCheck({ checks }) {
  const entries = Object.entries(checks || {});
  const failed = entries.filter(([, ok]) => !ok);
  const [open, setOpen] = useState(false);

  if (!entries.length) return null;

  const allPass = failed.length === 0;
  // A failure is never collapsed behind a click.
  const expanded = open || !allPass;

  return (
    <Card className={allPass ? "border-emerald-500/40" : "border-destructive"}>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-2 text-left"
        >
          {allPass ? (
            <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <X className="size-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">
            {allPass
              ? `All ${entries.length} internal checks passed`
              : `${failed.length} of ${entries.length} internal checks FAILED`}
          </span>
          <span className="text-xs text-muted-foreground">
            {allPass
              ? "the arithmetic on this page proves itself"
              : "the numbers below do not agree with each other"}
          </span>
          {allPass ? (
            <span className="ml-auto shrink-0 text-muted-foreground">
              {expanded ? (
                <ChevronDown className="size-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-4" aria-hidden="true" />
              )}
            </span>
          ) : null}
        </button>

        {expanded ? (
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 border-t pt-3 sm:grid-cols-2">
            {entries.map(([key, ok]) => (
              <li key={key} className="flex items-start gap-2 text-xs">
                {ok ? (
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <X className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span className={ok ? "text-muted-foreground" : "font-medium text-destructive"}>
                  {LABELS[key] || humanise(key)}
                  <span className="sr-only">{ok ? " — passed" : " — FAILED"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
