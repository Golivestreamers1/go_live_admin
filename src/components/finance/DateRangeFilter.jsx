import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

/**
 * The one date-range control for the finance pages.
 *
 * Replaces four incompatible dialects that exist across the admin today
 * (`from/to`, `startDate/endDate`, `period`, and a bare `YYYY-MM-DD`), and
 * fixes the off-by-one that came with the last of them: the old finance page
 * sent a bare date that the backend used as an inclusive `$lte`, which resolved
 * to midnight and so dropped almost all of the final day.
 *
 * This control sends calendar dates and nothing else. The server owns the
 * conversion to instants, so there is exactly one place that can get it wrong.
 */

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "ytd", label: "This year" },
];

export default function DateRangeFilter({ value, onChange, disabled = false }) {
  const { range = "all", from = "", to = "" } = value || {};
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const applyPreset = (key) => onChange({ range: key, from: "", to: "" });

  const applyCustom = () => {
    if (!draftFrom && !draftTo) return;
    onChange({ range: "custom", from: draftFrom, to: draftTo });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          type="button"
          size="sm"
          variant={range === p.key ? "default" : "outline"}
          disabled={disabled}
          onClick={() => applyPreset(p.key)}
        >
          {p.label}
        </Button>
      ))}

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <Input
        type="date"
        aria-label="From date"
        className="h-9 w-[150px]"
        value={draftFrom}
        disabled={disabled}
        onChange={(e) => setDraftFrom(e.target.value)}
      />
      <span className="text-muted-foreground text-sm">to</span>
      <Input
        type="date"
        aria-label="To date"
        className="h-9 w-[150px]"
        value={draftTo}
        disabled={disabled}
        onChange={(e) => setDraftTo(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        variant={range === "custom" ? "default" : "outline"}
        disabled={disabled || (!draftFrom && !draftTo)}
        onClick={applyCustom}
      >
        Apply
      </Button>
    </div>
  );
}

export { PRESETS };
