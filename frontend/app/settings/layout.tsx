'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bell, Shield, CreditCard, MapPin, Heart, Package } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Account',
      href: '/settings',
      icon: User,
      description: 'Manage your account information',
    },
    {
      name: 'Notifications',
      href: '/settings/notifications',
      icon: Bell,
      description: 'Email and notification preferences',
    },
    {
      name: 'Security',
      href: '/settings/security',
      icon: Shield,
      description: 'Password and security settings',
    },
    {
      name: 'Addresses',
      href: '/settings/addresses',
      icon: MapPin,
      description: 'Manage shipping addresses',
    },
    {
      name: 'Payment Methods',
      href: '/settings/payment-methods',
      icon: CreditCard,
      description: 'Saved payment methods',
    },
    {
      name: 'Orders',
      href: '/settings/orders',
      icon: Package,
      description: 'View order history',
    },
    {
      name: 'Wishlist',
      href: '/settings/wishlist',
      icon: Heart,
      description: 'Your saved items',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </p>
                        <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
