'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  TrashIcon, 
  MinusIcon, 
  PlusIcon,
  ShoppingBagIcon 
} from '@heroicons/react/24/outline';
import { useCartStore, formatPrice } from '@/lib/cart';
import toast from 'react-hot-toast';

export function CartContent() {
  const { items, updateQuantity, removeItem, clearCart, getTotalItems } = useCartStore();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
      toast.success('Item removed from cart');
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast.success(`${productName} removed from cart`);
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Cart cleared');
  };

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-12 text-center"
      >
        <div className="w-32 h-32 mx-auto mb-6 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center">
          <ShoppingBagIcon className="w-16 h-16 text-secondary-400 dark:text-secondary-600" />
        </div>
        <h3 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Your cart is empty
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-8">
          Discover amazing trading bots and start building your automated trading strategy.
        </p>
        <Link
          href="/store"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
        >
          Browse Trading Bots
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
          Cart Items ({getTotalItems()})
        </h2>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Items */}
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.product.item}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Product Image */}
              <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                <Image
                  src={item.product.image || '/api/placeholder/150/150'}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/product/${item.product.item}`}
                  className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-1">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                  Category: {item.product.category}
                </p>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(item.product.price)}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleQuantityChange(item.product.item, item.quantity - 1)}
                  className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                </button>
                
                <span className="w-12 text-center font-semibold text-secondary-800 dark:text-secondary-200">
                  {item.quantity}
                </span>
                
                <button
                  onClick={() => handleQuantityChange(item.product.item, item.quantity + 1)}
                  className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right">
                <div className="text-lg font-bold text-secondary-800 dark:text-secondary-200">
                  {formatPrice(item.product.price * item.quantity)}
                </div>
                {item.quantity > 1 && (
                  <div className="text-sm text-secondary-500 dark:text-secondary-500">
                    {formatPrice(item.product.price)} each
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveItem(item.product.item, item.product.name)}
                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                aria-label="Remove item"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Continue Shopping */}
      <div className="pt-6 border-t border-secondary-200 dark:border-secondary-700">
        <Link
          href="/store"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
        >
          <span>← Continue Shopping</span>
        </Link>
      </div>
    </div>
  );
}