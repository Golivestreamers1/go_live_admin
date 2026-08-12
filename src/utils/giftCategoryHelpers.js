export function findCategoryTab(categories, key) {
  if (!key) return null;
  return (
    categories.find((c) => c.key === key)
    || categories.find((c) => (c.legacyKeys || []).includes(key))
    || null
  );
}

export function categoryGateType(categories, key) {
  const tab = findCategoryTab(categories, key);
  return tab?.gateType || null;
}

export function isGatedCategoryTab(categories, key) {
  const tab = findCategoryTab(categories, key);
  return Boolean(tab?.gated || tab?.gateType);
}

export function defaultCategoryKey(categories) {
  return categories[0]?.key || 'Trending';
}

export function needsCrownGate(categories, key) {
  const gt = categoryGateType(categories, key);
  return gt === 'crown' || key === 'Crown';
}

export function needsRoleGate(categories, key) {
  const gt = categoryGateType(categories, key);
  return gt === 'sponsor' || gt === 'icons' || key === 'Sponsor' || key === 'Icons';
}

export const emptyCategoryRow = () => ({
  key: '',
  label: '',
  legacyKeys: [],
  legacyKeysText: '',
  gated: false,
  gateType: '',
  giftCount: 0,
});

export function categoriesToDraft(list) {
  return (list || []).map((c) => ({
    ...c,
    legacyKeysText: (c.legacyKeys || []).join(', '),
  }));
}

export function draftToPayload(categoryDraft) {
  return categoryDraft
    .map((row, index) => {
      const key = String(row.key || row.label || '').trim();
      if (!key) return null;
      const legacyKeys = String(row.legacyKeysText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((k) => k !== key);
      return {
        key,
        label: String(row.label || key).trim(),
        legacyKeys,
        gated: Boolean(row.gated || row.gateType),
        gateType: row.gateType || null,
        displayOrder: index,
      };
    })
    .filter(Boolean);
}

export function gateTypeLabel(gateType, gateTypeOptions = []) {
  if (!gateType) return 'Open';
  const opt = gateTypeOptions.find((o) => o.value === gateType);
  return opt?.label || gateType;
}
