import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';
import { useListBack } from '../hooks/useListNavigation';
import { Button } from '../components/ui/button';
import { DataCollectionBanner } from '../components/stabilization/LiveDeviceList';
import { formatAge, formatAppRamUsage, formatRole } from '../components/stabilization/liveDeviceShared';
import {
  DeviceMemoryMetricsPanel,
} from '../components/stabilization/DeviceMemoryMetricsPanel';
import stabilizationService from '../services/stabilizationService';
import { useStabilizationRealtime } from '../hooks/useStabilizationRealtime';
import StabilizationLiveBadge from '../components/stabilization/StabilizationLiveBadge';

const LIST_PATH = '/stabilization';

const LiveDeviceDetail = () => {
  const { userId } = useParams();
  const location = useLocation();
  const fallbackPath = location.pathname.includes('camera-mic-memory')
    ? '/stabilization/camera-mic-memory'
    : LIST_PATH;
  const goBack = useListBack(fallbackPath);

  const realtime = useStabilizationRealtime(
    () => stabilizationService.getCameraMicStabilization(),
    (payload) => payload?.cameraMic,
  );

  const data = realtime.data;
  const liveDevices = data?.liveDevices || [];
  const stepCount = data?.cleanupStepsActive ?? 8;

  const device = liveDevices.find((d) => d.userId === userId);

  if (!realtime.isLoading && data && !device) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 px-0"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App Stability
        </Button>
        <div className="rounded-xl border border-dashed bg-gray-50/50 p-10 text-center">
          <Smartphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">Device no longer on live</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This user left the stream or their ping expired (~3 min).
          </p>
          <Button className="mt-4" variant="outline" onClick={goBack}>
            Return to App Stability
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 px-0"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App Stability
          </Button>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
            {device?.deviceModel ?? 'Loading device…'}
            <StabilizationLiveBadge isLive={realtime.isLive} isStale={realtime.isStale} />
          </h1>
          {device ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatRole(device.role)} · {device.osName} {device.osVersion} ·{' '}
              {formatAppRamUsage(device, { precise: true })} · ping {formatAge(device.reportedAt)}
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={realtime.refresh} disabled={realtime.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${realtime.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {device ? (
        <>
          <DataCollectionBanner device={device} />
          <DeviceMemoryMetricsPanel
            device={device}
            stepCount={stepCount}
            subtitle={[
              formatRole(device.role),
              device.osName,
              device.osVersion,
              formatAppRamUsage(device, { precise: true }),
              `Last ping ${formatAge(device.reportedAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading device metrics…</p>
      )}
    </div>
  );
};

export default LiveDeviceDetail;
