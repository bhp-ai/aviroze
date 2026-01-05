'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Heart, Star, User, Share2 } from 'lucide-react';
import { productsService, Product } from '@/lib/services/products';
import { commentsService, Comment, CommentCreate } from '@/lib/services/comments';
import { authService } from '@/lib/services/auth';
import { wishlistService } from '@/lib/services/wishlist';
import { ordersService } from '@/lib/services/orders';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useProductMedia } from '@/contexts/ProductMediaContext';
import { formatIDR, calculateDiscountedPrice } from '@/lib/utils/currency';
import CustomVideoPlayer from '@/components/CustomVideoPlayer';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get product ID from query parameter, fallback to parsing slug as ID
  const productId = searchParams.get('id')
    ? parseInt(searchParams.get('id')!)
    : parseInt(params.slug as string);

  const { addToCart } = useCart();
  const toast = useToast();
  const { getCachedProduct, cacheProduct, getImagesByColor } = useProductMedia();

  const [product, setProduct] = useState<Product | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Wishlist state
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Purchase verification state
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  useEffect(() => {
    fetchProduct();
    fetchComments();
    checkUser();
    checkWishlistStatus();
    checkPurchaseStatus();
  }, [productId]);

  // Removed useEffect for color changes - now handled directly in handleColorChange

  const checkUser = () => {
    const user = authService.getUser();
    setCurrentUser(user);
  };

  const checkWishlistStatus = async () => {
    if (!authService.isAuthenticated()) {
      setIsInWishlist(false);
      return;
    }

    try {
      const inWishlist = await wishlistService.check(productId);
      setIsInWishlist(inWishlist);
    } catch (error) {
      // User might not be logged in or other error
      setIsInWishlist(false);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!authService.isAuthenticated()) {
      setHasPurchased(false);
      setCheckingPurchase(false);
      return;
    }

    try {
      setCheckingPurchase(true);
      const purchased = await ordersService.hasPurchasedProduct(productId);
      setHasPurchased(purchased);
    } catch (error) {
      setHasPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all images without color filter to get complete data
      const data = await productsService.getById(productId);

      // Cache all images if not already cached
      const cached = getCachedProduct(productId);
      if (!cached && data.images && data.images.length > 0) {
        cacheProduct(productId, data.images, data.colors || []);
      }

      // Set default color and filter images
      if (data.colors && data.colors.length > 0) {
        const firstColor = data.colors[0];
        setSelectedColor(firstColor);

        // Filter images by first color
        const allImages = cached ? cached.allImages : data.images;
        const filteredImages = allImages.filter(img =>
          !img.color || img.color.toLowerCase() === firstColor.toLowerCase()
        ).sort((a, b) => {
          const aIsMedia = a.media_type === 'video' || a.media_type === 'gif';
          const bIsMedia = b.media_type === 'video' || b.media_type === 'gif';
          if (aIsMedia && !bIsMedia) return -1;
          if (!aIsMedia && bIsMedia) return 1;
          return a.display_order - b.display_order;
        });

        setProduct({
          ...data,
          images: filteredImages.length > 0 ? filteredImages : data.images
        });
      } else {
        // No colors, show all images
        setProduct(data);
      }

      // Auto-select first size if available
      if (data.sizes && data.sizes.length > 0) {
        setSelectedSize(data.sizes[0]);
      } else if (data.variants && data.variants.length > 0) {
        const firstSize = data.variants[0].size;
        if (firstSize) {
          setSelectedSize(firstSize);
        }
      }
    } catch (err: any) {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await commentsService.getAll(productId);
      setComments(data);
    } catch (err: any) {
    }
  };

  const handleColorChange = (color: string) => {
    // Immediately filter and update images from cache
    const filteredImages = getImagesByColor(productId, color);

    if (product && filteredImages.length > 0) {
      setProduct({
        ...product,
        images: filteredImages
      });
      setSelectedImageIndex(0);
    }

    setSelectedColor(color);
  };

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;

    // Check if user is logged in FIRST
    if (!currentUser) {
      toast.warning('Please login to add items to cart');
      return;
    }

    // Check if color is required and not selected
    const hasColors = (product.colors && product.colors.length > 0) ||
                      (product.variants && product.variants.some(v => v.color));
    if (hasColors && !selectedColor) {
      toast.error('Please select a color');
      return;
    }

    // Check if size is required and not selected
    const hasSizes = (product.sizes && product.sizes.length > 0) ||
                     (product.variants && product.variants.length > 0);
    if (hasSizes && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    setAddingToCart(true);
    const result = addToCart(product, quantity, selectedSize || undefined, selectedColor || undefined);

    if (result === false) {
      // User not logged in (backup check)
      toast.warning('Please login to add items to cart');
      setAddingToCart(false);
    } else {
      // Successfully added
      toast.success(`Added ${quantity} item(s) to cart!`);

      // Reset quantity to 1 after adding
      setQuantity(1);

      // Show feedback
      setTimeout(() => {
        setAddingToCart(false);
      }, 1000);
    }
  };

  const handleAddToWishlist = async () => {
    if (!currentUser) {
      toast.warning('Please login to add items to wishlist');
      return;
    }

    try {
      setWishlistLoading(true);

      if (isInWishlist) {
        // Remove from wishlist
        await wishlistService.remove(productId);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        // Add to wishlist
        await wishlistService.add(productId);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please login to leave a review');
      return;
    }
    if (!rating) {
      alert('Please select a rating');
      return;
    }

    try {
      setSubmittingComment(true);
      const newComment = await commentsService.create({
        product_id: productId,
        rating,
        comment: commentText,
      });
      setComments([newComment, ...comments]);
      setCommentText('');
      setRating(0);
    } catch (err: any) {
      alert('Failed to submit review');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link href="/products" className="text-sm hover:underline">
          Back to products
        </Link>
      </div>
    );
  }

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={interactive ? 'cursor-pointer' : ''}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (interactive ? (hoverRating || rating) : rating)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = comments.length > 0
    ? (comments.reduce((sum, c) => sum + c.rating, 0) / comments.length).toFixed(1)
    : '0.0';

  const discountedPrice = calculateDiscountedPrice(product.price, product.discount);
  const discountPercentage = product.discount?.enabled && product.discount?.type === 'percentage' ? product.discount.value : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <a
          href="/"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Home
        </a>
        <span className="mx-2 text-gray-400">/</span>
        <a
          href="/products"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Products
        </a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12 mb-12">
        {/* Media Gallery */}
        <div>
          <div className="relative aspect-[3/4] bg-gray-100 mb-4">
            {product.images && product.images.length > 0 ? (
              <>
                {product.images[selectedImageIndex].media_type === 'video' ? (
                  <CustomVideoPlayer
                    src={product.images[selectedImageIndex].url}
                    className="w-full h-full"
                  />
                ) : product.images[selectedImageIndex].media_type === 'gif' ? (
                  <img
                    src={product.images[selectedImageIndex].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={product.images[selectedImageIndex].url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <ShoppingBag className="w-16 h-16 text-gray-400" />
              </div>
            )}
            {/* Discount Badge */}
            {discountPercentage && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 text-sm font-bold z-10">
                -{discountPercentage}% OFF
              </div>
            )}
          </div>

          {/* Media Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 border-2 rounded overflow-hidden ${
                    selectedImageIndex === idx ? 'border-gray-900' : 'border-gray-200'
                  }`}
                >
                  {img.media_type === 'video' ? (
                    <video
                      src={img.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : img.media_type === 'gif' ? (
                    <img
                      src={img.url}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={img.url}
                      alt={`${product.name} ${idx + 1}`}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  )}
                  {/* Media type indicator */}
                  {(img.media_type === 'video' || img.media_type === 'gif') && (
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                      {img.media_type === 'video' ? '▶' : 'GIF'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {renderStars(parseFloat(averageRating))}
              <span className="text-sm text-gray-600">
                {averageRating} ({comments.length} {comments.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
          <div className="mb-6">
            {discountedPrice ? (
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-red-600">
                  IDR {formatIDR(discountedPrice)}
                </p>
                <p className="text-xl text-gray-400 line-through">
                  IDR {formatIDR(product.price)}
                </p>
              </div>
            ) : (
              <p className="text-2xl text-gray-900">
                IDR {formatIDR(product.price)}
              </p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Color Selection */}
          {(() => {
            // Get available colors from either product.colors or extract from variants
            const availableColors = product.colors && product.colors.length > 0
              ? product.colors
              : product.variants && product.variants.length > 0
                ? [...new Set(product.variants.map(v => v.color).filter(c => c))]
                : [];

            return availableColors.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm uppercase tracking-widest text-gray-600 mb-3 text-xs">
                  COLOR
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableColors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => handleColorChange(color)}
                      className={`flex items-center gap-2 px-4 py-2 border transition-all text-sm ${
                        selectedColor === color
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Size Selection */}
          {(() => {
            // Get available sizes from either product.sizes or extract from variants
            const availableSizes = product.sizes && product.sizes.length > 0
              ? product.sizes
              : product.variants && product.variants.length > 0
                ? [...new Set(product.variants.map(v => v.size))]
                : [];

            return availableSizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm uppercase tracking-widest text-gray-600 text-xs">
                    SIZE
                  </label>
                  <Link href="#size-guide" className="text-xs underline text-gray-600 hover:text-foreground">
                    Size Guide
                  </Link>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {availableSizes.map((size, index) => {
                    // Check if this size is in stock (if using variants)
                    const isInStock = !product.variants || product.variants.length === 0 ||
                      product.variants.some(v => v.size === size && v.quantity > 0);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedSize(size)}
                        disabled={!isInStock}
                        className={`px-6 py-2 border transition-all text-sm ${
                          selectedSize === size
                            ? 'border-foreground bg-foreground/5'
                            : 'border-border hover:border-foreground/50'
                        } ${!isInStock ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm uppercase tracking-widest text-gray-600 mb-3 text-xs">
              QUANTITY
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addingToCart}
              className="flex-1 bg-foreground text-background px-6 py-3 uppercase text-sm font-medium tracking-wider hover:bg-foreground/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {addingToCart ? 'ADDED!' : product.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
            </button>
            <button
              onClick={handleAddToWishlist}
              disabled={wishlistLoading}
              className={`border px-4 py-3 hover:border-foreground transition-colors ${
                isInWishlist ? 'border-red-500 bg-red-50' : 'border-border'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    text: product.description,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard!');
                }
              }}
              className="border border-border px-4 py-3 hover:border-foreground transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Product Details */}
          <div className="border-t border-border pt-6 mt-8">
            <h3 className="text-sm uppercase tracking-widest text-gray-600 mb-4">
              Product Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 min-w-[80px]">Category:</span>
                <Link
                  href={`/products?category=${encodeURIComponent(product.category)}`}
                  className="px-3 py-1 border border-gray-300 rounded-md text-foreground hover:border-foreground hover:bg-foreground/5 transition-all font-medium"
                >
                  {product.category}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 min-w-[80px]">Stock:</span>
                <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </span>
              </div>
            </div>
          </div>

          {/* Size Guide */}
          {product.size_guide && product.size_guide.length > 0 && (
            <div className="border-t border-border pt-6 mt-8">
              <h3 className="text-sm uppercase tracking-widest text-gray-600 mb-4">
                Size Guide
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Size</th>
                      {Object.keys(product.size_guide[0])
                        .filter(key => key !== 'size')
                        .map((key) => (
                          <th key={key} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.size_guide.map((entry, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">{entry.size}</td>
                        {Object.keys(entry)
                          .filter(key => key !== 'size')
                          .map((key) => (
                            <td key={key} className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                              {entry[key] || '-'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">All measurements are in inches</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-gray-200 pt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>

        {/* Write Review Form */}
        {currentUser ? (
          checkingPurchase ? (
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-center">
              <p className="text-gray-600">Checking purchase history...</p>
            </div>
          ) : !hasPurchased ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">
                    Purchase Required to Review
                  </h3>
                  <p className="text-sm text-amber-800">
                    You need to purchase and receive this product before you can write a review. This helps ensure authentic feedback from verified buyers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Write a Review</h3>
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Rating
                  </label>
                  {renderStars(rating, true)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                    placeholder="Share your experience with this product..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingComment || !rating}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-center">
            <p className="text-gray-600">
              <Link href="/login" className="text-gray-900 hover:underline font-medium">
                Login
              </Link>{' '}
              to write a review
            </p>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{comment.username}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-2">{renderStars(comment.rating)}</div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
