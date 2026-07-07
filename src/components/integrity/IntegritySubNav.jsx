import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const TABS = [
  { href: '/integrity', label: 'Fleet drift' },
  { href: '/integrity/reconciliation', label: 'Reconciliation' },
];

export default function IntegritySubNav() {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
