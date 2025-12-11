'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, Heart, Star, User } from 'lucide-react';
import { productsService, Product } from '@/lib/services/products';
import { commentsService, Comment, CommentCreate } from '@/lib/services/comments';
import { authService } from '@/lib/services/auth';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatIDR, calculateDiscountedPrice } from '@/lib/utils/currency';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.slug as string);
  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchComments();
    checkUser();
  }, [productId]);

  const checkUser = () => {
    const user = authService.getUser();
    setCurrentUser(user);
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productsService.getById(productId);
      setProduct(data);
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
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
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;

    setAddingToCart(true);
    const result = addToCart(product, quantity, undefined, selectedColor || undefined);

    if (result === false) {
      // User not logged in
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

  const handleAddToWishlist = () => {
    if (!currentUser) {
      toast.warning('Please login to add items to wishlist');
      return;
    }
    // TODO: Implement wishlist functionality
    toast.info('Wishlist feature coming soon!');
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
      console.error('Failed to submit comment:', err);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-600">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-gray-900">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12 mb-12">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-[3/4] bg-gray-100 mb-4">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[selectedImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
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

          {/* Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 border-2 rounded overflow-hidden ${
                    selectedImageIndex === idx ? 'border-gray-900' : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
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
          {product.colors && product.colors.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Available Colors
              </label>
              <div className="flex gap-2 flex-wrap">
                {product.colors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Quantity
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
              className="flex-1 bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {addingToCart ? 'Added!' : product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button
              onClick={handleAddToWishlist}
              className="border border-gray-300 px-4 py-3 hover:border-gray-900 transition-colors"
              title="Add to wishlist"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Product Details
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Category: {product.category}</li>
              <li>Stock: {product.stock} available</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-gray-200 pt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>

        {/* Write Review Form */}
        {currentUser ? (
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
