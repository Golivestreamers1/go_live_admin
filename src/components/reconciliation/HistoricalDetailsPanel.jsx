import React from 'react';
import { Button } from '../ui/button';

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-US');

export default function HistoricalDetailsPanel({ details, onShowTechnical }) {
  if (!details) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-5 space-y-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Historical records</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Legacy transactions before <span className="font-medium text-gray-800">{details.cutoffDate}</span>
        </p>
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">
          These are old records created before the new audit system. They do not affect today&apos;s balances
          or current customer activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Affected categories
          </p>
          {details.categories.length ? (
            <ul className="space-y-1.5 text-sm">
              {details.categories.map((cat) => (
                <li key={cat.key} className="flex justify-between gap-3 border rounded px-3 py-2">
                  <span>{cat.label}</span>
                  <span className="font-mono tabular-nums text-gray-800">{fmtNum(cat.count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No category breakdown available.</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Post-cutoff issues
            </p>
            <p className="text-2xl font-semibold tabular-nums text-green-700">{fmtNum(details.postCutoff)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Customer impact
            </p>
            <p className="text-sm font-medium text-green-700">None</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Total legacy records
            </p>
            <p className="text-2xl font-semibold tabular-nums">{fmtNum(details.totalLegacy)}</p>
          </div>
        </div>
      </div>

      {details.sampleIds.length ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Sample transaction IDs
          </p>
          <ul className="text-xs font-mono text-gray-700 space-y-1 bg-gray-50 rounded-md border p-3 max-h-32 overflow-y-auto">
            {details.sampleIds.map((id) => (
              <li key={id} className="break-all">
                {id}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">
          Engineers: full I3 referential integrity evidence lives in technical details.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-800 hover:text-amber-900 px-0"
          onClick={() => onShowTechnical('check-I3_REFERENTIAL')}
        >
          Open I3 in technical view →
        </Button>
      </div>
    </div>
  );
}
