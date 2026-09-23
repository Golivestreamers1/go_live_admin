import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { promoService } from "../services/promoService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectItem } from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Tag, Search, Plus, RefreshCw, Eye, Calendar, Percent, Users, FileText, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

const getLocalDateTimeString = (d = new Date()) => {
  const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function PromoManagement() {
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const [formData, setFormData] = useState({
    customCode: "",
    note: "",
    bonusPercentage: 10,
    maxUses: 100,
    startDate: getLocalDateTimeString(new Date()),
    expirationDate: getLocalDateTimeString(new Date(Date.now() + 30 * 86400000)),
  });

  const [editFormData, setEditFormData] = useState({
    note: "",
    bonusPercentage: 10,
    maxUses: 100,
    startDate: "",
    expirationDate: "",
    isActive: true,
  });

  const fetchPromos = async (page = 1) => {
    try {
      setLoading(true);
      const data = await promoService.listPromoCodes({
        page,
        limit: pagination.limit,
        search: searchTerm,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      setPromos(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toast.error("Failed to fetch promo codes", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos(1);
  }, [selectedStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPromos(1);
  };

  const handleGenerateRandomCode = async () => {
    try {
      setGeneratingCode(true);
      const code = await promoService.getRandomCode();
      setFormData((prev) => ({ ...prev, customCode: code }));
      toast.success("Random code generated");
    } catch (err) {
      toast.error("Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!formData.note || !formData.bonusPercentage || !formData.maxUses) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.expirationDate) <= new Date(formData.startDate)) {
      toast.error("Expiration date must be after start date");
      return;
    }

    try {
      setSubmitting(true);
      await promoService.createPromoCode({
        customCode: formData.customCode || undefined,
        note: formData.note,
        bonusPercentage: Number(formData.bonusPercentage),
        maxUses: Number(formData.maxUses),
        startDate: formData.startDate,
        expirationDate: formData.expirationDate,
      });

      toast.success("Promo code created successfully!");
      setCreateDialogOpen(false);
      setFormData({
        customCode: "",
        note: "",
        bonusPercentage: 10,
        maxUses: 100,
        startDate: getLocalDateTimeString(new Date()),
        expirationDate: getLocalDateTimeString(new Date(Date.now() + 30 * 86400000)),
      });
      fetchPromos(1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create promo code";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (promo, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await promoService.togglePromoStatus(promo._id);
      toast.success(`Promo code "${promo.code}" is now ${res.isActive ? "Active" : "Inactive"}`);
      fetchPromos(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleOpenEdit = (promo, e) => {
    if (e) e.stopPropagation();
    setSelectedPromo(promo);
    setEditFormData({
      note: promo.note || "",
      bonusPercentage: promo.bonusPercentage || 10,
      maxUses: promo.maxUses || 100,
      startDate: promo.startDate ? getLocalDateTimeString(promo.startDate) : "",
      expirationDate: promo.expirationDate ? getLocalDateTimeString(promo.expirationDate) : "",
      isActive: promo.isActive !== false,
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePromo = async (e) => {
    e.preventDefault();
    if (!selectedPromo) return;

    if (new Date(editFormData.expirationDate) <= new Date(editFormData.startDate)) {
      toast.error("Expiration date must be after start date");
      return;
    }

    try {
      setSubmitting(true);
      await promoService.updatePromoCode(selectedPromo._id, {
        note: editFormData.note,
        bonusPercentage: Number(editFormData.bonusPercentage),
        maxUses: Number(editFormData.maxUses),
        startDate: editFormData.startDate,
        expirationDate: editFormData.expirationDate,
        isActive: editFormData.isActive,
      });
      toast.success("Promo code updated successfully!");
      setEditDialogOpen(false);
      fetchPromos(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update promo code";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (promo, e) => {
    if (e) e.stopPropagation();
    setSelectedPromo(promo);
    setDeleteConfirmOpen(true);
  };

  const handleDeletePromo = async () => {
    if (!selectedPromo) return;
    try {
      setSubmitting(true);
      const res = await promoService.deletePromoCode(selectedPromo._id);
      if (res?.archived) {
        toast.info("Promo Code Archived", {
          description: res.message || "Deactivated to preserve redemption history.",
        });
      } else {
        toast.success("Promo Code Deleted Permanently");
      }
      setDeleteConfirmOpen(false);
      fetchPromos(pagination.page);
    } catch (err) {
      toast.error("Failed to delete promo code", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promo Code Management</h2>
          <p className="text-muted-foreground">Manage promo codes, usage limits, and campaign bonuses</p>
        </div>
        <Button onClick={() => {
          setFormData({
            customCode: "",
            note: "",
            bonusPercentage: 10,
            maxUses: 100,
            startDate: getLocalDateTimeString(new Date()),
            expirationDate: getLocalDateTimeString(new Date(Date.now() + 30 * 86400000)),
          });
          setCreateDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Promo Code
        </Button>
      </div>

      {/* Actions & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by code or note..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="w-48">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Promo Codes ({pagination.total})
          </CardTitle>
          <CardDescription>Click any row or view icon to open detailed history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading promo codes...</div>
          ) : promos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No promo codes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Promotion Note</TableHead>
                  <TableHead>Bonus %</TableHead>
                  <TableHead>Usage (Used / Max)</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((p) => {
                  const isExpired = new Date() > new Date(p.expirationDate);
                  const isExhausted = p.currentUses >= p.maxUses;
                  return (
                    <TableRow key={p._id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/promos/${p._id}`)}>
                      <TableCell className="font-mono font-bold text-primary">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.note}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold text-green-600 bg-green-500/10">
                          +{p.bonusPercentage}% Bonus
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.currentUses} / {p.maxUses}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.expirationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!p.isActive ? (
                          <Badge variant="outline">Inactive</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : isExhausted ? (
                          <Badge variant="secondary">Exhausted</Badge>
                        ) : (
                          <Badge className="bg-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={p.isActive ? "Deactivate Promo Code" : "Activate Promo Code"}
                            onClick={(e) => handleToggleStatus(p, e)}
                          >
                            <Power className={`h-4 w-4 ${p.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Promo Code"
                            onClick={(e) => handleOpenEdit(p, e)}
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete / Archive Promo Code"
                            onClick={(e) => handleOpenDelete(p, e)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Details & Redemptions"
                            onClick={() => navigate(`/promos/${p._id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Promo Code</DialogTitle>
            <DialogDescription>
              Enter a custom code or click refresh to generate one. If left blank, a code will be generated automatically upon creation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePromo} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Promo Code (Custom or Auto-Generated)</label>
              <div className="flex gap-2">
                <Input
                  className="font-mono uppercase font-bold placeholder:normal-case placeholder:font-normal"
                  value={formData.customCode}
                  onChange={(e) => setFormData({ ...formData, customCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER2026 or leave blank"
                />
                <Button type="button" variant="outline" onClick={handleGenerateRandomCode} disabled={generatingCode} title="Generate Random Code">
                  <RefreshCw className={`h-4 w-4 ${generatingCode ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Promotion Note / Description</label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="e.g. Summer 2026 Conversion Promo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Bonus %</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={formData.bonusPercentage}
                    onChange={(e) => setFormData({ ...formData, bonusPercentage: e.target.value })}
                    required
                  />
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Max Redemptions</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="e.g. 500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    className="text-[12px] pl-2 pr-8 min-w-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expiration Date</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    min={formData.startDate}
                    className="text-[12px] pl-2 pr-8 min-w-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Promo Code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>
              Code: <span className="font-mono font-bold text-primary">{selectedPromo?.code}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePromo} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Promotion Note / Description</label>
              <Input
                value={editFormData.note}
                onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                placeholder="e.g. Summer 2026 Promo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Bonus %</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={editFormData.bonusPercentage}
                    onChange={(e) => setEditFormData({ ...editFormData, bonusPercentage: e.target.value })}
                    required
                  />
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Max Redemptions</label>
                <Input
                  type="number"
                  min="1"
                  value={editFormData.maxUses}
                  onChange={(e) => setEditFormData({ ...editFormData, maxUses: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    className="text-[12px] pl-2 pr-8 min-w-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expiration Date</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    min={editFormData.startDate}
                    className="text-[12px] pl-2 pr-8 min-w-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={editFormData.expirationDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expirationDate: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="editIsActive" className="text-sm font-medium cursor-pointer">
                Promo Code Active
              </label>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete promo code <span className="font-mono font-bold text-primary">{selectedPromo?.code}</span>?
              {selectedPromo?.currentUses > 0 ? (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ This code has {selectedPromo.currentUses} existing redemption(s). Deleting it will safely deactivate/archive it to preserve audit records.
                </span>
              ) : (
                <span className="block mt-2 text-muted-foreground">
                  This action will permanently delete the code since it has 0 redemptions.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePromo} disabled={submitting}>
              {submitting ? "Processing..." : selectedPromo?.currentUses > 0 ? "Archive Code" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
