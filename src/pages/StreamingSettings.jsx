import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { streamSettingsService } from '../services/streamSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Tv, Radio, AlertTriangle, Loader2 } from 'lucide-react';

const StreamingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    isStreamV2Enabled: false,
    isStreamSimulcastEnabled: false,
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await streamSettingsService.getSettings();
      setSettings({
        isStreamV2Enabled: !!data?.isStreamV2Enabled,
        isStreamSimulcastEnabled: !!data?.isStreamSimulcastEnabled,
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load streaming settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleV2 = async (checked) => {
    const prev = { ...settings };
    const next = {
      isStreamV2Enabled: checked,
      // If V2 is turned off, also turn off simulcast
      isStreamSimulcastEnabled: checked ? settings.isStreamSimulcastEnabled : false,
    };
    setSettings(next);
    try {
      setSaving(true);
      await streamSettingsService.updateSettings(next);
      toast.success(checked ? 'Stream V2 enabled' : 'Stream V2 disabled');
    } catch (e) {
      setSettings(prev);
      toast.error(e?.response?.data?.message || 'Failed to update V2 setting');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSimulcast = async (checked) => {
    const prev = { ...settings };
    const next = { ...settings, isStreamSimulcastEnabled: checked };
    setSettings(next);
    try {
      setSaving(true);
      await streamSettingsService.updateSettings({ isStreamSimulcastEnabled: checked });
      toast.success(checked ? 'Simulcast enabled' : 'Simulcast disabled');
    } catch (e) {
      setSettings(prev);
      toast.error(e?.response?.data?.message || 'Failed to update simulcast setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading streaming settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Streaming Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control live-stream feature flags. Changes propagate to all connected mobile clients within 5 minutes
          (or immediately on app restart).
        </p>
      </div>

      {/* V2 Streaming toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-4 h-4" /> Stream V2
          </CardTitle>
          <CardDescription>
            Enable the new V2 live-streaming screens for all mobile users.
            When disabled, users will see the legacy V1 live screens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label htmlFor="v2-toggle" className="text-sm font-medium">
                V2 Streaming
              </Label>
              {settings.isStreamV2Enabled ? (
                <Badge variant="outline" className="text-green-700 border-green-300">enabled</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">disabled</Badge>
              )}
            </div>
            <Switch
              id="v2-toggle"
              checked={settings.isStreamV2Enabled}
              onCheckedChange={handleToggleV2}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Simulcast toggle */}
      <Card className={!settings.isStreamV2Enabled ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4" /> Simulcast
          </CardTitle>
          <CardDescription>
            Enable Agora simulcast for adaptive bitrate streaming. Requires V2 to be enabled first.
            This will be wired to the Agora SDK in a future step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label htmlFor="simulcast-toggle" className="text-sm font-medium">
                Simulcast
              </Label>
              {settings.isStreamSimulcastEnabled ? (
                <Badge variant="outline" className="text-green-700 border-green-300">enabled</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">disabled</Badge>
              )}
            </div>
            <Switch
              id="simulcast-toggle"
              checked={settings.isStreamSimulcastEnabled}
              onCheckedChange={handleToggleSimulcast}
              disabled={saving || !settings.isStreamV2Enabled}
            />
          </div>
          {!settings.isStreamV2Enabled && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Enable Stream V2 first to unlock simulcast.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Tv className="w-4 h-4" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-600">
            <p>• Mobile clients fetch these settings on app launch and cache them for 5 minutes.</p>
            <p>• Toggling <strong>V2 off</strong> acts as a <strong>kill switch</strong> — all users revert to V1 screens on next cache refresh.</p>
            <p>• <strong>Simulcast</strong> is a DB-only flag for now; Agora SDK integration comes in Step 6.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamingSettings;
