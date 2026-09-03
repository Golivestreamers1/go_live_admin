import React, { useCallback, useEffect, useState } from 'react';
import { Share2, Trophy, Gift, Sparkles, Globe, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { featuresAllowedService } from '../services/featuresAllowedService';

const DEFAULT_GIFT_QUEUE = 6;
const MIN_GIFT_QUEUE = 1;
const MAX_GIFT_QUEUE = 12;

const clampGiftQueue = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_GIFT_QUEUE;
  return Math.max(MIN_GIFT_QUEUE, Math.min(MAX_GIFT_QUEUE, Math.round(n)));
};

const FeaturesAllowed = () => {
  const [settings, setSettings] = useState({
    referral: true,
    contest: true,
    gifterWheel: true,
    mysteryWheel: true,
    coinsWebsite: false,
    maxGiftAnimationQueue: DEFAULT_GIFT_QUEUE,
  });
  const [queueDraft, setQueueDraft] = useState(String(DEFAULT_GIFT_QUEUE));
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await featuresAllowedService.getSettings();
      const queue = clampGiftQueue(data?.maxGiftAnimationQueue ?? DEFAULT_GIFT_QUEUE);
      setSettings({
        referral: data?.referral !== false,
        contest: data?.contest !== false,
        gifterWheel: data?.gifterWheel !== false,
        mysteryWheel: data?.mysteryWheel !== false,
        coinsWebsite: data?.coinsWebsite === true,
        maxGiftAnimationQueue: queue,
      });
      setQueueDraft(String(queue));
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

  const handleCoinsWebsiteToggle = async (checked) => {
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({ coinsWebsite: checked });
      setSettings((prev) => ({ ...prev, coinsWebsite: updated?.coinsWebsite === true }));
      toast.success(
        checked
          ? 'Coins website enabled — users can buy coins via the website from the Wallet screen'
          : 'Coins website disabled — the website purchase option is hidden in the app',
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update coins website setting');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveGiftQueue = async () => {
    const next = clampGiftQueue(queueDraft);
    setQueueDraft(String(next));
    try {
      setUpdating(true);
      const updated = await featuresAllowedService.updateSettings({
        maxGiftAnimationQueue: next,
      });
      const saved = clampGiftQueue(updated?.maxGiftAnimationQueue ?? next);
      setSettings((prev) => ({ ...prev, maxGiftAnimationQueue: saved }));
      setQueueDraft(String(saved));
      toast.success(`Live gift queue set to ${saved} (playing + waiting)`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update gift queue size');
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

      <Card className="border-l-4 border-l-sky-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-sky-600" />
                Show coins website
              </CardTitle>
              <CardDescription className="mt-1">
                When on: the Wallet screen shows a &quot;Buy coins from website&quot; option that opens
                coins.golivestreamers.com in an in-app browser.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
              <span className="text-sm font-medium">
                {settings.coinsWebsite ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.coinsWebsite === true}
                onCheckedChange={handleCoinsWebsiteToggle}
                disabled={loading || updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Default is disabled. In-app store packages remain available regardless of this setting.
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-rose-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-rose-600" />
            Live gift animation queue
          </CardTitle>
          <CardDescription className="mt-1">
            How many gift animations can show at once on live (the one playing plus waiting).
            Extra gifts still count coins — only the animation is skipped. Applies on the next live session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={MIN_GIFT_QUEUE}
              max={MAX_GIFT_QUEUE}
              step={1}
              inputMode="numeric"
              className="w-24"
              value={queueDraft}
              onChange={(e) => setQueueDraft(e.target.value)}
              disabled={loading || updating}
            />
            <Button
              type="button"
              onClick={handleSaveGiftQueue}
              disabled={
                loading ||
                updating ||
                clampGiftQueue(queueDraft) === settings.maxGiftAnimationQueue
              }
            >
              Save
            </Button>
            <span className="text-sm text-muted-foreground">
              Current: {settings.maxGiftAnimationQueue}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Allowed range {MIN_GIFT_QUEUE}–{MAX_GIFT_QUEUE}. Default is {DEFAULT_GIFT_QUEUE}.
            Higher values can slow or crash live on older phones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturesAllowed;
