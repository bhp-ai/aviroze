import { Product } from '@/types';

export const products: Product[] = [
  {
    id: '1',
    name: 'Classic Blazer',
    slug: 'classic-blazer',
    description: 'Timeless blazer perfect for professional settings. Made with premium fabric for comfort and elegance.',
    price: 1250000,
    images: [
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    ],
    category: 'Outerwear',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Beige'],
    inStock: true,
    featured: true,
  },
  {
    id: '2',
    name: 'Silk Blouse',
    slug: 'silk-blouse',
    description: 'Elegant silk blouse with a modern cut. Perfect for both office and evening events.',
    price: 850000,
    images: [
      'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=800',
      'https://images.unsplash.com/photo-1624206112918-f140f087f9db?w=800',
    ],
    category: 'Tops',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['White', 'Black', 'Champagne'],
    inStock: true,
    featured: true,
  },
  {
    id: '3',
    name: 'Tailored Trousers',
    slug: 'tailored-trousers',
    description: 'High-waisted tailored trousers with a flattering fit. Essential for your professional wardrobe.',
    price: 950000,
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800',
    ],
    category: 'Bottoms',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Gray', 'Navy'],
    inStock: true,
  },
  {
    id: '4',
    name: 'A-Line Midi Skirt',
    slug: 'a-line-midi-skirt',
    description: 'Sophisticated midi skirt with a flattering A-line silhouette.',
    price: 750000,
    images: [
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800',
    ],
    category: 'Bottoms',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Black', 'Burgundy', 'Camel'],
    inStock: true,
  },
  {
    id: '5',
    name: 'Structured Coat',
    slug: 'structured-coat',
    description: 'Premium wool coat with a structured silhouette. Perfect for cold weather.',
    price: 2100000,
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
    ],
    category: 'Outerwear',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Camel', 'Black', 'Gray'],
    inStock: true,
    featured: true,
  },
  {
    id: '6',
    name: 'Pencil Dress',
    slug: 'pencil-dress',
    description: 'Elegant pencil dress that emphasizes your silhouette. Perfect for important meetings.',
    price: 1150000,
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
    ],
    category: 'Dresses',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Wine'],
    inStock: true,
  },
  {
    id: '7',
    name: 'Wide-Leg Pants',
    slug: 'wide-leg-pants',
    description: 'Contemporary wide-leg pants with a comfortable fit and elegant drape.',
    price: 900000,
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
      'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800',
    ],
    category: 'Bottoms',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Ivory', 'Olive'],
    inStock: false,
  },
  {
    id: '8',
    name: 'Cashmere Sweater',
    slug: 'cashmere-sweater',
    description: 'Luxurious cashmere sweater with a timeless design. Ultimate comfort and elegance.',
    price: 1450000,
    images: [
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
    ],
    category: 'Tops',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Cream', 'Gray', 'Charcoal'],
    inStock: true,
  },
];

export function getProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(product => product.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter(product => product.featured);
}
