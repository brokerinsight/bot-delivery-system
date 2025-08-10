'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CustomBotOrderRequest } from '@/types';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const CRYPTO_NETWORKS = [
  'Bitcoin (BTC)',
  'Ethereum (ETH)',
  'Binance Smart Chain (BSC)',
  'Polygon (MATIC)',
  'Tron (TRX)',
  'Litecoin (LTC)',
  'Bitcoin Cash (BCH)',
  'Cardano (ADA)',
  'Solana (SOL)',
  'Avalanche (AVAX)'
];

export function CustomBotForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CustomBotOrderRequest>({
    client_email: '',
    bot_description: '',
    bot_features: '',
    budget_amount: 10,
    payment_method: 'mpesa',
    refund_method: 'mpesa',
    refund_crypto_wallet: '',
    refund_crypto_network: '',
    refund_mpesa_number: '',
    refund_mpesa_name: '',
    terms_accepted: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.client_email) {
      newErrors.client_email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Please enter a valid email address';
    }

    // Bot description validation
    if (!formData.bot_description || formData.bot_description.length < 50) {
      newErrors.bot_description = 'Please provide at least 50 characters describing your bot logic';
    }

    // Bot features validation
    if (!formData.bot_features || formData.bot_features.length < 20) {
      newErrors.bot_features = 'Please provide at least 20 characters describing desired features';
    }

    // Budget validation
    if (formData.budget_amount < 10) {
      newErrors.budget_amount = 'Budget must be at least $10';
    }

    // Refund method validation
    if (formData.refund_method === 'crypto') {
      if (!formData.refund_crypto_wallet) {
        newErrors.refund_crypto_wallet = 'Crypto wallet address is required';
      }
      if (!formData.refund_crypto_network) {
        newErrors.refund_crypto_network = 'Crypto network is required';
      }
    } else if (formData.refund_method === 'mpesa') {
      if (!formData.refund_mpesa_number) {
        newErrors.refund_mpesa_number = 'M-Pesa number is required';
      } else if (!/^254\d{9}$/.test(formData.refund_mpesa_number.replace(/\s+/g, ''))) {
        newErrors.refund_mpesa_number = 'Please enter a valid M-Pesa number (254XXXXXXXXX)';
      }
      if (!formData.refund_mpesa_name) {
        newErrors.refund_mpesa_name = 'M-Pesa registered name is required';
      }
    }

    // Terms validation
    if (!formData.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CustomBotOrderRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Budget validation with suggestion
    if (field === 'budget_amount' && value < 10 && value > 0) {
      setErrors(prev => ({ 
        ...prev, 
        budget_amount: 'Consider a higher budget for better features and complexity' 
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/custom-bot/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order created successfully! Redirecting to payment...');
        
        // Redirect to payment page with order details
        setTimeout(() => {
          router.push(`/custom-bot/payment/${result.ref_code}`);
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card rounded-3xl p-8"
    >
      <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
        Custom Bot Request Form
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Address */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            <EnvelopeIcon className="w-4 h-4 inline mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.client_email}
            onChange={(e) => handleInputChange('client_email', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-secondary-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
              errors.client_email ? 'border-red-500' : 'border-secondary-200 dark:border-secondary-700'
            }`}
            placeholder="your.email@example.com"
          />
          {errors.client_email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_email}</p>
          )}
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-500">
            Your custom bot will be delivered to this email address
          </p>
        </div>

        {/* Bot Description */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            <DocumentTextIcon className="w-4 h-4 inline mr-2" />
            Bot Logic Description *
          </label>
          <textarea
            value={formData.bot_description}
            onChange={(e) => handleInputChange('bot_description', e.target.value)}
            rows={6}
            className={`w-full px-4 py-3 bg-white dark:bg-secondary-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none ${
              errors.bot_description ? 'border-red-500' : 'border-secondary-200 dark:border-secondary-700'
            }`}
            placeholder="Describe your trading strategy in detail. For example: 'I want a bot that uses RSI indicator with overbought level at 70 and oversold at 30. When RSI goes below 30, buy with $1 stake. If trade loses, double the stake using martingale. Set stop loss at 3 consecutive losses...'"
          />
          <div className="flex justify-between items-center mt-1">
            {errors.bot_description && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.bot_description}</p>
            )}
            <p className="text-xs text-secondary-500 dark:text-secondary-500">
              {formData.bot_description.length}/50 characters minimum
            </p>
          </div>
        </div>

        {/* Bot Features */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Additional Features & Requirements
          </label>
          <textarea
            value={formData.bot_features}
            onChange={(e) => handleInputChange('bot_features', e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 bg-white dark:bg-secondary-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none ${
              errors.bot_features ? 'border-red-500' : 'border-secondary-200 dark:border-secondary-700'
            }`}
            placeholder="Specify any additional features you want: stop-loss mechanisms, profit targets, time-based restrictions, specific indicators, notifications, etc."
          />
          {errors.bot_features && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bot_features}</p>
          )}
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            <CurrencyDollarIcon className="w-4 h-4 inline mr-2" />
            Budget Amount (USD) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-500">$</span>
            <input
              type="number"
              min="10"
              step="1"
              value={formData.budget_amount}
              onChange={(e) => handleInputChange('budget_amount', parseInt(e.target.value) || 0)}
              className={`w-full pl-8 pr-4 py-3 bg-white dark:bg-secondary-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                errors.budget_amount ? 'border-red-500' : 'border-secondary-200 dark:border-secondary-700'
              }`}
              placeholder="50"
            />
          </div>
          {errors.budget_amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget_amount}</p>
          )}
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-500">
            Minimum $10. Higher budgets allow for more complex features and faster delivery.
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
            <CreditCardIcon className="w-4 h-4 inline mr-2" />
            Payment Method *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
              formData.payment_method === 'mpesa' 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
            }`}>
              <input
                type="radio"
                name="payment_method"
                value="mpesa"
                checked={formData.payment_method === 'mpesa'}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  formData.payment_method === 'mpesa' 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-secondary-300'
                }`}>
                  {formData.payment_method === 'mpesa' && (
                    <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-secondary-800 dark:text-secondary-200">M-Pesa</div>
                  <div className="text-xs text-secondary-500">Safaricom M-Pesa payment</div>
                </div>
              </div>
            </label>

            <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
              formData.payment_method === 'crypto' 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
            }`}>
              <input
                type="radio"
                name="payment_method"
                value="crypto"
                checked={formData.payment_method === 'crypto'}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  formData.payment_method === 'crypto' 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-secondary-300'
                }`}>
                  {formData.payment_method === 'crypto' && (
                    <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-secondary-800 dark:text-secondary-200">Cryptocurrency</div>
                  <div className="text-xs text-secondary-500">Bitcoin, Ethereum, etc.</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Refund Method */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Refund Information Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                Please provide refund details in case your bot requirements cannot be technically implemented.
              </p>

              <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                Preferred Refund Method *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.refund_method === 'mpesa' 
                    ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-800/30' 
                    : 'border-yellow-200 dark:border-yellow-700 hover:border-yellow-300'
                }`}>
                  <input
                    type="radio"
                    name="refund_method"
                    value="mpesa"
                    checked={formData.refund_method === 'mpesa'}
                    onChange={(e) => handleInputChange('refund_method', e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      formData.refund_method === 'mpesa' 
                        ? 'border-yellow-600 bg-yellow-600' 
                        : 'border-yellow-400'
                    }`}>
                      {formData.refund_method === 'mpesa' && (
                        <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">M-Pesa</span>
                  </div>
                </label>

                <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.refund_method === 'crypto' 
                    ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-800/30' 
                    : 'border-yellow-200 dark:border-yellow-700 hover:border-yellow-300'
                }`}>
                  <input
                    type="radio"
                    name="refund_method"
                    value="crypto"
                    checked={formData.refund_method === 'crypto'}
                    onChange={(e) => handleInputChange('refund_method', e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      formData.refund_method === 'crypto' 
                        ? 'border-yellow-600 bg-yellow-600' 
                        : 'border-yellow-400'
                    }`}>
                      {formData.refund_method === 'crypto' && (
                        <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Cryptocurrency</span>
                  </div>
                </label>
              </div>

              {/* Crypto Refund Details */}
              {formData.refund_method === 'crypto' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Cryptocurrency Network *
                    </label>
                    <select
                      value={formData.refund_crypto_network}
                      onChange={(e) => handleInputChange('refund_crypto_network', e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-yellow-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm ${
                        errors.refund_crypto_network ? 'border-red-500' : 'border-yellow-200 dark:border-yellow-600'
                      }`}
                    >
                      <option value="">Select Network</option>
                      {CRYPTO_NETWORKS.map(network => (
                        <option key={network} value={network}>{network}</option>
                      ))}
                    </select>
                    {errors.refund_crypto_network && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.refund_crypto_network}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Wallet Address *
                    </label>
                    <input
                      type="text"
                      value={formData.refund_crypto_wallet}
                      onChange={(e) => handleInputChange('refund_crypto_wallet', e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-yellow-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-mono ${
                        errors.refund_crypto_wallet ? 'border-red-500' : 'border-yellow-200 dark:border-yellow-600'
                      }`}
                      placeholder="0x1234567890abcdef..."
                    />
                    {errors.refund_crypto_wallet && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.refund_crypto_wallet}</p>
                    )}
                  </div>
                </div>
              )}

              {/* M-Pesa Refund Details */}
              {formData.refund_method === 'mpesa' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      M-Pesa Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.refund_mpesa_number}
                      onChange={(e) => handleInputChange('refund_mpesa_number', e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-yellow-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm ${
                        errors.refund_mpesa_number ? 'border-red-500' : 'border-yellow-200 dark:border-yellow-600'
                      }`}
                      placeholder="254712345678"
                    />
                    {errors.refund_mpesa_number && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.refund_mpesa_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      M-Pesa Registered Name *
                    </label>
                    <input
                      type="text"
                      value={formData.refund_mpesa_name}
                      onChange={(e) => handleInputChange('refund_mpesa_name', e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-yellow-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm ${
                        errors.refund_mpesa_name ? 'border-red-500' : 'border-yellow-200 dark:border-yellow-600'
                      }`}
                      placeholder="John Doe"
                    />
                    {errors.refund_mpesa_name && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.refund_mpesa_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms_accepted"
              checked={formData.terms_accepted}
              onChange={(e) => handleInputChange('terms_accepted', e.target.checked)}
              className={`mt-1 w-4 h-4 text-primary-600 border-2 rounded focus:ring-primary-500 ${
                errors.terms_accepted ? 'border-red-500' : 'border-secondary-300'
              }`}
            />
            <label htmlFor="terms_accepted" className="text-sm text-secondary-700 dark:text-secondary-300">
              I have read and agree to the{' '}
              <a 
                href="/terms/custom-bot-policy" 
                target="_blank" 
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Custom Bot Development Policy
              </a>{' '}
              and{' '}
              <a 
                href="/terms/privacy-policy" 
                target="_blank" 
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Privacy Policy
              </a>
              . I understand that development typically takes 24 hours and if my requirements are technically impossible, I will receive a full refund.
            </label>
          </div>
          {errors.terms_accepted && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.terms_accepted}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
              isSubmitting
                ? 'bg-secondary-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Submit Request & Proceed to Payment</span>
              </div>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}