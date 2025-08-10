'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  HeartIcon, 
  ShareIcon,
  StarIcon,
  ShieldCheckIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useCartStore, formatPrice } from '@/lib/cart';
import { Product } from '@/types';
import toast from 'react-hot-toast';

interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem(product, selectedQuantity);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    addItem(product, selectedQuantity);
    // Navigate to checkout
    window.location.href = '/checkout';
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Product Badge */}
      <div className="flex items-center space-x-3">
        {product.is_new && (
          <span className="px-3 py-1 bg-primary-600 text-white text-sm font-semibold rounded-full">
            NEW
          </span>
        )}
        <span className="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 text-sm font-medium rounded-full">
          {product.category}
        </span>
      </div>

      {/* Product Title */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-3">
          {product.name}
        </h1>
        
        {/* Rating */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`w-5 h-5 ${
                  i < 4 ? 'text-yellow-400 fill-current' : 'text-secondary-300 dark:text-secondary-600'
                }`}
              />
            ))}
          </div>
          <span className="text-secondary-600 dark:text-secondary-400 text-sm">
            4.8 (127 reviews)
          </span>
        </div>
      </div>

      {/* Product Description */}
      {product.description && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Description
          </h3>
          <div 
            className="prose prose-secondary max-w-none text-secondary-700 dark:text-secondary-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: product.description.replace(/<span class="ql-ui"[^>]*><\/span>/g, '').trim()
            }}
          />
        </div>
      )}

      {/* Embedded Content (Video/Demo) */}
      {product.embed && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Demo & Preview
          </h3>
          <div 
            className="w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
            dangerouslySetInnerHTML={{ __html: product.embed }}
          />
        </div>
      )}

      {/* Price */}
      <div className="space-y-2">
        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {formatPrice(product.price)}
        </div>
        <p className="text-secondary-600 dark:text-secondary-400 text-sm">
          One-time purchase • Instant download • Lifetime access
        </p>
      </div>

      {/* Key Features */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          What's Included
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: ShieldCheckIcon, text: 'Proven Strategy' },
            { icon: ClockIcon, text: '24/7 Automation' },
            { icon: CurrencyDollarIcon, text: 'Risk Management' },
            { icon: StarIcon, text: 'Premium Support' },
          ].map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <feature.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-secondary-700 dark:text-secondary-300 text-sm">
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-secondary-700 dark:text-secondary-300 font-medium">
          Quantity:
        </label>
        <select
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(Number(e.target.value))}
          className="px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <button
          onClick={handleBuyNow}
          className="w-full px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Buy Now - {formatPrice(product.price * selectedQuantity)}
        </button>
        
        <button
          onClick={handleAddToCart}
          className="w-full px-8 py-4 glass-card hover:glass-modal text-secondary-700 dark:text-secondary-300 font-semibold rounded-2xl transition-all duration-300 border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 dark:hover:border-primary-500 flex items-center justify-center space-x-2"
        >
          <ShoppingCartIcon className="w-5 h-5" />
          <span>Add to Cart</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-center space-x-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <button
          onClick={toggleFavorite}
          className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
        >
          {isFavorite ? (
            <HeartSolid className="w-5 h-5 text-red-500" />
          ) : (
            <HeartIcon className="w-5 h-5" />
          )}
          <span className="text-sm">
            {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          </span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
        >
          <ShareIcon className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Guarantees */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Our Guarantee
        </h3>
        <div className="space-y-3 text-sm text-secondary-600 dark:text-secondary-400">
          <div className="flex items-center space-x-3">
            <span className="text-green-500">✓</span>
            <span>30-day money-back guarantee</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500">✓</span>
            <span>Instant download after purchase</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500">✓</span>
            <span>Lifetime access and updates</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500">✓</span>
            <span>24/7 premium support</span>
          </div>
        </div>
      </div>

      {/* Custom Bot Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
              Need Something Different?
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
              Our ready-made bots are great, but sometimes you need something perfectly tailored to your strategy. 
              Get a custom bot built just for you with your exact requirements.
            </p>
            <a
              href="/custom-bot"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              <span>Request Custom Bot</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}