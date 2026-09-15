import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const money = (cents) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const SOURCE_LABEL = {
  create: 'Created',
  edit: 'Vendor edit',
  admin_resync: 'Admin resync',
  cron_resync: 'Auto resync (6h)',
};

const MarketplacePriceHistory = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const limit = 20;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await marketplaceAdminService.getProducts({ page, limit, search: search || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price History</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every recorded price/cost change per product — at creation, on a vendor edit, from an
          admin-triggered resync, or the automatic 6-hourly cron that catches drift on listings
          nobody has touched.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <Input
              placeholder="Search product by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No products match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-xs text-gray-500">
                          Blueprint {product.blueprintId} · Provider {product.printProviderId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{product.vendorId?.name || '—'}</div>
                        <div className="text-xs text-gray-500">{product.vendorId?.email || ''}</div>
                      </TableCell>
                      <TableCell>{product.variants?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setViewing(product)}>
                          <History className="mr-1.5 h-4 w-4" />
                          View history
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

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-gray-500">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      {viewing && (
        <PriceHistoryDialog product={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
};

const PriceHistoryDialog = ({ product, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await marketplaceAdminService.getProductPriceHistory(product._id);
        if (!cancelled) setHistory(data);
      } catch (error) {
        if (!cancelled) toast.error('Failed to load price history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product._id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-sm text-gray-500">Loading…</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-sm text-gray-500">
            No recorded price history for this product yet — it was created before this feature
            shipped, or nothing has changed since.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Vendor keeps</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{h.variantTitle || `Variant ${h.variantId}`}</TableCell>
                    <TableCell>{money(h.costCents)}</TableCell>
                    <TableCell>{money(h.vendorMarkupCents)}</TableCell>
                    <TableCell>{money(h.platformCommissionCents)}</TableCell>
                    <TableCell className="font-medium">{money(h.price)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{SOURCE_LABEL[h.source] || h.source}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplacePriceHistory;
