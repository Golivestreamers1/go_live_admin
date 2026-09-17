import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { promoService } from "../services/promoService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { Input } from "../components/ui/input";
import { ArrowLeft, Tag, Users, Coins, Percent, Calendar, ShieldCheck, ExternalLink, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

export default function PromoDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit & Delete State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    note: "",
    bonusPercentage: 10,
    maxUses: 100,
    startDate: "",
    expirationDate: "",
    isActive: true,
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await promoService.getPromoDetails(id);
      setData(res);
    } catch (err) {
      toast.error("Failed to load promo details", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!data?.promo) return;
    try {
      const res = await promoService.togglePromoStatus(data.promo._id);
      toast.success(`Promo code "${data.promo.code}" is now ${res.isActive ? "Active" : "Inactive"}`);
      fetchDetails();
    } catch (err) {
      toast.error("Failed to toggle status", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const handleOpenEdit = () => {
    if (!data?.promo) return;
    const p = data.promo;
    setEditFormData({
      note: p.note || "",
      bonusPercentage: p.bonusPercentage || 10,
      maxUses: p.maxUses || 100,
      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 16) : "",
      expirationDate: p.expirationDate ? new Date(p.expirationDate).toISOString().slice(0, 16) : "",
      isActive: p.isActive !== false,
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePromo = async (e) => {
    e.preventDefault();
    if (!data?.promo) return;
    try {
      setSubmitting(true);
      await promoService.updatePromoCode(data.promo._id, {
        note: editFormData.note,
        bonusPercentage: Number(editFormData.bonusPercentage),
        maxUses: Number(editFormData.maxUses),
        startDate: editFormData.startDate,
        expirationDate: editFormData.expirationDate,
        isActive: editFormData.isActive,
      });
      toast.success("Promo code updated successfully!");
      setEditDialogOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error("Failed to update promo code", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async () => {
    if (!data?.promo) return;
    try {
      setSubmitting(true);
      const res = await promoService.deletePromoCode(data.promo._id);
      if (res?.archived) {
        toast.info("Promo Code Archived", {
          description: res.message || "Deactivated to preserve redemption history.",
        });
        fetchDetails();
      } else {
        toast.success("Promo Code Deleted Permanently");
        navigate("/promos");
      }
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast.error("Failed to delete promo code", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading promo details...</div>;
  }

  if (!data || !data.promo) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Promo code not found</p>
        <Button onClick={() => navigate("/promos")}>Back to Promo Codes</Button>
      </div>
    );
  }

  const { promo, history = [] } = data;
  const totalBonusCoinsGranted = history.reduce((sum, item) => sum + (item.bonusCoins || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Back & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/promos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold font-mono tracking-tight text-primary">{promo.code}</h2>
              <Badge variant={promo.isActive ? "default" : "secondary"}>
                {promo.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground font-medium">{promo.note}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            <Power className={`h-4 w-4 mr-2 ${promo.isActive ? "text-green-600" : "text-muted-foreground"}`} />
            {promo.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="secondary" onClick={handleOpenEdit}>
            <Pencil className="h-4 w-4 mr-2 text-blue-600" />
            Edit Code
          </Button>
          <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            {promo.currentUses > 0 ? "Archive Code" : "Delete Code"}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Percent className="h-4 w-4" /> Bonus Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{promo.bonusPercentage}% Bonus</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Usage Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promo.currentUses} / {promo.maxUses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((promo.currentUses / promo.maxUses) * 100)}% Used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-4 w-4" /> Bonus Coins Granted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">+{totalBonusCoinsGranted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all redemptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Date Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.expirationDate).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Campaign active period</p>
          </CardContent>
        </Card>
      </div>

      {/* Redemption History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Redemption & Usage History ({history.length})
          </CardTitle>
          <CardDescription>Comprehensive audit log of each transaction using this promo code</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No redemptions recorded yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Price (USD)</TableHead>
                  <TableHead>Base Coins</TableHead>
                  <TableHead>Bonus Coins Awarded</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{h.userId?.name || "User"}</div>
                        <div className="text-xs text-muted-foreground">{h.userId?.email || h.userId?._id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.packageName || "Package"}</TableCell>
                    <TableCell>${Number(h.packageUsd || 0).toFixed(2)}</TableCell>
                    <TableCell>{(h.baseCoins || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      +{(h.bonusCoins || 0).toLocaleString()} coins (+{h.bonusPercentage}%)
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {h.platform || "web"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>
              Code: <span className="font-mono font-bold text-primary">{promo?.code}</span>
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
                <Input
                  type="datetime-local"
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expiration Date</label>
                <Input
                  type="datetime-local"
                  value={editFormData.expirationDate}
                  onChange={(e) => setEditFormData({ ...editFormData, expirationDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsActiveDetails"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="editIsActiveDetails" className="text-sm font-medium cursor-pointer">
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
              Are you sure you want to delete promo code <span className="font-mono font-bold text-primary">{promo?.code}</span>?
              {promo?.currentUses > 0 ? (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ This code has {promo.currentUses} existing redemption(s). Deleting it will safely deactivate/archive it to preserve audit records.
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
              {submitting ? "Processing..." : promo?.currentUses > 0 ? "Archive Code" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
