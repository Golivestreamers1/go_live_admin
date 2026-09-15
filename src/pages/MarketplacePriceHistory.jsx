import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
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
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const money = (cents) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const SOURCE_LABEL = {
  create: 'Created',
  edit: 'Vendor edit',
  admin_resync: 'Admin resync',
  cron_resync: 'Auto resync (6h)',
};

const SOURCE_BADGE = {
  create: 'secondary',
  edit: 'default',
  admin_resync: 'default',
  cron_resync: 'default',
};

const MarketplacePriceHistory = () => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const data = await marketplaceAdminService.getProducts({ search: search.trim(), limit: 20 });
      setMatches(data.items);
      if (!data.items.length) toast.error('No products match that search');
    } catch (error) {
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const selectProduct = async (product) => {
    setSelected(product);
    setLoadingHistory(true);
    try {
      const data = await marketplaceAdminService.getProductPriceHistory(product._id);
      setHistory(data);
    } catch (error) {
      toast.error('Failed to load price history');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price History</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every recorded price/cost change for a product — at creation, on a vendor edit, from an
          admin-triggered resync, or the automatic 6-hourly cron that catches drift on listings
          nobody has touched.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              placeholder="Search product by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80"
            />
            <Button type="submit" variant="outline" size="sm" disabled={searching}>
              <Search className="w-4 h-4" />
            </Button>
          </form>
          {matches.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {matches.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selected?._id === p._id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="font-medium text-gray-900">{selected.title}</div>
              <div className="text-xs text-gray-500">
                {selected.vendorId?.name || '—'} · {selected.vendorId?.email || ''}
              </div>
            </div>
            {loadingHistory ? (
              <div className="p-6 text-sm text-gray-500">Loading…</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No recorded price history for this product yet — it was created before this
                feature shipped, or nothing has changed since.
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
                          <Badge variant={SOURCE_BADGE[h.source] || 'secondary'}>
                            {SOURCE_LABEL[h.source] || h.source}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketplacePriceHistory;
