'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { commentsService, CommentWithProduct } from '@/lib/services/comments';

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentWithProduct[]>([]);
  const [filteredComments, setFilteredComments] = useState<CommentWithProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [commentsPerPage, setCommentsPerPage] = useState(10);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await commentsService.getAllAdmin();
      setComments(data);
      setFilteredComments(data);
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  useEffect(() => {
    if (searchTerm) {
      const filtered = comments.filter(comment =>
        comment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredComments(filtered);
    } else {
      setFilteredComments(comments);
    }
  }, [searchTerm, comments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [commentsPerPage, searchTerm]);

  // Pagination calculations
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = filteredComments.slice(indexOfFirstComment, indexOfLastComment);
  const totalPages = Math.ceil(filteredComments.length / commentsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentsService.delete(id);
      setComments(comments.filter(c => c.id !== id));
      setFilteredComments(filteredComments.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Product Comments</h1>
        <p className="text-gray-600 mt-2">Manage customer reviews and feedback</p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product, user, or comment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
          />
        </div>

        {/* Per Page Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Per page:</span>
          <select
            value={commentsPerPage}
            onChange={(e) => setCommentsPerPage(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Comments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentComments.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{comment.product_name}</div>
                      <div className="text-xs text-gray-500">{comment.product_category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{comment.username}</div>
                      <div className="text-xs text-gray-500">{comment.user_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStars(comment.rating)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 max-w-md truncate">{comment.comment}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && currentComments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'No comments found matching your search' : 'No comments yet'}
            </p>
          </div>
        )}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredComments.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700">
              Showing {indexOfFirstComment + 1} to {Math.min(indexOfLastComment, filteredComments.length)} of {filteredComments.length} comments
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
