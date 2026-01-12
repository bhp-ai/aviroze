'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, X, Tag, Ticket, Package, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsService, Product as APIProduct } from '@/lib/services/products';
import { collectionsService } from '@/lib/services/collections';
import { formatIDR } from '@/lib/utils/currency';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/utils/csv-export';
import { HexColorPicker } from 'react-colorful';

// Map API Product type to local Product type
interface Product extends APIProduct {
  createdAt: string;
}

// Helper component to display product image/video (now using base64 data URLs)
const ProductImage = ({ images, productName, className }: { images: any[]; productName: string; className?: string }) => {
  const [hasError, setHasError] = useState(false);
  const mediaItem = images && images.length > 0 ? images[0] : null;

  // Handle both old string format and new object format
  const mediaUrl = typeof mediaItem === 'string' ? mediaItem : mediaItem?.url;
  const mediaType = typeof mediaItem === 'object' ? mediaItem?.media_type : 'image';

  if (hasError || !mediaUrl) {
    return (
      <div className={`rounded bg-gray-200 flex items-center justify-center flex-shrink-0 ${className || 'w-12 h-12'}`}>
        <Package className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  // Render video
  if (mediaType === 'video') {
    return (
      <video
        src={mediaUrl}
        className={`rounded object-cover ${className || 'w-12 h-12'}`}
        muted
        loop
        onError={() => setHasError(true)}
      />
    );
  }

  // Render image or gif
  return (
    <img
      src={mediaUrl}
      alt={productName}
      className={`rounded object-cover ${className || 'w-12 h-12'}`}
      onError={() => setHasError(true)}
    />
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: boolean;
    description?: boolean;
    category?: boolean;
  }>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [formData, setFormData] = useState<Product>({
    id: 0,
    name: '',
    description: '',
    price: 0,
    category: '',
    collection: '',
    size_guide: [],
    stock: 0,
    image: '',
    images: [],
    colors: [],
    sizes: [],
    variants: [],
    createdAt: '',
    discount: {
      enabled: false,
      type: 'percentage',
      value: 0,
    },
    voucher: {
      enabled: false,
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      expiryDate: '',
    },
  });
  const [colorInput, setColorInput] = useState('#000000');
  const [colorError, setColorError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [variantColorInput, setVariantColorInput] = useState('');
  const [variantSizeInput, setVariantSizeInput] = useState('');
  const [variantQuantityInput, setVariantQuantityInput] = useState<number>(0);
  const [variantError, setVariantError] = useState('');
  const [editingVariant, setEditingVariant] = useState<{color?: string, size: string} | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFileTypes, setImageFileTypes] = useState<string[]>([]);
  const [imageColors, setImageColors] = useState<string[]>([]); // Track color for each new media
  const [replaceAllImages, setReplaceAllImages] = useState<boolean>(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Size guide states
  const [sizeGuideInputs, setSizeGuideInputs] = useState<{[key: string]: string}>({size: ''});
  const [sizeGuideMeasurementFields, setSizeGuideMeasurementFields] = useState<string[]>([]);
  const [measurementFieldInput, setMeasurementFieldInput] = useState('');
  const [editingSizeGuideIndex, setEditingSizeGuideIndex] = useState<number | null>(null);
  const [sizeGuideError, setSizeGuideError] = useState('');

  // Collections state
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [showCustomCollection, setShowCustomCollection] = useState(false);
  const [customCollectionInput, setCustomCollectionInput] = useState('');

  // Load products and collections from API on mount
  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const fetchCollections = async () => {
    try {
      const collections = await collectionsService.getAll();
      setAvailableCollections(collections.map(c => c.name));
    } catch (err) {
      console.log('No collections available yet');
    }
  };

  const fetchProducts = async (search?: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await productsService.getAll({ search });
      setProducts(data.map(p => ({
        ...p,
        createdAt: p.created_at
      })));
    } catch (err: any) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        fetchProducts(searchTerm);
      } else {
        fetchProducts();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [productsPerPage, searchTerm]);

  // Pagination calculations
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);

      // Consolidate duplicate variants (same color+size) when loading
      let consolidatedVariants = product.variants || [];
      if (consolidatedVariants.length > 0) {
        const variantMap: {[key: string]: any} = {};
        consolidatedVariants.forEach(v => {
          const key = `${v.color || 'no-color'}-${v.size}`;
          if (variantMap[key]) {
            // Duplicate found - sum the quantities
            variantMap[key].quantity += v.quantity;
          } else {
            variantMap[key] = { ...v };
          }
        });
        consolidatedVariants = Object.values(variantMap);
      }

      setFormData({
        ...product,
        collection: product.collection || '',  // Convert null to empty string
        variants: consolidatedVariants,
        discount: product.discount || {
          enabled: false,
          type: 'percentage',
          value: 0,
        },
        voucher: product.voucher || {
          enabled: false,
          code: '',
          discountType: 'percentage',
          discountValue: 0,
          expiryDate: '',
        },
      });

      // Check if product's collection is not in availableCollections
      if (product.collection && !availableCollections.includes(product.collection)) {
        setShowCustomCollection(true);
        setCustomCollectionInput(product.collection);
      } else {
        setShowCustomCollection(false);
        setCustomCollectionInput('');
      }

      setImageFiles([]);
      setImagePreviews([]);
      setImageFileTypes([]);
      setImageColors([]);

      // Extract measurement fields from existing size guide
      if (product.size_guide && product.size_guide.length > 0) {
        const fields = Object.keys(product.size_guide[0]).filter(key => key !== 'size');
        setSizeGuideMeasurementFields(fields);
      } else {
        setSizeGuideMeasurementFields([]);
      }
      setMeasurementFieldInput('');
    } else {
      setEditingProduct(null);
      setFormData({
        id: Date.now(),
        name: '',
        description: '',
        price: 0,
        category: '',
        collection: '',
        size_guide: [],
        stock: 0,
        images: [],
        colors: [],
        sizes: [],
        variants: [],
        createdAt: new Date().toISOString(),
        discount: {
          enabled: false,
          type: 'percentage',
          value: 0,
        },
        voucher: {
          enabled: false,
          code: '',
          discountType: 'percentage',
          discountValue: 0,
          expiryDate: '',
        },
      });
      setImageFiles([]);
      setImagePreviews([]);
      setImageFileTypes([]);
      setImageColors([]);
      setSizeGuideMeasurementFields([]);
      setMeasurementFieldInput('');
      setSizeGuideInputs({size: ''});
      setShowCustomCollection(false);
      setCustomCollectionInput('');
    }
    setColorInput('');
    setVariantSizeInput('');
    setVariantQuantityInput(0);
    setEditingSizeGuideIndex(null);
    setSizeGuideError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
    setImageFileTypes([]);
    setImageColors([]);
    setReplaceAllImages(false);
    setSizeGuideMeasurementFields([]);
    setMeasurementFieldInput('');
    setSizeGuideInputs({size: ''});
    setEditingSizeGuideIndex(null);
    setSizeGuideError('');
    setShowCustomCollection(false);
    setCustomCollectionInput('');
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes

      // Validate file sizes
      const invalidFiles = newFiles.filter(file => {
        const isVideo = file.type.startsWith('video/');
        const isGif = file.type === 'image/gif';
        if ((isVideo || isGif) && file.size > MAX_SIZE) {
          return true;
        }
        return false;
      });

      if (invalidFiles.length > 0) {
        setError(`Some files are too large. Videos and GIFs must be under 10MB. Large files: ${invalidFiles.map(f => f.name).join(', ')}`);
        // Auto-dismiss error after 5 seconds
        setTimeout(() => {
          setError('');
        }, 5000);
        return;
      }

      setImageFiles(prev => [...prev, ...newFiles]);

      // Generate previews for all new files
      newFiles.forEach(file => {
        const isVideo = file.type.startsWith('video/');
        const isGif = file.type === 'image/gif';

        if (isVideo || isGif) {
          // For videos and GIFs, create a blob URL instead of using FileReader
          const blobUrl = URL.createObjectURL(file);
          setImagePreviews(prev => [...prev, blobUrl]);
          setImageFileTypes(prev => [...prev, file.type]);
          setImageColors(prev => [...prev, '']); // Initialize with no color
        } else {
          // For regular images, use FileReader
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreviews(prev => [...prev, reader.result as string]);
            setImageFileTypes(prev => [...prev, file.type]);
            setImageColors(prev => [...prev, '']); // Initialize with no color
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFileTypes(prev => prev.filter((_, i) => i !== index));
    setImageColors(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors({});

    // Validation
    const errors: { name?: boolean; description?: boolean; category?: boolean } = {};
    let errorMessage = '';

    if (formData.name.trim().length < 3) {
      errors.name = true;
      errorMessage = 'Product name must have at least 3 characters';
    }

    if (formData.description.trim().length < 10) {
      errors.description = true;
      if (!errorMessage) errorMessage = 'Description must have at least 10 characters';
    }

    if (formData.category.trim().length < 3) {
      errors.category = true;
      if (!errorMessage) errorMessage = 'Category must have at least 3 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError(errorMessage);
      setLoading(false);
      // Scroll to top of modal to show error
      document.getElementById('product-modal')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }


    try {
      // IMPORTANT: Use formData.stock directly (initial inventory)
      // Do NOT calculate from variants - we use shared stock formula
      // All variants share from the same stock pool

      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        collection: formData.collection,
        size_guide: formData.size_guide,
        stock: formData.stock,  // Use the user-entered stock value
        colors: formData.colors || [],
        sizes: formData.sizes || [],
        variants: formData.variants || [],
        discount: formData.discount,
        voucher: formData.voucher
      };

      if (editingProduct) {
        // Collect ALL existing image colors using image IDs (including newly assigned and null values)
        const existingImageColors: {[id: string]: string | null} = {};
        formData.images.forEach((img: any) => {
          if (typeof img === 'object' && img.id) {
            // Use image ID as key instead of URL for reliable matching
            existingImageColors[img.id.toString()] = img.color || null;
          }
        });

        // Update existing product
        await productsService.update(
          formData.id,
          productData,
          imageFiles.length > 0 ? imageFiles : undefined,
          replaceAllImages,
          imageColors.length > 0 ? imageColors : undefined,
          Object.keys(existingImageColors).length > 0 ? existingImageColors : undefined
        );
      } else {
        // Add new product
        await productsService.create(
          productData,
          imageFiles.length > 0 ? imageFiles : undefined,
          imageColors.length > 0 ? imageColors : undefined
        );
      }

      // Refresh products list
      await fetchProducts();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setLoading(true);
        try {
          await productsService.delete(id);
          await fetchProducts();
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Failed to delete product');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === currentProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (id: number) => {
    setSelectedProducts(prev =>
      prev.includes(id)
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Multiple Products',
      message: `Are you sure you want to delete ${selectedProducts.length} ${selectedProducts.length === 1 ? 'product' : 'products'}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          setLoading(true);
          await Promise.all(selectedProducts.map(id => productsService.delete(id)));
          await fetchProducts();
          setSelectedProducts([]);
        } catch (err) {
          setError('Failed to delete some products');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBulkOutOfStock = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Mark Out of Stock',
      message: `Mark ${selectedProducts.length} ${selectedProducts.length === 1 ? 'product' : 'products'} as out of stock?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          setLoading(true);
          await Promise.all(selectedProducts.map(id =>
            productsService.update(id, { stock: 0, variants: [] })
          ));
          await fetchProducts();
          setSelectedProducts([]);
        } catch (err) {
          setError('Failed to update some products');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleExportCSV = () => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));

    // CSV Headers
    const headers = ['ID', 'Name', 'Description', 'Price', 'Category', 'Stock', 'Colors', 'Variants', 'Created At'];

    // CSV Rows
    const rows = selectedProductsData.map(p => [
      p.id,
      `"${p.name}"`,
      `"${p.description}"`,
      p.price,
      p.category,
      p.stock,
      `"${(p.colors || []).join(', ')}"`,
      `"${(p.variants || []).map(v => `${v.size}:${v.quantity}`).join(', ')}"`,
      new Date(p.created_at).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateFinalPrice = (product: Product) => {
    if (product.discount?.enabled) {
      if (product.discount.type === 'percentage') {
        return product.price * (1 - product.discount.value / 100);
      } else {
        return product.price - product.discount.value;
      }
    }
    return product.price;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
        <p className="text-gray-600 mt-2">Manage your product catalog</p>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkOutOfStock}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              <Package className="w-4 h-4" />
              Mark Out of Stock
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
          />
        </div>

        {/* Per Page Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Per page:</span>
          <select
            value={productsPerPage}
            onChange={(e) => setProductsPerPage(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === currentProducts.length && currentProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sizes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offers
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ProductImage images={product.images} productName={product.name} />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.collection ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {product.collection}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {product.colors && product.colors.length > 0 ? (
                        product.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No colors</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="flex items-start gap-1 flex-wrap max-w-[200px]">
                      {product.variants && product.variants.length > 0 ? (
                        <>
                          {product.variants.slice(0, 3).map((variant, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800 border border-gray-300"
                              title={`${variant.color ? `${variant.color} - ` : ''}${variant.size}: ${variant.quantity} units`}
                            >
                              {variant.size} ({variant.quantity})
                            </span>
                          ))}
                          {product.variants.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-600">
                              +{product.variants.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">No variants</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.discount?.enabled ? (
                        <div>
                          <span className="line-through text-gray-400">Rp {formatIDR(product.price)}</span>
                          <span className="ml-2 text-green-600 font-semibold">
                            Rp {formatIDR(calculateFinalPrice(product))}
                          </span>
                        </div>
                      ) : (
                        <span>Rp {formatIDR(product.price)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.stock > 50
                          ? 'bg-green-100 text-green-800'
                          : product.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {new Date(product.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {product.discount?.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <Tag className="w-3 h-3" />
                          {product.discount.type === 'percentage'
                            ? `${product.discount.value}%`
                            : `Rp ${formatIDR(product.discount.value)}`}
                        </span>
                      )}
                      {product.voucher?.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          <Ticket className="w-3 h-3" />
                          {product.voucher.code}
                        </span>
                      )}
                      {!product.discount?.enabled && !product.voucher?.enabled && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {products.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700">
              Showing {indexOfFirstProduct + 1} to {Math.min(indexOfLastProduct, products.length)} of {products.length} products
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" id="product-modal">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Error Display - only show validation errors, not file size errors */}
              {error && !error.includes('too large') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-gray-900 text-white rounded-full text-sm">1</span>
                    Basic Information
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 ml-10">Enter the core details about your product</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (validationErrors.name) {
                            setValidationErrors({ ...validationErrors, name: false });
                            setError('');
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${
                          validationErrors.name
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:border-gray-900'
                        }`}
                        placeholder="e.g., Premium Cotton T-Shirt"
                        required
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-sm text-red-600">Must be at least 3 characters</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          if (validationErrors.description) {
                            setValidationErrors({ ...validationErrors, description: false });
                            setError('');
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${
                          validationErrors.description
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:border-gray-900'
                        }`}
                        rows={3}
                        placeholder="Describe your product features, materials, and benefits..."
                        required
                      />
                      {validationErrors.description && (
                        <p className="mt-1 text-sm text-red-600">Must be at least 10 characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (IDR) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        placeholder="299000"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter price in Indonesian Rupiah</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock (Total Inventory) *
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        placeholder="50"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Total units available (variants will share this pool)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ ...formData, category: e.target.value });
                          if (validationErrors.category) {
                            setValidationErrors({ ...validationErrors, category: false });
                            setError('');
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${
                          validationErrors.category
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:border-gray-900'
                        }`}
                        placeholder="e.g., T-Shirts, Dresses, Accessories"
                        required
                      />
                      {validationErrors.category && (
                        <p className="mt-1 text-sm text-red-600">Must be at least 3 characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Collection (Optional)
                      </label>

                      {/* Show dropdown if collections exist */}
                      {availableCollections.length > 0 && !showCustomCollection ? (
                        <div className="space-y-2">
                          <select
                            value={formData.collection || ''}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setShowCustomCollection(true);
                                setCustomCollectionInput('');
                                setFormData({ ...formData, collection: '' });
                              } else {
                                setFormData({ ...formData, collection: e.target.value });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                          >
                            <option value="">No collection</option>
                            {availableCollections.map((collection) => (
                              <option key={collection} value={collection}>
                                {collection}
                              </option>
                            ))}
                            <option value="__custom__">+ Create New Collection</option>
                          </select>
                        </div>
                      ) : (
                        /* Show text input for custom collection */
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={showCustomCollection ? customCollectionInput : (formData.collection || '')}
                              onChange={(e) => {
                                if (showCustomCollection) {
                                  setCustomCollectionInput(e.target.value);
                                  setFormData({ ...formData, collection: e.target.value });
                                } else {
                                  setFormData({ ...formData, collection: e.target.value });
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                              placeholder="e.g., Summer 2024, New Arrivals"
                            />
                            {showCustomCollection && availableCollections.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomCollection(false);
                                  setCustomCollectionInput('');
                                  setFormData({ ...formData, collection: '' });
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size Guide
                      </label>
                      <div className="space-y-3">
                        {/* Add measurement field */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Measurement name (e.g., Chest, Waist, Hip)"
                            value={measurementFieldInput}
                            onChange={(e) => setMeasurementFieldInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const field = measurementFieldInput.trim();
                                if (field && !sizeGuideMeasurementFields.includes(field.toLowerCase())) {
                                  setSizeGuideMeasurementFields([...sizeGuideMeasurementFields, field.toLowerCase()]);
                                  setMeasurementFieldInput('');
                                }
                              }
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const field = measurementFieldInput.trim();
                              if (field && !sizeGuideMeasurementFields.includes(field.toLowerCase())) {
                                setSizeGuideMeasurementFields([...sizeGuideMeasurementFields, field.toLowerCase()]);
                                setMeasurementFieldInput('');
                              }
                            }}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                          >
                            Add Field
                          </button>
                        </div>

                        {/* Show added measurement fields */}
                        {sizeGuideMeasurementFields.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-600 font-medium w-full">Measurement fields:</span>
                            {sizeGuideMeasurementFields.map((field, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {field}
                                <button
                                  type="button"
                                  onClick={() => setSizeGuideMeasurementFields(sizeGuideMeasurementFields.filter((_, i) => i !== idx))}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Add size measurement */}
                        {sizeGuideMeasurementFields.length > 0 && (
                          <div className="border border-gray-300 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              {editingSizeGuideIndex !== null ? 'Edit Size Measurements' : 'Add Size Measurements'}
                            </p>
                            {/* Display size guide error */}
                            {sizeGuideError && (
                              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                                {sizeGuideError}
                              </div>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Size (e.g., S, M, L)"
                                value={sizeGuideInputs.size || ''}
                                onChange={(e) => setSizeGuideInputs({...sizeGuideInputs, size: e.target.value})}
                                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-900"
                              />
                              {sizeGuideMeasurementFields.map((field) => (
                                <input
                                  key={field}
                                  type="text"
                                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                  value={sizeGuideInputs[field] || ''}
                                  onChange={(e) => setSizeGuideInputs({...sizeGuideInputs, [field]: e.target.value})}
                                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-900"
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (sizeGuideInputs.size && sizeGuideInputs.size.trim()) {
                                    const sizeValue = sizeGuideInputs.size.trim();

                                    // Check if size already exists (excluding the one being edited)
                                    const duplicateExists = formData.size_guide?.some(
                                      (entry, idx) => entry.size.toLowerCase() === sizeValue.toLowerCase() && idx !== editingSizeGuideIndex
                                    );

                                    if (duplicateExists) {
                                      setSizeGuideError(`Size "${sizeValue}" already exists in the size guide. Please use a different size or remove the existing one first.`);
                                      // Auto-clear error after 5 seconds
                                      setTimeout(() => setSizeGuideError(''), 5000);
                                      return;
                                    }

                                    const newEntry: any = {size: sizeValue};
                                    sizeGuideMeasurementFields.forEach(field => {
                                      newEntry[field] = sizeGuideInputs[field] || '';
                                    });

                                    if (editingSizeGuideIndex !== null) {
                                      // Update existing entry
                                      const updatedSizeGuide = [...(formData.size_guide || [])];
                                      updatedSizeGuide[editingSizeGuideIndex] = newEntry;
                                      setFormData({
                                        ...formData,
                                        size_guide: updatedSizeGuide
                                      });
                                      setEditingSizeGuideIndex(null);
                                    } else {
                                      // Add new entry
                                      setFormData({
                                        ...formData,
                                        size_guide: [...(formData.size_guide || []), newEntry]
                                      });
                                    }

                                    setSizeGuideInputs({size: ''});
                                    // Clear any existing errors
                                    setSizeGuideError('');
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                              >
                                {editingSizeGuideIndex !== null ? 'Update Size' : 'Add Size'}
                              </button>
                              {editingSizeGuideIndex !== null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSizeGuideIndex(null);
                                    setSizeGuideInputs({size: ''});
                                    setSizeGuideError('');
                                  }}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Display current size guide */}
                        {formData.size_guide && formData.size_guide.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Current Size Guide:</p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-gray-300 text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left font-medium">Size</th>
                                    {sizeGuideMeasurementFields.map((field) => (
                                      <th key={field} className="border border-gray-300 px-3 py-2 text-left font-medium">
                                        {field.charAt(0).toUpperCase() + field.slice(1)}
                                      </th>
                                    ))}
                                    <th className="border border-gray-300 px-3 py-2 text-left font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {formData.size_guide.map((entry, idx) => (
                                    <tr key={idx}>
                                      <td className="border border-gray-300 px-3 py-2">{entry.size}</td>
                                      {sizeGuideMeasurementFields.map((field) => (
                                        <td key={field} className="border border-gray-300 px-3 py-2">{entry[field] || '-'}</td>
                                      ))}
                                      <td className="border border-gray-300 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Populate inputs with the entry data for editing
                                              const editInputs: {[key: string]: string} = {size: entry.size};
                                              sizeGuideMeasurementFields.forEach(field => {
                                                editInputs[field] = entry[field] || '';
                                              });
                                              setSizeGuideInputs(editInputs);
                                              setEditingSizeGuideIndex(idx);
                                              setSizeGuideError('');
                                              // Scroll to the input area
                                              document.getElementById('product-modal')?.scrollTo({
                                                top: 0,
                                                behavior: 'smooth'
                                              });
                                            }}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Edit size"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormData({
                                                ...formData,
                                                size_guide: formData.size_guide?.filter((_, i) => i !== idx)
                                              });
                                              // Clear edit state if deleting the entry being edited
                                              if (editingSizeGuideIndex === idx) {
                                                setEditingSizeGuideIndex(null);
                                                setSizeGuideInputs({size: ''});
                                                setSizeGuideError('');
                                              }
                                            }}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete size"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-500">
                          Add measurement fields (e.g., Chest, Waist, Hip), then enter measurements for each size.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Media (Images, Videos, GIFs)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handleImageChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                      />

                      {/* Error message for file size - shown immediately below input */}
                      {error && error.includes('too large') && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
                          <p className="text-xs text-red-600 mt-1">Please compress your files or choose smaller ones.</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> You can select multiple files. Videos and GIFs max 10MB each. Videos/GIFs will appear first.
                      </p>

                      {/* Replace all images checkbox - only show when editing */}
                      {editingProduct && (
                        <div className="mt-3">
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replaceAllImages}
                              onChange={(e) => setReplaceAllImages(e.target.checked)}
                              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                            />
                            <span>Replace all existing media (check this to remove old media and use only new uploads)</span>
                          </label>
                        </div>
                      )}

                      <div className="mt-3">
                        {/* Show existing media - Group by color */}
                        {editingProduct && formData.images && formData.images.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-700 mb-3">Current Media ({formData.images.length} files):</p>

                            {/* Group images by color */}
                            {(() => {
                              const imagesByColor: { [key: string]: any[] } = {};
                              formData.images.forEach((img: any) => {
                                const color = typeof img === 'object' && img.color ? img.color : 'No Color';
                                if (!imagesByColor[color]) imagesByColor[color] = [];
                                imagesByColor[color].push(img);
                              });

                              return Object.entries(imagesByColor).map(([color, images]) => (
                                <div key={color} className="mb-3">
                                  <p className="text-xs text-gray-600 mb-1 font-medium uppercase">{color}:</p>
                                  <div className="flex flex-wrap gap-2 pl-2">
                                    {images.map((img, imgIndex) => {
                                      const mediaUrl = typeof img === 'string' ? img : img.url;
                                      const mediaType = typeof img === 'object' ? img.media_type : 'image';
                                      const isVideo = mediaType === 'video';
                                      const isGif = mediaType === 'gif';
                                      const currentColor = typeof img === 'object' && img.color ? img.color : null;

                                      // Find the actual index in the full images array
                                      const actualIndex = formData.images.findIndex((image: any) => {
                                        const url = typeof image === 'string' ? image : image.url;
                                        return url === mediaUrl;
                                      });

                                      return (
                                        <div key={imgIndex} className="relative group">
                                          <div className="relative">
                                            {isVideo ? (
                                              <video
                                                src={mediaUrl}
                                                className="w-20 h-20 rounded object-cover border border-gray-300"
                                                muted
                                                loop
                                              />
                                            ) : (
                                              <img
                                                src={mediaUrl}
                                                alt={`${color} ${imgIndex + 1}`}
                                                className="w-20 h-20 rounded object-cover border border-gray-300"
                                              />
                                            )}
                                            {/* Media type badge */}
                                            {(isVideo || isGif) && (
                                              <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                                {isVideo ? 'VIDEO' : 'GIF'}
                                              </div>
                                            )}
                                          </div>

                                          {/* Color selector for all media */}
                                          {formData.colors && formData.colors.length > 0 && (
                                            <div className="mt-1">
                                              <select
                                                value={currentColor || ''}
                                                onChange={(e) => {
                                                  const selectedColor = e.target.value;
                                                  if (actualIndex !== -1) {
                                                    // Update the color of this specific image
                                                    const updatedImages = [...formData.images];
                                                    if (typeof updatedImages[actualIndex] === 'object') {
                                                      updatedImages[actualIndex] = {
                                                        ...updatedImages[actualIndex],
                                                        color: selectedColor || null
                                                      };
                                                    } else {
                                                      // Convert string to object with color
                                                      updatedImages[actualIndex] = {
                                                        url: updatedImages[actualIndex],
                                                        color: selectedColor || null,
                                                        media_type: 'image',
                                                        display_order: actualIndex
                                                      };
                                                    }
                                                    setFormData({ ...formData, images: updatedImages });
                                                  }
                                                }}
                                                className="w-20 text-xs px-1 py-1 border border-gray-300 rounded bg-white hover:border-gray-400"
                                              >
                                                <option value="">{currentColor ? 'Remove' : 'Assign'}</option>
                                                {formData.colors.map((c) => (
                                                  <option key={c} value={c}>
                                                    {c}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}

                        {/* Show new media previews - Group by color */}
                        {imagePreviews.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 mb-3 font-semibold">New media to upload ({imagePreviews.length} files):</p>

                            {/* Group new media by selected color */}
                            {(() => {
                              const mediaByColor: { [key: string]: number[] } = {};
                              imagePreviews.forEach((_, idx) => {
                                const color = imageColors[idx] || 'Unassigned';
                                if (!mediaByColor[color]) mediaByColor[color] = [];
                                mediaByColor[color].push(idx);
                              });

                              return Object.entries(mediaByColor).map(([color, indices]) => (
                                <div key={color} className="mb-3">
                                  <p className="text-xs text-gray-600 mb-1 font-medium uppercase">{color}:</p>
                                  <div className="flex flex-wrap gap-3 pl-2">
                                    {indices.map((idx) => {
                                      const preview = imagePreviews[idx];
                                      const fileType = imageFileTypes[idx] || '';
                                      const isVideo = fileType.startsWith('video/');
                                      const isGif = fileType === 'image/gif';

                                      return (
                                        <div key={idx} className="flex flex-col gap-1">
                                          <div className="relative">
                                            {isVideo ? (
                                              <video
                                                src={preview}
                                                className="w-20 h-20 rounded object-cover border border-gray-200"
                                                muted
                                                loop
                                                autoPlay
                                              />
                                            ) : (
                                              <img
                                                src={preview}
                                                alt={`Preview ${idx + 1}`}
                                                className="w-20 h-20 rounded object-cover border border-gray-200"
                                              />
                                            )}
                                            {/* Media type badge */}
                                            {(isVideo || isGif) && (
                                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                                {isVideo ? 'VIDEO' : 'GIF'}
                                              </div>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveImage(idx)}
                                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                              ×
                                            </button>
                                          </div>
                                          {/* Color selector for each media */}
                                          <select
                                            value={imageColors[idx] || ''}
                                            onChange={(e) => {
                                              const newColors = [...imageColors];
                                              newColors[idx] = e.target.value;
                                              setImageColors(newColors);
                                            }}
                                            className="text-xs px-1 py-1 border border-gray-300 rounded focus:outline-none focus:border-gray-900 w-20"
                                          >
                                            <option value="">No Color</option>
                                            {formData.colors && formData.colors.map((c) => (
                                              <option key={c} value={c}>{c}</option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}

                        {/* No images */}
                        {!editingProduct && imagePreviews.length === 0 && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Package className="w-5 h-5" />
                            <span className="text-xs">No images selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media & Visual Section */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm">2</span>
                    Media & Colors
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 ml-10">Upload images/videos and define available colors</p>
                  <div className="space-y-4">

                    {/* Colors Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Colors
                      </label>
                      <div className="flex gap-2 mb-2 items-start">
                        {/* Color Preview and Picker */}
                        <div className="relative" ref={colorPickerRef}>
                          <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="w-12 h-10 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
                            style={{ backgroundColor: colorInput }}
                            title="Click to open color picker"
                          />
                          {showColorPicker && (
                            <div className="absolute top-12 left-0 z-50 bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                              <HexColorPicker color={colorInput} onChange={setColorInput} />
                              <div className="mt-2 text-xs text-gray-600 text-center font-mono">
                                {colorInput.toUpperCase()}
                              </div>
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value.toUpperCase())}
                          placeholder="Enter hex color (e.g., #FF0000)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 font-mono"
                          maxLength={7}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setColorError('');
                            if (!colorInput || colorInput.trim() === '') {
                              setColorError('Please enter a color value');
                              setTimeout(() => setColorError(''), 3000);
                              return;
                            }
                            if (formData.colors?.includes(colorInput)) {
                              setColorError('This color already exists');
                              setTimeout(() => setColorError(''), 3000);
                              return;
                            }
                            setFormData({
                              ...formData,
                              colors: [...(formData.colors || []), colorInput]
                            });
                            setColorInput('#000000');
                            setShowColorPicker(false);
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                          Add Color
                        </button>
                      </div>
                      {colorError && (
                        <p className="text-sm text-red-600 mt-2">{colorError}</p>
                      )}
                      {formData.colors && formData.colors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.colors.map((color, index) => {
                            // Check if this color has any media associated with it
                            const hasMedia = formData.images?.some((img: any) => {
                              if (typeof img === 'string') return false;
                              return img.color && img.color.toLowerCase() === color.toLowerCase();
                            });

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg border border-gray-300"
                              >
                                <div
                                  className="w-5 h-5 rounded border border-gray-300"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-sm text-gray-700">{color}</span>
                                {hasMedia && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                                    ✓ Media
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      colors: formData.colors?.filter((_, i) => i !== index)
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> Enter a hex color code (e.g., #000000) and click "Add Color". Colors with media will show a green "✓ Media" badge.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Variants Section */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm">3</span>
                    Product Variants
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 ml-10">Define size and color combinations with stock quantities</p>
                  <div className="space-y-4">

                    {/* Variants Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Variant (Color + Size + Quantity)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        💡 <strong>Example:</strong> Gray-S: 10 units, Gray-M: 15 units, Navy-S: 8 units
                      </p>
                      <div className="flex gap-2 mb-2">
                        <select
                          value={variantColorInput}
                          onChange={(e) => setVariantColorInput(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        >
                          <option value="">Select Color</option>
                          {formData.colors && formData.colors.map((color) => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={variantSizeInput}
                          onChange={(e) => setVariantSizeInput(e.target.value)}
                          placeholder="Size (e.g., S, M, L, XL)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                        <input
                          type="number"
                          min="0"
                          value={variantQuantityInput}
                          onChange={(e) => setVariantQuantityInput(parseInt(e.target.value) || 0)}
                          placeholder="Quantity"
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // Validation
                            setVariantError('');
                            if (!variantColorInput || variantColorInput.trim() === '') {
                              setVariantError('Please select a color for the variant');
                              setTimeout(() => setVariantError(''), 3000);
                              return;
                            }
                            if (!variantSizeInput || variantSizeInput.trim() === '') {
                              setVariantError('Please enter a size for the variant');
                              setTimeout(() => setVariantError(''), 3000);
                              return;
                            }
                            if (!variantQuantityInput || variantQuantityInput <= 0) {
                              setVariantError('Please enter a quantity greater than 0');
                              setTimeout(() => setVariantError(''), 3000);
                              return;
                            }

                            let updatedVariants = [...(formData.variants || [])];

                            // Calculate total variant quantity (excluding the variant being edited if any)
                            let currentTotal = updatedVariants.reduce((sum, v) => {
                              // Exclude the variant being edited from the current total
                              if (editingVariant && v.color === editingVariant.color && v.size === editingVariant.size) {
                                return sum;
                              }
                              return sum + v.quantity;
                            }, 0);

                            // Check if adding this variant would exceed stock
                            const newTotal = currentTotal + variantQuantityInput;
                            if (newTotal > formData.stock) {
                              setVariantError(`Total variant quantity (${newTotal}) cannot exceed stock (${formData.stock}). Currently allocated: ${currentTotal} units.`);
                              setTimeout(() => setVariantError(''), 5000);
                              return;
                            }

                            if (editingVariant) {
                                // Check if color or size changed
                                const colorOrSizeChanged =
                                  editingVariant.color !== variantColorInput ||
                                  editingVariant.size !== variantSizeInput;

                                // Remove the original variant being edited
                                updatedVariants = updatedVariants.filter(v =>
                                  !(v.color === editingVariant.color && v.size === editingVariant.size)
                                );

                                if (colorOrSizeChanged) {
                                  // If color or size changed, check if target variant exists
                                  const existingNewColorIndex = updatedVariants.findIndex(
                                    v => v.color === variantColorInput && v.size === variantSizeInput
                                  );

                                  if (existingNewColorIndex >= 0) {
                                    // Merge with existing variant
                                    updatedVariants[existingNewColorIndex].quantity += variantQuantityInput;
                                  } else {
                                    // Create new variant
                                    updatedVariants.push({
                                      color: variantColorInput,
                                      size: variantSizeInput,
                                      quantity: variantQuantityInput
                                    });
                                  }
                                } else {
                                  // Just updating quantity for same color+size
                                  updatedVariants.push({
                                    color: variantColorInput,
                                    size: variantSizeInput,
                                    quantity: variantQuantityInput
                                  });
                                }

                                setEditingVariant(null);
                              } else {
                                // Check if exact variant exists (same color, size, AND quantity)
                                const exactDuplicateIndex = updatedVariants.findIndex(
                                  v => v.color === variantColorInput &&
                                       v.size === variantSizeInput &&
                                       v.quantity === variantQuantityInput
                                );

                                if (exactDuplicateIndex >= 0) {
                                  // Exact duplicate exists - show info message
                                  setVariantError(`This variant already exists: ${variantColorInput || 'No Color'}-${variantSizeInput} with ${variantQuantityInput} units. Use the edit button to modify it.`);
                                  setTimeout(() => setVariantError(''), 5000);
                                  return;
                                }

                                // Check if variant exists with same color and size (but different quantity)
                                const sameColorSizeIndex = updatedVariants.findIndex(
                                  v => v.color === variantColorInput && v.size === variantSizeInput
                                );

                                if (sameColorSizeIndex >= 0) {
                                  // Update existing variant quantity
                                  updatedVariants[sameColorSizeIndex] = {
                                    color: variantColorInput,
                                    size: variantSizeInput,
                                    quantity: variantQuantityInput
                                  };
                                } else {
                                  // Add new variant
                                  updatedVariants.push({
                                    color: variantColorInput,
                                    size: variantSizeInput,
                                    quantity: variantQuantityInput
                                  });
                                }
                              }

                            // Extract unique sizes from variants
                            const uniqueSizes = Array.from(new Set(updatedVariants.map(v => v.size)));

                            // Consolidate duplicate variants (same color+size) by summing quantities
                            const consolidatedVariants: {[key: string]: any} = {};
                            updatedVariants.forEach(v => {
                              const key = `${v.color || 'no-color'}-${v.size}`;
                              if (consolidatedVariants[key]) {
                                // Duplicate found - sum the quantities
                                consolidatedVariants[key].quantity += v.quantity;
                              } else {
                                consolidatedVariants[key] = { ...v };
                              }
                            });
                            const finalVariants = Object.values(consolidatedVariants);

                            setFormData({
                              ...formData,
                              variants: finalVariants,
                              sizes: uniqueSizes  // Auto-update sizes array
                            });
                            setVariantColorInput('');
                            setVariantSizeInput('');
                            setVariantQuantityInput(0);
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                          {editingVariant ? 'Update Variant' : 'Add Variant'}
                        </button>
                      </div>
                      {variantError && (
                        <div className={`mt-2 p-3 rounded-lg border ${
                          variantError.includes('already exists')
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          <p className="text-sm font-medium">
                            {variantError.includes('already exists') ? 'ℹ️ ' : '⚠️ '}
                            {variantError}
                          </p>
                        </div>
                      )}
                      {formData.variants && formData.variants.length > 0 && (
                        <div>
                          {(() => {
                            const totalVariantQty = formData.variants.reduce((sum, v) => sum + v.quantity, 0);
                            const exceeds = totalVariantQty > formData.stock;
                            return (
                              <p className={`text-xs mb-2 ${exceeds ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                Total Variant Stock: {totalVariantQty} / {formData.stock} units
                                {exceeds && ' ⚠️ EXCEEDS STOCK LIMIT!'}
                              </p>
                            );
                          })()}
                          {/* Group variants by color */}
                          {(() => {
                            const variantsByColor: { [key: string]: any[] } = {};
                            formData.variants.forEach((variant: any) => {
                              const color = variant.color || 'No Color';
                              if (!variantsByColor[color]) variantsByColor[color] = [];
                              variantsByColor[color].push(variant);
                            });
                            return Object.entries(variantsByColor).map(([color, variants]) => (
                              <div key={color} className="mb-3">
                                <p className="text-xs font-semibold uppercase text-gray-700 mb-1">{color}:</p>
                                <div className="flex flex-wrap gap-2">
                                  {variants.map((variant, index) => (
                                    <div
                                      key={`${color}-${variant.size}-${index}`}
                                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-300"
                                    >
                                      <span className="text-sm font-semibold text-gray-900">{variant.size}</span>
                                      <span className="text-sm text-gray-600">({variant.quantity} units)</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Populate inputs with variant data for editing
                                          setVariantColorInput(variant.color || '');
                                          setVariantSizeInput(variant.size);
                                          setVariantQuantityInput(variant.quantity);
                                          // Track which variant is being edited
                                          setEditingVariant({ color: variant.color, size: variant.size });
                                        }}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Edit variant"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedVariants = formData.variants?.filter(v =>
                                            !(v.color === variant.color && v.size === variant.size)
                                          ) || [];

                                          // Extract unique sizes from remaining variants
                                          const uniqueSizes = Array.from(new Set(updatedVariants.map(v => v.size)));

                                          setFormData({
                                            ...formData,
                                            variants: updatedVariants,
                                            sizes: uniqueSizes  // Auto-update sizes array
                                          });
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                        title="Delete variant"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> Select a color, enter size and quantity, then click "Add Variant". To update existing variants, click the pencil icon.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing & Promotions Section */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm">4</span>
                    Pricing & Promotions
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 ml-10">Set up discounts and voucher codes (optional)</p>

                  {/* Discount Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Discount
                      </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.discount?.enabled || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          discount: {
                            enabled: e.target.checked,
                            type: formData.discount?.type || 'percentage',
                            value: formData.discount?.value || 0
                          }
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Enable Discount</span>
                    </label>
                  </div>

                  {formData.discount?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Type
                        </label>
                        <select
                          value={formData.discount?.type || 'percentage'}
                          onChange={(e) => setFormData({
                            ...formData,
                            discount: {
                              enabled: formData.discount?.enabled || false,
                              type: e.target.value as 'percentage' | 'fixed',
                              value: formData.discount?.value || 0
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (IDR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Value
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.discount?.value || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            discount: {
                              enabled: formData.discount?.enabled || false,
                              type: formData.discount?.type || 'percentage',
                              value: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Voucher Section */}
                  <div className="border-t border-gray-300 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                        <Ticket className="w-5 h-5" />
                        Voucher
                      </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.voucher?.enabled || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          voucher: {
                            enabled: e.target.checked,
                            code: formData.voucher?.code || '',
                            discountType: formData.voucher?.discountType || 'percentage',
                            discountValue: formData.voucher?.discountValue || 0,
                            expiryDate: formData.voucher?.expiryDate || ''
                          }
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Enable Voucher</span>
                    </label>
                  </div>

                  {formData.voucher?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Voucher Code
                        </label>
                        <input
                          type="text"
                          value={formData.voucher?.code || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            voucher: {
                              enabled: formData.voucher?.enabled || false,
                              code: e.target.value.toUpperCase(),
                              discountType: formData.voucher?.discountType || 'percentage',
                              discountValue: formData.voucher?.discountValue || 0,
                              expiryDate: formData.voucher?.expiryDate || ''
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                          placeholder="e.g., SAVE20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.voucher?.expiryDate || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            voucher: {
                              enabled: formData.voucher?.enabled || false,
                              code: formData.voucher?.code || '',
                              discountType: formData.voucher?.discountType || 'percentage',
                              discountValue: formData.voucher?.discountValue || 0,
                              expiryDate: e.target.value
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Type
                        </label>
                        <select
                          value={formData.voucher?.discountType || 'percentage'}
                          onChange={(e) => setFormData({
                            ...formData,
                            voucher: {
                              enabled: formData.voucher?.enabled || false,
                              code: formData.voucher?.code || '',
                              discountType: e.target.value as 'percentage' | 'fixed',
                              discountValue: formData.voucher?.discountValue || 0,
                              expiryDate: formData.voucher?.expiryDate || ''
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (IDR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Value
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.voucher?.discountValue || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            voucher: {
                              enabled: formData.voucher?.enabled || false,
                              code: formData.voucher?.code || '',
                              discountType: formData.voucher?.discountType || 'percentage',
                              discountValue: parseFloat(e.target.value) || 0,
                              expiryDate: formData.voucher?.expiryDate || ''
                            }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{editingProduct ? 'Updating...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {confirmModal.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
