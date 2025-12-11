'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Product as OldProduct } from '@/types';
import { Product as ApiProduct } from '@/lib/services/products';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { ShoppingCart } from 'lucide-react';
import { formatIDR, calculateDiscountedPrice } from '@/lib/utils/currency';

interface ProductCardProps {
  product: OldProduct | ApiProduct;
}

// Type guard to check if product is API product
function isApiProduct(product: OldProduct | ApiProduct): product is ApiProduct {
  return 'stock' in product && typeof (product as any).id === 'number';
}

export default function ProductCard({ product }: ProductCardProps) {
  const isApi = isApiProduct(product);
  const { addToCart } = useCart();
  const toast = useToast();

  const productImage = isApi
    ? (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400x600?text=No+Image')
    : product.images[0];

  const productLink = isApi
    ? `/products/${product.id}`
    : `/products/${product.slug}`;

  const inStock = isApi ? product.stock > 0 : product.inStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling

    if (!inStock) return;

    if (isApi) {
      const result = addToCart(product, 1);

      if (result === false) {
        // User not logged in
        toast.warning('Please login to add items to cart');
      } else {
        // Successfully added
        toast.success('Added to cart!');
      }
    }
  };

  const apiDiscount = isApi && 'discount' in product ? product.discount : undefined;
  const discountedPrice = calculateDiscountedPrice(product.price, apiDiscount);
  const discountPercentage = apiDiscount?.enabled && apiDiscount?.type === 'percentage' ? apiDiscount.value : null;

  return (
    <div className="group relative">
      {/* Product Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-3">
        <Link href={productLink}>
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        </Link>

        {/* Discount Badge */}
        {discountPercentage && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 text-xs font-bold z-10">
            -{discountPercentage}%
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-900">Out of Stock</span>
          </div>
        )}

        {/* Add to Cart Button - Shows on hover */}
        {inStock && isApi && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={handleAddToCart}
              className="bg-white text-gray-900 px-4 py-2 text-xs font-medium flex items-center gap-2 shadow-lg hover:bg-gray-100"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <Link href={productLink}>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900 group-hover:underline">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            {discountedPrice ? (
              <>
                <p className="text-sm font-semibold text-red-600">
                  IDR {formatIDR(discountedPrice)}
                </p>
                <p className="text-xs text-gray-400 line-through">
                  IDR {formatIDR(product.price)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                IDR {formatIDR(product.price)}
              </p>
            )}
          </div>
          {product.colors && product.colors.length > 0 && (
            <div className="flex gap-1 mt-2">
              {product.colors.slice(0, 4).map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: color.toLowerCase() }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
