const PAGE_PATHS = {
  dashboard: ["/"], stabilization: ["/stabilization"], users: ["/users"], agencies: ["/agencies"],
  finance: ["/finance"], marketplace: ["/marketplace"], sponsored_creators: ["/sponsored-creators"],
  icon_recruiter: ["/icon-recruiter"], test_accounts: ["/test-accounts"], top_spenders: ["/topspenders"],
  premium_subscribers: ["/premium-subscribers"], referrals: ["/referrals"], reported_users: ["/reported-users"],
  reported_posts: ["/reported-posts"], ip_bans: ["/ip-bans"], feed_algorithm: ["/feed-algorithm"],
  posts: ["/posts-management"], withdrawals: ["/withdraw-requests", "/cashout-requests", "/cashout-email-change"],
  streamers_rubies: ["/streamers-rubies"], stream_earnings: ["/user-stream-earnings"],
  live_streams: ["/live-streams"], stream_order: ["/stream-order"],
  gifter_recipients: ["/gifter-recipients"], gifts: ["/gifts"], gift_categories: ["/gift-categories"],
  promos: ["/promos", "/promo-codes"], blogs: ["/blogs"], contests: ["/contests"], banners: ["/banners"],
  support: ["/support"], support_settings: ["/support/settings"], iap: ["/iap"], features: ["/features-allowed"],
  theme: ["/theme"],
};

const roleName = (user) => String(user?.role?.name || user?.role || "").toUpperCase();
export const isFullAdmin = (user) => ["ADMIN", "SUPER_ADMIN"].includes(roleName(user));
export const isSuperAdmin = (user) => roleName(user) === "SUPER_ADMIN";
export const isStaff = (user) => ["STAFF", "MODERATOR"].includes(roleName(user));
export const getFirstAccessiblePath = (user) => {
  if (isSuperAdmin(user)) return "/";
  if (isFullAdmin(user)) return "/";
  const first = Object.entries(PAGE_PATHS).find(([key]) => (user?.staffPages || []).includes(key));
  return first?.[1]?.[0] || "/";
};
export const canAccessAdminPath = (user, pathname) => {
  if (pathname === "/user-journey" || pathname.startsWith("/user-journey/")) {
    return isSuperAdmin(user);
  }
  if (isFullAdmin(user)) return true;
  if (!isStaff(user)) return false;
  const page = Object.entries(PAGE_PATHS)
    .flatMap(([key, paths]) => paths.map((path) => ({ key, path })))
    .filter(({ path }) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return Boolean(page && (user.staffPages || []).includes(page.key));
};
