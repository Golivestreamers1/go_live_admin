import React from 'react';
import AccountabilityAssetFlow from './AccountabilityAssetFlow';

export default function AccountabilityEquationsPanel({ accountability, onShowTechnical }) {
  const { coin, ruby, investigationLinks } = accountability;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div id="accountability-coins">
        <AccountabilityAssetFlow
          title="Coins accountability"
          asset="coins"
          data={coin}
          investigationLinks={investigationLinks}
          variant="technical"
          defaultExpanded
        />
      </div>
      <div id="accountability-rubies">
        <AccountabilityAssetFlow
          title="Rubies accountability"
          asset="rubies"
          data={ruby}
          investigationLinks={investigationLinks}
          variant="technical"
          defaultExpanded
        />
      </div>
    </div>
  );
}
