import React, { useCallback, useEffect, useState } from 'react';
import { Share2, Trophy, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { featuresAllowedService } from '../services/featuresAllowedService';

const FeaturesAllowed = () => {
  const [settings, setSettings] = useState({
    referral: true,
    contest: true,
    gifterWheel: true,
    mysteryWheel: true,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await featuresAllowedService.getSettings();
      setSettings({
        referral: data?.referral !== false,
        contest: data?.contest !== false,
        gifterWheel: data?.gifterWheel !== false,
        mysteryWheel: data?.mysteryWheel !== false,
      });
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
      setSettings((prev) => ({ ...prev, referral: updated?.referral !== false }));
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

  const handleContestToggle = async (checked) => {
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({ contest: checked });
      setSettings((prev) => ({ ...prev, contest: updated?.contest !== false }));
      toast.success(
        checked
          ? 'Contest feature enabled — the Contest tab is visible in the app'
          : 'Contest feature disabled — the Contest tab is hidden in the app',
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update contest setting');
    } finally {
      setUpdating(false);
    }
  };

  const handleGifterWheelToggle = async (checked) => {
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({ gifterWheel: checked });
      setSettings((prev) => ({ ...prev, gifterWheel: updated?.gifterWheel !== false }));
      toast.success(
        checked
          ? 'Gifter Wheel enabled — the tile is visible in the gift panel'
          : 'Gifter Wheel disabled — the tile is hidden and spins are blocked',
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update Gifter Wheel setting');
    } finally {
      setUpdating(false);
    }
  };

  const handleMysteryWheelToggle = async (checked) => {
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({ mysteryWheel: checked });
      setSettings((prev) => ({ ...prev, mysteryWheel: updated?.mysteryWheel !== false }));
      toast.success(
        checked
          ? 'Mystery Wheel enabled — the tile is visible in the gift panel'
          : 'Mystery Wheel disabled — the tile is hidden and spins are blocked',
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update Mystery Wheel setting');
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

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                Contest feature
              </CardTitle>
              <CardDescription className="mt-1">
                When off: the Contest tab is hidden in the app and the public contest APIs return
                nothing. Contest management here in the admin stays available.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
              <span className="text-sm font-medium">
                {settings.contest ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.contest !== false}
                onCheckedChange={handleContestToggle}
                disabled={loading || updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Default is enabled. Existing contests are not deleted — they reappear when re-enabled.
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-600" />
                Gifter Wheel
              </CardTitle>
              <CardDescription className="mt-1">
                When off: the Gifter Wheel tile is hidden in the gift panel and its spin API returns disabled.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
              <span className="text-sm font-medium">
                {settings.gifterWheel ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.gifterWheel !== false}
                onCheckedChange={handleGifterWheelToggle}
                disabled={loading || updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Default is enabled. The viewer pays 1,000 coins to spin and wins the landed amount as coins.
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Mystery Wheel
              </CardTitle>
              <CardDescription className="mt-1">
                When off: the Mystery Wheel tile is hidden in the gift panel and its spin API returns disabled.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
              <span className="text-sm font-medium">
                {settings.mysteryWheel ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.mysteryWheel !== false}
                onCheckedChange={handleMysteryWheelToggle}
                disabled={loading || updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Default is enabled. The viewer pays 1,000 coins to spin and the streamer receives the spin plus the landed prize as rubies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturesAllowed;
