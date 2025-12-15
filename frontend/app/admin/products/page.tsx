'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Tag, Ticket, Package, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsService, Product as APIProduct } from '@/lib/services/products';
import { formatIDR } from '@/lib/utils/currency';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/utils/csv-export';

// Map API Product type to local Product type
interface Product extends APIProduct {
  createdAt: string;
}

// Helper component to display product image (now using base64 data URLs)
const ProductImage = ({ images, productName, className }: { images: string[]; productName: string; className?: string }) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = images && images.length > 0 ? images[0] : '';

  if (hasError || !imageUrl) {
    return (
      <div className={`rounded bg-gray-200 flex items-center justify-center flex-shrink-0 ${className || 'w-12 h-12'}`}>
        <Package className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [formData, setFormData] = useState<Product>({
    id: 0,
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    image: '',
    images: [],
    colors: [],
    sizes: [],
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
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Load products from API on mount
  useEffect(() => {
    fetchProducts();
  }, []);

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
      console.error('Failed to fetch products:', err);
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
      setFormData({
        ...product,
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
      setImageFiles([]);
      setImagePreviews([]);
    } else {
      setEditingProduct(null);
      setFormData({
        id: Date.now(),
        name: '',
        description: '',
        price: 0,
        category: '',
        stock: 0,
        images: [],
        colors: [],
        sizes: [],
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
    }
    setColorInput('');
    setSizeInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleExportCSV = () => {
    const csvData = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      discount_enabled: product.discount?.enabled ? 'Yes' : 'No',
      discount_type: product.discount?.type || '',
      discount_value: product.discount?.value || '',
      created_at: product.created_at || product.createdAt,
    }));

    const columns = [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { header: 'Price', key: 'price', format: formatCurrencyForCSV },
      { header: 'Category', key: 'category' },
      { header: 'Stock', key: 'stock' },
      { header: 'Discount Enabled', key: 'discount_enabled' },
      { header: 'Discount Type', key: 'discount_type' },
      { header: 'Discount Value', key: 'discount_value' },
      { header: 'Created At', key: 'created_at', format: formatDateForCSV },
    ];

    const filename = `products_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(csvData, columns, filename);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setImageFiles(prev => [...prev, ...newFiles]);

      // Generate previews for all new files
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        stock: formData.stock,
        colors: formData.colors || [],
        sizes: formData.sizes || [],
        discount: formData.discount,
        voucher: formData.voucher
      };

      if (editingProduct) {
        // Update existing product (replace images if new ones are provided)
        await productsService.update(formData.id, productData, imageFiles.length > 0 ? imageFiles : undefined, true);
      } else {
        // Add new product
        await productsService.create(productData, imageFiles.length > 0 ? imageFiles : undefined);
      }

      // Refresh products list
      await fetchProducts();
      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setError(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setLoading(true);
      try {
        await productsService.delete(id);
        await fetchProducts();
      } catch (err: any) {
        console.error('Failed to delete product:', err);
        setError(err.response?.data?.detail || 'Failed to delete product');
      } finally {
        setLoading(false);
      }
    }
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

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          disabled={products.length === 0}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colors
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

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

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
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        placeholder="e.g., Fashion, Outerwear, Accessories"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter any category name</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Images
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                      />
                      <p className="text-xs text-gray-500 mt-1">You can select multiple images</p>

                      <div className="mt-3">
                        {/* Show existing images */}
                        {editingProduct && formData.images && formData.images.length > 0 && imagePreviews.length === 0 && (
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Current images:</p>
                            <div className="flex flex-wrap gap-2">
                              {formData.images.map((img, idx) => (
                                <div key={idx} className="relative">
                                  <img
                                    src={img}
                                    alt={`Current ${idx + 1}`}
                                    className="w-20 h-20 rounded object-cover border border-gray-200"
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Select new images to replace all current images
                            </p>
                          </div>
                        )}

                        {/* Show new image previews */}
                        {imagePreviews.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 mb-2">New images to upload:</p>
                            <div className="flex flex-wrap gap-2">
                              {imagePreviews.map((preview, idx) => (
                                <div key={idx} className="relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-20 h-20 rounded object-cover border border-gray-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
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
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock *
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        required
                      />
                    </div>

                    {/* Colors Section */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Colors
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="color"
                          value={colorInput || '#000000'}
                          onChange={(e) => setColorInput(e.target.value)}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                          placeholder="Enter hex color (e.g., #FF0000)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (colorInput && !formData.colors?.includes(colorInput)) {
                              setFormData({
                                ...formData,
                                colors: [...(formData.colors || []), colorInput]
                              });
                              setColorInput('');
                            }
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Add Color
                        </button>
                      </div>
                      {formData.colors && formData.colors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.colors.map((color, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg border border-gray-300"
                            >
                              <div
                                className="w-5 h-5 rounded border border-gray-300"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm text-gray-700">{color}</span>
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
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sizes Section */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Sizes
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={sizeInput}
                          onChange={(e) => setSizeInput(e.target.value)}
                          placeholder="Enter size (e.g., XS, S, M, L, XL)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (sizeInput && !formData.sizes?.includes(sizeInput)) {
                              setFormData({
                                ...formData,
                                sizes: [...(formData.sizes || []), sizeInput]
                              });
                              setSizeInput('');
                            }
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Add Size
                        </button>
                      </div>
                      {formData.sizes && formData.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.sizes.map((size, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg border border-gray-300"
                            >
                              <span className="text-sm text-gray-700">{size}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    sizes: formData.sizes?.filter((_, i) => i !== index)
                                  });
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discount Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Discount
                    </h3>
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
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      Voucher
                    </h3>
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

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
