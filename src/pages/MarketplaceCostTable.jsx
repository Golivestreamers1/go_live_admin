import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../components/ui/alert-dialog';
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const emptyForm = { blueprintId: '', printProviderId: '', size: '', costCents: '' };

const MarketplaceCostTable = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await marketplaceAdminService.getCostEntries();
      setEntries(data);
    } catch (error) {
      toast.error('Failed to load cost entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const openAddDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setForm({
      blueprintId: String(entry.blueprintId),
      printProviderId: String(entry.printProviderId),
      size: entry.size ?? '',
      costCents: String((entry.costCents / 100).toFixed(2)),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const blueprintId = Number(form.blueprintId);
    const printProviderId = Number(form.printProviderId);
    const size = form.size.trim();
    const costCents = Math.round(Number(form.costCents) * 100);
    if (!Number.isInteger(blueprintId) || !Number.isInteger(printProviderId)) {
      toast.error('Blueprint ID and Print Provider ID must be whole numbers');
      return;
    }
    if (!size) {
      toast.error('Size is required');
      return;
    }
    if (!Number.isFinite(costCents) || costCents < 1) {
      toast.error('Cost must be a positive dollar amount');
      return;
    }
    setSaving(true);
    try {
      await marketplaceAdminService.saveCostEntry({ blueprintId, printProviderId, size, costCents });
      toast.success('Cost entry saved');
      setDialogOpen(false);
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save cost entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await marketplaceAdminService.deleteCostEntry(deleteTarget._id);
      toast.success('Cost entry deleted');
      setDeleteTarget(null);
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete cost entry');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Table</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manufacturing cost per product type. A product can't be sold until its
            blueprint + print provider combination has a cost entry here.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add cost entry
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No cost entries yet. Vendors can't publish new products until you add at least one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product type</TableHead>
                    <TableHead>Blueprint ID</TableHead>
                    <TableHead>Print provider ID</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {entry.blueprintTitle || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{entry.printProviderTitle || ''}</div>
                      </TableCell>
                      <TableCell>{entry.blueprintId}</TableCell>
                      <TableCell>{entry.printProviderId}</TableCell>
                      <TableCell>{entry.size}</TableCell>
                      <TableCell>${(entry.costCents / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(entry)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(entry)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Cost entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="blueprintId">Blueprint ID (from Printify)</Label>
                <Input
                  id="blueprintId"
                  type="number"
                  value={form.blueprintId}
                  onChange={(e) => setForm((f) => ({ ...f, blueprintId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="printProviderId">Print Provider ID (from Printify)</Label>
                <Input
                  id="printProviderId"
                  type="number"
                  value={form.printProviderId}
                  onChange={(e) => setForm((f) => ({ ...f, printProviderId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="size">Size (as shown in Printify's catalog, e.g. "S", "XL")</Label>
                <Input
                  id="size"
                  type="text"
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="costCents">Manufacturing cost (USD, shipping excluded)</Label>
                <Input
                  id="costCents"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.costCents}
                  onChange={(e) => setForm((f) => ({ ...f, costCents: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shipping is quoted live from Printify at checkout — don't include it here.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cost entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Vendors won't be able to publish new products for{' '}
              {deleteTarget?.blueprintTitle || 'this product type'} until a new cost entry is added.
              Existing published products are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketplaceCostTable;
