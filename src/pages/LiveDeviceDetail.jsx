import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DataCollectionBanner } from '../components/stabilization/LiveDeviceList';
import {
  formatAge,
  formatRam,
  formatRole,
} from '../components/stabilization/liveDeviceShared';
import {
  DeviceMemoryMetricsPanel,
  useLiveDeviceHistory,
} from '../components/stabilization/DeviceMemoryMetricsPanel';
import stabilizationService from '../services/stabilizationService';
import { usePolling } from '../hooks/usePolling';

const LIST_PATH = '/stabilization/camera-mic-memory';

const LiveDeviceDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const polling = usePolling(() => stabilizationService.getCameraMicStabilization(), {
    defaultIntervalMs: 20_000,
  });

  const data = polling.data;
  const liveDevices = data?.liveDevices || [];
  const stepCount = data?.cleanupStepsActive ?? 8;
  const liveHistory = useLiveDeviceHistory(liveDevices, polling.lastUpdatedAt?.getTime());

  const device = liveDevices.find((d) => d.userId === userId);
  const historyPoints = userId ? liveHistory[userId] || [] : [];

  if (!polling.isLoading && data && !device) {
    return (
      <div className="space-y-4">
        <Link
          to={LIST_PATH}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to live devices
        </Link>
        <div className="rounded-xl border border-dashed bg-gray-50/50 p-10 text-center">
          <Smartphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">Device no longer on live</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This user left the stream or their ping expired (~3 min).
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(LIST_PATH)}>
            Return to device list
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={LIST_PATH}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to live devices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {device?.deviceModel ?? 'Loading device…'}
          </h1>
          {device ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatRole(device.role)} · {device.osName} {device.osVersion} ·{' '}
              {formatRam(device.totalMemoryMb)} · ping {formatAge(device.reportedAt)}
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={polling.refresh} disabled={polling.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${polling.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {device ? (
        <>
          <DataCollectionBanner device={device} historyPoints={historyPoints} />
          <DeviceMemoryMetricsPanel
            device={device}
            historyPoints={historyPoints}
            stepCount={stepCount}
            subtitle={[
              formatRole(device.role),
              device.osName,
              device.osVersion,
              formatRam(device.totalMemoryMb),
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
