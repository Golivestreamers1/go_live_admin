import React, { useCallback, useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { featuresAllowedService } from '../services/featuresAllowedService';

export default function FeaturesAllowed() {
  const [settings, setSettings] = useState({ referral: true });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await featuresAllowedService.getSettings();
      setSettings({ referral: data?.referral !== false });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load feature settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleReferralToggle = async (checked) => {
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({ referral: checked });
      setSettings({ referral: updated?.referral !== false });
      toast.success(
        checked
          ? 'Referral program enabled — signup field and Refer screen are visible'
          : 'Referral program disabled — signup field and Refer screen are hidden',
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update referral setting');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Features Allowed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control which app features are visible to users. Changes apply on next app open or refresh.
        </p>
      </div>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                Referral program
              </CardTitle>
              <CardDescription className="mt-1">
                When off: referral code field is hidden on signup, the Refer screen is hidden in profile,
                and referral APIs return disabled.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
              <span className="text-sm font-medium">
                {settings.referral ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.referral !== false}
                onCheckedChange={handleReferralToggle}
                disabled={loading || updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Default is enabled. Admin Referrals analytics page still shows historical data when this is off.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
