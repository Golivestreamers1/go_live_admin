import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import { marketplaceAdminService } from '../services/marketplaceAdminService';

const STATUS_OPTIONS = ['', 'pending', 'submitted', 'in_production', 'shipped', 'delivered', 'cancelled', 'failed'];

const STATUS_BADGE = {
  pending: 'secondary',
  submitted: 'default',
  in_production: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'secondary',
  failed: 'destructive',
};

const money = (cents) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const MarketplaceOrders = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await marketplaceAdminService.getOrders({ page, limit, status: status || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every vendor's suborders across the whole marketplace.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              className="border rounded-md px-3 py-1.5 text-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s ? s.replace(/_/g, ' ') : 'All statuses'}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No orders match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Platform profit</TableHead>
                    <TableHead>Vendor payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{order.vendorId?.name || '—'}</TableCell>
                      <TableCell>{order.buyerId?.name || '—'}</TableCell>
                      <TableCell>
                        {order.items?.reduce((n, i) => n + i.quantity, 0) ?? 0}
                      </TableCell>
                      <TableCell>{money(order.subtotal)}</TableCell>
                      <TableCell>{money(order.platformMarkup)}</TableCell>
                      <TableCell>{money(order.vendorPayout)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[order.status] || 'secondary'}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                        {order.printify?.marginWarning && (
                          <Badge variant="destructive" className="ml-1">
                            margin loss
                          </Badge>
                        )}
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
    </div>
  );
};

export default MarketplaceOrders;
