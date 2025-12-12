'use client';

import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Eye, TrendingUp, Activity, ShoppingCart } from 'lucide-react';
import { logsService, OrderLog, UserActivityLog, OrderLogStats, UserActivityLogStats } from '@/lib/services/logs';
import { exportToCSV, formatDateForCSV } from '@/lib/utils/csv-export';

type TabType = 'orders' | 'activities';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [orderStats, setOrderStats] = useState<OrderLogStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [activityStats, setActivityStats] = useState<UserActivityLogStats | null>(null);
  const [page, setPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    setPage(1);
    if (activeTab === 'orders') {
      fetchOrderLogs();
      fetchOrderStats();
    } else {
      fetchActivityLogs();
      fetchActivityStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrderLogs();
    else fetchActivityLogs();
  }, [page]);

  const fetchOrderLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await logsService.orders.getAll({ skip: (page - 1) * logsPerPage, limit: logsPerPage });
      setOrderLogs(data);
    } catch (err: any) {
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const stats = await logsService.orders.getStats(30);
      setOrderStats(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await logsService.activities.getAll({ skip: (page - 1) * logsPerPage, limit: logsPerPage });
      setActivityLogs(data);
    } catch (err: any) {
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const stats = await logsService.activities.getStats(30);
      setActivityStats(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'orders') {
      const csvData = orderLogs.map(log => ({
        id: log.id, order_id: log.order_id, action: log.action,
        user: log.user_username || 'System', order_status: log.order_status || '-',
        payment_status: log.payment_status || '-', amount: log.total_amount || '-',
        created_at: log.created_at
      }));
      exportToCSV(csvData, [
        { header: 'ID', key: 'id' }, { header: 'Order', key: 'order_id' },
        { header: 'Action', key: 'action' }, { header: 'User', key: 'user' },
        { header: 'Order Status', key: 'order_status' }, { header: 'Payment', key: 'payment_status' },
        { header: 'Amount', key: 'amount' }, { header: 'Date', key: 'created_at', format: formatDateForCSV }
      ], `order_logs_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const csvData = activityLogs.map(log => ({
        id: log.id, user: log.user_username || 'Anonymous', activity: log.activity_type,
        resource: log.resource_type || '-', ip: log.ip_address || '-', created_at: log.created_at
      }));
      exportToCSV(csvData, [
        { header: 'ID', key: 'id' }, { header: 'User', key: 'user' },
        { header: 'Activity', key: 'activity' }, { header: 'Resource', key: 'resource' },
        { header: 'IP', key: 'ip' }, { header: 'Date', key: 'created_at', format: formatDateForCSV }
      ], `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'created': 'bg-green-100 text-green-800', 'updated': 'bg-blue-100 text-blue-800',
      'status_changed': 'bg-yellow-100 text-yellow-800', 'cancelled': 'bg-red-100 text-red-800',
      'login': 'bg-green-100 text-green-800', 'logout': 'bg-gray-100 text-gray-800',
      'product_view': 'bg-indigo-100 text-indigo-800', 'cart_add': 'bg-blue-100 text-blue-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const currentLogs = activeTab === 'orders' ? orderLogs : activityLogs;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
        <p className="text-gray-600 mt-2">Monitor transactions and user activities (optimized for high volume)</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'orders' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Transaction & Orders
            {orderStats && <span className="text-xs">({orderStats.total_logs})</span>}
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'activities' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            User Activity
            {activityStats && <span className="text-xs">({activityStats.total_activities})</span>}
          </button>
        </div>
      </div>

      {/* Stats */}
      {activeTab === 'orders' && orderStats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Total Logs</p>
            <p className="text-2xl font-bold mt-1">{orderStats.total_logs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Recent (30d)</p>
            <p className="text-2xl font-bold mt-1">{orderStats.recent_activity_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Orders Tracked</p>
            <p className="text-2xl font-bold mt-1">{orderStats.total_orders_tracked}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-2">Top Actions</p>
            {Object.entries(orderStats.logs_by_action).sort(([,a],[,b]) => b-a).slice(0,3).map(([a,c]) => (
              <div key={a} className="flex justify-between text-xs">
                <span>{a.replace('_',' ')}</span><span className="font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activities' && activityStats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Total Activities</p>
            <p className="text-2xl font-bold mt-1">{activityStats.total_activities}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Recent (30d)</p>
            <p className="text-2xl font-bold mt-1">{activityStats.recent_activity_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Unique Users</p>
            <p className="text-2xl font-bold mt-1">{activityStats.unique_users}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-2">Top Activities</p>
            {Object.entries(activityStats.activities_by_type).sort(([,a],[,b]) => b-a).slice(0,3).map(([a,c]) => (
              <div key={a} className="flex justify-between text-xs">
                <span>{a.replace('_',' ')}</span><span className="font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mb-6 items-center">
        <button onClick={handleExportCSV} disabled={currentLogs.length===0} className="inline-flex items-center gap-2 border px-6 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <Download className="w-5 h-5" />Export CSV
        </button>
        <div className="text-sm text-gray-600">
          Showing {currentLogs.length} logs (max 50 per page for performance)
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                {activeTab === 'orders' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL/Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeTab === 'orders' && orderLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">#{log.id}</td>
                  <td className="px-6 py-4 text-sm">#{log.order_id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getActionBadge(log.action)}`}>
                      {log.action.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {log.order_status && <div>Order: {log.order_status}</div>}
                    {log.payment_status && <div>Pay: {log.payment_status}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">{log.total_amount ? `$${log.total_amount.toFixed(2)}` : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {activeTab === 'activities' && activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">#{log.id}</td>
                  <td className="px-6 py-4 text-sm">{log.user_username || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getActionBadge(log.activity_type)}`}>
                      {log.activity_type.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {log.details?.url ? (
                      <div className="max-w-xs truncate" title={log.details.url}>
                        {log.details.path || log.details.url}
                      </div>
                    ) : (log.resource_type || '-')}
                  </td>
                  <td className="px-6 py-4 text-sm">{log.ip_address || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && currentLogs.length === 0 && <div className="text-center py-12 text-gray-500">No logs found</div>}
        {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}
      </div>

      {/* Pagination */}
      {currentLogs.length === logsPerPage && (
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => setPage(p => p-1)} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button onClick={() => setPage(p => p+1)} className="px-4 py-2 border rounded-lg flex items-center gap-1">
            Next<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
