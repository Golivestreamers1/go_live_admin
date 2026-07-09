export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);

export const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

export function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
