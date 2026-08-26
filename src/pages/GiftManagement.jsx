import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { giftService } from '../services/giftService';
import GiftProcessingPanel from '../components/GiftProcessingPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { Gift, Plus, Pencil, Trash2, Image as ImageIcon, Upload, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';
import {
  findCategoryTab,
  isGatedCategoryTab,
  needsCrownGate,
  needsRoleGate,
} from '../utils/giftCategoryHelpers';

const PRIZE_RECIPIENTS = [
  { value: 'streamer', label: 'Streamer' },
  { value: 'viewer', label: 'Viewer' },
];
const PRIZE_CURRENCIES = [
  { value: 'rubies', label: 'Rubies' },
  { value: 'coins', label: 'Coins' },
];
const DEFAULT_SEGMENT_COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#EAB308'];
const WHEEL_THEME_FIELDS = [
  { key: 'pointerColor', label: 'Pointer' },
  { key: 'centerColor', label: 'Center' },
  { key: 'textColor', label: 'Text' },
  { key: 'ringColor', label: 'Ring' },
  { key: 'backgroundColor', label: 'Background' },
];

const makeWheelSegment = (i = 0) => ({
  label: '',
  value: '',
  chancePercent: '',
  color: DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length],
});

const makeEmptyWheel = () => ({
  name: '',
  cost: '',
  category: 'Special',
  prizeRecipient: 'streamer',
  prizeCurrency: 'rubies',
  minTierCreditsZero: false,
  creditsZeroThreshold: '',
  segments: [makeWheelSegment(0), makeWheelSegment(1)],
  theme: { pointerColor: '', centerColor: '', textColor: '', ringColor: '', backgroundColor: '' },
  displayOrder: 0,
  isActive: true,
});

/** Live preview: equal-arc pie of the wheel segments, colored by tier. */
function WheelPreview({ segments, theme }) {
  const segs = (segments || []).filter((s) => s != null);
  const n = Math.max(segs.length, 1);
  const stops = segs
    .map((s, i) => {
      const color = (s.color || '').trim() || DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length];
      const from = ((i / n) * 100).toFixed(2);
      const to = (((i + 1) / n) * 100).toFixed(2);
      return `${color} ${from}% ${to}%`;
    })
    .join(', ');
  const ring = (theme?.ringColor || '').trim() || '#1f2937';
  const center = (theme?.centerColor || '').trim() || '#ffffff';
  const pointer = (theme?.pointerColor || '').trim() || '#ef4444';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 w-40">
        <div
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `14px solid ${pointer}`,
          }}
        />
        <div
          className="h-40 w-40 rounded-full"
          style={{
            background: segs.length ? `conic-gradient(${stops})` : '#e5e7eb',
            border: `4px solid ${ring}`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ background: center }}
        />
      </div>
      <span className="text-xs text-muted-foreground">Preview (segments shown at equal size)</span>
    </div>
  );
}

const emptyGift = {
  name: '',
  coinValue: '',
  category: 'Trending',
  /** Crown gate — only used when category === 'Crown'. Hierarchical: a user with a higher
   *  tier can also send lower-tier gifts (Gold unlocks Bronze + Silver + Gold). */
  requiredCrownTier: '',
  /** Sponsor gate — only used when category === 'Sponsor'. */
  requiredRole: '',
  iconUrl: '',
  animationUrl: '',
  /** Transparent + audio — HEVC .mov for iOS live hero. */
  videoUrlIos: '',
  /** Opaque / platform fallback — WebM or MP4 for Android live hero. */
  videoUrlAndroid: '',
  /** Stacked luma-matte MP4 — RGB top / alpha bottom; one file for iOS + Android. */
  videoUrlLumaMatte: '',
  /** Raw Lottie JSON (Bodymovin) — from paste or .json file read in browser; stored in MongoDB. */
  animationJson: '',
  animationDurationMs: null,
  /** Admin-facing seconds (converted to ms on save). */
  animationDurationSec: '',
  /** Live hero height — % of screen (0.8 = 80%, or enter 80). Empty = app default. Width is always full screen. */
  heroHeightPercent: '',
  displayOrder: 0,
  isActive: true,
};

const msToDurationSecInput = (ms) => {
  if (ms == null || ms === '' || Number(ms) <= 0) return '';
  const sec = Number(ms) / 1000;
  return Number.isInteger(sec) ? String(sec) : String(Math.round(sec * 100) / 100);
};

const parseDurationSecToMs = (secStr) => {
  if (secStr === '' || secStr == null) return null;
  const sec = Number(secStr);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.round(sec * 1000);
};

const formatDurationLabel = (ms) => {
  if (ms == null || Number(ms) <= 0) return '—';
  const sec = Number(ms) / 1000;
  return sec >= 10 ? `${sec.toFixed(1)} s` : `${sec < 1 ? sec.toFixed(2) : sec.toFixed(1)} s`;
};

const formatHeroPercentForInput = (pct) => {
  if (pct == null || Number(pct) <= 0) return '';
  return String(pct);
};

/** Accept 0.5 (50%) or 50 — store as percent 0.01–100. */
const parseHeroPercentInput = (value) => {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.min(100, Math.max(0.01, pct));
};

