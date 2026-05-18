import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fraudCascadeService } from '../services/fraudCascadeService';
import FraudCascadeDialog from '../components/FraudCascadeDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { AlertTriangle, RefreshCw, Plus, Undo2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

const statusVariant = (status) =>
  ({
    planning: 'secondary',
    plan_ready: 'secondary',
    executing: 'secondary',
    completed: 'default',
    failed: 'destructive',
    undone: 'outline',
  })[status] || 'secondary';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
const fmtNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';

export default function FraudCascade() {
  const [cascades, setCascades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  // For resuming a `plan_ready` cascade from the history table — opens the
  // same dialog but pre-loaded with the saved plan, jumps to PREVIEW stage.
  const [resumeCascadeId, setResumeCascadeId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fraudCascadeService.list({
        status: statusFilter || null,
        page: 1,
        limit: 50,
      });
      setCascades(data?.items || []);
      setFeatureDisabled(false);
    } catch (err) {
      if (err?.response?.status === 404) {
        // Feature flag off on the backend.
        setFeatureDisabled(true);
        setCascades([]);
      } else {
        toast.error(`Load failed: ${err?.response?.data?.message || err?.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleUndo = async (cascadeId) => {
    const reason = window.prompt('Reason for undoing this cascade (min 20 chars):');
    if (!reason || reason.trim().length < 20) {
      toast.info('Undo cancelled — reason too short');
      return;
    }
    try {
      const data = await fraudCascadeService.undo(cascadeId, reason.trim());
      toast.success(
        `Undo ${data.finalStatus}: ${data.successCount} reversed, ${data.failedCount} failed`,
      );
      fetchData();
    } catch (err) {
      toast.error(`Undo failed: ${err?.response?.data?.message || err?.message}`);
    }
  };

  if (featureDisabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Fraud cascade is disabled
            </CardTitle>
            <CardDescription>
              The backend <code>FRAUD_CASCADE_ENABLED</code> environment flag is <b>off</b>. Set it to{' '}
              <code>true</code> on the backend and restart, then reload this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Fraud cascade
          </h1>
          <p className="text-sm text-gray-500">
            Reverse a fraudulent transaction and all its downstream effects in one auditable action.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New cascade
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>History</CardTitle>
            <CardDescription>All cascades triggered by super-admins</CardDescription>
          </div>
          <div className="w-48">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="planning">planning</SelectItem>
                <SelectItem value="plan_ready">plan_ready</SelectItem>
                <SelectItem value="executing">executing</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="failed">failed</SelectItem>
                <SelectItem value="undone">undone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Triggered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Root user</TableHead>
                <TableHead className="text-right">Taint</TableHead>
                <TableHead className="text-right">Users affected</TableHead>
                <TableHead className="text-right">Coins reversed</TableHead>
                <TableHead className="text-right">Rubies reversed</TableHead>
                <TableHead className="text-right">USD leaked</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && cascades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No cascades yet.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                cascades.map((c) => {
                  const t = c.plan?.totals || {};
                  const undoable =
                    (c.status === 'completed' || c.status === 'failed') &&
                    !c.undoneBy &&
                    !c.undoOf;
                  const resumable = c.status === 'plan_ready';
                  return (
                    <TableRow key={c._id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        <Link
                          to={`/fraud-cascade/${c._id}`}
                          className="hover:underline"
                          title={`Cascade #${String(c._id).slice(-6)}`}
                        >
                          {fmtDate(c.createdAt)}
                          <div className="text-[10px] font-mono text-muted-foreground">
                            #{String(c._id).slice(-6)}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {String(c.rootUserId || '').slice(-8)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {fmtNumber(c.taintAmount)} {c.taintCurrency}
                      </TableCell>
                      <TableCell className="text-right">{fmtNumber(t.usersAffected)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(t.coinsReversed)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(t.rubiesReversed)}</TableCell>
                      <TableCell className="text-right">
                        ${fmtNumber(t.usdWithdrawnLeaked)}
                      </TableCell>
                      <TableCell>
                        {resumable ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setResumeCascadeId(c._id)}
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1" />
                            Review & execute
                          </Button>
                        ) : undoable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndo(c._id)}
                          >
                            <Undo2 className="h-3.5 w-3.5 mr-1" />
                            Undo
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {c.status === 'executing'
                              ? 'in progress…'
                              : c.undoneBy
                                ? 'undone'
                                : c.undoOf
                                  ? '(undo of)'
                                  : '—'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FraudCascadeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCompleted={() => fetchData()}
      />

      {/* Separate mount for the resume-existing flow so the two dialogs don't
          share state. Only rendered when a plan_ready cascade is being opened. */}
      <FraudCascadeDialog
        open={!!resumeCascadeId}
        existingCascadeId={resumeCascadeId}
        onClose={() => setResumeCascadeId(null)}
        onCompleted={() => {
          setResumeCascadeId(null);
          fetchData();
        }}
      />
    </div>
  );
}
