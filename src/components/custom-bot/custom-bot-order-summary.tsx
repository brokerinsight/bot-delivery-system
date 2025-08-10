'use client';

import { motion } from 'framer-motion';
import { CustomBotOrder } from '@/types';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ClockIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface CustomBotOrderSummaryProps {
  order: CustomBotOrder;
}

export function CustomBotOrderSummary({ order }: CustomBotOrderSummaryProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Order Summary */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
          Order Summary
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-secondary-600 dark:text-secondary-400">Custom Bot Development</span>
            <span className="font-semibold text-secondary-800 dark:text-secondary-200">
              ${order.budget_amount}
            </span>
          </div>
          
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-secondary-800 dark:text-secondary-200">Total</span>
              <span className="text-xl font-bold text-primary-600">
                ${order.budget_amount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Order Details
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Tracking Number</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono text-secondary-800 dark:text-secondary-200">
                {order.tracking_number}
              </span>
              <button
                onClick={() => copyToClipboard(order.tracking_number, 'Tracking number')}
                className="p-1 text-secondary-500 hover:text-primary-600 transition-colors"
                title="Copy tracking number"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Order ID</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono text-secondary-800 dark:text-secondary-200">
                {order.ref_code}
              </span>
              <button
                onClick={() => copyToClipboard(order.ref_code, 'Order ID')}
                className="p-1 text-secondary-500 hover:text-primary-600 transition-colors"
                title="Copy order ID"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Email</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-secondary-800 dark:text-secondary-200">
                {order.client_email}
              </span>
              <button
                onClick={() => copyToClipboard(order.client_email, 'Email')}
                className="p-1 text-secondary-500 hover:text-primary-600 transition-colors"
                title="Copy email"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Payment Method</span>
            <span className="text-sm text-secondary-800 dark:text-secondary-200 capitalize">
              {order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Created</span>
            <span className="text-sm text-secondary-800 dark:text-secondary-200">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Requirements Preview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Your Requirements
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Bot Description
            </h4>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-800 rounded-lg p-3">
              {order.bot_description.length > 150 
                ? `${order.bot_description.substring(0, 150)}...` 
                : order.bot_description
              }
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Features
            </h4>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-800 rounded-lg p-3">
              {order.bot_features.length > 100 
                ? `${order.bot_features.substring(0, 100)}...` 
                : order.bot_features
              }
            </p>
          </div>
        </div>
      </div>

      {/* Refund Information */}
      {(order.refund_crypto_wallet || order.refund_mpesa_number) && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheckIcon className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
              Refund Information
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600 dark:text-secondary-400">Refund Method</span>
              <span className="text-sm text-secondary-800 dark:text-secondary-200 capitalize">
                {order.refund_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}
              </span>
            </div>

            {order.refund_method === 'crypto' && order.refund_crypto_wallet && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">Network</span>
                  <span className="text-sm text-secondary-800 dark:text-secondary-200">
                    {order.refund_crypto_network}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">Wallet</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-secondary-800 dark:text-secondary-200">
                      {order.refund_crypto_wallet.substring(0, 8)}...{order.refund_crypto_wallet.substring(-6)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(order.refund_crypto_wallet!, 'Wallet address')}
                      className="p-1 text-secondary-500 hover:text-primary-600 transition-colors"
                      title="Copy wallet address"
                    >
                      <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {order.refund_method === 'mpesa' && order.refund_mpesa_number && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">M-Pesa Number</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-secondary-800 dark:text-secondary-200">
                      {order.refund_mpesa_number}
                    </span>
                    <button
                      onClick={() => copyToClipboard(order.refund_mpesa_number!, 'M-Pesa number')}
                      className="p-1 text-secondary-500 hover:text-primary-600 transition-colors"
                      title="Copy M-Pesa number"
                    >
                      <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">Registered Name</span>
                  <span className="text-sm text-secondary-800 dark:text-secondary-200">
                    {order.refund_mpesa_name}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ClockIcon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Development Timeline
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>0-2 hours:</strong> Order review and confirmation
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>2-12 hours:</strong> Bot development and testing
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>12-24 hours:</strong> Quality assurance and delivery
            </span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <EnvelopeIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Stay Updated
          </h3>
        </div>

        <div className="space-y-3 text-sm text-secondary-600 dark:text-secondary-400">
          <p>
            You'll receive email notifications at each stage:
          </p>
          <ul className="space-y-1 pl-4">
            <li>• Payment confirmation</li>
            <li>• Development started</li>
            <li>• Bot completed and delivered</li>
          </ul>
          <p className="text-xs text-secondary-500 dark:text-secondary-500">
            All emails will be sent to {order.client_email}
          </p>
        </div>
      </div>
    </motion.div>
  );
}