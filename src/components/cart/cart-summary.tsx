'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TagIcon, GiftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCartStore, formatPrice, calculateTax } from '@/lib/cart';

export function CartSummary() {
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const { items, getTotalPrice, getTotalItems } = useCartStore();

  const subtotal = getTotalPrice();
  const tax = calculateTax(subtotal);
  const discount = isPromoApplied ? promoDiscount : 0;
  const total = subtotal + tax - discount;

  const handlePromoCode = () => {
    // Mock promo code validation
    if (promoCode.toLowerCase() === 'welcome10') {
      setIsPromoApplied(true);
      setPromoDiscount(subtotal * 0.1); // 10% discount
    } else if (promoCode.toLowerCase() === 'save20') {
      setIsPromoApplied(true);
      setPromoDiscount(subtotal * 0.2); // 20% discount
    } else {
      setIsPromoApplied(false);
      setPromoDiscount(0);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setIsPromoApplied(false);
    setPromoDiscount(0);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6 space-y-6"
    >
      {/* Summary Header */}
      <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
        Order Summary
      </h2>

      {/* Promo Code */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <TagIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
          <span className="text-secondary-700 dark:text-secondary-300 font-medium">
            Promo Code
          </span>
        </div>
        
        {!isPromoApplied ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="flex-1 px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg text-secondary-800 dark:text-secondary-200 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handlePromoCode}
              disabled={!promoCode.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:dark:bg-secondary-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <GiftIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                {promoCode.toUpperCase()} Applied
              </span>
            </div>
            <button
              onClick={removePromoCode}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <div className="flex justify-between items-center">
          <span className="text-secondary-600 dark:text-secondary-400">
            Subtotal ({getTotalItems()} items)
          </span>
          <span className="font-semibold text-secondary-800 dark:text-secondary-200">
            {formatPrice(subtotal)}
          </span>
        </div>

        {isPromoApplied && (
          <div className="flex justify-between items-center">
            <span className="text-green-600 dark:text-green-400">
              Discount ({promoCode.toUpperCase()})
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              -{formatPrice(discount)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1">
            <span className="text-secondary-600 dark:text-secondary-400">Tax</span>
            <InformationCircleIcon className="w-4 h-4 text-secondary-400" title="VAT included where applicable" />
          </div>
          <span className="font-semibold text-secondary-800 dark:text-secondary-200">
            {formatPrice(tax)}
          </span>
        </div>

        <div className="border-t border-secondary-200 dark:border-secondary-700 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
              Total
            </span>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <Link
        href="/checkout"
        className="block w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        Proceed to Checkout
      </Link>

      {/* Security Notice */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-secondary-500 dark:text-secondary-500">
          <span>🔒</span>
          <span>Secure SSL encrypted checkout</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
          We Accept
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center justify-center p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              M-Pesa
            </span>
          </div>
          <div className="flex items-center justify-center p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Crypto
            </span>
          </div>
          <div className="flex items-center justify-center p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Card
            </span>
          </div>
        </div>
      </div>

      {/* Savings Info */}
      {subtotal > 500 && (
        <div className="p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <GiftIcon className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <span className="font-semibold text-accent-700 dark:text-accent-300">
              Great Choice!
            </span>
          </div>
          <p className="text-sm text-accent-600 dark:text-accent-400">
            You qualify for our premium support package with purchases over $500.
          </p>
        </div>
      )}
    </motion.div>
  );
}