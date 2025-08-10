'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingCartIcon, 
  HeartIcon, 
  StarIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useCartStore, formatPrice } from '@/lib/cart';
import { Product, SearchParams } from '@/types';
import toast from 'react-hot-toast';

interface ProductGridProps {
  searchParams: SearchParams;
}

// Mock data - replace with actual API call
const mockProducts: Product[] = [
  {
    item: 'advanced-martingale-bot',
    file_id: 'file_1',
    price: 299,
    name: 'Advanced Martingale Bot',
    description: 'Professional martingale strategy with advanced risk management and customizable settings for binary options trading.',
    image: '/api/placeholder/400/300',
    category: 'Martingale',
    embed: '<iframe>...</iframe>',
    is_new: true,
    is_archived: false,
    original_file_name: 'advanced_martingale.xml',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    item: 'scalping-master-pro',
    file_id: 'file_2',
    price: 199,
    name: 'Scalping Master Pro',
    description: 'High-frequency scalping bot designed for quick profits in volatile markets with built-in stop-loss protection.',
    image: '/api/placeholder/400/300',
    category: 'Scalping',
    embed: '<iframe>...</iframe>',
    is_new: false,
    is_archived: false,
    original_file_name: 'scalping_master.xml',
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    item: 'trend-follower-ai',
    file_id: 'file_3',
    price: 399,
    name: 'AI Trend Follower',
    description: 'Machine learning powered trend analysis bot that adapts to market conditions automatically.',
    image: '/api/placeholder/400/300',
    category: 'AI Trading',
    embed: '<iframe>...</iframe>',
    is_new: true,
    is_archived: false,
    original_file_name: 'ai_trend_follower.xml',
    created_at: '2024-01-20T10:00:00Z',
  },
];

export function ProductGrid({ searchParams }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { addItem } = useCartStore();

  // Filter products based on search params
  useEffect(() => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      let filteredProducts = mockProducts;

      // Apply search filter
      if (searchParams.query) {
        const query = searchParams.query.toLowerCase();
        filteredProducts = filteredProducts.filter(product =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
        );
      }

      // Apply category filter
      if (searchParams.category) {
        filteredProducts = filteredProducts.filter(product =>
          product.category.toLowerCase() === searchParams.category?.toLowerCase()
        );
      }

      // Apply sorting
      if (searchParams.sort) {
        switch (searchParams.sort) {
          case 'price_asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
          case 'price_desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
          case 'name_asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'name_desc':
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
          case 'newest':
            filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            break;
          case 'oldest':
            filteredProducts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            break;
        }
      }

      setProducts(filteredProducts);
      setLoading(false);
    }, 500);
  }, [searchParams]);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(productId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return <ProductGridSkeleton />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-32 h-32 mx-auto mb-6 opacity-50">
          <div className="w-full h-full bg-secondary-200 dark:bg-secondary-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">🤖</span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
          No trading bots found
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          Try adjusting your search or filter criteria
        </p>
        
        {/* Custom Bot Suggestion */}
        <div className="max-w-md mx-auto bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
            Can't Find What You Need?
          </h4>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
            Let us build a custom trading bot tailored specifically to your strategy and requirements.
          </p>
          <a
            href="/custom-bot"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            <span>Request Custom Bot</span>
            <span>→</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <motion.div
          key={product.item}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="group glass-card rounded-2xl overflow-hidden hover-lift"
        >
          {/* Product Image */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={product.image || '/api/placeholder/400/300'}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-3">
                <Link
                  href={`/product/${product.item}`}
                  className="p-3 bg-white/90 hover:bg-white rounded-full transition-colors duration-200"
                >
                  <EyeIcon className="w-5 h-5 text-secondary-800" />
                </Link>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors duration-200"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col space-y-2">
              {product.is_new && (
                <span className="px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                  NEW
                </span>
              )}
            </div>

            {/* Favorite Button */}
            <button
              onClick={() => toggleFavorite(product.item)}
              className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-colors duration-200"
            >
              {favorites.has(product.item) ? (
                <HeartSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-secondary-600" />
              )}
            </button>
          </div>

          {/* Product Info */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                {product.category}
              </span>
              <div className="flex items-center space-x-1">
                <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">4.8</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-2 line-clamp-1">
              {product.name}
            </h3>

            <p className="text-secondary-600 dark:text-secondary-400 text-sm line-clamp-2 mb-4">
              {product.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(product.price)}
              </div>
              <button
                onClick={() => handleAddToCart(product)}
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="aspect-video bg-secondary-200 dark:bg-secondary-700 rounded-xl mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4" />
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-full" />
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-2/3" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-20" />
              <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}