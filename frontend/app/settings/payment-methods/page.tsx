'use client';

import { CreditCard, Plus } from 'lucide-react';

export default function PaymentMethodsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods saved</h3>
        <p className="text-gray-600 mb-6">Add your payment methods for faster checkout</p>
        <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
          Add Payment Method
        </button>
      </div>
    </div>
  );
}
