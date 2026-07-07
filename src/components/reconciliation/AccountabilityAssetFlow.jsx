import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getExplainedDestinationsNote } from '../../lib/reconciliationAccountability';

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-US');

const UNIT_LABEL = {
  coins: 'coins',
  rubies: 'rubies',
};

const UNIT_SINGULAR = {
  coins: 'coin',
  rubies: 'ruby',
};

function FlowLine({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums shrink-0">{fmtNum(value)}</span>
    </div>
  );
}

const REQUIRES_RECONCILIATION_LABEL = 'Requires reconciliation';

function ReconciliationStatus({ balanced, needsReconciliation, unit }) {
  if (balanced) {
    return <span className="text-xs font-medium text-green-700">✓ Fully reconciled</span>;
  }

  return (
    <div className="text-right">
      <p className="text-xs font-medium text-amber-800">{REQUIRES_RECONCILIATION_LABEL}</p>
      <p className="text-sm font-bold tabular-nums text-amber-900">
        {fmtNum(needsReconciliation)} {unit}
      </p>
    </div>
  );
}

function EquationTerm({ label, value, size = 'md' }) {
  const sizeClass = {
    md: 'text-lg font-semibold',
    lg: 'text-xl font-semibold',
    focal: 'text-3xl font-bold',
  }[size];

  return (
    <div className="text-center space-y-0.5 py-0.5">
      <p className="text-xs tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-mono tabular-nums text-gray-900 ${sizeClass}`}>{fmtNum(value)}</p>
    </div>
  );
}

function FlowDown() {
  return <p className="text-center text-sm text-muted-foreground leading-none py-1">↓</p>;
}

function AccountabilityEquation({ created, explainedTotal, needsReconciliation, balanced, unit }) {
  if (balanced) {
    return (
      <div className="rounded-md bg-gray-50 border px-4 py-4 space-y-1">
        <EquationTerm label="Created" value={created} size="lg" />
        <p className="text-center text-xl font-light text-muted-foreground leading-none py-1">=</p>
        <EquationTerm label="Explained destinations" value={explainedTotal} size="lg" />
      </div>
    );
  }

  return (
    <div className="rounded-md bg-gray-50 border px-4 py-4 space-y-0.5">
      <EquationTerm label="Created" value={created} size="lg" />
      <FlowDown />
      <EquationTerm label="Explained destinations" value={explainedTotal} size="md" />
      <FlowDown />
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3 mt-1">
        <p className="text-xs font-semibold text-center text-amber-900 tracking-wide">
          {REQUIRES_RECONCILIATION_LABEL}
        </p>
        <p className="font-mono tabular-nums text-3xl font-bold text-center text-amber-950 mt-1">
          {fmtNum(needsReconciliation)}
        </p>
        <p className="text-xs text-center text-amber-800/80 mt-0.5">{unit}</p>
      </div>
      <p className="text-center text-[11px] text-muted-foreground pt-2">
        Created = Explained destinations + Requires reconciliation
      </p>
    </div>
  );
}

/**
 * Visual accountability flow: Created → Explained destinations → Requires reconciliation.
 */
export default function AccountabilityAssetFlow({
  title,
  asset,
  data,
  investigationLinks = [],
  onInvestigate,
  onShowTechnical,
  variant = 'business',
  defaultExpanded,
}) {
  const unit = UNIT_LABEL[asset] ?? 'units';
  const unitSingular = UNIT_SINGULAR[asset] ?? 'unit';
  const links = investigationLinks.filter((l) => l.asset === asset);
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? (variant === 'technical' && !data.balanced)
  );

  const visibleDestinations = data.destinations.filter((d) => Number(d.value) > 0);
  const destinationsNote = getExplainedDestinationsNote(data);

  const toggleExpanded = () => setExpanded((v) => !v);

  return (
    <div
      className={`rounded-md border bg-white space-y-3 ${
        variant === 'technical' ? 'p-4' : 'p-3'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <ReconciliationStatus
          balanced={data.balanced}
          needsReconciliation={data.needsReconciliation}
          unit={unit}
        />
      </div>

      <AccountabilityEquation
        created={data.created}
        explainedTotal={data.explainedTotal}
        needsReconciliation={data.needsReconciliation}
        balanced={data.balanced}
        unit={unit}
      />

      {!data.balanced ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Requires reconciliation means some created {unit} have not yet been matched to an explained
          destination. Review the checks below to identify the cause.
        </p>
      ) : null}

      {destinationsNote ? (
        <p className="text-xs text-amber-900/80 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-2 leading-relaxed">
          {destinationsNote.short}
        </p>
      ) : null}

      <button
        type="button"
        onClick={toggleExpanded}
        className="flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {expanded ? 'Hide explained destinations' : 'Show explained destinations'}
      </button>

      {expanded ? (
        <div className="space-y-2 pl-2 border-l-2 border-gray-200 ml-1">
          <p className="text-xs text-muted-foreground">
            Each {unitSingular} should have an owner — gifts, wheel, conversions, withdrawals,
            and balances included.
          </p>
          {visibleDestinations.length ? (
            visibleDestinations.map((d) => <FlowLine key={d.label} label={d.label} value={d.value} />)
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No non-zero destinations recorded yet.
            </p>
          )}
          <div className="flex justify-between gap-4 text-sm font-medium pt-1 border-t">
            <span className="text-gray-900">Explained destinations total</span>
            <span className="font-mono tabular-nums">{fmtNum(data.explainedTotal)}</span>
          </div>
          {destinationsNote ? (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {destinationsNote.expanded}
            </p>
          ) : null}
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className="pt-2 border-t space-y-1">
          <p className="text-xs text-muted-foreground">Investigate</p>
          {links.map((link) => (
            <button
              key={`${link.asset}-${link.cardId}`}
              type="button"
              onClick={() => onInvestigate?.(link.cardId)}
              className="block text-sm text-amber-800 hover:text-amber-900 hover:underline text-left"
            >
              ↓ {link.label}
            </button>
          ))}
        </div>
      ) : null}

      {variant === 'business' && !data.balanced && onShowTechnical ? (
        <button
          type="button"
          onClick={() => onShowTechnical(`accountability-${asset}`)}
          className="text-xs text-muted-foreground hover:text-gray-900 underline underline-offset-2"
        >
          Open full equation in technical view →
        </button>
      ) : null}
    </div>
  );
}
