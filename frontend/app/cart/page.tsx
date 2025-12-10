'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const cartItems = items;
  const subtotal = getCartTotal();
  const shipping = subtotal > 0 ? 50000 : 0;
  const total = subtotal + shipping;

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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <div key={`${item.product.id}-${item.selectedSize || 'no-size'}-${item.selectedColor || 'no-color'}-${index}`} className="flex gap-4 p-4 border border-gray-200 rounded">
                <div className="relative w-24 h-32 bg-gray-100">
                  <Image
                    src={item.product.image || 'https://via.placeholder.com/200x300?text=No+Image'}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
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
                  <p className="text-sm font-medium text-gray-900">
                    IDR {item.product.price.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Subtotal: IDR {(item.product.price * item.quantity).toLocaleString('id-ID')}
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
            ))}
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
                  IDR {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  IDR {shipping.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold mb-6">
              <span>Total</span>
              <span>IDR {total.toLocaleString('id-ID')}</span>
            </div>
            <button className="w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors mb-3">
              Proceed to Checkout
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
