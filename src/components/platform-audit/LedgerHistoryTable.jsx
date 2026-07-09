import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { formatDateTime, formatNumber } from './formatters';

const LedgerHistoryTable = ({ history, unit, loading, onPageChange }) => {
  const items = history?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Transaction history</CardTitle>
          {!loading && history ? (
            <span className="text-xs text-muted-foreground">
              {formatNumber(history.total)} rows · read-only
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions in this range.</p>
        ) : (
          <>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">{unit === 'coins' ? 'Coins' : 'Rubies'}</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const amount = unit === 'coins' ? row.coins : row.rubies;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">{row.type}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            amount > 0 ? 'text-emerald-700' : amount < 0 ? 'text-red-700' : ''
                          }`}
                        >
                          {formatNumber(amount)}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                          {row.userId ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {history && history.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {history.page} of {history.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={history.page <= 1}
                    onClick={() => onPageChange(history.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={history.page >= history.totalPages}
                    onClick={() => onPageChange(history.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};

LedgerHistoryTable.propTypes = {
  history: PropTypes.object,
  unit: PropTypes.oneOf(['coins', 'rubies']).isRequired,
  loading: PropTypes.bool,
  onPageChange: PropTypes.func.isRequired,
};

export default LedgerHistoryTable;
