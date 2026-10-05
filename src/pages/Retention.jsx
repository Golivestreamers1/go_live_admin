import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { getRetention } from "../services/analyticsService";

const COHORTS = [
  { value: "all", label: "All" },
  { value: "new", label: "New accounts" },
  { value: "old", label: "Old accounts" },
];

const COHORT_HINT = {
  all: "Every non-bot account created on or before the end date.",
  new: "Non-bot accounts that signed up between the start and end date.",
  old: "Non-bot accounts that signed up before the start date.",
};

const ACTION_HINTS = {
  postsLiked: "From like notifications: self-likes are not counted.",
};

// A YYYY-MM-DD day in Eastern time — the backend reads both dates as whole ET days.
const easternDaysAgo = (days) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(Date.now() - days * 86_400_000));

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);

/** Users with at least `min` occurrences, from a { count: users } histogram. */
const usersAtLeast = (histogram, min) =>
  Object.entries(histogram || {}).reduce((sum, [n, users]) => (Number(n) >= min ? sum + users : sum), 0);

const Retention = () => {
  // Last 7 days: every range costs a scan of all activity inside it, so don't open on months.
  const [start, setStart] = useState(() => easternDaysAgo(6));
  const [end, setEnd] = useState(() => easternDaysAgo(0));
  const [cohort, setCohort] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mins, setMins] = useState({});

  useEffect(() => {
    if (!start || !end || start > end) return;
    let cancelled = false;
    const onError = (error) =>
      !cancelled && toast.error(error?.response?.data?.message || "Failed to fetch retention");
    setLoading(true);
    getRetention({ start, end, cohort })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        // Slow actions arrive as histogram: null; fill each in as its own request lands.
        for (const { key } of result.actions.filter((a) => a.deferred)) {
          getRetention({ start, end, cohort, action: key })
            .then(({ actions: [loaded] }) => {
              if (cancelled) return;
              setData((prev) => ({ ...prev, actions: prev.actions.map((a) => (a.key === key ? loaded : a)) }));
            })
            .catch(onError);
        }
      })
      .catch(onError)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [start, end, cohort]);

  const minFor = (key) => mins[key] ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Retention</h1>
        <p className="text-gray-600 mt-1">How many users in a cohort performed each action within the date range.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm text-gray-700">
              Start (ET)
              <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700">
              End (ET)
              <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <div className="flex gap-2">
              {COHORTS.map((c) => (
                <Button
                  key={c.value}
                  variant={cohort === c.value ? "default" : "outline"}
                  onClick={() => setCohort(c.value)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {data ? formatNumber(data.cohortCount) : "—"}
              <span className="text-base font-normal text-gray-600 ml-2">users in cohort</span>
              {loading && <span className="text-sm font-normal text-gray-400 ml-3">Loading…</span>}
            </div>
            <p className="text-sm text-gray-500">{COHORT_HINT[cohort]} Bots and test accounts excluded.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions in range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(data?.actions || []).map((action) => {
              const min = minFor(action.key);
              const pending = action.histogram === null;
              const users = usersAtLeast(action.histogram, min);
              const pct = data.cohortCount ? (users / data.cohortCount) * 100 : 0;
              return (
                <div key={action.key} className="grid grid-cols-[1fr_auto_10rem] items-center gap-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{action.label}</div>
                    {ACTION_HINTS[action.key] && (
                      <div className="text-xs text-gray-500">{ACTION_HINTS[action.key]}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    ≥
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={min}
                      onChange={(e) =>
                        setMins((prev) => ({ ...prev, [action.key]: Math.max(1, Number(e.target.value) || 1) }))
                      }
                    />
                    {action.unit}
                  </div>
                  <div className="text-right">
                    {pending ? (
                      <div className="text-sm text-gray-400">Loading…</div>
                    ) : (
                      <>
                        <div className="text-xl font-semibold text-gray-900">{formatNumber(users)}</div>
                        <div className="text-xs text-gray-500">{pct.toFixed(1)}% of cohort</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Retention;
