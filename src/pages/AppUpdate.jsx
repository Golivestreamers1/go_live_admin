import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { appUpdateService } from '../services/appUpdateService';

const EMPTY = {
  minVersion: '0.0.0',
  latestVersion: '0.0.0',
  forceUpdate: false,
  message: '',
  storeUrls: { ios: '', android: '' },
  updatedAt: null,
};

function formatUpdatedAt(value) {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

const AppUpdate = () => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await appUpdateService.getSettings();
      setForm({
        minVersion: data?.minVersion || '0.0.0',
        latestVersion: data?.latestVersion || '0.0.0',
        forceUpdate: data?.forceUpdate === true,
        message: data?.message || '',
        storeUrls: {
          ios: data?.storeUrls?.ios || '',
          android: data?.storeUrls?.android || '',
        },
        updatedAt: data?.updatedAt || null,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load app update settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await appUpdateService.updateSettings({
        latestVersion: form.latestVersion.trim(),
        forceUpdate: form.forceUpdate,
        message: form.message.trim(),
      });
      setForm({
        minVersion: updated?.minVersion || form.latestVersion,
        latestVersion: updated?.latestVersion || form.latestVersion,
        forceUpdate: updated?.forceUpdate === true,
        message: updated?.message || form.message,
        storeUrls: {
          ios: updated?.storeUrls?.ios || form.storeUrls.ios,
          android: updated?.storeUrls?.android || form.storeUrls.android,
        },
        updatedAt: updated?.updatedAt || null,
      });
      toast.success('App update settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save app update settings');
    } finally {
      setSaving(false);
    }
  };

  const enforcementActive = form.forceUpdate && form.latestVersion !== '0.0.0';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control when mobile users must update. Changes apply on next app open or resume.
        </p>
      </div>

      {enforcementActive ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Force update is active</p>
            <p className="mt-1 text-amber-800">
              Users below version <strong>{form.latestVersion}</strong> must update before using the app.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Version policy
          </CardTitle>
          <CardDescription>
            Set <strong>Store version</strong> to the build live on App Store and Play Store. Users on an
            older version get a soft update prompt; turn on <strong>Force update</strong> to block the app
            until they update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="latestVersion">Store version</Label>
              <Input
                id="latestVersion"
                placeholder="1.0.35"
                value={form.latestVersion}
                onChange={(e) => setForm((prev) => ({ ...prev, latestVersion: e.target.value }))}
                disabled={loading || saving}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Semver of the build on the stores (e.g. 1.0.35). Must match versionName / CFBundleShortVersionString.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
              <div>
                <p className="text-sm font-medium">Force update</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When on, users below store version cannot use the app until they update.
                </p>
              </div>
              <Switch
                checked={form.forceUpdate}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, forceUpdate: checked }))
                }
                disabled={loading || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Update message</Label>
              <Textarea
                id="message"
                rows={3}
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                disabled={loading || saving}
                placeholder="A new version of GoLive is available. Please update to continue."
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium text-gray-900">Store links (read-only)</p>
              <p className="text-xs text-muted-foreground break-all">
                iOS: {form.storeUrls.ios || '—'}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                Android: {form.storeUrls.android || '—'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Last saved: {formatUpdatedAt(form.updatedAt)}
              </p>
              <Button type="submit" disabled={loading || saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Typical rollout</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Ship the new build to App Store and Play Store.</p>
          <p>2. Set <strong>Store version</strong> to that build (e.g. 1.0.35).</p>
          <p>3. Force update <strong>off</strong> → users on older builds see a soft update prompt.</p>
          <p>4. Force update <strong>on</strong> → users on older builds are blocked until they update.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppUpdate;
