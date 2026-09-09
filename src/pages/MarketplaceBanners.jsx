import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const MarketplaceBanners = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null); // vendorId currently showing a reject-note form
  const [rejectNote, setRejectNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await marketplaceAdminService.getPendingBanners();
      setItems(data);
    } catch (error) {
      toast.error('Failed to load pending banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleApprove = async (vendorId) => {
    setSaving(true);
    try {
      await marketplaceAdminService.approveBanner(vendorId);
      toast.success('Banner approved');
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve banner');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (vendorId) => {
    if (!rejectNote.trim()) {
      toast.error('A rejection note is required');
      return;
    }
    setSaving(true);
    try {
      await marketplaceAdminService.rejectBanner(vendorId, rejectNote.trim());
      toast.success('Banner rejected');
      setRejecting(null);
      setRejectNote('');
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shop banners</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vendor shop banners awaiting approval before they go live on their storefront.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No banners are waiting for review.</div>
          ) : (
            <div className="divide-y">
              {items.map((vendor) => (
                <div key={vendor._id} className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={vendor.marketplaceBanner?.url}
                      alt={`${vendor.name}'s shop banner`}
                      className="h-24 w-40 shrink-0 rounded-md border border-gray-200 object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{vendor.name}</div>
                      <div className="text-xs text-gray-500">{vendor.email}</div>
                      {vendor.marketplaceBanner?.submittedAt && (
                        <div className="mt-1 text-xs text-gray-400">
                          Submitted{' '}
                          {new Date(vendor.marketplaceBanner.submittedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          setRejecting(rejecting === vendor._id ? null : vendor._id)
                        }
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Reject
                      </Button>
                      <Button size="sm" disabled={saving} onClick={() => handleApprove(vendor._id)}>
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                  {rejecting === vendor._id && (
                    <div className="mt-3 pl-[176px]">
                      <Label htmlFor={`reject-note-${vendor._id}`}>
                        Rejection note (shown to the vendor)
                      </Label>
                      <Textarea
                        id={`reject-note-${vendor._id}`}
                        rows={2}
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="e.g. Banner text is hard to read against the background"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejecting(null);
                            setRejectNote('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={saving}
                          onClick={() => handleReject(vendor._id)}
                        >
                          {saving ? 'Rejecting…' : 'Confirm reject'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceBanners;
