'use client';

import { useState, useEffect } from 'react';
import { collectionsService, Collection } from '@/lib/services/collections';
import { Package, Plus, Edit, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await collectionsService.getAll();
      setCollections(data);
    } catch (err: any) {
      setError('Failed to load collections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (collection?: Collection) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        name: collection.name,
        description: collection.description || '',
      });
      setImagePreview(collection.image_url || '');
    } else {
      setEditingCollection(null);
      setFormData({ name: '', description: '' });
      setImagePreview('');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCollection(null);
    setFormData({ name: '', description: '' });
    setImageFile(null);
    setImagePreview('');
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingCollection) {
        await collectionsService.update(editingCollection.id, formData, imageFile || undefined);
      } else {
        await collectionsService.create(formData, imageFile || undefined);
      }
      await fetchCollections();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      setLoading(true);
      await collectionsService.delete(id);
      await fetchCollections();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections Management</h1>
            <p className="text-gray-600 mt-1">Manage collection images and descriptions</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Collection
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !isModalOpen ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {/* Collections Grid */}
            {collections.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No collections yet</p>
                <p className="text-gray-400 text-sm mt-2">Create your first collection to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <div key={collection.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Collection Image */}
                    <div className="relative h-48 bg-gray-100">
                      {collection.image_url ? (
                        <img
                          src={collection.image_url}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Collection Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{collection.name}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {collection.description || 'No description'}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(collection)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(collection.id)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCollection ? 'Edit Collection' : 'Add Collection'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6">
                {/* Collection Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                    placeholder="e.g., Summer 2024"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This name should match the collection name used in your products
                  </p>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                    placeholder="Describe this collection..."
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Image
                  </label>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingCollection ? 'Update Collection' : 'Create Collection'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
