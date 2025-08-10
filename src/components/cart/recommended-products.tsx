'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCartStore, formatPrice } from '@/lib/cart';
import { Product } from '@/types';
import toast from 'react-hot-toast';

export function RecommendedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchRecommendedProducts();
  }, []);

  const fetchRecommendedProducts = async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.products) {
          // Get 4 random products for recommendations
          const activeProducts = result.data.products.filter((p: Product) => !p.isArchived);
          const shuffled = [...activeProducts].sort(() => 0.5 - Math.random());
          setProducts(shuffled.slice(0, 4));
        }
      }
    } catch (error) {
      console.error('Error fetching recommended products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
          Recommended for You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
        Recommended for You
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((product, index) => (
          <motion.div
            key={product.item}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="glass-card rounded-xl p-4 hover-lift"
          >
            <div className="relative mb-3">
              <Image
                src={product.image || '/api/placeholder/300/200'}
                alt={product.name}
                width={300}
                height={200}
                className="w-full h-32 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/api/placeholder/300/200';
                }}
              />
              {product.isNew && (
                <span className="absolute top-2 right-2 px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                  NEW
                </span>
              )}
            </div>
            
            <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2 line-clamp-2">
              {product.name}
            </h3>
            
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3 line-clamp-2">
              {product.category}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(product.price)}
              </span>
              
              <div className="flex space-x-2">
                <Link
                  href={`/product/${product.item}`}
                  className="px-3 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                >
                  View
                </Link>
                
                <button
                  onClick={() => handleAddToCart(product)}
                  className="px-3 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}