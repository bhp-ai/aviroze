'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Sparkles, Heart, Award, Package } from 'lucide-react';
import { productsService, Product } from '@/lib/services/products';
import { collectionsService, Collection } from '@/lib/services/collections';

interface CollectionData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  items: number;
}

export default function CollectionsPage() {
  const router = useRouter();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError('');

      // Get collections from Collection model ONLY
      const collectionsFromDB = await collectionsService.getAll();

      // Fetch product counts for each collection
      const collectionsWithData: CollectionData[] = [];

      for (const collection of collectionsFromDB) {
        // Get products for this collection to count them
        const products = await productsService.getAll({ collection: collection.name });

        // Use collection's uploaded image, or fallback to first product image or placeholder
        let collectionImage = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop';

        if (collection.image_url) {
          // Use the uploaded collection image from Collection table
          collectionImage = collection.image_url;
        } else if (products.length > 0 && products[0].images && products[0].images.length > 0) {
          // Fallback to first product's first image
          const firstImage = products[0].images[0];
          collectionImage = typeof firstImage === 'string' ? firstImage : firstImage.url;
        }

        collectionsWithData.push({
          id: collection.id,
          title: collection.name,
          subtitle: `${products.length} ${products.length === 1 ? 'Item' : 'Items'}`,
          description: collection.description || `Explore our ${collection.name} collection featuring ${products.length} carefully selected products.`,
          image: collectionImage,
          items: products.length,
        });
      }

      setCollections(collectionsWithData);
    } catch (err: any) {
      setError('Failed to load collections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionClick = (collectionTitle: string) => {
    // Navigate to products page with collection filter
    router.push(`/products?collection=${encodeURIComponent(collectionTitle)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCollections}
            className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[60vh] bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop"
          alt="Collections Hero"
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-4">
              Our Collections
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
              Curated selections for the modern woman
            </p>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Introduction */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
            Explore Our Curated Collections
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {collections.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No collections available</p>
              <p className="text-gray-400 text-sm mt-2">Check back soon for new collections!</p>
            </div>
          ) : (
            collections.map((collection) => (
              <div
                key={collection.id}
                className="group cursor-pointer"
                onClick={() => handleCollectionClick(collection.title)}
              >
              <div className="relative h-96 mb-4 overflow-hidden bg-gray-100">
                <Image
                  src={collection.image}
                  alt={collection.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-sm font-medium mb-1">{collection.items} Items</p>
                    <p className="text-sm opacity-90">Explore Collection →</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-1">
                  {collection.title}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{collection.subtitle}</p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {collection.description}
                </p>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Features Section */}
        <div className="border-t border-gray-200 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Curated Selection
              </h3>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Made with Love
              </h3>
              <p className="text-gray-600">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Premium Quality
              </h3>
              <p className="text-gray-600">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gray-50 rounded-lg p-8 md:p-12 text-center">
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
            Can't Find What You're Looking For?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <a
            href="/products"
            className="inline-block bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Browse All Products
          </a>
        </div>
      </div>
    </div>
  );
}
