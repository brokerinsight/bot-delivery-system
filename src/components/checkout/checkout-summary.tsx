'use client';

import { motion } from 'framer-motion';
import { useCartStore, formatPrice } from '@/lib/cart';
import { ShoppingCartIcon, TagIcon } from '@heroicons/react/24/outline';

export function CheckoutSummary() {
  const { items, getTotalPrice, getTotalItems } = useCartStore();

  const subtotal = getTotalPrice();
  const tax = 0; // No tax for digital products
  const discount = 0; // Future feature
  const total = subtotal - discount + tax;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Order Summary Header */}
      <div className="flex items-center space-x-3">
        <ShoppingCartIcon className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
          Order Summary
        </h2>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={`${item.product.item}-${item.quantity}`}
            className="flex items-center justify-between py-3 border-b border-secondary-200 dark:border-secondary-700"
          >
            <div className="flex-1">
              <h3 className="font-medium text-secondary-800 dark:text-secondary-200 line-clamp-2">
                {item.product.name}
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                {item.product.category}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-500">
                Qty: {item.quantity}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-secondary-800 dark:text-secondary-200">
                {formatPrice(item.product.price * item.quantity)}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-secondary-500">
                  {formatPrice(item.product.price)} each
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex justify-between text-secondary-600 dark:text-secondary-400">
          <span>Subtotal ({getTotalItems()} items)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center space-x-1">
              <TagIcon className="w-4 h-4" />
              <span>Discount</span>
            </span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between text-secondary-600 dark:text-secondary-400">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold text-secondary-800 dark:text-secondary-200 pt-3 border-t border-secondary-200 dark:border-secondary-700">
          <span>Total</span>
          <span className="text-primary-600 dark:text-primary-400">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Security Badge */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Secure Checkout
          </span>
        </div>
        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
          Your payment information is encrypted and secure
        </p>
      </div>

      {/* Instant Download Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
          🚀 Instant Download
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Get immediate access to your trading bots after payment confirmation
        </p>
      </div>

      {/* Support Info */}
      <div className="text-center">
        <p className="text-xs text-secondary-500 dark:text-secondary-500">
          Need help? Contact support 24/7
        </p>
      </div>
    </motion.div>
  );
}