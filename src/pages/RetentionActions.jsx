import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, LogIn, Video, MessageSquare, Gift, Eye, FileText, Heart, MessageCircle, ArrowRight } from "lucide-react";
import { getCohortActions } from "@/services/analyticsService";

const ActionRow = ({ icon: Icon, title, stat, threshold, onChangeThreshold }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 mb-3 hover:border-indigo-200 hover:shadow-sm transition-all group">
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
          <span>Times action performed &lt;</span>
          <Input 
            type="number" 
            min="1" 
            className="h-6 w-16 text-xs px-2 py-0 border-slate-300 focus:ring-indigo-500 focus:border-indigo-500" 
            value={threshold} 
            onChange={(e) => onChangeThreshold(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-2xl font-bold text-slate-800">{stat}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Users</div>
    </div>
  </div>
);

const RetentionActions = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [userType, setUserType] = useState('all');
  
  const [thresholds, setThresholds] = useState({
    signIn: 2,
    liveStream: 1,
    message: 1,
    gift: 1,
    joinStream: 1,
    post: 1,
    comment: 1,
    like: 1
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    totalUsers: 0,
    signedIn: 0,
    startedStream: 0,
    wroteMessage: 0,
    sentGift: 0,
    joinedStream: 0,
    createdPost: 0,
    likedPost: 0,
    commentedPost: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getCohortActions({
        startDate,
        endDate,
        userType,
        thresholds
      });
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch cohort actions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [userType, startDate, endDate]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line
  }, [thresholds]);

  const handleThresholdChange = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-indigo-600" /> Retention & Engagement
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Filter users by cohort and analyze their inactivity dynamically across the platform.
        </p>
      </div>

      <Card className="border-indigo-100 shadow-sm bg-white">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 w-full rounded-t-xl"></div>
        <CardHeader className="pb-4">
          <CardTitle>Cohort Configuration</CardTitle>
          <CardDescription>Select the time period and the type of users to analyze.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="space-y-2 flex-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Type of User</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="new">New Accounts (Signed up in period)</SelectItem>
                  <SelectItem value="old">Old Accounts (Signed up before)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData} disabled={loading} className="w-full md:w-32 bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-8 flex flex-col justify-center items-center h-full text-center">
            <div className="bg-white/20 p-4 rounded-full mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-indigo-100 font-medium text-lg mb-1">Total Users in Cohort</h3>
            <div className="text-5xl font-extrabold tracking-tight">{data.totalUsers.toLocaleString()}</div>
            <p className="text-indigo-100 text-xs mt-4 max-w-[200px] leading-relaxed">
              These are the base users matching your cohort filter. All metrics on the right apply ONLY to these users.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Action Deficits (Lurkers & Inactive)</CardTitle>
            <CardDescription>Number of cohort users who performed an action fewer times than the specified threshold within the date range.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <div className="space-y-1">
              <ActionRow icon={LogIn} title="Signed In" stat={data.signedIn} threshold={thresholds.signIn} onChangeThreshold={(val) => handleThresholdChange('signIn', val)} />
              <ActionRow icon={Video} title="Started Live Stream" stat={data.startedStream} threshold={thresholds.liveStream} onChangeThreshold={(val) => handleThresholdChange('liveStream', val)} />
              <ActionRow icon={MessageSquare} title="Wrote a Message" stat={data.wroteMessage} threshold={thresholds.message} onChangeThreshold={(val) => handleThresholdChange('message', val)} />
              <ActionRow icon={Gift} title="Sent a Gift" stat={data.sentGift} threshold={thresholds.gift} onChangeThreshold={(val) => handleThresholdChange('gift', val)} />
            </div>
            <div className="space-y-1">
              <ActionRow icon={Eye} title="Joined Live Stream" stat={data.joinedStream} threshold={thresholds.joinStream} onChangeThreshold={(val) => handleThresholdChange('joinStream', val)} />
              <ActionRow icon={FileText} title="Created a Post" stat={data.createdPost} threshold={thresholds.post} onChangeThreshold={(val) => handleThresholdChange('post', val)} />
              <ActionRow icon={MessageCircle} title="Commented on Post" stat={data.commentedPost} threshold={thresholds.comment} onChangeThreshold={(val) => handleThresholdChange('comment', val)} />
              <ActionRow icon={Heart} title="Liked a Post" stat={data.likedPost} threshold={thresholds.like} onChangeThreshold={(val) => handleThresholdChange('like', val)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RetentionActions;
