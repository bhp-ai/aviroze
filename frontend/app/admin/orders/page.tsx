'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Truck, CheckCircle, XCircle, Clock, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ordersService, Order } from '@/lib/services/orders';
import { authService } from '@/lib/services/auth';
import { formatIDR } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/utils/csv-export';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(5);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
    loadOrders();
  }, [router, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ordersPerPage]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await ordersService.getAllOrders(statusFilter || undefined);
      setOrders(data);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to load orders',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingOrderId(orderId);

      // Optimistic update - update UI immediately
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );

      await ordersService.updateOrderStatus(orderId, newStatus);
      showToast('Order status updated successfully', 'success');

      // Reload to get fresh data from server
      loadOrders();
    } catch (error) {
      // Revert on error
      loadOrders();
      showToast(
        error instanceof Error ? error.message : 'Failed to update order status',
        'error'
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleExportCSV = () => {
    const csvData = orders.map(order => ({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      total_amount: order.total_amount,
      payment_method: order.payment_method || 'N/A',
      payment_status: order.payment_status,
      shipping_address: order.shipping_address || 'N/A',
      items_count: order.items.length,
      items: order.items.map(item => `${item.product_name} (x${item.quantity})`).join('; '),
      created_at: order.created_at,
    }));

    const columns = [
      { header: 'Order ID', key: 'id' },
      { header: 'User ID', key: 'user_id' },
      { header: 'Status', key: 'status' },
      { header: 'Total Amount', key: 'total_amount', format: formatCurrencyForCSV },
      { header: 'Payment Method', key: 'payment_method' },
      { header: 'Payment Status', key: 'payment_status' },
      { header: 'Shipping Address', key: 'shipping_address' },
      { header: 'Items Count', key: 'items_count' },
      { header: 'Items', key: 'items' },
      { header: 'Order Date', key: 'created_at', format: formatDateForCSV },
    ];

    const filterLabel = statusFilter ? `_${statusFilter}` : '_all';
    const filename = `orders${filterLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(csvData, columns, filename);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter and sort orders
  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(order => new Date(order.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(order => new Date(order.created_at) <= new Date(dateTo));
    }

    // Sort orders
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'total') {
        comparison = a.total_amount - b.total_amount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredOrders = getFilteredAndSortedOrders();

  // Pagination calculations
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600 mt-1">Manage and track all customer orders</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={orders.length === 0}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <Filter className="w-5 h-5 text-gray-400 mt-2" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'total')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="total">Total</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="desc">↓ Desc</option>
                  <option value="asc">↑ Asc</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Per page</label>
              <select
                value={ordersPerPage}
                onChange={(e) => setOrdersPerPage(Number(e.target.value))}
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
        </div>

        {/* Clear Filters Button */}
        {(dateFrom || dateTo || statusFilter || sortBy !== 'date' || sortOrder !== 'desc') && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setStatusFilter('');
                setSortBy('date');
                setSortOrder('desc');
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {filteredOrders.filter(o => o.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Processing</p>
              <p className="text-2xl font-bold text-blue-900">
                {filteredOrders.filter(o => o.status === 'processing').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredOrders.filter(o => o.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-red-600 font-medium">Cancelled</p>
              <p className="text-2xl font-bold text-red-900">
                {filteredOrders.filter(o => o.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No orders found</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Order Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Shipping Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border border-gray-200 font-bold text-gray-900">#{order.id}</td>
                      <td className="px-4 py-3 border border-gray-200 font-bold text-gray-900">#{order.user_id}</td>
                      <td className="px-4 py-3 border border-gray-200 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 font-bold text-gray-900 whitespace-nowrap">
                        IDR {formatIDR(order.total_amount)}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700">
                        {order.items.map((item, idx) => (
                          <div key={item.id}>
                            {item.product_name} (x{item.quantity})
                            {idx < order.items.length - 1 && ', '}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-sm text-gray-700">
                        {order.shipping_address || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {updatingOrderId === order.id ? (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase ${getStatusColor(order.status)}`}>
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase ${getStatusColor(order.status)} border-0 cursor-pointer`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-8">
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
                Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
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
        </>
      )}
    </div>
  );
}
