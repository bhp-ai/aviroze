'use client';

import { useState } from 'react';
import { Bell, Mail, Smartphone, ShoppingBag, Tag, Package } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: {
      orderUpdates: true,
      promotions: true,
      newsletters: false,
      productRestock: true,
    },
    pushNotifications: {
      orderShipped: true,
      orderDelivered: true,
      salesAndOffers: false,
    },
  });

  const handleToggle = (category: 'emailNotifications' | 'pushNotifications', key: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]],
      },
    }));
  };

  const handleSave = () => {
    showToast('Notification preferences saved successfully', 'success');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <NotificationToggle
              icon={Package}
              label="Order Updates"
              description="Get notified about your order status, shipping, and delivery"
              checked={settings.emailNotifications.orderUpdates}
              onChange={() => handleToggle('emailNotifications', 'orderUpdates')}
            />
            <NotificationToggle
              icon={Tag}
              label="Promotions & Offers"
              description="Receive exclusive deals and special offers"
              checked={settings.emailNotifications.promotions}
              onChange={() => handleToggle('emailNotifications', 'promotions')}
            />
            <NotificationToggle
              icon={Bell}
              label="Newsletters"
              description="Weekly newsletters with new arrivals and fashion tips"
              checked={settings.emailNotifications.newsletters}
              onChange={() => handleToggle('emailNotifications', 'newsletters')}
            />
            <NotificationToggle
              icon={ShoppingBag}
              label="Product Restock Alerts"
              description="Get notified when out-of-stock items are available"
              checked={settings.emailNotifications.productRestock}
              onChange={() => handleToggle('emailNotifications', 'productRestock')}
            />
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <NotificationToggle
              icon={Package}
              label="Order Shipped"
              description="Instant notification when your order is shipped"
              checked={settings.pushNotifications.orderShipped}
              onChange={() => handleToggle('pushNotifications', 'orderShipped')}
            />
            <NotificationToggle
              icon={Package}
              label="Order Delivered"
              description="Get notified when your package is delivered"
              checked={settings.pushNotifications.orderDelivered}
              onChange={() => handleToggle('pushNotifications', 'orderDelivered')}
            />
            <NotificationToggle
              icon={Tag}
              label="Flash Sales & Limited Offers"
              description="Be the first to know about time-limited deals"
              checked={settings.pushNotifications.salesAndOffers}
              onChange={() => handleToggle('pushNotifications', 'salesAndOffers')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
      </label>
    </div>
  );
}
