'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { QuillEditor, QuillEditorRef } from '@/components/ui/quill-editor';

interface ManageBotsSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onSave: (payload?: any) => Promise<boolean>;
}

interface Product {
  item: string;
  name: string;
  price: number;
  desc: string;
  embed: string;
  category: string;
  img: string;
  fileId?: string;
  originalFileName?: string;
}

export function ManageBotsSection({ data, onDataUpdate, onSave }: ManageBotsSectionProps) {
  const [products, setProducts] = useState<Product[]>(data.products || []);
  const [categories] = useState(data.categories || ['General']);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [originalItem, setOriginalItem] = useState('');
  const editDescriptionEditorRef = useRef<QuillEditorRef>(null);

  useEffect(() => {
    setProducts(data.products || []);
  }, [data.products]);

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setOriginalItem(product.item);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
    setOriginalItem('');
  };

  const saveEdit = async () => {
    if (!editingProduct) return;

    // Validation
    if (!editingProduct.item || !editingProduct.name || !editingProduct.price) {
      toast.error('Item ID, name, and price are required');
      return;
    }

    // Check if item ID changed and already exists
    if (editingProduct.item !== originalItem) {
      const existingProduct = products.find(p => p.item === editingProduct.item && p.item !== originalItem);
      if (existingProduct) {
        toast.error('Item ID already exists');
        return;
      }
    }

    try {
      // Update local products array
      let updatedProducts = [...products];
      const productIndex = updatedProducts.findIndex(p => p.item === originalItem);
      
      if (productIndex !== -1) {
        if (editingProduct.item !== originalItem) {
          // Item ID changed: remove old, add new
          updatedProducts.splice(productIndex, 1);
          updatedProducts.push(editingProduct);
        } else {
          // Item ID same: update in place
          updatedProducts[productIndex] = editingProduct;
        }
      }

      // Prepare payload for server
      const payload: any = { ...editingProduct };
      if (editingProduct.item !== originalItem) {
        payload.originalItem = originalItem;
      }

      // Call server update
      const response = await fetch('/api/update-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setProducts(updatedProducts);
        onDataUpdate({ products: updatedProducts });
        closeEditModal();
        toast.success('Bot updated successfully');
      } else {
        toast.error(result.error || 'Failed to update bot');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update bot');
    }
  };

  const deleteProduct = async (item: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/delete-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        const updatedProducts = products.filter(p => p.item !== item);
        setProducts(updatedProducts);
        onDataUpdate({ products: updatedProducts });
        toast.success('Bot deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete bot');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete bot');
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
          Manage Bots
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Edit, delete, and manage your trading bots.
        </p>
      </div>

      {/* Products List */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Trading Bots ({products.length})</h3>
        
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No bots found</p>
            <p className="text-gray-400">Add your first bot to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.item} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      {product.img && (
                        <img 
                          src={product.img} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">Item ID: {product.item}</p>
                        <p className="text-sm text-gray-500">Category: {product.category}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Price</p>
                        <p className="text-lg font-bold text-green-600">KES {product.price}</p>
                      </div>
                      
                      {product.embed && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Video Embed</p>
                          <p className="text-sm text-gray-500 truncate">{product.embed}</p>
                        </div>
                      )}
                    </div>
                    
                    {product.desc && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                        <div 
                          className="text-sm text-gray-600 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: product.desc.substring(0, 200) + (product.desc.length > 200 ? '...' : '') }}
                        />
                      </div>
                    )}
                    
                    {product.originalFileName && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">File</p>
                        <p className="text-sm text-gray-500">{product.originalFileName}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Bot"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => deleteProduct(product.item)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Bot"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Bot</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item ID *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.item}
                    onChange={(e) => setEditingProduct({...editingProduct, item: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter unique item ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bot Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter bot name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={editingProduct.img}
                    onChange={(e) => setEditingProduct({...editingProduct, img: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Embed Code
                  </label>
                  <textarea
                    value={editingProduct.embed}
                    onChange={(e) => setEditingProduct({...editingProduct, embed: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    placeholder="Paste video embed code here..."
                  />
                </div>

                {editingProduct.originalFileName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current File
                    </label>
                    <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      {editingProduct.originalFileName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      To change the file, please create a new bot instead.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <QuillEditor
                ref={editDescriptionEditorRef}
                value={editingProduct.desc}
                onChange={(value) => setEditingProduct({...editingProduct, desc: value})}
                placeholder="Enter bot description..."
                toolbar="full"
                minHeight="180px"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use rich formatting to create an appealing description that highlights the bot's key features.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}