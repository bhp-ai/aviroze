'use client';

import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import BannerCarousel from '@/components/BannerCarousel';
import { productsService, Product } from '@/lib/services/products';
import { useState, useEffect } from 'react';

export default function Home() {
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [bestsellersData, newArrivalsData] = await Promise.all([
          productsService.getBestsellers(4),
          productsService.getNewArrivals(4),
        ]);
        setBestsellers(bestsellersData);
        setNewArrivals(newArrivalsData);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <>
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[650px]">
        {/* Full Width Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero-main.jpg"
            alt="Aviroze Collection"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Text Overlay */}
        <div className="relative h-full bg-gradient-to-r from-white/90 via-white/60 to-transparent flex">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-xl text-left py-12">
              <p className="text-xs tracking-[0.2em] mb-6 uppercase text-gray-800">
                New Collection
              </p>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-2">
                <span className="block text-gray-900">Timeless Elegance</span>
                <span className="block italic font-normal text-gray-800">for the Modern Woman</span>
              </h1>
              <p className="text-base text-gray-800 mb-8 mt-6 max-w-md">
                Discover our curated collection of sophisticated workwear designed for the confident professional.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-3.5 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  SHOP COLLECTION
                  <span className="text-lg">→</span>
                </Link>
                <Link
                  href="/about"
                  className="inline-block border-2 border-gray-900 text-gray-900 px-7 py-3.5 text-sm font-medium hover:bg-gray-900 hover:text-white transition-colors"
                >
                  OUR STORY
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Collection */}
      <section className="bg-[#faf8f5] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl mb-3">
              Shop by Collection
            </h2>
            <p className="text-gray-600">Curated selections for every occasion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Workwear Essentials */}
          <Link href="/collections/workwear" className="group relative aspect-[4/5] overflow-hidden">
            <Image
              src="/collection-workwear.jpg"
              alt="Workwear Essentials"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
              <h3 className="text-2xl font-bold mb-2">Workwear Essentials</h3>
              <p className="text-sm mb-4">Timeless pieces for the modern professional</p>
              <span className="text-sm underline">Explore Collection</span>
            </div>
          </Link>

          {/* Power Suiting */}
          <Link href="/collections/power-suiting" className="group relative aspect-[4/5] overflow-hidden">
            <Image
              src="/collection-suiting.jpg"
              alt="Power Suiting"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
              <h3 className="text-2xl font-bold mb-2">Power Suiting</h3>
              <p className="text-sm mb-4">Command the room with elegance</p>
              <span className="text-sm underline">Explore Collection</span>
            </div>
          </Link>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-[#f5f3ef] py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-3xl lg:text-4xl mb-2">
                Bestsellers
              </h2>
              <p className="text-gray-600 mt-2">Our most loved pieces</p>
            </div>
            <Link href="/products" className="nav-link text-sm font-medium">
              View All
            </Link>
          </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 mb-3"></div>
                <div className="h-4 bg-gray-200 mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 w-1/2"></div>
              </div>
            ))}
          </div>
        ) : bestsellers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No bestsellers available at the moment.</p>
        )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl tracking-tight text-gray-900">
              New Arrivals
            </h2>
            <p className="text-gray-600 mt-2">Fresh additions to our collection</p>
          </div>
          <Link href="/products" className="nav-link text-sm font-medium">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 mb-3"></div>
                <div className="h-4 bg-gray-200 mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 w-1/2"></div>
              </div>
            ))}
          </div>
        ) : newArrivals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No new arrivals available at the moment.</p>
        )}
      </section>

      {/* The Aviroze Story */}
      <section className="bg-[#eeece7] py-20">
        <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 text-center">
          <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-6">
            The Aviroze Story
          </h2>
          <blockquote className="font-serif text-3xl lg:text-4xl italic leading-relaxed mb-8">
            "We believe in creating timeless pieces that empower women to feel confident and elegant in every aspect of their professional lives."
          </blockquote>
          <Link
            href="/about"
            className="border border-1 border-black px-12 py-4 inline-flex items-center justify-center uppercase text-sm font-medium hover:bg-foreground hover:text-background transition-colors "
          >
            Discover Our Story
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-2 h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </Link>
        </div>
      </section>
    </>
  );
}
