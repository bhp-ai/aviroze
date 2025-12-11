'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { paymentService } from '@/lib/services/payments';
import { useCart } from '@/contexts/CartContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const hasVerified = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasVerified.current) {
      return;
    }

    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      hasVerified.current = true;
      return;
    }

    // Verify payment status
    const verifyPayment = async () => {
      try {
        const result = await paymentService.getSessionStatus(sessionId);

        if (result.status === 'paid') {
          setStatus('success');
          setCustomerEmail(result.customer_email);
          // Clear the cart after successful payment
          clearCart();
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Failed to verify payment:', error);
        setStatus('error');
      } finally {
        hasVerified.current = true;
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't verify your payment. Please contact support if you believe this is an error.
          </p>
          <div className="space-y-3">
            <Link
              href="/cart"
              className="block w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Back to Cart
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. A confirmation email has been sent to{' '}
          <span className="font-medium text-gray-900">{customerEmail}</span>
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">
            What's Next?
          </h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You'll receive an order confirmation email shortly</li>
            <li>• Track your order status in your account</li>
            <li>• Your items will be shipped within 2-3 business days</li>
          </ul>
        </div>
        <div className="space-y-3">
          <Link
            href="/products"
            className="block w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-300 text-gray-700 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-16 h-16 animate-spin text-gray-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
