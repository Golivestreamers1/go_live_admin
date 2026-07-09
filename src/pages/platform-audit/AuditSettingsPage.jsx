import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Bell, Database, Shield, Coins, Save, RefreshCw } from 'lucide-react';
import platformAuditService from '../../services/platformAuditService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectItem } from '../../components/ui/select';

const AuditSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await platformAuditService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load audit settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const payload = {
        schedule: settings.schedule,
        reconciliation: settings.reconciliation,
        alertThresholds: settings.alertThresholds,
        notifications: settings.notifications,
        retention: settings.retention,
      };
      const saved = await platformAuditService.updateSettings(payload);
      setSettings(saved);
      toast.success('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  const economy = settings.economyConstants ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            Configure audit schedules, alert thresholds, notifications, and retention.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Schedule
          </CardTitle>
          <CardDescription>
            Cron expressions for nightly jobs (informational — configure cron on the server to match).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Reconciliation snapshot</Label>
            <Input
              value={settings.schedule.reconciliationCron}
              onChange={(e) => updateField('schedule', 'reconciliationCron', e.target.value)}
            />
          </div>
          <div>
            <Label>Integrity scan</Label>
            <Input
              value={settings.schedule.integrityScanCron}
              onChange={(e) => updateField('schedule', 'integrityScanCron', e.target.value)}
            />
          </div>
          <div>
            <Label>Alert batch job</Label>
            <Input
              value={settings.schedule.alertBatchCron}
              onChange={(e) => updateField('schedule', 'alertBatchCron', e.target.value)}
            />
          </div>
          <div>
            <Label>Reconciliation frequency</Label>
            <Select
              value={settings.reconciliation.frequency}
              onValueChange={(v) => updateField('reconciliation', 'frequency', v)}
            >
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2 sm:col-span-2">
            <div>
              <Label>Include fleet integrity scan</Label>
              <p className="text-xs text-muted-foreground">Run fleet scan during nightly reconciliation</p>
            </div>
            <Switch
              checked={settings.reconciliation.includeFleetScan}
              onCheckedChange={(v) => updateField('reconciliation', 'includeFleetScan', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Alert thresholds
          </CardTitle>
          <CardDescription>Values used by alert generation batch jobs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Refund lookback (days)</Label>
            <Input
              type="number"
              min={1}
              value={settings.alertThresholds.refundLookbackDays}
              onChange={(e) =>
                updateField('alertThresholds', 'refundLookbackDays', Number(e.target.value))
              }
            />
          </div>
          <div>
            <Label>Refund count threshold</Label>
            <Input
              type="number"
              min={1}
              value={settings.alertThresholds.refundCountThreshold}
              onChange={(e) =>
                updateField('alertThresholds', 'refundCountThreshold', Number(e.target.value))
              }
            />
          </div>
          <div>
            <Label>Stream settlement lookback (days)</Label>
            <Input
              type="number"
              min={1}
              value={settings.alertThresholds.streamSettlementLookbackDays}
              onChange={(e) =>
                updateField('alertThresholds', 'streamSettlementLookbackDays', Number(e.target.value))
              }
            />
          </div>
          <div>
            <Label>Max settlement issues per batch</Label>
            <Input
              type="number"
              min={1}
              value={settings.alertThresholds.streamSettlementIssueLimit}
              onChange={(e) =>
                updateField('alertThresholds', 'streamSettlementIssueLimit', Number(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>Webhook stub for v1 — delivery deferred to v2.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label>Enable webhook</Label>
            <Switch
              checked={settings.notifications.webhookEnabled}
              onCheckedChange={(v) => updateField('notifications', 'webhookEnabled', v)}
            />
          </div>
          <div>
            <Label>Webhook URL</Label>
            <Input
              placeholder="https://example.com/hooks/platform-audit"
              value={settings.notifications.webhookUrl}
              onChange={(e) => updateField('notifications', 'webhookUrl', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Retention
          </CardTitle>
          <CardDescription>Old reports are purged after generation when past retention.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Report retention (days)</Label>
            <Input
              type="number"
              min={7}
              value={settings.retention.reportRetentionDays}
              onChange={(e) =>
                updateField('retention', 'reportRetentionDays', Number(e.target.value))
              }
            />
          </div>
          <div>
            <Label>Operation log retention (days)</Label>
            <Input
              type="number"
              min={30}
              value={settings.retention.operationLogRetentionDays}
              onChange={(e) =>
                updateField('retention', 'operationLogRetentionDays', Number(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            Economy constants
          </CardTitle>
          <CardDescription>Read-only — sourced from {economy.source ?? 'constants.js'}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Coin → USD cashout</p>
            <p className="font-medium">{economy.coinToUsdCashout}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Ruby → USD cashout</p>
            <p className="font-medium">{economy.rubyToUsdCashout}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Ruby → coin rate</p>
            <p className="font-medium">{economy.rubyToCoinRate}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Streamer earnings rate</p>
            <p className="font-medium">{economy.streamerEarningsRate}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{settings.permissionsNote}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditSettingsPage;
