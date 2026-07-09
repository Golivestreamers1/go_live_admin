import {
  LayoutDashboard,
  Coins,
  Gem,
  ShoppingCart,
  Radio,
  ArrowDownToLine,
  Share2,
  UserCog,
  ShieldAlert,
  Scale,
  Search,
  FileSearch,
  FileText,
  ScrollText,
  Settings,
} from 'lucide-react';

/** Platform Audit sidebar + route definitions (single source of truth). */
export const PLATFORM_AUDIT_NAV = [
  { name: 'Audit Overview', href: '/platform-audit', icon: LayoutDashboard, description: 'High-level platform integrity overview.' },
  { name: 'Coin Ledger', href: '/platform-audit/coin-ledger', icon: Coins, description: 'Complete audit trail for all Coin activity.' },
  { name: 'Ruby Ledger', href: '/platform-audit/ruby-ledger', icon: Gem, description: 'Complete audit trail for all Ruby activity.' },
  { name: 'Purchase Audit', href: '/platform-audit/purchases', icon: ShoppingCart, description: 'Verify purchases across IAP and PayPal.' },
  { name: 'Stream Settlement', href: '/platform-audit/stream-settlements', icon: Radio, description: 'Ensure every completed stream is settled correctly.' },
  { name: 'Withdrawal Audit', href: '/platform-audit/withdrawals', icon: ArrowDownToLine, description: 'Audit the complete withdrawal lifecycle.' },
  { name: 'Referral Audit', href: '/platform-audit/referrals', icon: Share2, description: 'Verify referral eligibility and rewards.' },
  { name: 'Admin Actions', href: '/platform-audit/admin-actions', icon: UserCog, description: 'Track every administrator balance modification.' },
  { name: 'Fraud & Reversals', href: '/platform-audit/fraud', icon: ShieldAlert, description: 'Track fraud-related operations and reversal chains.' },
  { name: 'Reconciliation', href: '/platform-audit/reconciliation', icon: Scale, description: 'Automatic verification against platform balances.' },
  { name: 'User Balance Explorer', href: '/platform-audit/balance-explorer', icon: Search, description: 'Search users and explain every balance from history.' },
  { name: 'Investigation', href: '/platform-audit/investigation', icon: FileSearch, description: 'Investigation workspace for transaction chains.' },
  { name: 'Audit Reports', href: '/platform-audit/reports', icon: FileText, description: 'Generate and export audit reports.' },
  { name: 'Audit Logs', href: '/platform-audit/logs', icon: ScrollText, description: 'Immutable log of every audit operation.' },
  { name: 'Settings', href: '/platform-audit/settings', icon: Settings, description: 'Configure audit schedules, thresholds, and alerts.' },
];

export const PLATFORM_AUDIT_PATHS = PLATFORM_AUDIT_NAV.map((item) => item.href);

export function getPlatformAuditPageMeta(pathname) {
  const exact = PLATFORM_AUDIT_NAV.find((item) => item.href === pathname);
  if (exact) return exact;

  if (/^\/platform-audit\/users\/[^/]+\/balance-proof$/.test(pathname)) {
    return PLATFORM_AUDIT_NAV.find((item) => item.href === '/platform-audit/balance-explorer');
  }
  if (/^\/platform-audit\/stream-settlements\/[^/]+$/.test(pathname)) {
    return PLATFORM_AUDIT_NAV.find((item) => item.href === '/platform-audit/stream-settlements');
  }

  if (pathname.startsWith('/platform-audit')) {
    return PLATFORM_AUDIT_NAV[0];
  }
  return null;
}
