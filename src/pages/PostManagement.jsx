import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Trash2,
  Sliders,
  Plus,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  RefreshCw,
  AlertTriangle,
  PlayCircle,
  Image as ImageIcon,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { feedAdminService } from '../services/feedAdminService';

const resolvePostImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [postType, setPostType] = useState('all');
  const [status, setStatus] = useState('active');
  const [sortBy, setSortBy] = useState('trendingScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Score Adjustment Modal State
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await feedAdminService.getPosts({
        page,
        limit: 15,
        search,
        postType,
        status,
        sortBy,
        sortOrder,
      });

      const raw = res?.data ?? res;
      const list = Array.isArray(raw?.posts)
        ? raw.posts
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : Array.isArray(res?.posts)
        ? res.posts
        : [];
      const pag = raw?.pagination || res?.pagination || {};

      setPosts(list);
      setTotalPages(pag.totalPages || 1);
      setTotalCount(pag.totalCount || list.length);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, search, postType, status, sortBy, sortOrder]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleOpenScoreModal = (post) => {
    setSelectedPost(post);
    setAdjustmentValue(post.adminScoreAdjustment || 0);
    setAdjustmentReason(post.adminScoreReason || '');
    setScoreModalOpen(true);
  };

  const handleSaveScoreAdjustment = async () => {
    if (!selectedPost) return;
    try {
      setAdjusting(true);
      await feedAdminService.adjustPostScore(
        selectedPost._id,
        adjustmentValue,
        adjustmentReason
      );
      toast.success('Post score adjusted successfully!');
      setScoreModalOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error('Failed to adjust post score');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenDeleteModal = (post) => {
    setPostToDelete(post);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      setDeleting(true);
      await feedAdminService.deletePost(postToDelete._id);
      toast.success('Post deleted successfully');
      setDeleteModalOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-purple-600" />
            Posts Management & Scoring
          </h1>
          <p className="text-sm text-muted-foreground">
            View all posts, boost/demote post trending rankings, and moderate content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchPosts}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search text, author..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-white border-gray-300"
              />
            </div>

            {/* Post Type Filter */}
            <select
              value={postType}
              onChange={(e) => {
                setPostType(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Media Types</option>
              <option value="clip">Clips (Short Video)</option>
              <option value="video">Videos</option>
              <option value="image">Images</option>
              <option value="text">Text Only</option>
              <option value="poll">Polls</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="active">Active Only</option>
              <option value="deleted">Deleted Posts</option>
              <option value="all">All Statuses</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="trendingScore">Trending Score (High to Low)</option>
              <option value="newest">Newest First</option>
              <option value="likes">Most Likes</option>
              <option value="views">Most Views</option>
              <option value="adminScoreAdjustment">Highest Admin Boost</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-gray-900">Posts ({totalCount})</CardTitle>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No posts found matching the active filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-600 uppercase">
                    <th className="py-3 px-3">Post</th>
                    <th className="py-3 px-3">Author</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-right">Engagement</th>
                    <th className="py-3 px-3 text-right">Admin Score Boost</th>
                    <th className="py-3 px-3 text-right text-orange-600">Trending Score</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map((post) => {
                    const isClip =
                      post.postType === 'clip' ||
                      (post.postType === 'video' && post.videos?.length > 0);

                    return (
                      <tr key={post._id} className="hover:bg-gray-50/80 transition">
                        {/* Post info & preview */}
                        <td className="py-3 px-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                              {post.images?.[0] ? (
                                <img
                                  src={resolvePostImageUrl(post.images[0])}
                                  alt="post"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20x%3D%223%22%20y%3D%223%22%20rx%3D%222%22%20ry%3D%222%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%229%22%20r%3D%222%22%2F%3E%3Cpath%20d%3D%22m21%2015-3.086-3.086a2%202%200%200%200-2.828%200L6%2021%22%2F%3E%3C%2Fsvg%3E';
                                  }}
                                />
                              ) : isClip ? (
                                <PlayCircle className="h-5 w-5 text-purple-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]">
                                {post.content || post.title || '(No text content)'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(post.createdAt).toLocaleDateString()} at{' '}
                                {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Author */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {post.author?.profilePicture ? (
                              <img
                                src={post.author.profilePicture}
                                alt="avatar"
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center">
                                {post.author?.name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-900">
                                {post.author?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{post.author?.username || 'user'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium capitalize border ${
                              isClip
                                ? 'bg-pink-50 text-pink-700 border-pink-200'
                                : post.postType === 'image'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : post.postType === 'poll'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {isClip ? 'Clip' : post.postType}
                          </span>
                        </td>

                        {/* Engagement stats */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 text-xs text-gray-600 font-mono">
                            <span className="flex items-center gap-0.5 text-pink-600">
                              <Heart className="h-3 w-3" /> {post.likesCount || 0}
                            </span>
                            <span className="flex items-center gap-0.5 text-blue-600">
                              <MessageCircle className="h-3 w-3" /> {post.commentsCount || 0}
                            </span>
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <Eye className="h-3 w-3" /> {post.views || 0}
                            </span>
                          </div>
                        </td>

                        {/* Admin Score Adjustment */}
                        <td className="py-3 px-3 text-right font-mono">
                          {post.adminScoreAdjustment ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                                post.adminScoreAdjustment > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {post.adminScoreAdjustment > 0
                                ? `+${post.adminScoreAdjustment}`
                                : post.adminScoreAdjustment}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">0</span>
                          )}
                        </td>

                        {/* Trending score */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-orange-600">
                          {(post.trendingScore || 0).toFixed(3)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenScoreModal(post)}
                              className="h-8 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                              title="Adjust Post Score"
                            >
                              <Sliders className="h-3.5 w-3.5 mr-1 text-purple-600" />
                              Score
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenDeleteModal(post)}
                              className="h-8 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
                              title="Delete Post"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-muted-foreground">
                Showing {posts.length} of {totalCount} posts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs font-mono text-gray-700 px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Adjustment Modal */}
      {scoreModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-purple-600" />
                Adjust Post Score
              </h3>
              <button
                onClick={() => setScoreModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900 truncate">
                  {selectedPost.content || selectedPost.title || '(Media post)'}
                </p>
                <p className="text-muted-foreground">
                  By @{selectedPost.author?.username || 'user'} • Current Score:{' '}
                  <span className="text-orange-600 font-bold font-mono">
                    {(selectedPost.trendingScore || 0).toFixed(3)}
                  </span>
                </p>
              </div>

              {/* Adjustment value */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Manual Score Boost / Penalty
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                    placeholder="e.g. +50 or -20"
                    className="bg-white border-gray-300 text-gray-900 font-mono text-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentValue(0)}
                  >
                    Reset
                  </Button>
                </div>

                {/* Quick boost / demote chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground mr-1 self-center">Quick:</span>
                  {[+10, +50, +100, +500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustmentValue((prev) => (Number(prev) || 0) + val)}
                      className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-mono text-emerald-700 hover:bg-emerald-100 font-medium"
                    >
                      +{val}
                    </button>
                  ))}
                  {[-10, -50, -100, -500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustmentValue((prev) => (Number(prev) || 0) + val)}
                      className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-mono text-rose-700 hover:bg-rose-100 font-medium"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Reason for Adjustment (optional)
                </label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Featured partner promotion / Viral review"
                  className="bg-white border-gray-300 text-gray-900 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setScoreModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveScoreAdjustment}
                disabled={adjusting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {adjusting ? 'Saving...' : 'Apply Score'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-gray-900">Delete Post?</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this post? It will be removed from all user feeds immediately.
            </p>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-muted-foreground truncate">
              "{postToDelete.content || postToDelete.title || 'Media post'}" by @{postToDelete.author?.username}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Post'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostManagement;
