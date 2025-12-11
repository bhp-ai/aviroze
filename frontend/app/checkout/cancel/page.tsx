'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Need Help?
          </h2>
          <p className="text-sm text-gray-600">
            If you encountered any issues during checkout, please don't hesitate to contact our support team.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/cart"
            className="block w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Return to Cart
          </Link>
          <Link
            href="/products"
            className="block w-full border border-gray-300 text-gray-700 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
