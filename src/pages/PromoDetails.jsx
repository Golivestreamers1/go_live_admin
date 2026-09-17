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
import { ArrowLeft, Tag, Users, Coins, Percent, Calendar, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PromoDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
