'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product } from '@/types';

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default placeholder image
  const defaultImage = '/api/placeholder/600/400';
  
  // Use product image or fallback to default
  const imageUrl = imageError ? defaultImage : (product.image || defaultImage);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-4"
    >
      {/* Main Product Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-900 rounded-2xl overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          priority
        />
        
        {/* Image overlay with product info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-4 left-4 right-4">
            <div className="glass-card rounded-lg p-3">
              <p className="text-white text-sm font-medium">
                {product.name}
              </p>
              <p className="text-white/80 text-xs">
                Click to view full size
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Badge Indicators */}
      <div className="flex items-center justify-center space-x-3">
        {product.isNew && (
          <div className="px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
            NEW
          </div>
        )}
        <div className="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 text-xs font-medium rounded-full">
          {product.category}
        </div>
        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
          Instant Download
        </div>
      </div>

      {/* Product Features Icons */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-8 h-8 mx-auto mb-2 text-2xl">⚡</div>
          <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
            Fast Setup
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-8 h-8 mx-auto mb-2 text-2xl">🛡️</div>
          <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
            Risk Control
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-8 h-8 mx-auto mb-2 text-2xl">📈</div>
          <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
            Profitable
          </p>
        </div>
      </div>

      {/* File Information */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-3 text-sm">
          File Information
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-secondary-600 dark:text-secondary-400">File Type:</span>
            <span className="text-secondary-800 dark:text-secondary-200 font-medium">
              {product.originalFileName?.endsWith('.xml') ? 'XML Bot File' : 'Bot File'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600 dark:text-secondary-400">Category:</span>
            <span className="text-secondary-800 dark:text-secondary-200 font-medium">
              {product.category}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600 dark:text-secondary-400">File Name:</span>
            <span className="text-secondary-800 dark:text-secondary-200 font-medium">
              {product.originalFileName || `${product.item}.xml`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600 dark:text-secondary-400">Download:</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              Instant
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}