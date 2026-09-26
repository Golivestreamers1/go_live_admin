import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FlaskConical, RefreshCw, Search, X } from 'lucide-react';
import { userService } from '../services/userService';
import { testAccountService } from '../services/testAccountService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

const MIN_SEARCH_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 300;

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function UserCell({ id, name, username }) {
  return (
    <>
      <Link to={`/users/${id}`} className="font-medium hover:underline">
        {name || '—'}
      </Link>
      {username && <div className="text-xs text-muted-foreground">@{username}</div>}
    </>
  );
}

const TestAccounts = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [busyId, setBusyId] = useState(null);

  const flaggedIds = useMemo(
    () => new Set(rows.map((r) => String(r.user?.id || ''))),
    [rows]
  );

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testAccountService.list();
      setRows(data.items || []);
      setTotal(data.total ?? (data.items || []).length);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load test accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Search as the admin types. Only the newest request may update results, so a
  // slow earlier response can't overwrite a newer one.
  const latestSearch = useRef(0);
  const runSearch = useCallback(async (term) => {
    const reqId = ++latestSearch.current;
    if (term.length < MIN_SEARCH_CHARS) {
      setResults(null);
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const data = await userService.getAllUsers({ page: 1, limit: 10, search: term });
      if (reqId === latestSearch.current) setResults(data.users || []);
    } catch (err) {
      if (reqId === latestSearch.current) {
        toast.error(err?.response?.data?.message || 'Search failed');
      }
    } finally {
      if (reqId === latestSearch.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const markUser = async (u) => {
    const id = String(u._id);
    const label = u.email || u.username || u.name || id;
    if (!window.confirm(`Mark ${label} as a test account? Their purchases will be excluded from Money Flow revenue.`)) {
      return;
    }
    try {
      setBusyId(id);
      await testAccountService.add(id, note);
      toast.success(`${label} marked as test account`);
      await fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const unmark = async (row) => {
    // The row id also works when the user document has since been deleted.
    const ref = String(row.id);
    const label = row.user?.email || row.user?.username || ref;
    if (!window.confirm(`Remove the test flag from ${label}? Their purchases will count in Money Flow again.`)) {
      return;
    }
    try {
      setBusyId(ref);
      await testAccountService.remove(ref);
      toast.success(`${label} unmarked`);
      await fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FlaskConical className="h-6 w-6" />
            Test Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Purchases by these users are excluded from{' '}
            <Link to="/finance" className="underline">Money Flow</Link> revenue.
            Nothing else about the account changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a test account</CardTitle>
          <CardDescription>
            Start typing a name, email or username; matching users appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type at least 2 letters…"
                className="pl-9 pr-9"
                autoFocus
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional), e.g. QA device"
              maxLength={500}
              className="max-w-xs"
            />
            {searching && <span className="text-xs text-muted-foreground">Searching…</span>}
          </form>

          {results && (
            results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((u) => {
                    const id = String(u._id);
                    return (
                      <TableRow key={id}>
                        <TableCell><UserCell id={id} name={u.name} username={u.username} /></TableCell>
                        <TableCell className="text-sm">{u.email || '—'}</TableCell>
                        <TableCell className="text-right">
                          {flaggedIds.has(id) ? (
                            <Badge variant="secondary">Already test</Badge>
                          ) : (
                            <Button size="sm" disabled={busyId === id} onClick={() => markUser(u)}>
                              Mark as test
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test accounts ({total})</CardTitle>
          {total > rows.length && (
            <CardDescription>Showing the latest {rows.length}.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test accounts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead>Added at</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const ref = String(r.id);
                  return (
                    <TableRow key={ref}>
                      <TableCell>
                        {r.user ? (
                          <UserCell id={r.user.id} name={r.user.name} username={r.user.username} />
                        ) : (
                          <span className="text-muted-foreground">Deleted user</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.user?.email || '—'}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{r.note || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.createdBy ? (r.createdBy.username ? `@${r.createdBy.username}` : r.createdBy.email) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{fmtDate(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === ref}
                          onClick={() => unmark(r)}
                        >
                          Unmark
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAccounts;
