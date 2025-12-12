'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { ordersService, Order } from '@/lib/services/orders';
import { authService } from '@/lib/services/auth';
import { formatIDR } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';

export default function OrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(5);

  useEffect(() => {
    const user = authService.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
    loadOrders();
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ordersPerPage]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await ordersService.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to load orders',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Pagination calculations
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-gray-500">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Orders Yet</h1>
          <p className="text-gray-600 mb-8">
            You haven't placed any orders yet. Start shopping to see your orders here!
          </p>
          <Link
            href="/products"
            className="inline-block bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Per page:</span>
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

      <div className="space-y-6">
        {currentOrders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Order Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-gray-500">Order ID</p>
                    <p className="font-medium text-gray-900">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Order Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-medium text-gray-900">
                      IDR {formatIDR(order.total_amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="text-xs font-semibold uppercase">
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-6">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                      {item.product_image ? (
                        <Image
                          src={item.product_image}
                          alt={item.product_name}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        IDR {formatIDR(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        IDR {formatIDR(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Shipping Address
                  </h4>
                  <p className="text-sm text-gray-600">{order.shipping_address}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8">
        {/* Pagination Buttons */}
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
            Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, orders.length)} of {orders.length} orders
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
    </div>
  );
}
