import { useCallback, useEffect, useRef, useState } from 'react';
import { giftService } from '../services/giftService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, CheckCircle2, XCircle, Film, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Admin gift-asset processing: upload color + alpha/luma videos.
 * Backend FFmpeg generates Android luma MP4, iOS transparent .mov, and 50×50 thumbnail.
 */
const POLL_MS = 2500;
const TERMINAL = new Set(['ready_for_review', 'approved', 'rejected', 'failed']);

export default function GiftProcessingPanel({ onApproved, categories = [] }) {
  const [colorFile, setColorFile] = useState(null);
  const [alphaFile, setAlphaFile] = useState(null);
  const [name, setName] = useState('');
  const [coinValue, setCoinValue] = useState('');
  const [category, setCategory] = useState(categories[0]?.key || 'Trending');
  const [heroHeightPercent, setHeroHeightPercent] = useState('');
  const [animationDurationSec, setAnimationDurationSec] = useState('');

  const [processingId, setProcessingId] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const pollRef = useRef(null);
  const colorRef = useRef(null);
  const alphaRef = useRef(null);

  useEffect(() => {
    if (!category && categories[0]?.key) setCategory(categories[0].key);
  }, [categories, category]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  const poll = useCallback(async (id) => {
    try {
      const data = await giftService.getProcessingStatus(id);
      setJob(data);
      if (data && TERMINAL.has(data.status)) stopPolling();
    } catch {
      /* keep polling through transient errors */
    }
  }, []);

  const reset = () => {
    stopPolling();
    setProcessingId(null);
    setJob(null);
    setColorFile(null);
    setAlphaFile(null);
    setName('');
    setCoinValue('');
    setCategory(categories[0]?.key || 'Trending');
    setHeroHeightPercent('');
    setAnimationDurationSec('');
    setMsg(null);
    if (colorRef.current) colorRef.current.value = '';
    if (alphaRef.current) alphaRef.current.value = '';
  };

  const start = async () => {
    if (!colorFile || !alphaFile) {
      setMsg({ type: 'error', text: 'Select both a color video and an alpha/matte video.' });
      return;
    }
    if (!String(name).trim()) {
      setMsg({ type: 'error', text: 'Gift name is required.' });
      return;
    }
    const coins = Number(coinValue);
    if (coinValue === '' || Number.isNaN(coins) || coins < 0) {
      setMsg({ type: 'error', text: 'Coin value must be a non-negative number.' });
      return;
    }
    setBusy(true);
    setMsg({
      type: 'info',
      text: 'Uploading videos… this can take a minute on slow networks.',
    });
    try {
      const res = await giftService.processGift({
        colorFile,
        alphaFile,
        name: String(name).trim(),
        coinValue: coins,
        category: category || undefined,
        heroHeightPercent: heroHeightPercent === '' ? undefined : heroHeightPercent,
        animationDurationSec: animationDurationSec === '' ? undefined : animationDurationSec,
      });
      setProcessingId(res.processingId);
      setJob({ status: res.status || 'processing' });
      setMsg({
        type: 'info',
        text: 'Generating Android, iOS, and thumbnail on the server…',
      });
      stopPolling();
      pollRef.current = setInterval(() => poll(res.processingId), POLL_MS);
      poll(res.processingId);
    } catch (e) {
      const code = e?.code || e?.cause?.code;
      const netFail =
        code === 'ERR_NETWORK' ||
        /ERR_HTTP2_PING_FAILED|Network Error|timeout/i.test(String(e?.message || ''));
      setMsg({
        type: 'error',
        text: netFail
          ? 'Upload timed out or the connection dropped. Retry with smaller videos, or check the API host has ffmpeg.'
          : e?.response?.data?.message || e.message || 'Failed to start processing.',
      });
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      const res = await giftService.approveProcessing(processingId);
      setMsg({ type: 'success', text: `Saved. Gift ID: ${res.giftId}` });
      setJob((j) => (j ? { ...j, status: 'approved' } : j));
      stopPolling();
      onApproved?.(res.giftId);
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.message || 'Approve failed.' });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await giftService.rejectProcessing(processingId);
      setMsg({
        type: 'success',
        text: 'Rejected. Temporary assets deleted — you can upload again.',
      });
      reset();
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.message || 'Reject failed.' });
    } finally {
      setBusy(false);
    }
  };

  const status = job?.status;
  const isProcessing = status === 'uploading' || status === 'processing';
  const isReady = status === 'ready_for_review';
  const isFailed = status === 'failed';
  const isApproved = status === 'approved';

  return (
    <div className="space-y-5">
      {!processingId && (
        <>
          <p className="text-[13px] leading-relaxed text-neutral-500">
            Upload color + alpha videos. The server builds Android, iOS, and a 50×50 icon — then you
            preview and approve.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FilePick
              label="Color video"
              required
              file={colorFile}
              inputRef={colorRef}
              onPick={(f) => setColorFile(f)}
              hint="color_input.mp4"
            />
            <FilePick
              label="Alpha / matte"
              required
              file={alphaFile}
              inputRef={alphaRef}
              onPick={(f) => setAlphaFile(f)}
              hint="alpha_input.mp4"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Gift name" required htmlFor="proc-name">
              <Input
                id="proc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Zeus"
                className="h-10 border-neutral-200 bg-white"
              />
            </Field>
            <Field label="Coin value" required htmlFor="proc-coins">
              <Input
                id="proc-coins"
                type="number"
                min={0}
                value={coinValue}
                onChange={(e) => setCoinValue(e.target.value)}
                placeholder="100"
                className="h-10 border-neutral-200 bg-white"
              />
            </Field>
            <Field label="Category" htmlFor="proc-cat">
              {categories.length > 0 ? (
                <select
                  id="proc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                >
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label || cat.key}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="proc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Trending"
                  className="h-10 border-neutral-200 bg-white"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Live height (% of screen)" htmlFor="proc-height">
              <Input
                id="proc-height"
                type="number"
                min={1}
                max={100}
                step={1}
                value={heroHeightPercent}
                onChange={(e) => setHeroHeightPercent(e.target.value)}
                placeholder="Default ~82"
                className="h-10 border-neutral-200 bg-white"
              />
            </Field>
            <Field label="Duration (seconds)" htmlFor="proc-duration">
              <Input
                id="proc-duration"
                type="number"
                min={0.1}
                step={0.1}
                value={animationDurationSec}
                onChange={(e) => setAnimationDurationSec(e.target.value)}
                placeholder="Auto from video"
                className="h-10 border-neutral-200 bg-white"
              />
            </Field>
          </div>

          <Button
            type="button"
            disabled={busy || !colorFile || !alphaFile}
            onClick={start}
            className="h-11 w-full rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {busy ? 'Uploading…' : 'Generate assets'}
          </Button>
        </>
      )}

      {processingId && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill status={status} />
            <code className="truncate text-[10px] text-neutral-400 max-w-[220px]">{processingId}</code>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
              Building Android, iOS, and thumbnail…
            </div>
          )}

          {isFailed && (
            <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm">
              <p className="font-medium text-red-700">Processing failed</p>
              <p className="text-red-600/90">{job?.error}</p>
              {job?.ffmpegLogs && (
                <details>
                  <summary className="cursor-pointer text-xs text-neutral-500">FFmpeg log</summary>
                  <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-neutral-900 p-3 text-[11px] text-neutral-100 whitespace-pre-wrap">
                    {job.ffmpegLogs}
                  </pre>
                </details>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                className="border-neutral-200 bg-white"
              >
                Start over
              </Button>
            </div>
          )}

          {(isReady || isApproved) && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-neutral-800">Preview</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewTile title="Thumbnail" icon={<ImageIcon className="h-3.5 w-3.5" />}>
                  {job?.thumbnail?.url ? (
                    <img
                      src={job.thumbnail.url}
                      width={50}
                      height={50}
                      alt="thumbnail"
                      className="mx-auto rounded-md border border-neutral-100 bg-neutral-50"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </PreviewTile>
                <PreviewTile title="Android" icon={<Film className="h-3.5 w-3.5" />}>
                  {job?.android?.url ? (
                    <video
                      src={job.android.url}
                      controls
                      loop
                      muted
                      playsInline
                      className="w-full rounded-lg bg-black"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </PreviewTile>
                <PreviewTile title="iOS preview" icon={<Film className="h-3.5 w-3.5" />}>
                  {job?.ios?.url ? (
                    <video
                      src={job.ios.url}
                      controls
                      loop
                      muted
                      playsInline
                      className="w-full rounded-lg bg-black"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                  <p className="mt-2 text-[10px] leading-snug text-neutral-400">
                    Browser preview — live uses HEVC .mov
                  </p>
                </PreviewTile>
              </div>

              {isReady && (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={approve}
                    className="h-11 flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {busy ? 'Saving…' : 'Approve & save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={reject}
                    className="h-11 rounded-lg border-neutral-200 bg-white text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
              {isApproved && (
                <Button
                  type="button"
                  onClick={reset}
                  className="h-11 w-full rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  Add another gift
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div
          className={cn(
            'rounded-xl px-3.5 py-2.5 text-[13px]',
            msg.type === 'error' && 'bg-red-50 text-red-700',
            msg.type === 'info' && 'bg-neutral-50 text-neutral-600',
            msg.type === 'success' && 'bg-emerald-50 text-emerald-800',
          )}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[12px] font-medium text-neutral-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function FilePick({ label, required, file, inputRef, onPick, hint }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-neutral-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition-colors',
          file
            ? 'border-neutral-300 bg-neutral-50'
            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80',
        )}
      >
        <Upload className="h-4 w-4 text-neutral-400" />
        <span className="max-w-full truncate px-1 text-[12px] font-medium text-neutral-800">
          {file ? file.name : 'Choose file'}
        </span>
        {!file && <span className="text-[11px] text-neutral-400">{hint}</span>}
      </button>
    </div>
  );
}

function PreviewTile({ title, icon, children }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    uploading: { label: 'Uploading', className: 'bg-neutral-100 text-neutral-700' },
    processing: { label: 'Processing', className: 'bg-amber-50 text-amber-800' },
    ready_for_review: { label: 'Ready for review', className: 'bg-sky-50 text-sky-800' },
    approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800' },
    rejected: { label: 'Rejected', className: 'bg-neutral-100 text-neutral-600' },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
  };
  const entry = map[status] || { label: status || '—', className: 'bg-neutral-100 text-neutral-600' };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium', entry.className)}>
      {entry.label}
    </span>
  );
}
