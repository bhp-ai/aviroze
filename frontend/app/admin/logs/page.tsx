'use client';

import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Eye, TrendingUp, Activity, ShoppingCart, Search, Filter, X, Server } from 'lucide-react';
import { logsService, OrderLog, UserActivityLog, APIRequestLog, OrderLogStats, UserActivityLogStats, APIRequestLogStats, UserActivityLogFilters, APIRequestLogFilters } from '@/lib/services/logs';
import { exportToCSV, formatDateForCSV } from '@/lib/utils/csv-export';

type TabType = 'orders' | 'activities' | 'api-requests';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [orderStats, setOrderStats] = useState<OrderLogStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [activityStats, setActivityStats] = useState<UserActivityLogStats | null>(null);
  const [apiLogs, setApiLogs] = useState<APIRequestLog[]>([]);
  const [apiStats, setApiStats] = useState<APIRequestLogStats | null>(null);
  const [page, setPage] = useState(1);
  const logsPerPage = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setPage(1);
    if (activeTab === 'orders') {
      fetchOrderLogs();
      fetchOrderStats();
    } else if (activeTab === 'activities') {
      fetchActivityLogs();
      fetchActivityStats();
    } else {
      fetchApiLogs();
      fetchApiStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrderLogs();
    else if (activeTab === 'activities') fetchActivityLogs();
    else fetchApiLogs();
  }, [page, searchQuery, activityTypeFilter, ipFilter]);

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
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const filters: UserActivityLogFilters = {
        skip: (page - 1) * logsPerPage,
        limit: logsPerPage,
      };
      if (searchQuery) filters.search = searchQuery;
      if (activityTypeFilter) filters.activity_type = activityTypeFilter;
      if (ipFilter) filters.ip_address = ipFilter;

      const data = await logsService.activities.getAll(filters);
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
    }
  };

  const fetchApiLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await logsService.apiRequests.getAll({ skip: (page - 1) * logsPerPage, limit: logsPerPage });
      setApiLogs(data);
    } catch (err: any) {
      setError('Failed to load API logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiStats = async () => {
    try {
      const stats = await logsService.apiRequests.getStats(30);
      setApiStats(stats);
    } catch (err) {
    }
  };

  const handleExportCSV = () => {
    // Export filtered logs
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
      ], `order_logs_filtered_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const csvData = activityLogs.map(log => ({
        id: log.id, user: log.user_username || 'Anonymous', activity: log.activity_type,
        url: log.details?.url || '-', ip: log.ip_address || '-', created_at: log.created_at
      }));
      exportToCSV(csvData, [
        { header: 'ID', key: 'id' }, { header: 'User', key: 'user' },
        { header: 'Activity', key: 'activity' }, { header: 'URL', key: 'url' },
        { header: 'IP', key: 'ip' }, { header: 'Date', key: 'created_at', format: formatDateForCSV }
      ], `activity_logs_filtered_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActivityTypeFilter('');
    setIpFilter('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || activityTypeFilter || ipFilter;

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'created': 'bg-green-100 text-green-800', 'updated': 'bg-blue-100 text-blue-800',
      'status_changed': 'bg-yellow-100 text-yellow-800', 'cancelled': 'bg-red-100 text-red-800',
      'login': 'bg-green-100 text-green-800', 'logout': 'bg-gray-100 text-gray-800',
      'product_view': 'bg-indigo-100 text-indigo-800', 'cart_add': 'bg-blue-100 text-blue-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      'GET': 'bg-blue-100 text-blue-800',
      'POST': 'bg-green-100 text-green-800',
      'PUT': 'bg-yellow-100 text-yellow-800',
      'PATCH': 'bg-orange-100 text-orange-800',
      'DELETE': 'bg-red-100 text-red-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: number | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const currentLogs = activeTab === 'orders' ? orderLogs : activeTab === 'activities' ? activityLogs : apiLogs;

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
          <button
            onClick={() => setActiveTab('api-requests')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'api-requests' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="w-5 h-5" />
            API Requests
            {apiStats && <span className="text-xs">({apiStats.total_requests})</span>}
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

      {activeTab === 'api-requests' && apiStats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Total Requests</p>
            <p className="text-2xl font-bold mt-1">{apiStats.total_requests.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Recent (30d)</p>
            <p className="text-2xl font-bold mt-1">{apiStats.recent_requests_count.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Avg Response Time</p>
            <p className="text-2xl font-bold mt-1">{(apiStats.avg_response_time * 1000).toFixed(0)}ms</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-2">By Method</p>
            {Object.entries(apiStats.requests_by_method).sort(([,a],[,b]) => b-a).slice(0,3).map(([method,count]) => (
              <div key={method} className="flex justify-between text-xs">
                <span>{method}</span><span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex gap-4 items-start">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user, activity, IP, or description..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={currentLogs.length === 0}
            className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <select
                value={activityTypeFilter}
                onChange={(e) => { setActivityTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              >
                <option value="">All Types</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="product_view">Product View</option>
                <option value="cart_add">Cart Add</option>
                <option value="order_create">Order Create</option>
                <option value="admin_action">Admin Action</option>
                <option value="page_view">Page View</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
              <input
                type="text"
                placeholder="Filter by IP..."
                value={ipFilter}
                onChange={(e) => { setIpFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Search: {searchQuery}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {activityTypeFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Type: {activityTypeFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setActivityTypeFilter('')} />
              </span>
            )}
            {ipFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                IP: {ipFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setIpFilter('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {currentLogs.length} logs {hasActiveFilters && '(filtered)'}
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
                ) : activeTab === 'activities' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL/Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
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
              {activeTab === 'api-requests' && apiLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">#{log.id}</td>
                  <td className="px-6 py-4 text-sm">{log.user_username || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getMethodBadge(log.method)}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{log.path}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(log.status_code)}`}>
                      {log.status_code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{log.response_time ? `${(log.response_time * 1000).toFixed(0)}ms` : '-'}</td>
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
