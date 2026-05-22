import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { loggingConfigService, LOGGING_FEATURES } from '../services/loggingConfigService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { ScrollText, Power } from 'lucide-react';

const LoggingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [features, setFeatures] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await loggingConfigService.get();
      setGlobalEnabled(data.globalEnabled !== false);
      setFeatures(data.features || {});
      setUpdatedAt(data.updatedAt || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load logging config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveGlobal = async (checked) => {
    const prev = globalEnabled;
    setGlobalEnabled(checked); // optimistic
    try {
      const data = await loggingConfigService.update({ globalEnabled: checked });
      setUpdatedAt(data.updatedAt || null);
      toast.success(`Feature logging ${checked ? 'enabled' : 'disabled'} — applies on next app open`);
    } catch (e) {
      setGlobalEnabled(prev); // rollback
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const saveFeature = async (key, checked) => {
    const prev = features[key] !== false;
    setFeatures((f) => ({ ...f, [key]: checked })); // optimistic
    try {
      const data = await loggingConfigService.update({ features: { [key]: checked } });
      setFeatures(data.features || {});
      setUpdatedAt(data.updatedAt || null);
    } catch (e) {
      setFeatures((f) => ({ ...f, [key]: prev })); // rollback
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logging Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control which mobile app feature logs are sent to Sentry. Crashes and fatal errors are
          always sent and cannot be disabled here. Changes apply on each user&apos;s next app open.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Power className="w-4 h-4" /> Master switch</CardTitle>
          <CardDescription>Turn off to mute ALL non-fatal feature logs across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border rounded p-3">
            <div className="flex-1 min-w-0 pr-4">
              <div className="font-medium text-sm">Feature logging</div>
              <div className="text-xs text-gray-500">
                {globalEnabled
                  ? 'Enabled — feature logs are sent (per the toggles below).'
                  : 'Disabled — only crashes and fatal errors are sent.'}
              </div>
            </div>
            <Switch checked={globalEnabled} disabled={loading} onCheckedChange={saveGlobal} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScrollText className="w-4 h-4" /> Per-feature logging</CardTitle>
          <CardDescription>
            Each feature&apos;s handled errors, breadcrumbs, and performance traces. Disabled features
            are dropped on the device and never sent (zero quota cost).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : (
            LOGGING_FEATURES.map((feat) => {
              const on = features[feat.key] !== false;
              return (
                <div key={feat.key} className="flex items-center justify-between border rounded p-3">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {feat.label}
                      {!globalEnabled && <Badge variant="outline" className="text-gray-500">master off</Badge>}
                    </div>
                    <div className="text-xs text-gray-500">{feat.description}</div>
                  </div>
                  <Switch
                    checked={on}
                    disabled={!globalEnabled}
                    onCheckedChange={(v) => saveFeature(feat.key, v)}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {updatedAt && (
        <div className="text-xs text-gray-400">
          Last updated {new Date(updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default LoggingSettings;
