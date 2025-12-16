'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { productsService, Product } from '@/lib/services/products';
import { Search, Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Read category from URL on mount
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategories([categoryFromUrl]);
    }
  }, [searchParams]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await productsService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products when category or search changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        setPage(1);

        // Fetch all products first
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        const data = await productsService.getAll(params);

        // Filter by multiple categories on client side
        let filteredProducts = data;
        if (selectedCategories.length > 0) {
          filteredProducts = data.filter(product =>
            selectedCategories.includes(product.category)
          );
        }

        setAllProducts(filteredProducts);
        setDisplayedProducts(filteredProducts.slice(0, ITEMS_PER_PAGE));
        setHasMore(filteredProducts.length > ITEMS_PER_PAGE);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategories, searchQuery]);

  // Load more products when page changes
  useEffect(() => {
    if (page === 1) return; // Skip initial load

    setLoadingMore(true);
    const startIndex = 0;
    const endIndex = page * ITEMS_PER_PAGE;
    const newProducts = allProducts.slice(startIndex, endIndex);

    setDisplayedProducts(newProducts);
    setHasMore(endIndex < allProducts.length);
    setLoadingMore(false);
  }, [page, allProducts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Remove category if already selected
        return prev.filter(c => c !== category);
      } else {
        // Add category to selection
        return [...prev, category];
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
          All Products
        </h1>
        <p className="text-gray-600">
          Discover our complete collection of premium professional fashion
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-8 pb-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategories([])}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              selectedCategories.length === 0
                ? 'bg-black text-white'
                : 'border border-gray-300 hover:border-gray-900'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                selectedCategories.includes(category)
                  ? 'bg-black text-white'
                  : 'border border-gray-300 hover:border-gray-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 mb-3 rounded"></div>
              <div className="h-4 bg-gray-200 mb-2 w-3/4 rounded"></div>
              <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
            </div>
          ))}
        </div>
      ) : displayedProducts.length > 0 ? (
        <>
          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {displayedProducts.length} of {allProducts.length} {allProducts.length === 1 ? 'product' : 'products'}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Intersection Observer Target */}
          <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
            {loadingMore && hasMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading more products...</span>
              </div>
            )}
          </div>

          {/* End of Results */}
          {!hasMore && displayedProducts.length > 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              You've reached the end of the list
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No products found</p>
          <p className="text-gray-400 text-sm">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </div>
  );
}
