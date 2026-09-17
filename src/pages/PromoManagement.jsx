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
import { Tag, Search, Plus, RefreshCw, Eye, Calendar, Percent, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PromoManagement() {
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [formData, setFormData] = useState({
    customCode: "",
    note: "",
    bonusPercentage: 10,
    maxUses: 100,
    startDate: new Date().toISOString().slice(0, 16),
    expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
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
        startDate: new Date().toISOString().slice(0, 16),
        expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      });
      fetchPromos(1);
    } catch (err) {
      toast.error("Failed to create promo code", {
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
          handleGenerateRandomCode();
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
                    <TableRow key={p._id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/promo-codes/${p._id}`)}>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/promo-codes/${p._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View Details
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Promo Code</DialogTitle>
            <DialogDescription>
              Randomized code generated automatically. Set promotion note, percentage, and limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePromo} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Promo Code (Randomized)</label>
              <div className="flex gap-2">
                <Input
                  className="font-mono uppercase font-bold"
                  value={formData.customCode}
                  onChange={(e) => setFormData({ ...formData, customCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. PRM-X8K9M2"
                  required
                />
                <Button type="button" variant="outline" onClick={handleGenerateRandomCode} disabled={generatingCode}>
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
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expiration Date</label>
                <Input
                  type="datetime-local"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  required
                />
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
    </div>
  );
}
