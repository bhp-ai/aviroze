'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, Tag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatIDR, calculateDiscountedPrice, getFinalPrice } from '@/lib/utils/currency';
import { authService } from '@/lib/services/auth';
import { paymentService } from '@/lib/services/payments';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const router = useRouter();
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (!user) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleCheckout = async () => {
    setIsProcessingCheckout(true);
    try {
      // Prepare checkout items with only IDs and quantities (security: prices fetched on backend)
      const checkoutItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
      }));

      // Create checkout session
      const { checkout_url } = await paymentService.createCheckoutSession(checkoutItems);

      // Redirect to Stripe checkout
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to start checkout',
        'error'
      );
      setIsProcessingCheckout(false);
    }
  };

  const cartItems = items;
  const subtotal = getCartTotal();
  const shipping = subtotal > 0 ? 50000 : 0;
  const total = subtotal + shipping;

  // Calculate total savings
  const totalSavings = items.reduce((savings, item) => {
    const originalPrice = item.product.price;
    const finalPrice = getFinalPrice(item.product.price, item.product.discount);
    const itemSavings = (originalPrice - finalPrice) * item.quantity;
    return savings + itemSavings;
  }, 0);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Your cart is empty
          </h1>
          <p className="text-gray-600 mb-8">
            Add some items to get started
          </p>
          <Link
            href="/products"
            className="inline-block bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Shopping Cart</h1>

      {/* Discount Applied Banner */}
      {totalSavings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                Discounts Applied!
              </p>
              <p className="text-xs text-green-700">
                You're saving IDR {formatIDR(totalSavings)} on this order
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cartItems.map((item, index) => {
              const discountedPrice = calculateDiscountedPrice(item.product.price, item.product.discount);
              const finalPrice = getFinalPrice(item.product.price, item.product.discount);
              const itemSubtotal = finalPrice * item.quantity;

              return (
                <div key={`${item.product.id}-${item.selectedSize || 'no-size'}-${item.selectedColor || 'no-color'}-${index}`} className="flex gap-4 p-4 border border-gray-200 rounded">
                  <div className="relative w-24 h-32 bg-gray-100">
                    <Image
                      src={item.product.images?.[0] || 'https://via.placeholder.com/200x300?text=No+Image'}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                    {/* Discount Badge */}
                    {item.product.discount?.enabled && item.product.discount.type === 'percentage' && (
                      <div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 text-xs font-bold">
                        -{item.product.discount.value}%
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product.id}`}>
                      <h3 className="font-medium text-gray-900 mb-1 hover:underline">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.selectedSize && `Size: ${item.selectedSize}`}
                      {item.selectedSize && item.selectedColor && ' | '}
                      {item.selectedColor && `Color: ${item.selectedColor}`}
                    </p>
                    {discountedPrice ? (
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-red-600">
                          IDR {formatIDR(discountedPrice)}
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                          IDR {formatIDR(item.product.price)}
                        </p>
                        {item.product.discount?.enabled && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">
                            <Tag className="w-3 h-3" />
                            {item.product.discount.type === 'percentage'
                              ? `${item.product.discount.value}%`
                              : `${formatIDR(item.product.discount.value)}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        IDR {formatIDR(item.product.price)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Subtotal: IDR {formatIDR(itemSubtotal)}
                    </p>
                  </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove from cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 border border-gray-300 rounded">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 transition-colors"
                      disabled={item.quantity >= (item.product.stock || 99)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-gray-50 p-6 rounded-lg sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  IDR {formatIDR(subtotal)}
                </span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Total Discount
                  </span>
                  <span className="text-green-600 font-semibold">
                    -IDR {formatIDR(totalSavings)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  IDR {formatIDR(shipping)}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold mb-6">
              <span>Total</span>
              <span>IDR {formatIDR(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isProcessingCheckout}
              className="w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingCheckout ? 'Processing...' : 'Proceed to Checkout'}
            </button>
            <Link
              href="/products"
              className="block text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
