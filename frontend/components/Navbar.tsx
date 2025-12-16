'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, Search, User, LogOut, Package, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { authService } from '@/lib/services/auth';
import { productsService, Product } from '@/lib/services/products';
import { formatIDR, calculateDiscountedPrice } from '@/lib/utils/currency';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { getCartCount } = useCart();

  useEffect(() => {
    // Check if user is logged in and validate session
    const checkUser = () => {
      const userData = authService.getUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    checkUser();

    // Listen for login events
    window.addEventListener('userLogin', checkUser);

    // Check session expiration every minute
    const intervalId = setInterval(checkUser, 60000);

    return () => {
      window.removeEventListener('userLogin', checkUser);
      clearInterval(intervalId);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    if (isUserMenuOpen || showResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, showResults]);

  // Search products with debounce
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await productsService.getAll({ search: searchQuery });
        setSearchResults(results.slice(0, 5)); // Limit to 5 results
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsUserMenuOpen(false);
  };

  const handleViewAll = () => {
    router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    setShowResults(false);
    setIsSearchOpen(false);
  };

  const handleProductClick = () => {
    setShowResults(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <nav className="sticky top-0 z-50 bg-navbar border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
            AVIROZE
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Shop
            </Link>
            <Link href="/collections" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Collections
            </Link>
            <Link href="/about" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              About
            </Link>
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>

            {/* User Account - Show avatar if logged in, icon if not */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-foreground/5 rounded-full transition-colors"
                >
                  <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-foreground">
                    {user.username}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border border-border shadow-lg z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{user.username}</p>
                        <p className="text-xs text-foreground/60 capitalize">{user.role}</p>
                      </div>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/orders"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Package className="w-4 h-4" />
                        <span>My Orders</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-foreground/5 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                <User className="w-5 h-5 text-foreground" />
              </Link>
            )}

            <Link href="/cart" className="p-2 hover:bg-foreground/5 rounded-full transition-colors relative">
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {getCartCount() > 0 && (
                <span className="absolute top-0 right-0 bg-foreground text-background text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {getCartCount()}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          className={`overflow-visible transition-all duration-300 ease-in-out ${
            isSearchOpen ? 'max-h-[500px] opacity-100 pointer-events-auto' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="py-4 relative" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-border focus:outline-none focus:border-foreground transition-colors text-sm"
                autoFocus={isSearchOpen}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2">
                <Search className="w-5 h-5 text-foreground/40" />
              </button>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-lg max-h-96 overflow-y-auto z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-foreground/60">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((product) => {
                      const discountedPrice = calculateDiscountedPrice(product.price, product.discount);
                      return (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}`}
                          onClick={handleProductClick}
                          className="flex items-center gap-3 p-3 hover:bg-foreground/5 transition-colors border-b border-border last:border-b-0"
                        >
                          {/* Product Image */}
                          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100">
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              {discountedPrice ? (
                                <>
                                  <span className="text-sm font-semibold text-red-600">
                                    IDR {formatIDR(discountedPrice)}
                                  </span>
                                  <span className="text-xs text-gray-400 line-through">
                                    IDR {formatIDR(product.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-foreground/80">
                                  IDR {formatIDR(product.price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {/* View All Button */}
                    <button
                      onClick={handleViewAll}
                      className="w-full p-3 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2 border-t border-border"
                    >
                      <span>View all results for "{searchQuery}"</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-foreground/60">
                    No products found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              <Link href="/products" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground">
                Shop
              </Link>
              <Link href="/collections" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground">
                Collections
              </Link>
              <Link href="/about" className="nav-link text-sm font-medium text-foreground/70 hover:text-foreground">
                About
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
