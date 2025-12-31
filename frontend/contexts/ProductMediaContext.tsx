'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProductImage } from '@/lib/services/products';

interface ProductMediaCache {
  [productId: number]: {
    allImages: ProductImage[];
    colors: string[];
  };
}

interface ProductMediaContextType {
  getCachedProduct: (productId: number) => ProductMediaCache[number] | null;
  cacheProduct: (productId: number, allImages: ProductImage[], colors: string[]) => void;
  getImagesByColor: (productId: number, color: string) => ProductImage[];
  clearCache: () => void;
}

const ProductMediaContext = createContext<ProductMediaContextType | undefined>(undefined);

export function ProductMediaProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<ProductMediaCache>({});

  const getCachedProduct = (productId: number) => {
    return cache[productId] || null;
  };

  const cacheProduct = (productId: number, allImages: ProductImage[], colors: string[]) => {
    setCache(prev => ({
      ...prev,
      [productId]: {
        allImages,
        colors
      }
    }));
  };

  const getImagesByColor = (productId: number, color: string): ProductImage[] => {
    const cached = cache[productId];
    if (!cached) return [];

    // Filter images by color
    const filtered = cached.allImages.filter(img =>
      !img.color || img.color.toLowerCase() === color.toLowerCase()
    );

    // Sort: videos/gifs first, then images
    return filtered.sort((a, b) => {
      const aIsMedia = a.media_type === 'video' || a.media_type === 'gif';
      const bIsMedia = b.media_type === 'video' || b.media_type === 'gif';

      if (aIsMedia && !bIsMedia) return -1;
      if (!aIsMedia && bIsMedia) return 1;
      return a.display_order - b.display_order;
    });
  };

  const clearCache = () => {
    setCache({});
  };

  return (
    <ProductMediaContext.Provider
      value={{
        getCachedProduct,
        cacheProduct,
        getImagesByColor,
        clearCache
      }}
    >
      {children}
    </ProductMediaContext.Provider>
  );
}

export function useProductMedia() {
  const context = useContext(ProductMediaContext);
  if (context === undefined) {
    throw new Error('useProductMedia must be used within a ProductMediaProvider');
  }
  return context;
}
