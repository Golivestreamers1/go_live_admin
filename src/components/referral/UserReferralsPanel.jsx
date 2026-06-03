import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { referralService } from '../../services/referralService';
import { userService } from '../../services/userService';
import { ReferralJourneyDialog } from './ReferralJourneyDialog';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString());

export function UserReferralsPanel({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [togglingUnlimited, setTogglingUnlimited] = useState(false);
  const [journeyUserId, setJourneyUserId] = useState(null);

  const load = useCallback(
    async (p = 1) => {
      if (!userId) return;
      try {
        setLoading(true);
        const result = await referralService.getUserReferrals(userId, { page: p, limit: 15 });
        setData(result);
        setPage(result.pagination?.page || p);
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || 'Failed to load referrals');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const toggleUnlimited = async () => {
    if (!data?.user) return;
    const next = !data.user.referralUnlimitedRewards;
    try {
      setTogglingUnlimited(true);
      await userService.updateUser(userId, { referralUnlimitedRewards: next });
      toast.success(next ? 'Unlimited referral rewards enabled' : 'Monthly cap restored (3/month)');
      await load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setTogglingUnlimited(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">No referral data.</p>;
  }

  const { user, rewardPolicy, summary } = data;
  const referredBy = user.referredBy;
  const pagination = data.pagination;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Referral code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono font-bold">{user.referralCode || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" /> Lifetime referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtNum(summary?.lifetimeReferrals)}</p>
            <p className="text-xs text-muted-foreground">
              {fmtNum(summary?.lifetimeRewarded)} rewarded • {fmtNum(summary?.pendingEngagement)} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Gem className="h-4 w-4" /> Rubies from referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtNum(summary?.lifetimeRubiesPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This month (UTC)</CardTitle>
          </CardHeader>
          <CardContent>
            {rewardPolicy?.unlimited ? (
              <Badge className="bg-violet-600">Unlimited rewards</Badge>
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {rewardPolicy?.rewardedThisMonth} / {rewardPolicy?.monthlyRewardCap}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rewardPolicy?.remainingRewardsThisMonth} slots left • {rewardPolicy?.perReferralRubies}{' '}
                  rubies each
                </p>
                {rewardPolicy?.capReached && (
                  <Badge variant="outline" className="mt-1 text-amber-700">
                    Cap reached
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reward policy</CardTitle>
          <CardDescription>
            Default: 3 rewarded referrals per calendar month (UTC). Extra referrals still link but earn 0
            rubies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            variant={user.referralUnlimitedRewards ? 'default' : 'outline'}
            disabled={togglingUnlimited}
            onClick={toggleUnlimited}
          >
            {togglingUnlimited && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {user.referralUnlimitedRewards ? 'Disable unlimited rewards' : 'Enable unlimited rewards'}
          </Button>
          <Link to="/referrals">
            <Button variant="ghost">Open Referrals dashboard</Button>
          </Link>
        </CardContent>
      </Card>

      {referredBy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invited by</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              {referredBy.name} (@{referredBy.username}) — code{' '}
              <span className="font-mono">{referredBy.referralCode}</span>
            </p>
            <Link to={`/users/${referredBy._id}`} className="text-xs text-blue-600 hover:underline">
              View referrer
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Users they referred</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Rubies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No referred users yet.
                    </TableCell>
                  </TableRow>
                )}
                {(data.data || []).map((log) => {
                  const u = log.referredUserId;
                  const uid = u?._id || u;
                  return (
                    <TableRow key={String(log._id)}>
                      <TableCell>
                        <div className="font-medium text-sm">{u?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">@{u?.username || '—'}</div>
                      </TableCell>
                      <TableCell>{fmtNum(log.rubiesAwarded)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            log.rewardStatus === 'rewarded' ? 'bg-emerald-600' : 'bg-slate-500'
                          }
                        >
                          {log.rewardStatus === 'rewarded' ? 'Rewarded' : 'Linked (no reward)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{fmtDate(log.createdAt)}</TableCell>
                      <TableCell>
                        {uid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setJourneyUserId(String(uid))}
                          >
                            Journey
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => load(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ReferralJourneyDialog
        referredUserId={journeyUserId}
        open={Boolean(journeyUserId)}
        onOpenChange={(v) => !v && setJourneyUserId(null)}
      />
    </div>
  );
}

export default UserReferralsPanel;
