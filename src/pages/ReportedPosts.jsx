import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertTriangle,
  Eye,
  Trash2,
  User,
  Clock,
  FileText,
  Image,
  Video,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

const ReportedPosts = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReports = async (page = 1, status = '') => {
    try {
      setLoading(true);
      const result = await reportService.getReportedPosts({ page, limit: 10, status: status || undefined });
      setReports(result.reports);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to fetch reported posts:', error);
      toast.error('Failed to fetch reported posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    fetchReports(1, status);
  };

  const handlePageChange = (newPage) => {
    fetchReports(newPage, statusFilter);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const handleDeleteClick = (report) => {
    setDeleteTarget(report);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.reportedPost?._id || !deleteTarget?._id) return;
    try {
      setDeleting(true);
      await reportService.deletePost(deleteTarget.reportedPost._id);
      // Mark this report (and any other pending reports for the same post) as reviewed
      // so the admin list stops showing the resolved case. Best-effort: if this fails the
      // post is already deleted, so we still consider the action a success.
      try {
        await reportService.setReportStatus(deleteTarget._id, 'reviewed');
      } catch (statusErr) {
        console.warn('Post deleted but report status update failed:', statusErr);
      }
      toast.success('Post deleted and report marked reviewed');
      setDeleteOpen(false);
      setDetailOpen(false);
      setDeleteTarget(null);
      fetchReports(pagination.page, statusFilter);
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="default">Reviewed</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPostTypeIcon = (postType) => {
    switch (postType) {
      case 'image':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'poll':
        return <BarChart3 className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reported Posts</h1>
        <p className="text-gray-600 mt-1">
          Review and manage post reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Post Reports</CardTitle>
          <CardDescription>All reports against posts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Filter */}
          <div className="flex gap-2 mb-6">
            {['', 'pending', 'reviewed', 'dismissed'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter(s)}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Delete Post</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No reported posts found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report._id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getPostTypeIcon(report.reportedPost?.postType)}
                          <div className="text-sm max-w-[150px] truncate">
                            {report.reportedPost?.content || report.reportedPost?.title || 'No content'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {report.reportedPost?.author?.name || 'Unknown'}
                          </div>
                          <div className="text-gray-500 text-xs">
                            @{report.reportedPost?.author?.username || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{report.reporter?.name || 'Unknown'}</div>
                          <div className="text-gray-500">{report.reporter?.email || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 max-w-[200px] truncate">
                          {report.reason}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDeleteClick(report)}
                          disabled={!report.reportedPost?._id}
                        >
                          <Trash2 color="red" size={20} />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>Detailed information about this post report</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Post Content */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  {getPostTypeIcon(selectedReport.reportedPost?.postType)}
                  Reported Post
                  <Badge variant="outline" className="ml-auto text-xs">
                    {selectedReport.reportedPost?.postType || 'text'}
                  </Badge>
                </h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedReport.reportedPost?.content || selectedReport.reportedPost?.title || 'No content'}
                </p>

                {/* Post images */}
                {selectedReport.reportedPost?.images?.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {selectedReport.reportedPost.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Post image ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                    ))}
                  </div>
                )}

                {/* Post stats */}
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span>{selectedReport.reportedPost?.likesCount || 0} likes</span>
                  <span>{selectedReport.reportedPost?.commentsCount || 0} comments</span>
                  <span>{selectedReport.reportedPost?.sharesCount || 0} shares</span>
                </div>
              </div>

              {/* Post Author */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Post Author</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{selectedReport.reportedPost?.author?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">@{selectedReport.reportedPost?.author?.username || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Reporter */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Reported By</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{selectedReport.reporter?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">{selectedReport.reporter?.email || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Reason</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedReport.reason}</p>
              </div>

              {/* Status & Date */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Status</h4>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-gray-800">Reported On</h4>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {selectedReport?.reportedPost?._id && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteTarget(selectedReport);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportedPosts;
