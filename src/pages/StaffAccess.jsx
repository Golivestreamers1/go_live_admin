import React from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function StaffAccess() {
  const [pages, setPages] = React.useState([]);
  const [selected, setSelected] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/roles/permissions');
      setPages(data.data?.pages || []);
      setSelected(data.data?.staffPages || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load staff access settings');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const toggle = (key) => setSelected((current) => current.includes(key)
    ? current.filter((item) => item !== key)
    : [...current, key]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/roles/permissions', { staffPages: selected });
      setSelected(data.data?.staffPages || selected);
      toast.success('Staff page access updated for all staff accounts');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save staff access settings');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-4xl space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Staff Access</h1>
      <p className="mt-1 text-sm text-muted-foreground">These page permissions apply to every staff account.</p>
    </div>
    <Card>
      <CardHeader><CardTitle>Pages staff can access</CardTitle><CardDescription>Access changes take effect on backend requests immediately. Signed-in staff can reload the admin panel to refresh their navigation.</CardDescription></CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading permissions…</p> : <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((page) => <label key={page.key} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
            <input type="checkbox" checked={selected.includes(page.key)} onChange={() => toggle(page.key)} className="h-4 w-4" />
            <span className="text-sm font-medium">{page.label}</span>
          </label>)}
        </div>}
        <div className="mt-5 flex justify-end"><Button onClick={save} disabled={loading || saving}>{saving ? 'Saving…' : 'Save staff access'}</Button></div>
      </CardContent>
    </Card>
  </div>;
}
