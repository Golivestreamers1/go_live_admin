import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Tags,
  Plus,
  ArrowDown,
  ArrowUp,
  Save,
  RefreshCw,
  Lock,
  Crown,
  Shield,
} from 'lucide-react';
import { giftService } from '../services/giftService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import {
  categoriesToDraft,
  draftToPayload,
  emptyCategoryRow,
  gateTypeLabel,
} from '../utils/giftCategoryHelpers';

const GiftCategoryManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState([]);
  const [crownTiers, setCrownTiers] = useState([]);
  const [giftRoles, setGiftRoles] = useState([]);
  const [gateTypeOptions, setGateTypeOptions] = useState([]);
  const [removeIndex, setRemoveIndex] = useState(null);

  const totalGifts = useMemo(
    () => categoryDraft.reduce((sum, row) => sum + (row.giftCount || 0), 0),
    [categoryDraft],
  );

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await giftService.getCategories();
      const list = Array.isArray(data?.categories) ? data.categories : [];
      setCategoryDraft(categoriesToDraft(list));
      setIsCustom(Boolean(data?.isCustom));
      setCrownTiers(Array.isArray(data?.crownTiers) ? data.crownTiers : []);
      setGiftRoles(Array.isArray(data?.giftRoles) ? data.giftRoles : []);
      setGateTypeOptions(Array.isArray(data?.gateTypeOptions) ? data.gateTypeOptions : []);
    } catch (err) {
      console.error('Failed to fetch gift categories', err);
      toast.error(err.response?.data?.message || 'Failed to fetch gift categories');
      setCategoryDraft([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const moveCategory = (index, dir) => {
    setCategoryDraft((rows) => {
      const next = [...rows];
      const j = index + dir;
      if (j < 0 || j >= next.length) return rows;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    const payload = draftToPayload(categoryDraft);
    if (!payload.length) {
      toast.error('Add at least one category');
      return;
    }
    try {
      setSaving(true);
      const data = await giftService.saveCategories(payload);
      const list = data?.categories || payload;
      setCategoryDraft(categoriesToDraft(list));
      setIsCustom(Boolean(data?.isCustom ?? true));
      if (Array.isArray(data?.crownTiers)) setCrownTiers(data.crownTiers);
      if (Array.isArray(data?.giftRoles)) setGiftRoles(data.giftRoles);
      if (Array.isArray(data?.gateTypeOptions)) setGateTypeOptions(data.gateTypeOptions);
      toast.success('Gift categories saved — app picker tabs will update on next load');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    if (removeIndex == null) return;
    setCategoryDraft((rows) => rows.filter((_, i) => i !== removeIndex));
    setRemoveIndex(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Tags className="h-6 w-6" />
              Gift categories
            </CardTitle>
            <CardDescription>
              Manage live gift picker tabs (Trending, Icons, Subscriber, Crown). Legacy keys map older{' '}
              <code className="text-xs">gift.category</code> values onto a tab. Assign gifts to a tab from{' '}
              <Link to="/gifts" className="text-primary underline-offset-4 hover:underline">
                Gifts
              </Link>
              .
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={() => void loadCategories()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button type="button" disabled={saving || loading} onClick={() => void handleSave()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{categoryDraft.length} tab(s)</Badge>
            <Badge variant="outline">{totalGifts} gift(s) mapped</Badge>
            <Badge variant={isCustom ? 'default' : 'outline'}>
              {isCustom ? 'Custom tabs' : 'Server defaults'}
            </Badge>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading categories…</div>
          ) : (
            <>
              <div className="hidden md:block rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Gate</TableHead>
                      <TableHead>Gifts</TableHead>
                      <TableHead>Legacy keys</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryDraft.map((row, index) => (
                      <TableRow key={`preview-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{row.key || '—'}</TableCell>
                        <TableCell>{row.label || row.key || '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {row.gated || row.gateType ? <Lock className="h-3 w-3" /> : null}
                            {gateTypeLabel(row.gateType, gateTypeOptions)}
                          </span>
                        </TableCell>
                        <TableCell>{row.giftCount || 0}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {row.legacyKeysText || '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">Tab order</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3">
                {categoryDraft.map((row, index) => (
                  <div key={`cat-${index}`} className="rounded-lg border p-4 space-y-3 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Tab {index + 1}</span>
                        {row.giftCount ? (
                          <Badge variant="secondary" className="text-xs">
                            {row.giftCount} gift(s)
                          </Badge>
                        ) : null}
                        {(row.gated || row.gateType) && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Gated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveCategory(index, -1)}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === categoryDraft.length - 1}
                          onClick={() => moveCategory(index, 1)}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={Boolean(row.giftCount)}
                          title={row.giftCount ? 'Reassign gifts before removing' : 'Remove tab'}
                          onClick={() => setRemoveIndex(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Key (stored on gifts)</Label>
                        <Input
                          value={row.key}
                          onChange={(e) => setCategoryDraft((rows) => rows.map((r, i) => (
                            i === index ? { ...r, key: e.target.value } : r
                          )))}
                          placeholder="e.g. Trending"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label (shown in app)</Label>
                        <Input
                          value={row.label}
                          onChange={(e) => setCategoryDraft((rows) => rows.map((r, i) => (
                            i === index ? { ...r, label: e.target.value } : r
                          )))}
                          placeholder="e.g. Trending"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Legacy keys (comma-separated)</Label>
                      <Input
                        value={row.legacyKeysText || ''}
                        onChange={(e) => setCategoryDraft((rows) => rows.map((r, i) => (
                          i === index ? { ...r, legacyKeysText: e.target.value } : r
                        )))}
                        placeholder="Popular, Roses, Special, Sponsor"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Older gifts with these category values appear under this tab.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Gate type</Label>
                        <select
                          value={row.gateType || ''}
                          onChange={(e) => {
                            const gateType = e.target.value;
                            setCategoryDraft((rows) => rows.map((r, i) => (
                              i === index ? { ...r, gateType, gated: Boolean(gateType) } : r
                            )));
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {gateTypeOptions.map((opt) => (
                            <option key={opt.value || 'none'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(row.gated || row.gateType)}
                            onChange={(e) => setCategoryDraft((rows) => rows.map((r, i) => (
                              i === index ? { ...r, gated: e.target.checked } : r
                            )))}
                          />
                          Show lock icon in app
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryDraft((rows) => [...rows, emptyCategoryRow()])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add category tab
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Crown tiers
            </CardTitle>
            <CardDescription>
              Used when gate type is Crown. Set per-gift minimum tier on the Gifts page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {crownTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading from backend…</p>
            ) : (
              <ul className="space-y-2">
                {crownTiers.map((tier) => (
                  <li key={tier.tier ?? tier.value} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: tier.color || '#ccc' }}
                    />
                    <span className="font-medium">{tier.label}</span>
                    <span className="text-muted-foreground">Tier {tier.tier ?? tier.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sponsor / Icons roles
            </CardTitle>
            <CardDescription>
              Used when gate type is Sponsored or Icons. Set per-gift on the Gifts page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {giftRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading from backend…</p>
            ) : (
              <ul className="space-y-2">
                {giftRoles.map((role) => (
                  <li key={role.value} className="text-sm">
                    <span className="font-medium">{role.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({role.value})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={removeIndex != null}
        onClose={() => setRemoveIndex(null)}
        onConfirm={confirmRemove}
        title="Remove category tab"
        description="Remove this tab from the gift picker? You can only remove tabs with zero gifts assigned."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default GiftCategoryManagement;