/** Table icon column: static icon/GIF first; else hero video when there is no separate icon. */
function giftStripPreviewSrc(g) {
  const icon = g?.iconUrl?.trim();
  if (icon) return icon;
  const anim = g?.animationUrl?.trim();
  if (anim && !/\.json($|\?)/i.test(anim) && !isVideoAnimationUrl(anim)) return anim;
  return giftHeroPreviewSrc(g);
}

function giftHeroPreviewSrc(g) {
  const luma = g?.videoUrlLumaMatte?.trim();
  if (luma) return luma;
  const ios = g?.videoUrlIos?.trim();
  const android = g?.videoUrlAndroid?.trim();
  if (ios) return ios;
  if (android) return android;
  const anim = g?.animationUrl?.trim();
  if (anim) return anim;
  return null;
}

function isVideoAnimationUrl(url) {
  const u = String(url || '').trim().split('?')[0].toLowerCase();
  return /\.(mp4|m4v|mov|webm)$/.test(u);
}

function GiftAnimationPreview({ src, className, imgClassName = 'h-full w-full object-contain' }) {
  const url = String(src || '').trim();
  if (!url) return null;
  if (isVideoAnimationUrl(url)) {
    return (
      <video
        src={url}
        className={className || imgClassName}
        muted
        playsInline
        loop
        autoPlay
      />
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={imgClassName}
      onError={(e) => {
        e.target.onerror = null;
        e.target.style.display = 'none';
      }}
    />
  );
}

const GiftManagement = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState({ ...emptyGift });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPreviewUrl, setIconPreviewUrl] = useState('');
  const iconFileRef = React.useRef(null);
  const [uploadingAnimation, setUploadingAnimation] = useState(false);
  const [animationPreviewUrl, setAnimationPreviewUrl] = useState('');
  const animationFileRef = React.useRef(null);
  const [uploadingIosVideo, setUploadingIosVideo] = useState(false);
  const [uploadingAndroidVideo, setUploadingAndroidVideo] = useState(false);
  const [uploadingLumaMatteVideo, setUploadingLumaMatteVideo] = useState(false);
  const [iosVideoPreviewUrl, setIosVideoPreviewUrl] = useState('');
  const [androidVideoPreviewUrl, setAndroidVideoPreviewUrl] = useState('');
  const [lumaMatteVideoPreviewUrl, setLumaMatteVideoPreviewUrl] = useState('');
  const iosVideoFileRef = React.useRef(null);
  const androidVideoFileRef = React.useRef(null);
  const lumaMatteVideoFileRef = React.useRef(null);
  const lottieJsonFileRef = React.useRef(null);
  const [wheelDialogOpen, setWheelDialogOpen] = useState(false);
  const [editingWheel, setEditingWheel] = useState(null);
  const [wheelForm, setWheelForm] = useState(() => makeEmptyWheel());
  const [wheelSubmitting, setWheelSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [crownTiers, setCrownTiers] = useState([]);
  const [giftRoles, setGiftRoles] = useState([]);

  const wheelCategoryOptions = categories.filter(
    (c) => !c.gated && !c.gateType,
  );

  const crownTierLabel = (tier) =>
    crownTiers.find((t) => Number(t.value ?? t.tier) === Number(tier))?.label ?? null;
  const giftRoleLabel = (role) =>
    giftRoles.find((r) => r.value === role)?.label ?? null;

  const fetchCategories = async () => {
    try {
      const data = await giftService.getCategories();
      const list = Array.isArray(data?.categories) ? data.categories : [];
      setCategories(list);
      setCrownTiers(Array.isArray(data?.crownTiers) ? data.crownTiers : []);
      setGiftRoles(Array.isArray(data?.giftRoles) ? data.giftRoles : []);
      return list;
    } catch (err) {
      console.error('Failed to fetch gift categories', err);
      toast.error(err.response?.data?.message || 'Failed to fetch gift categories');
      return [];
    }
  };

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const list = await giftService.getGifts();
      setGifts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch gifts', err);
      toast.error(err.response?.data?.message || 'Failed to fetch gifts');
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
    fetchGifts();
  }, []);

  const openCreate = () => {
    setEditingGift(null);
    setForm({ ...emptyGift });
    setIconPreviewUrl('');
    setAnimationPreviewUrl('');
    setIosVideoPreviewUrl('');
    setAndroidVideoPreviewUrl('');
    setLumaMatteVideoPreviewUrl('');
    setDialogOpen(true);
  };

  const openEdit = (gift) => {
    setEditingGift(gift);
    setForm({
      name: gift.name ?? '',
      coinValue: gift.coinValue ?? '',
      category: findCategoryTab(categories, gift.category)?.key ?? gift.category ?? 'Trending',
      requiredCrownTier: gift.requiredCrownTier != null ? String(gift.requiredCrownTier) : '',
      requiredRole: gift.requiredRole ?? '',
      iconUrl: gift.iconUrl ?? '',
      animationUrl: gift.animationUrl ?? '',
      videoUrlIos: gift.videoUrlIos ?? '',
      videoUrlAndroid: gift.videoUrlAndroid ?? '',
      videoUrlLumaMatte: gift.videoUrlLumaMatte ?? '',
      animationJson: typeof gift.animationJson === 'string' ? gift.animationJson : '',
      animationDurationMs:
        typeof gift.animationDurationMs === 'number' && gift.animationDurationMs > 0
          ? gift.animationDurationMs
          : null,
      animationDurationSec: msToDurationSecInput(gift.animationDurationMs),
      heroHeightPercent: formatHeroPercentForInput(gift.heroHeightPercent),
      displayOrder: gift.displayOrder ?? 0,
      isActive: gift.isActive !== false,
    });
    setIconPreviewUrl(gift.iconUrl ?? '');
    setAnimationPreviewUrl(gift.animationUrl ?? '');
    setIosVideoPreviewUrl(gift.videoUrlIos ?? '');
    setAndroidVideoPreviewUrl(gift.videoUrlAndroid ?? '');
    setLumaMatteVideoPreviewUrl(gift.videoUrlLumaMatte ?? '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingGift(null);
    setForm({ ...emptyGift });
    setIconPreviewUrl('');
    setAnimationPreviewUrl('');
    setIosVideoPreviewUrl('');
    setAndroidVideoPreviewUrl('');
    setLumaMatteVideoPreviewUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = String(form.name).trim();
    const coinValue = Number(form.coinValue);
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (isNaN(coinValue) || coinValue < 0) {
      toast.error('Coin value must be a non-negative number');
      return;
    }
    const iconT = form.iconUrl?.trim() || '';
    const animT = form.animationUrl?.trim() || '';
    const videoIosT = form.videoUrlIos?.trim() || '';
    const videoAndroidT = form.videoUrlAndroid?.trim() || '';
    const videoLumaT = form.videoUrlLumaMatte?.trim() || '';
    const animJsonT = form.animationJson?.trim() || '';
    if (animJsonT) {
      try {
        JSON.parse(animJsonT);
      } catch {
        toast.error('Lottie JSON is invalid — paste valid JSON from your .json file.');
        return;
      }
    }
    if (!iconT && !animT && !animJsonT && !videoIosT && !videoAndroidT && !videoLumaT) {
      toast.error('Add Lottie JSON, luma-matte / platform videos, a GIF/image animation, and/or an icon — at least one is required.');
      return;
    }
    /** Gated categories need their unlock rule, otherwise nobody could ever send the gift. */
    if (needsCrownGate(categories, form.category) && !form.requiredCrownTier) {
      toast.error('Crown gifts need a required crown tier (Bronze / Silver / Gold / Ruby).');
      return;
    }
    if (needsRoleGate(categories, form.category) && !form.requiredRole) {
      toast.error('Sponsor/Icons gifts need a required status (Sponsored / Icon Creator / Either).');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        name,
        coinValue,
        category: form.category || categories[0]?.key || 'Trending',
        /** Always send both (null when not applicable) so switching a gift OUT of a gated
         *  category clears its old gate instead of leaving it silently locked. */
        requiredCrownTier:
          needsCrownGate(categories, form.category) && form.requiredCrownTier
            ? Number(form.requiredCrownTier)
            : null,
        requiredRole:
          needsRoleGate(categories, form.category) && form.requiredRole ? form.requiredRole : null,
        iconUrl: iconT || undefined,
        animationUrl: animT || undefined,
        videoUrlIos: videoIosT || null,
        videoUrlAndroid: videoAndroidT || null,
        videoUrlLumaMatte: videoLumaT || null,
        animationJson: animJsonT || null,
        animationDurationMs: (() => {
          const fromSec = parseDurationSecToMs(form.animationDurationSec);
          if (fromSec != null) return fromSec;
          if (typeof form.animationDurationMs === 'number' && form.animationDurationMs > 0) {
            return form.animationDurationMs;
          }
          return null;
        })(),
        heroWidthPercent: null,
        heroHeightPercent: parseHeroPercentInput(form.heroHeightPercent),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      if (editingGift?._id) {
        await giftService.updateGift(editingGift._id, body);
        toast.success('Gift updated');
      } else {
        await giftService.createGift(body);
        toast.success('Gift created');
      }
      closeDialog();
      fetchGifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (gift) => setDeleteTarget(gift);

  const handleUploadIcon = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, GIF, WebP)');
      return;
    }
    try {
      setUploadingIcon(true);
      const result = await giftService.uploadImage(file);
      const url = result?.url ?? result;
      if (url) {
        setForm((f) => ({ ...f, iconUrl: url }));
        setIconPreviewUrl(result?.previewUrl || url);
        toast.success('Icon uploaded');
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingIcon(false);
      if (iconFileRef.current) iconFileRef.current.value = '';
    }
  };

  const handleUploadAnimation = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    const okExt = /\.(gif|webp|png|jpe?g|mp4|m4v|mov|webm)$/i.test(name);
    if (!okExt) {
      toast.error(
        'Upload GIF / WebP / PNG / JPG / MP4 / MOV / WebM. For Lottie, upload a .json file or paste JSON below.',
      );
      return;
    }
    try {
      setUploadingAnimation(true);
      const result = await giftService.uploadAnimation(file);
      const url = result?.url ?? result;
      if (url) {
        const autoIcon = result?.iconUrl?.trim?.() || '';
        setForm((f) => ({
          ...f,
          animationUrl: url,
          animationDurationMs:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? result.animationDurationMs
              : f.animationDurationMs,
          animationDurationSec:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? msToDurationSecInput(result.animationDurationMs)
              : f.animationDurationSec,
          iconUrl: autoIcon || f.iconUrl,
        }));
        if (autoIcon) setIconPreviewUrl(result?.iconPreviewUrl || autoIcon);
        setAnimationPreviewUrl(result?.previewUrl || url);
        toast.success(
          autoIcon
            ? 'Animation uploaded — picker icon auto-generated'
            : 'Animation uploaded — viewers will see it when this gift is sent',
        );
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingAnimation(false);
      if (animationFileRef.current) animationFileRef.current.value = '';
    }
  };

  const handleUploadLumaMatteVideo = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    if (!name.endsWith('.mp4')) {
      toast.error('Luma-matte gift video must be a stacked MP4 — upload a .mp4 file.');
      return;
    }
    try {
      setUploadingLumaMatteVideo(true);
      const result = await giftService.uploadAnimation(file);
      const url = result?.url ?? result;
      if (url) {
        setForm((f) => ({
          ...f,
          videoUrlLumaMatte: url,
          animationDurationMs:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? result.animationDurationMs
              : f.animationDurationMs,
          animationDurationSec:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? msToDurationSecInput(result.animationDurationMs)
              : f.animationDurationSec,
        }));
        setLumaMatteVideoPreviewUrl(result?.previewUrl || url);
        toast.success('Luma-matte gift video uploaded');
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingLumaMatteVideo(false);
      if (lumaMatteVideoFileRef.current) lumaMatteVideoFileRef.current.value = '';
    }
  };

  const handleUploadPlatformVideo = async (e, platform) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    const isIos = platform === 'ios';
    if (isIos && !name.endsWith('.mov')) {
      toast.error('iOS gift video must be HEVC with alpha — upload a .mov file.');
      return;
    }
    if (!isIos && !/\.(webm|webp|mp4|m4v)$/i.test(name)) {
      toast.error(
        'Android gift video must be WebM, MP4, or animated WebP — upload a .webm, .mp4, or .webp file.',
      );
      return;
    }
    const setUploading = isIos ? setUploadingIosVideo : setUploadingAndroidVideo;
    const setPreview = isIos ? setIosVideoPreviewUrl : setAndroidVideoPreviewUrl;
    const field = isIos ? 'videoUrlIos' : 'videoUrlAndroid';
    const fileRef = isIos ? iosVideoFileRef : androidVideoFileRef;
    try {
      setUploading(true);
      const result = await giftService.uploadAnimation(file);
      const url = result?.url ?? result;
      if (url) {
        setForm((f) => ({
          ...f,
          [field]: url,
          animationDurationMs:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? result.animationDurationMs
              : f.animationDurationMs,
          animationDurationSec:
            typeof result?.animationDurationMs === 'number' && result.animationDurationMs > 0
              ? msToDurationSecInput(result.animationDurationMs)
              : f.animationDurationSec,
        }));
        setPreview(result?.previewUrl || url);
        toast.success(isIos ? 'iOS gift video uploaded' : 'Android gift video uploaded');
      } else toast.error('Upload failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleLottieJsonFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const name = file.name?.toLowerCase() ?? '';
    if (!name.endsWith('.json') && file.type && !/json|text\/plain/i.test(file.type)) {
      toast.error('Please choose a Lottie / Bodymovin .json file.');
      if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
      return;
    }
    try {
      const text = await file.text();
      const trimmed = text.trim();
      if (!trimmed) {
        toast.error('File is empty.');
        if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
        return;
      }
      JSON.parse(trimmed);
      setForm((f) => ({ ...f, animationJson: trimmed }));
      toast.success('Lottie JSON loaded from file — save the gift to store it.');
    } catch {
      toast.error('Invalid JSON — use a valid Bodymovin / Lottie export .json file.');
    } finally {
      if (lottieJsonFileRef.current) lottieJsonFileRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?._id) return;
    try {
      setDeleteLoading(true);
      await giftService.deleteGift(deleteTarget._id);
      toast.success(deleteTarget.type === 'wheel' ? 'Wheel deleted' : 'Gift deleted');
      setDeleteTarget(null);
      fetchGifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateWheel = () => {
    setEditingWheel(null);
    setWheelForm(makeEmptyWheel());
    setWheelDialogOpen(true);
  };

  const openEditWheel = (gift) => {
    const w = gift.wheel || {};
    const segments = Array.isArray(w.segments) && w.segments.length
      ? w.segments.map((s, i) => ({
          label: s.label ?? '',
          value: s.value ?? '',
          chancePercent: s.chancePercent ?? '',
          color: s.color || DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length],
        }))
      : [makeWheelSegment(0), makeWheelSegment(1)];
    setEditingWheel(gift);
    setWheelForm({
      name: gift.name ?? '',
      cost: w.cost ?? gift.coinValue ?? '',
      category: findCategoryTab(categories, gift.category)?.key ?? gift.category ?? wheelCategoryOptions[0]?.key ?? 'Trending',
      prizeRecipient: w.prizeRecipient === 'viewer' ? 'viewer' : 'streamer',
      prizeCurrency: w.prizeCurrency === 'coins' ? 'coins' : 'rubies',
      minTierCreditsZero: !!w.minTierCreditsZero,
      creditsZeroThreshold: Number(w.creditsZeroThreshold) > 0 ? Number(w.creditsZeroThreshold) : '',
      segments,
      theme: {
        pointerColor: w.theme?.pointerColor ?? '',
        centerColor: w.theme?.centerColor ?? '',
        textColor: w.theme?.textColor ?? '',
        ringColor: w.theme?.ringColor ?? '',
        backgroundColor: w.theme?.backgroundColor ?? '',
      },
      displayOrder: gift.displayOrder ?? 0,
      isActive: gift.isActive !== false,
    });
    setWheelDialogOpen(true);
  };

  const closeWheelDialog = () => {
    setWheelDialogOpen(false);
    setEditingWheel(null);
    setWheelForm(makeEmptyWheel());
  };

  const handleEditRow = (gift) => (gift.type === 'wheel' ? openEditWheel(gift) : openEdit(gift));

  const updateSegment = (idx, patch) => {
    setWheelForm((f) => ({
      ...f,
      segments: f.segments.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const addSegment = () => {
    setWheelForm((f) => ({ ...f, segments: [...f.segments, makeWheelSegment(f.segments.length)] }));
  };

  const removeSegment = (idx) => {
    setWheelForm((f) => ({
      ...f,
      segments: f.segments.length > 1 ? f.segments.filter((_, i) => i !== idx) : f.segments,
    }));
  };

  const wheelChanceSum = wheelForm.segments.reduce(
    (acc, s) => acc + (Number(s.chancePercent) || 0),
    0,
  );

  const handleWheelSubmit = async (e) => {
    e.preventDefault();
    const name = String(wheelForm.name).trim();
    const cost = Number(wheelForm.cost);
    if (!name) {
      toast.error('Wheel name is required');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error('Spin cost must be a non-negative number');
      return;
    }
    const segments = wheelForm.segments
      .map((s) => ({
        label: String(s.label || '').trim() || undefined,
        value: Number(s.value),
        chancePercent: Number(s.chancePercent),
        color: String(s.color || '').trim() || undefined,
      }))
      .filter((s) => Number.isFinite(s.value) && s.value >= 0 && Number.isFinite(s.chancePercent) && s.chancePercent > 0);
    if (segments.length === 0) {
      toast.error('Add at least one segment with a prize value and a win chance.');
      return;
    }
    const theme = {};
    for (const { key } of WHEEL_THEME_FIELDS) {
      const v = String(wheelForm.theme[key] || '').trim();
      if (v) theme[key] = v;
    }
    try {
      setWheelSubmitting(true);
      const body = {
        name,
        coinValue: cost,
        category: wheelCategoryOptions.some((c) => c.key === wheelForm.category)
          ? wheelForm.category
          : defaultCategoryKey(wheelCategoryOptions),
        type: 'wheel',
        displayOrder: Number(wheelForm.displayOrder) || 0,
        isActive: wheelForm.isActive,
        wheel: {
          cost,
          prizeRecipient: wheelForm.prizeRecipient,
          prizeCurrency: wheelForm.prizeCurrency,
          minTierCreditsZero: !!wheelForm.minTierCreditsZero,
          creditsZeroThreshold: Number(wheelForm.creditsZeroThreshold) > 0 ? Number(wheelForm.creditsZeroThreshold) : 0,
          segments,
          theme: Object.keys(theme).length ? theme : undefined,
        },
      };
      if (editingWheel?._id) {
        await giftService.updateGift(editingWheel._id, body);
        toast.success('Wheel updated');
      } else {
        await giftService.createGift(body);
        toast.success('Wheel created');
      }
      closeWheelDialog();
      fetchGifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save wheel');
    } finally {
      setWheelSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Live stream gifts
            </CardTitle>
            <CardDescription>
              <strong>Add gift</strong> = upload color + alpha videos; the server generates Android
              luma MP4, iOS .mov, and a 50×50 icon for you to preview. Manage picker tabs on{' '}
              <Link to="/gift-categories" className="text-primary underline-offset-4 hover:underline">Gift categories</Link>.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openCreateWheel}>
              <Plus className="h-4 w-4 mr-2" />
              Add wheel
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add gift
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading gifts...</div>
          ) : gifts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No gifts yet. Click &quot;Add gift&quot; and upload color + alpha videos to generate assets.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Icon</TableHead>
                  <TableHead className="w-[60px]">Animation</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Rubies</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gifts.map((g) => (
                  <TableRow key={g._id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded border flex items-center justify-center bg-muted overflow-hidden">
                        {giftStripPreviewSrc(g) ? (
                          isVideoAnimationUrl(giftStripPreviewSrc(g)) ? (
                            <GiftAnimationPreview src={giftStripPreviewSrc(g)} />
                          ) : (
                            <img
                              src={giftStripPreviewSrc(g)}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                          )
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-10 w-10 rounded border flex items-center justify-center bg-muted overflow-hidden text-[10px] text-muted-foreground"
                        title={giftHeroPreviewSrc(g) || g.animationUrl || ''}
                      >
                        {(g.animationJson && String(g.animationJson).trim()) ||
                        (g.animationUrl && /\.json($|\?)/i.test(g.animationUrl)) ? (
                          <span className="px-1 text-center leading-tight">Lottie</span>
                        ) : giftHeroPreviewSrc(g) ? (
                          <GiftAnimationPreview src={giftHeroPreviewSrc(g)} />
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {g.name}
                        {g.type === 'wheel' && (
                          <Badge variant="secondary" className="text-[10px]">
                            {g.wheel?.prizeRecipient === 'viewer' ? 'Viewer' : 'Streamer'}{' '}
                            {g.wheel?.prizeCurrency === 'coins' ? 'coins' : 'rubies'} wheel
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline">{g.type === 'wheel' ? 'Wheel' : g.category || 'Popular'}</Badge>
                        {/* Unlock rule for gated gifts — so admins can see at a glance who can send it. */}
                        {g.requiredCrownTier ? (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            🔒 {crownTierLabel(g.requiredCrownTier) ?? `Tier ${g.requiredCrownTier}`}+
                          </Badge>
                        ) : null}
                        {g.requiredRole ? (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            🔒 {giftRoleLabel(g.requiredRole) ?? g.requiredRole}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{g.coinValue}</TableCell>
                    <TableCell>{g.rubyValue ?? '—'}</TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {formatDurationLabel(g.animationDurationMs)}
                    </TableCell>
                    <TableCell>{g.displayOrder ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={g.isActive !== false ? 'default' : 'secondary'}>
                        {g.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-1"
                        onClick={() => handleEditRow(g)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(g)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create = color+alpha process flow; Edit = metadata + existing asset preview */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          className={
            editingGift
              ? 'sm:max-w-2xl max-h-[90vh] overflow-y-auto'
              : 'gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl sm:max-w-[560px] max-h-[90vh] sm:rounded-2xl'
          }
        >
          {editingGift ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit gift</DialogTitle>
                <DialogDescription>
                  Update name, coins, category, and playback settings. Video assets were generated
                  from color + alpha — replace by creating a new gift.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rose, Rocket"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coinValue">Coin value *</Label>
              <Input
                id="coinValue"
                type="number"
                min={0}
                step={1}
                value={form.coinValue}
                onChange={(e) => setForm((f) => ({ ...f, coinValue: e.target.value }))}
                placeholder="e.g. 10"
                required
              />
              <p className="text-xs text-muted-foreground">Streamer earns 55% of coins as rubies when the stream ends.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label || cat.key}
                    {isGatedCategoryTab(categories, cat.key) ? ' 🔒' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Tabs are configured under Gift categories. Gated tabs show a lock unless the sender qualifies.
              </p>
            </div>

            {/* ——— Crown gate ——— */}
            {needsCrownGate(categories, form.category) && (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <Label htmlFor="requiredCrownTier">Required crown tier *</Label>
                <select
                  id="requiredCrownTier"
                  value={form.requiredCrownTier}
                  onChange={(e) => setForm((f) => ({ ...f, requiredCrownTier: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select a crown tier…</option>
                  {crownTiers.map((t) => (
                    <option key={t.value ?? t.tier} value={t.value ?? t.tier}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Minimum crown needed to send this gift. <strong>Hierarchical</strong> — a user
                  with a higher crown can also send lower-tier gifts (e.g. a <em>Gold</em> user can
                  send Bronze, Silver and Gold gifts, but not Ruby). The app groups Crown gifts
                  into a section per tier.
                </p>
              </div>
            )}

            {/* ——— Sponsor / Icon Creator gate ——— */}
            {needsRoleGate(categories, form.category) && (
              <div className="space-y-2 rounded-md border border-violet-500/40 bg-violet-500/5 p-3">
                <Label htmlFor="requiredRole">Required status *</Label>
                <select
                  id="requiredRole"
                  value={form.requiredRole}
                  onChange={(e) => setForm((f) => ({ ...f, requiredRole: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select who can send this…</option>
                  {giftRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Who is allowed to send this gift. Checked against the user&apos;s{' '}
                  <code className="text-xs">sponsoredActive</code> /{' '}
                  <code className="text-xs">iconRecruiterActive</code> status.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="animationJson">Lottie animation (JSON)</Label>
              <p className="text-xs text-muted-foreground">
                Upload a Bodymovin / Lottie <code className="text-xs">.json</code> file (we read it in the browser and store the JSON in MongoDB), or paste the same below. No line or character cap in the form — very large files are limited only by MongoDB (~16MB per document) and the API payload. Plays on viewer and streamer for ~10s when the gift is sent.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={lottieJsonFileRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  className="hidden"
                  onChange={handleLottieJsonFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => lottieJsonFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload lottie.json
                </Button>
                {form.animationJson?.trim() ? (
                  <span className="text-xs text-muted-foreground">JSON loaded — edit below if needed.</span>
                ) : null}
              </div>
              <Textarea
                id="animationJson"
                value={form.animationJson}
                onChange={(e) => setForm((f) => ({ ...f, animationJson: e.target.value }))}
                placeholder='{"v":"5.7.4","fr":60,...} or use Upload lottie.json above'
                className="font-mono text-xs min-h-[120px]"
                spellCheck={false}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <Label className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Generated assets (read-only)
              </Label>
              <p className="text-xs text-muted-foreground">
                These were created from color + alpha via FFmpeg. To replace videos, create a new gift
                with <strong>Add gift</strong> (color + alpha → process → approve).
              </p>
              <div className="flex flex-wrap gap-4">
                {(iconPreviewUrl || form.iconUrl) && (
                  <div>
                    <div className="text-xs font-medium mb-1">Icon / thumbnail</div>
                    <div className="h-12 w-12 rounded border overflow-hidden bg-muted">
                      <img
                        src={iconPreviewUrl || form.iconUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {(lumaMatteVideoPreviewUrl || form.videoUrlLumaMatte) && (
                  <div>
                    <div className="text-xs font-medium mb-1">Android (luma MP4)</div>
                    <div className="h-14 w-14 rounded border overflow-hidden bg-muted">
                      <GiftAnimationPreview
                        src={lumaMatteVideoPreviewUrl || form.videoUrlLumaMatte}
                      />
                    </div>
                  </div>
                )}
                {(iosVideoPreviewUrl || form.videoUrlIos) && (
                  <div>
                    <div className="text-xs font-medium mb-1">iOS (.mov)</div>
                    <div className="h-14 w-14 rounded border overflow-hidden bg-muted">
                      <GiftAnimationPreview src={iosVideoPreviewUrl || form.videoUrlIos} />
                    </div>
                  </div>
                )}
                {!form.videoUrlLumaMatte && !form.videoUrlIos && !form.iconUrl && (
                  <span className="text-xs text-muted-foreground">No generated video assets on this gift.</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Send animation (GIF / MP4 / WebP / image URL)
              </Label>
              <p className="text-xs text-muted-foreground">
                Optional fallback to platform videos: GIF, single MP4, or static image. Max upload ~50MB.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={animationFileRef}
                  type="file"
                  accept="image/gif,image/webp,image/png,image/jpeg,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  className="hidden"
                  onChange={handleUploadAnimation}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAnimation}
                  onClick={() => animationFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAnimation ? 'Uploading…' : 'Upload GIF / MP4 / image'}
                </Button>
                {(animationPreviewUrl || form.animationUrl) &&
                /\.json($|[?#&])/i.test((form.animationUrl || animationPreviewUrl || '').trim()) ? (
                  <span
                    className="text-xs text-muted-foreground max-w-[200px] truncate"
                    title={form.animationUrl || animationPreviewUrl}
                  >
                    JSON URL (legacy)
                  </span>
                ) : (animationPreviewUrl || form.animationUrl) ? (
                  <div className="h-14 w-14 rounded border overflow-hidden bg-muted flex-shrink-0">
                    <GiftAnimationPreview src={animationPreviewUrl || form.animationUrl} />
                  </div>
                ) : null}
              </div>
              <Input
                id="animationUrl"
                type="url"
                value={form.animationUrl}
                onChange={(e) => setForm((f) => ({ ...f, animationUrl: e.target.value }))}
                placeholder="Or paste animation URL (Lottie .json, GIF, MP4, or image URL)"
                className="mt-1"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/30">
              <Label htmlFor="animationDurationSec">Playback duration (seconds)</Label>
              <p className="text-xs text-muted-foreground">
                How long the gift animation plays on stream (GIF loop or MP4 length). Auto-filled when you
                upload a GIF; set manually for MP4. Leave empty to use app default (~10s for Lottie). Examples:{' '}
                <code className="text-xs">1.8</code> = 1800ms, <code className="text-xs">9</code> = 9 seconds.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="animationDurationSec"
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="max-w-[160px]"
                  value={form.animationDurationSec}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      animationDurationSec: e.target.value,
                      animationDurationMs: null,
                    }))
                  }
                  placeholder="e.g. 1.8"
                />
                {form.animationDurationSec !== '' && parseDurationSecToMs(form.animationDurationSec) != null && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    = {parseDurationSecToMs(form.animationDurationSec).toLocaleString()} ms
                  </span>
                )}
                {form.animationDurationSec !== '' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        animationDurationSec: '',
                        animationDurationMs: null,
                      }))
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/30">
              <Label htmlFor="heroHeightPercent">Live hero height (% of screen)</Label>
              <p className="text-xs text-muted-foreground">
                Optional — width is always full screen. Height only:{' '}
                <code className="text-xs">100</code> = full screen height. Values above 100 are
                clamped to 100. Leave empty for the app default (~82%).
              </p>
              <Input
                id="heroHeightPercent"
                type="number"
                min={1}
                max={100}
                step="any"
                className="max-w-[160px]"
                value={form.heroHeightPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, heroHeightPercent: e.target.value }))
                }
                placeholder="Default"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon image (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Small thumbnail in the gift strip. If you skip this, the app uses your animation (GIF/WebP) as the thumbnail; Lottie-only gifts show a default until you add a PNG/GIF icon.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={iconFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleUploadIcon}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingIcon}
                  onClick={() => iconFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingIcon ? 'Uploading...' : 'Upload icon'}
                </Button>
                {form.animationUrl?.trim() && !form.iconUrl?.trim() && /\.(gif|webp|png|jpe?g)($|\?)/i.test(form.animationUrl) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, iconUrl: f.animationUrl?.trim() || '' }))}
                  >
                    Use animation as icon
                  </Button>
                )}
                {(iconPreviewUrl || form.iconUrl) && (
                  <div className="h-12 w-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                    <img src={iconPreviewUrl || form.iconUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <Input
                id="iconUrl"
                type="url"
                value={form.iconUrl}
                onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
                placeholder="Or paste icon URL"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active (show in app gift list)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
            </>
          ) : (
            <div className="flex max-h-[90vh] flex-col bg-white">
              <div className="border-b border-neutral-100 px-6 pb-4 pt-6 pr-12">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-neutral-900">
                    Add gift
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-neutral-500">
                    Simple upload → generate → preview → save
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="overflow-y-auto px-6 py-5">
                <GiftProcessingPanel
                  categories={categories}
                  onApproved={() => {
                    fetchGifts();
                    closeDialog();
                    toast.success('Gift approved and saved');
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit wheel dialog */}
      <Dialog open={wheelDialogOpen} onOpenChange={(open) => !open && closeWheelDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWheel ? 'Edit wheel' : 'Add wheel'}</DialogTitle>
            <DialogDescription>
              A wheel is a gift the viewer taps to spin. The viewer always pays the spin cost; the
              landed prize is credited to the chosen recipient in the chosen currency.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWheelSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wheelName">Name *</Label>
                <Input
                  id="wheelName"
                  value={wheelForm.name}
                  onChange={(e) => setWheelForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mystery Wheel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wheelCost">Spin cost (coins) *</Label>
                <Input
                  id="wheelCost"
                  type="number"
                  min={0}
                  step={1}
                  value={wheelForm.cost}
                  onChange={(e) => setWheelForm((f) => ({ ...f, cost: e.target.value }))}
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizeRecipient">Prize goes to *</Label>
                <select
                  id="prizeRecipient"
                  value={wheelForm.prizeRecipient}
                  onChange={(e) => setWheelForm((f) => ({ ...f, prizeRecipient: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PRIZE_RECIPIENTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizeCurrency">Prize currency *</Label>
                <select
                  id="prizeCurrency"
                  value={wheelForm.prizeCurrency}
                  onChange={(e) => setWheelForm((f) => ({ ...f, prizeCurrency: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PRIZE_CURRENCIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Streamer + rubies = today's Mystery Wheel. Viewer + coins = today's Gifter Wheel.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="minTierCreditsZero"
                  checked={wheelForm.minTierCreditsZero}
                  onChange={(e) => setWheelForm((f) => ({ ...f, minTierCreditsZero: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="minTierCreditsZero" className="cursor-pointer">
                  Landing at or below the spin cost pays the winner nothing
                </Label>
              </div>
              {wheelForm.minTierCreditsZero ? (
                <div className="ml-6 space-y-1">
                  <Label htmlFor="creditsZeroThreshold">Wins at or below this value pay nothing</Label>
                  <Input
                    id="creditsZeroThreshold"
                    type="number"
                    min={0}
                    placeholder="Leave blank to use the spin cost"
                    value={wheelForm.creditsZeroThreshold}
                    onChange={(e) => setWheelForm((f) => ({ ...f, creditsZeroThreshold: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. 1000 → a win of 1000 or less credits 0; only wins above 1000 are paid out.
                    Only applies when the prize goes to the viewer (Gifter Wheel).
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Segments *</Label>
                  <span
                    className={`text-xs tabular-nums ${
                      Math.abs(wheelChanceSum - 100) < 0.5 ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    Chances total {wheelChanceSum.toFixed(2)}%
                  </span>
                </div>
                {wheelForm.segments.map((s, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="w-10 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Color</Label>
                      <input
                        type="color"
                        value={s.color || DEFAULT_SEGMENT_COLORS[idx % DEFAULT_SEGMENT_COLORS.length]}
                        onChange={(e) => updateSegment(idx, { color: e.target.value })}
                        className="h-9 w-10 rounded border border-input bg-background p-0.5"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Label</Label>
                      <Input
                        value={s.label}
                        onChange={(e) => updateSegment(idx, { label: e.target.value })}
                        placeholder="optional"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Prize value</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.value}
                        onChange={(e) => updateSegment(idx, { value: e.target.value })}
                        placeholder="1000"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Chance %</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={s.chancePercent}
                        onChange={(e) => updateSegment(idx, { chancePercent: e.target.value })}
                        placeholder="94.3"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeSegment(idx)}
                      disabled={wheelForm.segments.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add segment
                </Button>
              </div>
              <div className="flex items-start justify-center pt-6">
                <WheelPreview segments={wheelForm.segments} theme={wheelForm.theme} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wheel colors (optional)</Label>
              <div className="flex flex-wrap gap-4">
                {WHEEL_THEME_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{label}</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={wheelForm.theme[key] || '#000000'}
                        onChange={(e) =>
                          setWheelForm((f) => ({ ...f, theme: { ...f.theme, [key]: e.target.value } }))
                        }
                        className="h-9 w-10 rounded border border-input bg-background p-0.5"
                      />
                      {wheelForm.theme[key] ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-1 text-xs"
                          onClick={() =>
                            setWheelForm((f) => ({ ...f, theme: { ...f.theme, [key]: '' } }))
                          }
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wheelCategory">Category *</Label>
                <select
                  id="wheelCategory"
                  value={wheelForm.category}
                  onChange={(e) => setWheelForm((f) => ({ ...f, category: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {wheelCategoryOptions.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label || cat.key}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Which gift tab this wheel appears under in the app.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wheelDisplayOrder">Display order</Label>
                <Input
                  id="wheelDisplayOrder"
                  type="number"
                  min={0}
                  value={wheelForm.displayOrder}
                  onChange={(e) => setWheelForm((f) => ({ ...f, displayOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  id="wheelIsActive"
                  checked={wheelForm.isActive}
                  onChange={(e) => setWheelForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="wheelIsActive" className="cursor-pointer">Active (show in app gift list)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeWheelDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={wheelSubmitting}>
                {wheelSubmitting ? 'Saving...' : editingWheel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete gift"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
};

export default GiftManagement;