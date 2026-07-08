import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Scale } from 'lucide-react';
import reconciliationService from '../services/reconciliationService';
import IntegritySubNav from '../components/integrity/IntegritySubNav';
import ReconciliationBusinessView, {
  TechnicalDetailsToggle,
} from '../components/reconciliation/ReconciliationBusinessView';
import ReconciliationTechnicalView from '../components/reconciliation/ReconciliationTechnicalView';
import ReconciliationHistoryTrend from '../components/reconciliation/ReconciliationHistoryTrend';
import { Button } from '../components/ui/button';
import {
  loadSavedView,
  RECONCILIATION_VIEW,
  saveView,
} from '../lib/reconciliationBusinessView';

export default function PlatformReconciliation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyDays] = useState(30);
  const [technicalOpen, setTechnicalOpen] = useState(() => {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView === RECONCILIATION_VIEW.TECHNICAL) return true;
    return loadSavedView() === RECONCILIATION_VIEW.TECHNICAL;
  });
  const pendingAnchorRef = useRef(null);
  const technicalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [summary, historyData] = await Promise.all([
        reconciliationService.getSummary({ fleetScan: false }),
        reconciliationService.getHistory(historyDays),
      ]);
      setData(summary);
      setHistory(historyData.snapshots || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load platform reconciliation');
    } finally {
      setLoading(false);
    }
  }, [historyDays]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView === RECONCILIATION_VIEW.TECHNICAL) {
      setTechnicalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pendingAnchorRef.current?.openTechnical || !technicalOpen) return;

    const anchorId = pendingAnchorRef.current.anchorId;
    pendingAnchorRef.current = null;

    const timer = window.setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [technicalOpen, data]);

  const scrollToAnchor = (anchorId, { openTechnical = false } = {}) => {
    if (!anchorId) return;
    if (openTechnical) {
      pendingAnchorRef.current = { anchorId, openTechnical: true };
      setTechnicalExpanded(true);
      return;
    }
    window.setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const setTechnicalExpanded = (open) => {
    setTechnicalOpen(open);
    saveView(open ? RECONCILIATION_VIEW.TECHNICAL : RECONCILIATION_VIEW.BUSINESS);

    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('view', RECONCILIATION_VIEW.TECHNICAL);
    } else {
      next.delete('view');
    }
    setSearchParams(next, { replace: true });
  };

  const showTechnicalDetails = (anchorId) => {
    scrollToAnchor(anchorId, { openTechnical: true });
  };

  const investigateIssue = (cardId) => {
    scrollToAnchor(`card-${cardId}`, { openTechnical: false });
  };

  return (
    <div className="space-y-6">
      <IntegritySubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="size-8 text-amber-600" />
            Platform reconciliation
          </h1>
          <p className="text-gray-600 mt-1">
            Platform health for daily review — expand technical details for the full audit engine.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : data ? (
        <>
          <ReconciliationBusinessView
            data={data}
            onShowTechnical={showTechnicalDetails}
            onInvestigate={investigateIssue}
          />

          <ReconciliationHistoryTrend snapshots={history} days={historyDays} />

          <TechnicalDetailsToggle
            expanded={technicalOpen}
            onToggle={() => setTechnicalExpanded(!technicalOpen)}
          />

          {technicalOpen ? (
            <div ref={technicalRef}>
              <ReconciliationTechnicalView data={data} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
