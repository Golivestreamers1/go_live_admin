import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../ui/button';

const PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

function rangeFromDays(days) {
  if (days == null) return { from: null, to: null };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const PlatformAuditDateRange = ({ value, onChange, activePreset, onPresetChange }) => {
  const handlePreset = (preset) => {
    onPresetChange(preset.key);
    onChange(rangeFromDays(preset.days));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          variant={activePreset === preset.key ? 'default' : 'outline'}
          size="sm"
          type="button"
          onClick={() => handlePreset(preset)}
        >
          {preset.label}
        </Button>
      ))}
      <input
        type="date"
        value={value.from ?? ''}
        onChange={(e) => {
          onPresetChange('custom');
          onChange({ ...value, from: e.target.value || null });
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        aria-label="From date"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        value={value.to ?? ''}
        onChange={(e) => {
          onPresetChange('custom');
          onChange({ ...value, to: e.target.value || null });
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        aria-label="To date"
      />
    </div>
  );
};

PlatformAuditDateRange.propTypes = {
  value: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  activePreset: PropTypes.string.isRequired,
  onPresetChange: PropTypes.func.isRequired,
};

export default PlatformAuditDateRange;
