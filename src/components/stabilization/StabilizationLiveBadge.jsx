import React from 'react';
import { Radio } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function StabilizationLiveBadge({ isLive, isStale }) {
  if (isLive && !isStale) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Radio className="mr-1 h-3 w-3" />
      {isStale ? 'Reconnecting…' : 'Connecting…'}
    </Badge>
  );
}
