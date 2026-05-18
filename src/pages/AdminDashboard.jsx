import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Users,
  UserCheck,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import dashboardService from '../services/dashboardService';
import SupportDashboardWidget from '../components/SupportDashboardWidget';
import LiveNowCard from '../components/dashboard/LiveNowCard';
import HostMetricsCard from '../components/dashboard/HostMetricsCard';
import MongoCard from '../components/dashboard/MongoCard';
import AlertsCard from '../components/dashboard/AlertsCard';
import B2Card from '../components/dashboard/B2Card';
import AgoraCard from '../components/dashboard/AgoraCard';
import CardErrorBoundary from '../components/dashboard/CardErrorBoundary';

const AdminDashboard = () => {
  const [stats, setStats] = useState([
    { title: 'Total Users', value: '0', change: '', changeType: 'neutral', icon: Users },
    { title: 'Active Users', value: '0', change: '', changeType: 'neutral', icon: UserCheck },
    { title: 'Admin Users', value: '0', change: '', changeType: 'neutral', icon: Shield }
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamTotals, setStreamTotals] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, activityResponse, totalsResponse] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getActivity(10),
        dashboardService.getStreamTotals().catch(() => null)
      ]);

      // Update stats (dashboardService now unwraps, so we can use directly)
      const formattedStats = [
        {
          title: 'Total Users',
          value: statsResponse.totalUsers.count.toString(),
          change: statsResponse.totalUsers.change,
          changeType: statsResponse.totalUsers.changeType,
          icon: Users
        },
        {
          title: 'Active Users',
          value: statsResponse.activeUsers.count.toString(),
          change: statsResponse.activeUsers.change,
          changeType: statsResponse.activeUsers.changeType,
          icon: UserCheck
        },
        {
          title: 'Admin Users',
          value: statsResponse.adminUsers.count.toString(),
          change: statsResponse.adminUsers.change,
          changeType: statsResponse.adminUsers.changeType,
          icon: Shield
        }
      ];
      setStats(formattedStats);

      // Update recent activity (direct use, no .data)
      setRecentActivity(activityResponse || []);

      if (totalsResponse) {
        setStreamTotals(totalsResponse);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };


  const getActivityIcon = (type) => {
    switch (type) {
      case 'user':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'role':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'status':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your system and user management
        </p>
      </div>

      {/* Real alerts (threshold-based) */}
      <CardErrorBoundary name="System Alerts"><AlertsCard /></CardErrorBoundary>

      {/* Live Now (realtime) */}
      <CardErrorBoundary name="Live Now"><LiveNowCard /></CardErrorBoundary>

      {/* Stream totals (all-time / range) */}
      {streamTotals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">All-time streams</p>
              <p className="text-2xl font-bold">{streamTotals.allTimeStreams.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{streamTotals.streamsToday.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Last 7 days</p>
              <p className="text-2xl font-bold">{streamTotals.streams7d.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Peak viewers ever</p>
              <p className="text-2xl font-bold">
                {streamTotals.peakViewersEver?.value?.toLocaleString() ?? '—'}
              </p>
              {streamTotals.peakViewersEver?.streamer && (
                <p className="text-xs text-muted-foreground truncate">
                  {streamTotals.peakViewersEver.streamer}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg unique viewers</p>
              <p className="text-2xl font-bold">{streamTotals.avgUniqueViewersPerStream}</p>
              <p className="text-xs text-muted-foreground">per stream</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg duration</p>
              <p className="text-2xl font-bold">{streamTotals.avgDurationMin}m</p>
              <p className="text-xs text-muted-foreground">avg peak {streamTotals.avgPeakPerStream}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change && (
                  <p className={`text-xs ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {stat.change} from last month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Support Widget */}
      <SupportDashboardWidget />

      {/* Infrastructure */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Infrastructure</h2>
      </div>
      <CardErrorBoundary name="Host Metrics"><HostMetricsCard /></CardErrorBoundary>
      <CardErrorBoundary name="MongoDB"><MongoCard /></CardErrorBoundary>
      <CardErrorBoundary name="Agora"><AgoraCard /></CardErrorBoundary>
      <CardErrorBoundary name="Backblaze B2"><B2Card /></CardErrorBoundary>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system and user activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {activity.user}
                    </p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;