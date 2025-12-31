'use client';

import { useEffect, useState } from 'react';
import { Heart, ShoppingCart, Trash2, ExternalLink } from 'lucide-react';
import { wishlistService, WishlistItem } from '@/lib/services/wishlist';
import { productsService, Product } from '@/lib/services/products';
import { useToast } from '@/contexts/ToastContext';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils/currency';

interface WishlistProductItem extends WishlistItem {
  product?: Product;
}

export default function WishlistPage() {
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState<WishlistProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const items = await wishlistService.getAll();

      // Fetch product details for each wishlist item
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          try {
            const product = await productsService.getById(item.product_id);
            return { ...item, product };
          } catch (error) {
            console.error(`Failed to fetch product ${item.product_id}`, error);
            return item;
          }
        })
      );

      setWishlistItems(itemsWithProducts);
    } catch (error) {
      showToast('Failed to load wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await wishlistService.remove(productId);
      showToast('Removed from wishlist', 'success');
      setWishlistItems(wishlistItems.filter(item => item.product_id !== productId));
    } catch (error) {
      showToast('Failed to remove from wishlist', 'error');
    }
  };

  const handleAddToCart = (product: Product) => {
    const defaultSize = product.sizes?.[0] || 'One Size';
    const defaultColor = product.colors?.[0];

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: defaultSize,
      color: defaultColor,
      image: product.images?.[0]?.url || '',
    });

    showToast('Added to cart', 'success');
  };

  const handleViewProduct = (productId: number, productName: string) => {
    const slug = productName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/products/${slug}?id=${productId}`);
  };

  const calculateFinalPrice = (product: Product): number => {
    if (!product.discount?.enabled) return product.price;

    if (product.discount.type === 'percentage') {
      return product.price * (1 - (product.discount.value || 0) / 100);
    } else if (product.discount.type === 'fixed') {
      return product.price - (product.discount.value || 0);
    }

    return product.price;
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Wishlist</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <LoadingSpinner size="lg" text="Loading wishlist..." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
        <span className="text-sm text-gray-600">
          {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-600 mb-6">Save items you love to buy them later</p>
          <button
            onClick={() => router.push('/products')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => {
            if (!item.product) return null;

            const product = item.product;
            const finalPrice = calculateFinalPrice(product);
            const hasDiscount = product.discount?.enabled && finalPrice < product.price;

            // Get the first image that is of type 'image' (not video or gif)
            const productImage = product.images?.find(img => img.media_type === 'image') || product.images?.[0];

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square bg-gray-100">
                  {productImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productImage.url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      {product.discount?.type === 'percentage'
                        ? `-${product.discount.value}%`
                        : `-${formatCurrency(product.discount?.value || 0)}`
                      }
                    </div>
                  )}

                  <button
                    onClick={() => handleRemove(product.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-colors shadow-md"
                    title="Remove from wishlist"
                  >
                    <Heart className="w-5 h-5 text-red-600 fill-red-600" />
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                    {product.category}
                  </p>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(finalPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>

                  {product.stock === 0 ? (
                    <div className="text-sm text-red-600 font-medium mb-3">
                      Out of stock
                    </div>
                  ) : product.stock < 10 ? (
                    <div className="text-sm text-orange-600 font-medium mb-3">
                      Only {product.stock} left in stock
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleViewProduct(product.id, product.name)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="View product"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
