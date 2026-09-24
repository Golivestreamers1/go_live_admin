import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Save,
  RotateCcw,
  Flame,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  SlidersHorizontal,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { feedAdminService } from '../services/feedAdminService';

const DEFAULT_CONFIG = {
  likeWeight: 1.0,
  commentWeight: 2.0,
  shareWeight: 3.0,
  viewWeight: 0.2,
  timeDecayBaseHours: 2.0,
  timeDecayGravity: 1.0,
  freshnessEnabled: false,
  freshnessSmin: 0.15,
  freshnessTau0Hours: 6.0,
  freshnessBeta: 1.0,
  poolSize: 1000,
  poolMaxAgeDays: 30,
};

const FeedAlgorithmSettings = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulatedPosts, setSimulatedPosts] = useState([]);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await feedAdminService.getAlgorithmConfig();
      if (data) {
        setConfig({
          likeWeight: data.likeWeight ?? 1.0,
          commentWeight: data.commentWeight ?? 2.0,
          shareWeight: data.shareWeight ?? 3.0,
          viewWeight: data.viewWeight ?? 0.2,
          timeDecayBaseHours: data.timeDecayBaseHours ?? 2.0,
          timeDecayGravity: data.timeDecayGravity ?? 1.0,
          freshnessEnabled: data.freshnessEnabled === true,
          freshnessSmin: data.freshnessSmin ?? 0.15,
          freshnessTau0Hours: data.freshnessTau0Hours ?? 6.0,
          freshnessBeta: data.freshnessBeta ?? 1.0,
          poolSize: data.poolSize ?? 1000,
          poolMaxAgeDays: data.poolMaxAgeDays ?? 30,
        });
      }
    } catch (err) {
      toast.error('Failed to load algorithm settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSimulation = useCallback(async (currentConfig) => {
    try {
      setSimulating(true);
      const res = await feedAdminService.simulateAlgorithm({
        likeWeight: currentConfig.likeWeight,
        commentWeight: currentConfig.commentWeight,
        shareWeight: currentConfig.shareWeight,
        viewWeight: currentConfig.viewWeight,
        timeDecayBaseHours: currentConfig.timeDecayBaseHours,
        timeDecayGravity: currentConfig.timeDecayGravity,
        limit: 8,
      });
      const raw = res?.data ?? res;
      const list = Array.isArray(raw?.simulatedPosts)
        ? raw.simulatedPosts
        : Array.isArray(raw?.data?.simulatedPosts)
        ? raw.data.simulatedPosts
        : Array.isArray(res?.simulatedPosts)
        ? res.simulatedPosts
        : [];
      setSimulatedPosts(list);
    } catch (err) {
      // quiet simulation error
    } finally {
      setSimulating(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        runSimulation(config);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [config, loading, runSimulation]);

  const handleWeightChange = (key, val) => {
    const num = parseFloat(val);
    setConfig((prev) => ({
      ...prev,
      [key]: isNaN(num) ? '' : num,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await feedAdminService.updateAlgorithmConfig(config);
      toast.success('Feed algorithm settings updated and applied to feeds in real time!');
    } catch (err) {
      toast.error('Failed to save algorithm settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    toast.info('Settings reset to defaults. Click Save to persist.');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Flame className="h-7 w-7 text-orange-500" />
            Feed Algorithm Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Tweak formula weights, time decay curves, and test live feed ranking behavior.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleResetDefaults}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow"
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Algorithm
          </Button>
        </div>
      </div>

      {/* Formula Banner */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-purple-50/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-orange-100 p-3 text-orange-600 border border-orange-200 shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base">Active Trending Formula</h3>
              <div className="rounded-lg bg-white p-3 font-mono text-sm text-orange-700 border border-orange-200 shadow-inner overflow-x-auto">
                Trending Score = (Likes × {config.likeWeight} + Comments × {config.commentWeight} + Shares × {config.shareWeight} + Views × {config.viewWeight} + AdminBoost) ÷ (HoursSincePosted + {config.timeDecayBaseHours})^{config.timeDecayGravity}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Higher engagement weights push viral clips higher; higher gravity penalizes older posts faster.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Weights */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-purple-600" />
              Engagement Metric Weights
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Set how much each user interaction contributes to the engagement score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Like Weight */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Like Weight (W_like)
                </span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                  {config.likeWeight}x
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={config.likeWeight}
                  onChange={(e) => handleWeightChange('likeWeight', e.target.value)}
                  className="w-full accent-pink-500 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={config.likeWeight}
                  onChange={(e) => handleWeightChange('likeWeight', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>

            {/* Comment Weight */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  Comment Weight (W_comment)
                </span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                  {config.commentWeight}x
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={config.commentWeight}
                  onChange={(e) => handleWeightChange('commentWeight', e.target.value)}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={config.commentWeight}
                  onChange={(e) => handleWeightChange('commentWeight', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>

            {/* Share Weight */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-emerald-500" />
                  Share Weight (W_share)
                </span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                  {config.shareWeight}x
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.1"
                  value={config.shareWeight}
                  onChange={(e) => handleWeightChange('shareWeight', e.target.value)}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={config.shareWeight}
                  onChange={(e) => handleWeightChange('shareWeight', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>

            {/* View Weight */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-amber-500" />
                  View / Impression Weight (W_view)
                </span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                  {config.viewWeight}x
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.05"
                  value={config.viewWeight}
                  onChange={(e) => handleWeightChange('viewWeight', e.target.value)}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.05"
                  value={config.viewWeight}
                  onChange={(e) => handleWeightChange('viewWeight', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Decay & Freshness */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Time Decay & Freshness
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Control how rapidly older posts lose ranking and how repeat views decay for users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Base Hours */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">
                  Time Decay Base Hours (T₀)
                </span>
                <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                  {config.timeDecayBaseHours} hrs
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={config.timeDecayBaseHours}
                  onChange={(e) => handleWeightChange('timeDecayBaseHours', e.target.value)}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.5"
                  value={config.timeDecayBaseHours}
                  onChange={(e) => handleWeightChange('timeDecayBaseHours', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>

            {/* Gravity */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">
                  Time Decay Gravity (Exponent γ)
                </span>
                <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                  {config.timeDecayGravity}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={config.timeDecayGravity}
                  onChange={(e) => handleWeightChange('timeDecayGravity', e.target.value)}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={config.timeDecayGravity}
                  onChange={(e) => handleWeightChange('timeDecayGravity', e.target.value)}
                  className="w-20 bg-white border-gray-300 text-gray-900 font-mono text-right"
                />
              </div>
            </div>

            {/* Freshness Toggle */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Per-User Freshness Layer</p>
                <p className="text-xs text-muted-foreground">Demote posts already seen by a user</p>
              </div>
              <Switch
                checked={config.freshnessEnabled}
                onCheckedChange={(val) => setConfig((p) => ({ ...p, freshnessEnabled: val }))}
              />
            </div>

            {config.freshnessEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Seen Floor Multiplier (sMin)</label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="1.0"
                    value={config.freshnessSmin}
                    onChange={(e) => handleWeightChange('freshnessSmin', e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Recovery Time (tau0 hrs)</label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="72"
                    value={config.freshnessTau0Hours}
                    onChange={(e) => handleWeightChange('freshnessTau0Hours', e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Simulation Preview */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Live Feed Simulation Preview
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Real-time score calculation and ranking order on actual database posts using current slider settings.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runSimulation(config)}
            disabled={simulating}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${simulating ? 'animate-spin' : ''}`} />
            Re-Simulate
          </Button>
        </CardHeader>
        <CardContent>
          {simulatedPosts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent active posts found to simulate.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-600 uppercase">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Post / Content</th>
                    <th className="py-3 px-3">Author</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-right">Age (hrs)</th>
                    <th className="py-3 px-3 text-right">Stats (L/C/S/V)</th>
                    <th className="py-3 px-3 text-right">Admin Boost</th>
                    <th className="py-3 px-3 text-right text-orange-600 font-bold">Trending Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {simulatedPosts.map((p, idx) => (
                    <tr key={p._id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          idx === 1 ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                          idx === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          'text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-gray-900 max-w-xs truncate">
                        {p.content || '(Media)'}
                      </td>
                      <td className="py-3 px-3 font-sans text-gray-700">
                        @{p.author?.username || p.author?.name || 'unknown'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 capitalize border border-gray-200">
                          {p.postType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {p.hoursSincePosted}h
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700">
                        {p.likesCount} / {p.commentsCount} / {p.sharesCount} / {p.viewsCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {p.adminScoreAdjustment !== 0 ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.adminScoreAdjustment > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {p.adminScoreAdjustment > 0 ? `+${p.adminScoreAdjustment}` : p.adminScoreAdjustment}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-orange-600 font-bold text-base">
                        {p.simulatedScore.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedAlgorithmSettings;
