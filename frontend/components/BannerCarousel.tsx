'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannerService, Banner } from '@/lib/services/banners';
import Link from 'next/link';
import LoadingSpinner from './LoadingSpinner';

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveBanners();
  }, []);

  const fetchActiveBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getActiveBanners();
      console.log('Fetched banners:', data.length, data);
      setBanners(data);

      // Track views for all banners
      data.forEach(banner => {
        bannerService.trackBannerView(banner.id).catch(() => {});
      });
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleBannerClick = (banner: Banner) => {
    bannerService.trackBannerClick(banner.id).catch(() => {});
  };

  if (loading) {
    // Show skeleton placeholder while loading to prevent layout shift
    return (
      <div className="relative w-full overflow-hidden bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100">
        <div className="relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] flex items-center justify-center">
          <LoadingSpinner
            size="lg"
            color="gray"
            text="Loading banners..."
            subText="Setting up your promotional content"
          />
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full overflow-hidden bg-gray-100">
      <div className="relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9]">
        {/* Banner Content */}
        {currentBanner.link_url ? (
          <Link
            href={currentBanner.link_url}
            target={currentBanner.link_target}
            onClick={() => handleBannerClick(currentBanner)}
            className="block w-full h-full"
          >
            <BannerContent banner={currentBanner} />
          </Link>
        ) : (
          <BannerContent banner={currentBanner} />
        )}

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 rounded-full p-2 transition-all z-10 shadow-lg"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 rounded-full p-2 transition-all z-10 shadow-lg"
              aria-label="Next banner"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BannerContent({ banner }: { banner: Banner }) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{
        backgroundColor: banner.background_color || '#f3f4f6',
      }}
    >
      {/* Background Image */}
      {banner.image && (
        <>
          <img
            src={banner.image}
            alt={banner.title}
            className="hidden md:block absolute inset-0 w-full h-full object-cover"
          />
          {banner.mobile_image && (
            <img
              src={banner.mobile_image}
              alt={banner.title}
              className="md:hidden absolute inset-0 w-full h-full object-cover"
            />
          )}
        </>
      )}

      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Text Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg"
          style={{ color: banner.text_color || '#000000' }}
        >
          {banner.title}
        </h2>
        {banner.subtitle && (
          <p
            className="text-lg sm:text-xl md:text-2xl mb-6 drop-shadow-lg"
            style={{ color: banner.text_color || '#000000' }}
          >
            {banner.subtitle}
          </p>
        )}
        {banner.description && (
          <p
            className="text-sm sm:text-base md:text-lg mb-8 max-w-2xl mx-auto drop-shadow-lg"
            style={{ color: banner.text_color || '#000000' }}
          >
            {banner.description}
          </p>
        )}
        {banner.link_text && banner.link_url && (
          <button
            className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-white transition-transform hover:scale-105 shadow-lg"
            style={{ backgroundColor: banner.button_color || '#000000' }}
          >
            {banner.link_text}
          </button>
        )}
      </div>
    </div>
  );
}
