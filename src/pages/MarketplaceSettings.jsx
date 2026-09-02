import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const MarketplaceSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Stored as fractions (0.2) on the backend, edited as whole percentages (20) here.
  const [platformPct, setPlatformPct] = useState('20');
  const [vendorPct, setVendorPct] = useState('20');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await marketplaceAdminService.getSettings();
        setPlatformPct(String(Math.round(data.platformMarkupPct * 100)));
        setVendorPct(String(Math.round(data.vendorMarkupCapPct * 100)));
      } catch (error) {
        toast.error('Failed to load marketplace settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const platformFraction = Number(platformPct) / 100;
    const vendorFraction = Number(vendorPct) / 100;
    if (!Number.isFinite(platformFraction) || platformFraction < 0) {
      toast.error('Platform markup must be a number >= 0');
      return;
    }
    if (!Number.isFinite(vendorFraction) || vendorFraction < 0) {
      toast.error('Vendor markup cap must be a number >= 0');
      return;
    }
    setSaving(true);
    try {
      await marketplaceAdminService.updateSettings({
        platformMarkupPct: platformFraction,
        vendorMarkupCapPct: vendorFraction,
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Live example so an admin can see exactly what the numbers mean before saving.
  const exampleCost = 15;
  const floor = exampleCost * (1 + Number(platformPct || 0) / 100);
  const ceiling = exampleCost * (1 + Number(platformPct || 0) / 100 + Number(vendorPct || 0) / 100);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Controls the cost-plus pricing band every vendor's price must fall inside.
        </p>
      </div>

      <Card className="max-w-xl">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Pricing markup</CardTitle>
            <CardDescription>
              Both percentages are applied on top of the product's manufacturing cost
              (from the Cost Table), not on top of the retail price.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platformPct">Platform markup (%)</Label>
              <Input
                id="platformPct"
                type="number"
                min="0"
                step="1"
                value={platformPct}
                onChange={(e) => setPlatformPct(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                The platform's guaranteed cut — always recovered, no matter what price the
                vendor sets within the allowed band.
              </p>
            </div>
            <div>
              <Label htmlFor="vendorPct">Vendor markup cap (%)</Label>
              <Input
                id="vendorPct"
                type="number"
                min="0"
                step="1"
                value={vendorPct}
                onChange={(e) => setVendorPct(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                The most a vendor may add on top of the floor price for their own margin.
              </p>
            </div>

            <div className="rounded-md bg-gray-50 border p-4 text-sm">
              <p className="font-medium text-gray-900 mb-1">Example — $15.00 cost item</p>
              <p className="text-gray-600">
                Vendor must price between <span className="font-semibold text-gray-900">${floor.toFixed(2)}</span> and{' '}
                <span className="font-semibold text-gray-900">${ceiling.toFixed(2)}</span>.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default MarketplaceSettings;
