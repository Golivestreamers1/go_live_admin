import React, { useState, useEffect } from 'react';
import { iapService } from '../services/iapService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectItem } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Apple,
  RefreshCw,
  AlertTriangle,
  Package,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Native formatter to replace date-fns
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

const IapManagement = () => {
  const [activeTab, setActiveTab] = useState('audit');
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [settings, setSettings] = useState({ strictMode: true });
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  
  // Filters for Audit
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [skuMismatchOnly, setSkuMismatchOnly] = useState(false);
  
  // Package Dialog
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [packageFormData, setPackageFormData] = useState({
    name: '',
    usd: 0,
    coins: 0,
    appStoreProductId: '',
    playStoreProductId: '',
    googlePlayProductId: '',
    displayOrder: 0,
    isActive: true,
    webOnly: false
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      if (activeTab === 'audit') {
        const [settingsData, transData] = await Promise.all([
          iapService.getSettings(),
          iapService.getTransactions({
            page,
            limit: pagination.limit,
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            verificationMode: selectedMode !== 'all' ? selectedMode : undefined,
            skuMismatch: skuMismatchOnly || undefined,
          })
        ]);
        setSettings(settingsData);
        setTransactions(transData.transactions);
        setPagination(transData.pagination);
      } else {
        const packagesData = await iapService.getPackages();
        setPackages(packagesData);
      }
    } catch (error) {
      console.error('Failed to fetch IAP data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedPlatform, selectedStatus, selectedMode, skuMismatchOnly]);

  const handleToggleStrictMode = async (checked) => {
    try {
      setUpdatingSettings(true);
      const updated = await iapService.updateSettings({ strictMode: checked });
      setSettings(updated);
      toast.success(`IAP Mode switched to ${checked ? 'STRICT' : 'DEGRADED'}`);
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleOpenPackageDialog = (pkg = null) => {
    if (pkg) {
      setCurrentPackage(pkg);
      setPackageFormData({
        name: pkg.name || '',
        usd: pkg.usd || 0,
        coins: pkg.coins || 0,
        appStoreProductId: pkg.appStoreProductId || '',
        playStoreProductId: pkg.playStoreProductId || '',
        googlePlayProductId: pkg.googlePlayProductId || '',
        displayOrder: pkg.displayOrder || 0,
        isActive: pkg.isActive ?? true,
        webOnly: pkg.webOnly ?? false
      });
    } else {
      setCurrentPackage(null);
      setPackageFormData({
        name: '',
        usd: 0,
        coins: 0,
        appStoreProductId: '',
        playStoreProductId: '',
        googlePlayProductId: '',
        displayOrder: packages.length + 1,
        isActive: true,
        webOnly: false
      });
    }
    setIsPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    try {
      if (currentPackage) {
        await iapService.updatePackage(currentPackage._id, packageFormData);
        toast.success('Package updated');
      } else {
        await iapService.createPackage(packageFormData);
        toast.success('Package created');
      }
      setIsPackageDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save package');
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await iapService.deletePackage(id);
      toast.success('Package deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete package');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case 'authoritative': return <Badge variant="outline" className="border-blue-500 text-blue-500"><ShieldCheck className="w-3 h-3 mr-1" /> Authoritative</Badge>;
      case 'degraded': return <Badge variant="outline" className="border-orange-500 text-orange-500"><ShieldAlert className="w-3 h-3 mr-1" /> Degraded</Badge>;
      case 'legacy': return <Badge variant="outline" className="text-gray-500">Legacy</Badge>;
      default: return <Badge variant="outline">{mode}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900">IAP Command Center</h2>
          <p className="text-muted-foreground text-indigo-600/70">Monitor real-time billing security and package catalog</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'packages' && (
            <Button onClick={() => handleOpenPackageDialog()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add Package
            </Button>
          )}
          <Button onClick={() => fetchData(pagination.page)} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-indigo-50/50 p-1">
          <TabsTrigger value="audit" className="data-[state=active]:bg-white data-[state=active]:text-indigo-900">
            <ShieldCheck className="w-4 h-4 mr-2" /> Audit Ledger
          </TabsTrigger>
          <TabsTrigger value="packages" className="data-[state=active]:bg-white data-[state=active]:text-indigo-900">
            <Package className="w-4 h-4 mr-2" /> Coin Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6 mt-6">
          {/* Emergency Toggle Card */}
          <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {settings.strictMode ? <ShieldCheck className="text-indigo-600" /> : <ShieldAlert className="text-orange-500" />}
                    Security Gate Status: <span className={settings.strictMode ? "text-indigo-600" : "text-orange-600"}>
                      {settings.strictMode ? "STRICT MODE" : "DEGRADED MODE"}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {settings.strictMode 
                      ? "Verification mandatory. Reject all mismatches and store errors." 
                      : "Emergency Mode. Accept purchases via SKU if stores are down. Transactions tagged as 'degraded'."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-indigo-100">
                  <span className="text-sm font-medium text-indigo-900">Strict Mode</span>
                  <Switch 
                    checked={settings.strictMode} 
                    onCheckedChange={handleToggleStrictMode}
                    disabled={updatingSettings}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Platform</label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="ios">iOS (App Store)</SelectItem>
                    <SelectItem value="android">Android (Play Store)</SelectItem>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Verification Mode</label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="authoritative">Authoritative Only</SelectItem>
                    <SelectItem value="degraded">Degraded Only</SelectItem>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    variant={skuMismatchOnly ? "destructive" : "outline"}
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => setSkuMismatchOnly(!skuMismatchOnly)}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    SKU Mismatches Only
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Audit Ledger</CardTitle>
              <CardDescription>Authorize records of all In-App coin purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>User / Date</TableHead>
                    <TableHead>Platform / Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10">Loading transactions...</TableCell></TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions found</TableCell></TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx._id} className={tx.metadata?.skuMismatch ? "bg-red-50/30" : ""}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-900 leading-none">
                              {tx.userId?.username || tx.userId?.name || (typeof tx.userId === 'string' ? `ID: ${tx.userId.substring(0, 8)}` : 'Unknown User')}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1 font-medium">{formatDate(tx.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.metadata?.storePlatform === 'ios' ? <Apple className="w-4 h-4 text-gray-500" /> : <Smartphone className="w-4 h-4 text-green-600" />}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{tx.metadata?.storeProductId || 'N/A'}</span>
                              {tx.metadata?.skuMismatch && (
                                <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> SKU MISMATCH
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-indigo-700">{tx.coins} Coins</span>
                            <span className="text-xs text-muted-foreground">${tx.usd?.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getModeBadge(tx.metadata?.verificationMode)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tx.status || tx.metadata?.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {transactions.length} of {pagination.total} entries
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" size="sm" 
                      disabled={pagination.page === 1}
                      onClick={() => fetchData(pagination.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button 
                      variant="outline" size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => fetchData(pagination.page + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Catalog Management</CardTitle>
              <CardDescription>Map backend coin amounts to Apple & Google Product IDs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Package Name</TableHead>
                    <TableHead>Coins / Price</TableHead>
                    <TableHead>Store Identifiers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10">Loading packages...</TableCell></TableRow>
                  ) : packages.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No packages configured</TableCell></TableRow>
                  ) : (
                    packages.map((pkg) => (
                      <TableRow key={pkg._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-900">{pkg.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Order: {pkg.displayOrder}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-indigo-700">{pkg.coins} Coins</span>
                            <span className="text-xs text-muted-foreground">${pkg.usd?.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <Apple className="w-3 h-3 text-gray-400" />
                              <span className="font-mono text-gray-600">{pkg.appStoreProductId || 'MISSING'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Smartphone className="w-3 h-3 text-green-500" />
                              <span className="font-mono text-gray-600">{pkg.googlePlayProductId || pkg.playStoreProductId || 'MISSING'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pkg.isActive ? "success" : "secondary"}>
                            {pkg.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {pkg.webOnly && <Badge variant="outline" className="ml-1 border-indigo-200 text-indigo-600">Web Only</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenPackageDialog(pkg)}>
                              <Pencil className="w-4 h-4 text-indigo-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePackage(pkg._id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Package Editor Dialog */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentPackage ? 'Edit Coin Package' : 'Add New Coin Package'}</DialogTitle>
            <DialogDescription>
              Ensure Product IDs match exactly what is configured in the App Store & Play Store.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input 
                  id="name" 
                  placeholder="Starter Pack" 
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData({...packageFormData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input 
                  id="displayOrder" 
                  type="number" 
                  value={packageFormData.displayOrder}
                  onChange={(e) => setPackageFormData({...packageFormData, displayOrder: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coins">Coins Awarded</Label>
                <Input 
                  id="coins" 
                  type="number" 
                  value={packageFormData.coins}
                  onChange={(e) => setPackageFormData({...packageFormData, coins: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usd">Price (USD)</Label>
                <Input 
                  id="usd" 
                  type="number" 
                  step="0.01"
                  value={packageFormData.usd}
                  onChange={(e) => setPackageFormData({...packageFormData, usd: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appleId" className="flex items-center gap-2"><Apple className="w-3 h-3" /> Apple Product ID</Label>
              <Input 
                id="appleId" 
                placeholder="golive_coins_100" 
                className="font-mono text-sm"
                value={packageFormData.appStoreProductId}
                onChange={(e) => setPackageFormData({...packageFormData, appStoreProductId: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleId" className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> Google Product ID</Label>
              <Input 
                id="googleId" 
                placeholder="golive_coins_100" 
                className="font-mono text-sm"
                value={packageFormData.googlePlayProductId}
                onChange={(e) => setPackageFormData({
                  ...packageFormData, 
                  googlePlayProductId: e.target.value,
                  playStoreProductId: e.target.value // Keep both in sync for safety
                })}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch 
                  id="isActive" 
                  checked={packageFormData.isActive}
                  onCheckedChange={(checked) => setPackageFormData({...packageFormData, isActive: checked})}
                />
                <Label htmlFor="isActive">Active in Store</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="webOnly" 
                  checked={packageFormData.webOnly}
                  onCheckedChange={(checked) => setPackageFormData({...packageFormData, webOnly: checked})}
                />
                <Label htmlFor="webOnly">Web Only</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePackage} className="bg-indigo-600 hover:bg-indigo-700">Save Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IapManagement;
