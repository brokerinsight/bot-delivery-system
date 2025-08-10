'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { QuillEditor, QuillEditorRef } from '@/components/ui/quill-editor';

interface AddBotSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onSave: (payload?: any) => Promise<boolean>;
}

interface ProductForm {
  item: string;
  name: string;
  price: string;
  desc: string;
  embed: string;
  category: string;
  img: string;
  isNew: boolean;
}

export function AddBotSection({ data, onDataUpdate, onSave }: AddBotSectionProps) {
  const [form, setForm] = useState<ProductForm>({
    item: '',
    name: '',
    price: '',
    desc: '',
    embed: '',
    category: 'General',
    img: '',
    isNew: false
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<QuillEditorRef>(null);
  
  const categories = data.categories || ['General'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      
      setFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  const resetForm = () => {
    setForm({
      item: '',
      name: '',
      price: '',
      desc: '',
      embed: '',
      category: 'General',
      img: '',
      isNew: false
    });
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (descriptionEditorRef.current) {
      descriptionEditorRef.current.clear();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.item.trim()) {
      toast.error('Item ID is required');
      return;
    }
    
    if (!form.name.trim()) {
      toast.error('Bot name is required');
      return;
    }
    
    if (!form.price || parseFloat(form.price) <= 0) {
      toast.error('Valid price is required');
      return;
    }
    
    if (!file) {
      toast.error('Bot file is required');
      return;
    }

    // Check if item ID already exists
    const existingProduct = data.products?.find((p: any) => p.item === form.item.trim());
    if (existingProduct) {
      toast.error('Item ID already exists');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('item', form.item.trim());
      formData.append('name', form.name.trim());
      formData.append('price', form.price);
      formData.append('desc', form.desc);
      formData.append('embed', form.embed.trim());
      formData.append('category', form.category);
      formData.append('img', form.img.trim());
      formData.append('isNew', form.isNew.toString());

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch('/api/add-product', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();
      
      if (result.success && result.product) {
        // Update local data with the new product
        const updatedProducts = [...(data.products || []), result.product];
        onDataUpdate({ products: updatedProducts });
        
        resetForm();
        toast.success('Bot added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add bot');
      }
    } catch (error: any) {
      console.error('Error adding bot:', error);
      toast.error(error.message || 'Failed to add bot');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
          Add New Bot
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Upload a new trading bot to your store.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item ID *
                </label>
                <input
                  type="text"
                  value={form.item}
                  onChange={(e) => setForm({...form, item: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter unique item ID (e.g., BOT001)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this bot. Cannot be changed later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter bot name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (KES) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({...form, price: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter price in KES"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  value={form.img}
                  onChange={(e) => setForm({...form, img: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://example.com/bot-image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: URL to bot preview image
                </p>
              </div>

              {/* Mark as New Checkbox */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(e) => setForm({...form, isNew: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as New</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Display "NEW" badge on the bot
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Embed Code
                </label>
                <textarea
                  value={form.embed}
                  onChange={(e) => setForm({...form, embed: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Paste video embed code here (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Embed code for demo video
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".zip,.rar,.7z,.tar,.gz,.json,.xml,.ex4,.ex5,.mq4,.mq5"
                  />
                  
                  {file ? (
                    <div className="space-y-2">
                      <DocumentIcon className="w-12 h-12 text-green-500 mx-auto" />
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-green-600 hover:text-green-700 text-sm"
                      >
                        Change file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Click to upload bot file
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Choose File
                      </button>
                      <p className="text-xs text-gray-500">
                        Supported: .zip, .rar, .7z, .tar, .gz, .json, .xml, .ex4, .ex5, .mq4, .mq5
                      </p>
                      <p className="text-xs text-gray-500">
                        Max size: 100MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <QuillEditor
              ref={descriptionEditorRef}
              value={form.desc}
              onChange={(value) => setForm({...form, desc: value})}
              placeholder="Enter detailed description of the bot's features and functionality..."
              toolbar="full"
              minHeight="200px"
            />
            <p className="text-xs text-gray-500 mt-2">
              Use rich formatting to create an appealing description that highlights the bot's key features and benefits.
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Uploading bot...
                </span>
                <span className="text-sm text-blue-600">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className={`px-6 py-3 rounded-lg font-medium ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white transition-colors`}
            >
              {uploading ? 'Adding Bot...' : 'Add Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}