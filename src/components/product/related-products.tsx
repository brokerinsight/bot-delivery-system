'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCartStore, formatPrice } from '@/lib/cart';
import { Product } from '@/types';
import { ArrowRightIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface RelatedProductsProps {
  currentProduct: Product;
}

export function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchRelatedProducts();
  }, [currentProduct]);

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.products) {
          const allProducts = result.data.products.filter((p: Product) => !p.isArchived);
          
          // Get related products based on category and exclude current product
          let related = allProducts.filter((p: Product) => 
            p.category === currentProduct.category && p.item !== currentProduct.item
          );
          
          // If not enough products in same category, add random products
          if (related.length < 4) {
            const otherProducts = allProducts.filter((p: Product) => 
              p.category !== currentProduct.category && p.item !== currentProduct.item
            );
            related = [...related, ...otherProducts].slice(0, 4);
          } else {
            related = related.slice(0, 4);
          }
          
          setRelatedProducts(related);
        }
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">
          Related Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200">
          Related Products
        </h2>
        <Link
          href="/store"
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <span>View All</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product, index) => (
          <motion.div
            key={product.item}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="glass-card rounded-xl overflow-hidden hover-lift group"
          >
            <div className="relative">
              <Link href={`/product/${product.item}`}>
                <Image
                  src={product.image || '/api/placeholder/400/300'}
                  alt={product.name}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/400/300';
                  }}
                />
              </Link>
              
              {product.isNew && (
                <span className="absolute top-3 right-3 px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                  NEW
                </span>
              )}
              
              {/* Quick Add to Cart */}
              <button
                onClick={() => handleAddToCart(product)}
                className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-secondary-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                title="Add to Cart"
              >
                <ShoppingCartIcon className="w-5 h-5 text-primary-600" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">
                  {product.category}
                </p>
                <Link href={`/product/${product.item}`}>
                  <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 line-clamp-2 hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                </Link>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(product.price)}
                </span>
                
                <div className="flex items-center space-x-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3 h-3 ${i < 4 ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-secondary-500">4.8</span>
                </div>
              </div>
              
              <Link
                href={`/product/${product.item}`}
                className="block w-full text-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                View Details
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Browse More CTA */}
      <div className="text-center pt-8">
        <Link
          href="/store"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-700 hover:to-accent-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
        >
          <span>Browse All Products</span>
          <ArrowRightIcon className="w-5 h-5" />
        </Link>
      </div>
    </motion.div>
  );
}