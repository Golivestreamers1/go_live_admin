import React from 'react';
import PropTypes from 'prop-types';
import { Coins, Gem } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { formatNumber } from './formatters';

const TransactionCategoriesTable = ({ data, loading }) => {
  const categories = data?.categories ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Top Transaction Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions in this range.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.coinVolume > 0 ? (
                          <Coins className="h-3.5 w-3.5 text-amber-600" />
                        ) : null}
                        {row.rubyVolume > 0 ? (
                          <Gem className="h-3.5 w-3.5 text-violet-600" />
                        ) : null}
                        <span className="font-medium text-gray-900">{row.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                    <TableCell className="text-right">
                      {row.coinVolume > 0 ? (
                        <span className="block text-xs text-amber-700">
                          {formatNumber(row.coinVolume)} coins
                        </span>
                      ) : null}
                      {row.rubyVolume > 0 ? (
                        <span className="block text-xs text-violet-700">
                          {formatNumber(row.rubyVolume)} rubies
                        </span>
                      ) : null}
                      {row.coinVolume === 0 && row.rubyVolume === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{row.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

TransactionCategoriesTable.propTypes = {
  data: PropTypes.object,
  loading: PropTypes.bool,
};

export default TransactionCategoriesTable;
