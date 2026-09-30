import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getUserJourney } from '../services/analyticsService';
import { ArrowLeft, Users, Activity, Eye, Search, AlertCircle, TerminalSquare, Loader2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const getHumanReadableAction = (method, url, msg) => {
  if (msg) return msg;
  if (!url) return "Unknown Action";
  const path = url.split('?')[0].toLowerCase();
  if (path.includes('/login')) return "Logged In";
  if (path.includes('/register') || path.includes('/signup')) return "Created Account";
  if (path.includes('/profile')) return method === 'GET' ? "Viewed Profile" : "Updated Profile";
  if (path.includes('/stream') || path.includes('/live')) return method === 'GET' ? "Browsed Streams" : "Started a Stream";
  if (path.includes('/gift')) return "Sent a Gift";
  if (path.includes('/purchase') || path.includes('/wallet') || path.includes('/checkout')) return "Made a Transaction";
  if (path.includes('/message') || path.includes('/chat')) return method === 'GET' ? "Read Messages" : "Sent a Message";
  if (path.includes('/follow')) return "Followed a User";
  
  const endpointName = path.split('/').filter(Boolean).pop();
  if (method === 'GET') return `Viewed ${endpointName || 'Page'}`;
  if (method === 'POST') return `Submitted Data to ${endpointName || 'App'}`;
  return `Interacted with ${endpointName || 'App'}`;
};

const UserJourneyExplorer = () => {
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState('24h');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [allLogs, setAllLogs] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userLogs, setUserLogs] = useState([]);
  const [logFilterText, setLogFilterText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [error, setError] = useState(null);

  const observer = useRef();

  const parseUsersFromLogs = (logsToParse) => {
    const userMap = {};
    logsToParse.forEach(item => {
      try {
        const parsed = JSON.parse(item.log);
        if (parsed.userId) {
          if (!userMap[parsed.userId]) {
            userMap[parsed.userId] = { count: 0, lastActive: item.timestamp, id: parsed.userId };
          }
          userMap[parsed.userId].count += 1;
          if (item.timestamp > userMap[parsed.userId].lastActive) {
            userMap[parsed.userId].lastActive = item.timestamp;
          }
        }
      } catch(e) { }
    });
    setActiveUsers(Object.values(userMap).sort((a,b) => b.lastActive - a.lastActive));
  };

  const fetchAllJourneys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getUserJourney("", range === 'custom' ? "" : range, 50, "", range === 'custom' ? startDate : "", range === 'custom' ? endDate : ""); // Fetch smaller chunk initially
      const logs = res.data || [];
      setAllLogs(logs);
      setHasMoreUsers(logs.length >= 50);
      parseUsersFromLogs(logs);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJourneys = async () => {
    if (loading || loadingMore || !hasMoreUsers) return;
    try {
      setLoadingMore(true);
      const cursor = allLogs.length > 0 ? allLogs[allLogs.length - 1].timestamp : "";
      const res = await getUserJourney("", range === 'custom' ? "" : range, 50, cursor, range === 'custom' ? startDate : "", range === 'custom' ? endDate : "");
      const newLogs = res.data || [];
      
      // If we got exactly the same last log, Loki pagination might have overlapped, but usually end is exclusive or we deduplicate
      const combined = [...allLogs, ...newLogs];
      setAllLogs(combined);
      setHasMoreUsers(newLogs.length >= 50);
      parseUsersFromLogs(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      if (range !== 'custom' || (range === 'custom' && startDate && endDate)) {
        fetchAllJourneys();
      }
    }
  }, [range, selectedUser, startDate, endDate]);

  const handleTraceSpecific = async (uid) => {
    if (!uid.trim()) return;
    if (range === 'custom' && (!startDate || !endDate)) {
      setError("Please select both start and end dates for custom range.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSelectedUser(uid);
      const res = await getUserJourney(uid, range === 'custom' ? "" : range, 50, "", range === 'custom' ? startDate : "", range === 'custom' ? endDate : "");
      setUserLogs(res.data || []);
      setHasMoreLogs((res.data || []).length >= 50);
      setLogFilterText('');
    } catch (err) {
      console.error(err);
      setError("Failed to fetch specific user journey.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreUserLogs = async () => {
    if (loading || loadingMore || !hasMoreLogs) return;
    try {
      setLoadingMore(true);
      const cursor = userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : "";
      const res = await getUserJourney(selectedUser, range === 'custom' ? "" : range, 50, cursor, range === 'custom' ? startDate : "", range === 'custom' ? endDate : "");
      const newLogs = res.data || [];
      setUserLogs([...userLogs, ...newLogs]);
      setHasMoreLogs(newLogs.length >= 50);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserLogs([]);
    setSearchInput('');
    setLogFilterText('');
  };

  const filteredUserLogs = useMemo(() => {
    if (!logFilterText) return userLogs;
    return userLogs.filter(log => log.log.toLowerCase().includes(logFilterText.toLowerCase()));
  }, [userLogs, logFilterText]);

  // Infinite Scroll Intersection Observer ref
  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (selectedUser && hasMoreLogs) {
          loadMoreUserLogs();
        } else if (!selectedUser && hasMoreUsers) {
          loadMoreJourneys();
        }
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMoreLogs, hasMoreUsers, selectedUser, userLogs, allLogs]);
  const renderTimeFilters = (showButton = false, onButtonClick = null, buttonLabel = "Apply Range") => (
    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Time Range:</span>
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value)}
          className="flex h-10 w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-slate-200 focus:border-slate-300"
        >
          <option value="1h">Last 1 Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      {range === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-none">
          <DatePicker 
            selected={startDate ? new Date(startDate) : null}
            onChange={(date) => setStartDate(date ? date.toISOString() : '')}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMM d, yyyy h:mm aa"
            placeholderText="Start Date & Time"
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-[200px] shadow-sm"
          />
          <span className="text-sm font-medium text-slate-400 hidden sm:block">to</span>
          <DatePicker 
            selected={endDate ? new Date(endDate) : null}
            onChange={(date) => setEndDate(date ? date.toISOString() : '')}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMM d, yyyy h:mm aa"
            placeholderText="End Date & Time"
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-[200px] shadow-sm"
          />
        </div>
      )}
      
      {showButton && (
        <Button onClick={onButtonClick} disabled={loading} className="w-full sm:w-auto shadow-sm">
          {loading ? "Tracing..." : buttonLabel}
        </Button>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {selectedUser ? "User Journey Detail" : "User Journeys (Live)"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {selectedUser 
              ? `Tracing path for user: ${selectedUser}` 
              : "Showing active users from recent logs (Auto-paginated)"}
          </p>
        </div>
        {selectedUser && (
          <Button variant="outline" onClick={handleBack} className="mt-4 md:mt-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Users
          </Button>
        )}
      </div>

      {!selectedUser && (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Enter User ID to trace specific user (e.g. 6aa1b8a9...)" 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 w-full shadow-sm"
                  />
                </div>
                <Button onClick={() => handleTraceSpecific(searchInput)} disabled={loading || !searchInput.trim()} className="w-full sm:w-auto shadow-sm shrink-0">
                  {loading ? "Tracing..." : "Trace Specific User"}
                </Button>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-600 hidden xl:block">Active Users Logs</div>
                {renderTimeFilters(false)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* List of All Users View */}
      {!selectedUser && activeUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.map(u => (
            <Card 
              key={u.id} 
              className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group"
              onClick={() => {
                setSearchInput(u.id);
                handleTraceSpecific(u.id);
              }}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm" title={u.id}>
                      User ID: {u.id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Activity className="w-3 h-3 text-green-500" /> {u.count} recorded actions
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  <div className="mb-1 text-[10px] uppercase font-bold tracking-wider">Last Active</div>
                  {new Date(u.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!selectedUser && !loading && activeUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            {allLogs.length > 0 ? (
              <div className="max-w-2xl mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto opacity-50" />
                <h3 className="text-lg font-semibold text-slate-700">No Structured User Logs Found</h3>
                <p className="text-sm">We couldn't find any standard JSON logs with a <strong>User ID</strong> in the selected time range.</p>
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
                  <p><strong>Note for DevOps:</strong> Loki returned {allLogs.length} raw system logs. Ensure that standard request logs (INFO) are being streamed to Loki, not just error logs.</p>
                </div>
                <div className="mt-6 text-left border rounded-md p-4 bg-slate-900 overflow-auto max-h-64 space-y-2">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2"><TerminalSquare className="w-4 h-4"/> Raw System Feed</div>
                  {allLogs.slice(0, 50).map((l, i) => (
                    <div key={i} className="text-xs font-mono text-green-400 whitespace-pre-wrap pb-2 border-b border-slate-800 last:border-0">{l.log}</div>
                  ))}
                </div>
              </div>
            ) : (
              "No logs of any kind found in the selected time range."
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Loading & Intersection Observer Trigger for All Users */}
      {!selectedUser && (
        <div ref={lastElementRef} className="py-6 text-center text-slate-400 text-sm">
          {loading || loadingMore ? (
            <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading more activity...</div>
          ) : hasMoreUsers && allLogs.length > 0 ? (
            "Scroll for more users"
          ) : allLogs.length > 0 ? (
            "No more user activity in this time range."
          ) : null}
        </div>
      )}

      {/* Specific User Detail View */}
      {selectedUser && (
        <Card className="shadow-md border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Journey Timeline <span className="text-slate-500 font-normal text-sm ml-1">({filteredUserLogs.length} events)</span>
                </CardTitle>
                <CardDescription className="mt-1">Chronological history from newest to oldest.</CardDescription>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Filter events (e.g. 'Purchase')..." 
                  value={logFilterText}
                  onChange={(e) => setLogFilterText(e.target.value)}
                  className="pl-9 bg-white w-full shadow-sm"
                />
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-200/60 flex justify-end">
              {renderTimeFilters(true, () => handleTraceSpecific(selectedUser), "Apply Range")}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading && userLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 animate-pulse">Analyzing user journey...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUserLogs.map((item, idx) => {
                  let parsedLog = null;
                  try {
                    parsedLog = JSON.parse(item.log);
                  } catch(e) {}
                  
                  let stayDuration = null;
                  if (idx > 0) {
                    const newerEvent = filteredUserLogs[idx - 1];
                    const diffMs = newerEvent.timestamp - item.timestamp;
                    if (diffMs < 1000 * 60 * 60 * 2) { 
                      if (diffMs < 1000) {
                        stayDuration = "A few seconds";
                      } else {
                        const s = Math.floor((diffMs / 1000) % 60);
                        const m = Math.floor((diffMs / (1000 * 60)) % 60);
                        const h = Math.floor(diffMs / (1000 * 60 * 60));
                        stayDuration = [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', s > 0 ? `${s}s` : ''].filter(Boolean).join(' ');
                      }
                    } else {
                      stayDuration = "Session Ended (Inactive)";
                    }
                  } else {
                    stayDuration = "Last recorded action";
                  }

                  let humanAction = "System Event";
                  let technicalDetail = item.log;
                  let isError = false;

                  if (parsedLog?.req) {
                    humanAction = getHumanReadableAction(parsedLog.req.method, parsedLog.req.url, parsedLog.msg);
                    technicalDetail = `${parsedLog.req.method} ${parsedLog.req.url}`;
                  } else if (parsedLog?.msg) {
                    humanAction = parsedLog.msg;
                    technicalDetail = JSON.stringify(parsedLog, null, 2);
                  } else if (item.log.includes('MONGOOSE') || item.log.includes('Error')) {
                    humanAction = "Database / System Warning";
                    isError = true;
                  } else {
                    humanAction = "Raw Application Log";
                  }

                  return (
                    <div key={idx} className={`p-4 md:p-6 hover:bg-slate-50 transition-colors ${isError ? 'bg-red-50/30' : ''}`}>
                      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        <div className="w-32 flex-shrink-0">
                          <div className="text-sm font-semibold text-slate-700">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex-grow space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isError ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <span className="font-semibold text-slate-800">{humanAction}</span>
                          </div>
                          
                          <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full inline-block font-medium border border-blue-100">
                            {idx > 0 && stayDuration !== "Session Ended (Inactive)" ? (
                              <span>User stayed here for <strong>{stayDuration}</strong></span>
                            ) : (
                              <span>{stayDuration}</span>
                            )}
                          </div>
                          
                          <div className="bg-slate-900 rounded-lg p-3 overflow-hidden">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                              <TerminalSquare className="w-3 h-3" /> Technical Log Data
                            </div>
                            <div className="text-xs font-mono text-green-400 break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                              {technicalDetail}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredUserLogs.length === 0 && !loading && (
                  <div className="text-center py-12 text-slate-500">
                    <Eye className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    No events match your current filter.
                  </div>
                )}
                
                {/* Infinite Scroll trigger for specific user logs */}
                <div ref={lastElementRef} className="py-6 text-center text-slate-400 text-sm">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading older logs...</div>
                  ) : hasMoreLogs && userLogs.length > 0 ? (
                    "Scroll down to load older events"
                  ) : userLogs.length > 0 ? (
                    "End of user journey history."
                  ) : null}
                </div>
                
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserJourneyExplorer;
