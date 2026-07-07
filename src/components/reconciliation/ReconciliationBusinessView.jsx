import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { buildBusinessSummary } from '../../lib/reconciliationBusinessView';
import { buildAccountabilitySummary } from '../../lib/reconciliationAccountability';
import HistoricalDetailsPanel from './HistoricalDetailsPanel';
import PlatformAccountabilityCard from './PlatformAccountabilityCard';

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const fmtShortDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const HEALTH_ICON = {
  healthy: '✓',
  warn: '⚠',
  issue: '⚠',
};

const HEALTH_DETAIL_CLASS = {
  healthy: 'text-green-700',
  warn: 'text-amber-700',
  issue: 'text-red-700',
};

const HEADLINE_CLASS = {
  green: 'text-green-800',
  amber: 'text-amber-800',
  red: 'text-red-800',
};

function HealthRow({ label, status, detail }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0">
      <span className="text-sm font-medium text-gray-900">
        {HEALTH_ICON[status]} {label}
      </span>
      <span className={`text-sm ${HEALTH_DETAIL_CLASS[status]}`}>{detail}</span>
    </div>
  );
}

function ActionCard({ card, detailOpen, onOpenDetail, onShowTechnical }) {
  const borderClass =
    card.severity === 'info'
      ? 'border-amber-200 bg-amber-50/40'
      : 'border-red-200 bg-red-50/40';

  const handleCta = () => {
    if (card.ctaMode === 'detail') {
      onOpenDetail(detailOpen ? null : card.id);
      return;
    }
    if (card.ctaMode === 'technical') {
      onShowTechnical(card.technicalAnchor);
      return;
    }
  };

  const ctaIsToggle = card.ctaMode === 'detail' && detailOpen;

  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{card.title}</CardTitle>
        <CardDescription className="text-sm text-gray-700 leading-relaxed">
          {card.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {card.detail ? (
          <p className="text-sm text-gray-800">
            <span className="font-medium text-muted-foreground">Scope: </span>
            {card.detail}
          </p>
        ) : null}

        {card.impact ? (
          <p className="text-sm text-gray-800">
            <span className="font-medium text-muted-foreground">Customer impact: </span>
            {card.impact}
          </p>
        ) : null}

        {card.action ? (
          <p className="text-sm text-gray-800">
            <span className="font-medium text-muted-foreground">Action: </span>
            {card.action}
          </p>
        ) : null}

        {card.ctaMode === 'link' && card.ctaTo ? (
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link to={card.ctaTo}>{card.ctaLabel}</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleCta} className="font-medium">
            {ctaIsToggle ? 'Hide details' : card.ctaLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReconciliationBusinessView({ data, onShowTechnical, onInvestigate }) {
  const summary = buildBusinessSummary(data);
  const accountability = buildAccountabilitySummary(data);
  const { headline, healthRows, actionCards, historicalDetails, reviewCount, reassurance, withdrawal } =
    summary;
  const [openDetailId, setOpenDetailId] = useState(null);

  return (
    <div className="space-y-6">
      <PlatformAccountabilityCard
        accountability={accountability}
        onShowTechnical={onShowTechnical}
        onInvestigate={onInvestigate}
      />

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-semibold tracking-tight">Platform health</CardTitle>
          <CardDescription className="text-base space-y-1">
            <span className={`block font-medium ${HEADLINE_CLASS[headline.tone]}`}>
              {headline.emoji} {headline.title}
            </span>
            {reviewCount > 0 ? (
              <span className="block text-gray-600">
                {reviewCount} item{reviewCount > 1 ? 's' : ''} require review.
              </span>
            ) : (
              <span className="block text-gray-600">No items require review.</span>
            )}
            {!accountability.allBalanced ? (
              <span className="block text-gray-600">
                These checks help explain why coins or rubies need reconciliation above.
              </span>
            ) : null}
            {reassurance ? (
              <span className="block text-gray-600">{reassurance}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Last checked: <span className="text-gray-900">{fmtShortDate(data.generatedAt)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {healthRows.map((row) => (
            <HealthRow key={row.id} label={row.label} status={row.status} detail={row.detail} />
          ))}
        </CardContent>
      </Card>

      {actionCards.length > 0 ? (
        <div className="space-y-4">
          {actionCards.map((card) => (
            <div key={card.id} id={`card-${card.id}`} className="space-y-3 scroll-mt-24">
              <ActionCard
                card={card}
                detailOpen={openDetailId === card.id}
                onOpenDetail={setOpenDetailId}
                onShowTechnical={onShowTechnical}
              />
              {openDetailId === card.id && card.detailPanel === 'historical' ? (
                <HistoricalDetailsPanel
                  details={historicalDetails}
                  onShowTechnical={(anchor) => {
                    setOpenDetailId(null);
                    onShowTechnical(anchor);
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="py-6 text-center text-sm text-green-800">
            All monitored systems look healthy. Expand technical details anytime for the full audit.
          </CardContent>
        </Card>
      )}

      <Card id="panel-d-business">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Withdrawal obligations</CardTitle>
          <CardDescription>Money currently owed or awaiting action — informational</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-xs text-muted-foreground">Pending review</p>
            <p className="text-xl font-semibold tabular-nums mt-1">{fmtUsd(withdrawal.pendingUsd)}</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
            <p className="text-xs text-muted-foreground">Approved, not yet paid</p>
            <p className="text-xl font-semibold tabular-nums mt-1">{fmtUsd(withdrawal.approvedUnpaidUsd)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Outstanding liability (estimate)</p>
            <p className="text-xl font-semibold tabular-nums mt-1">{fmtUsd(withdrawal.outstandingUsd)}</p>
          </div>
        </CardContent>
        {withdrawal.needsAttention ? (
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" asChild className="font-medium">
              <Link to="/withdraw-requests">Review withdraw requests →</Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}

export function TechnicalDetailsToggle({ expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
    >
      {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      {expanded ? 'Hide technical details' : 'Show technical details'}
    </button>
  );
}
