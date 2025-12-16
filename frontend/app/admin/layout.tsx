'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, LogOut, Menu, X, Package, MessageSquare, ShoppingBag, FileText } from 'lucide-react';
import { authService } from '@/lib/services/auth';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Track all admin page visits
  usePageTracking();

  useEffect(() => {
    // Check if user is logged in, session is valid, and user is admin
    const checkUser = () => {
      const userData = authService.getUser();
      if (userData) {
        if (userData.role === 'admin') {
          setUser(userData);
        } else {
          router.push('/');
        }
      } else {
        router.push('/login');
      }
    };

    checkUser();

    // Check session expiration every minute
    const intervalId = setInterval(checkUser, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [router]);

  const handleLogout = () => {
    authService.logout();
  };

  if (!user) {
    return null; // or loading spinner
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Logs', href: '/admin/logs', icon: FileText },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button - Only show when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white w-64 transform transition-transform duration-300 ease-in-out z-40 flex flex-col overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold">AVIROZE</h1>
            <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
          </div>
          {/* Close button inside sidebar */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto overscroll-contain">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white border-l-4 border-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <div className="mb-4">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="font-medium">{user.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors rounded"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 p-8 pt-20 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
