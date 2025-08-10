'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  EnvelopeIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

type RefundMethod = 'mpesa' | 'crypto';

interface FormData {
  email: string;
  botLogic: string;
  features: string;
  budgetAmount: string;
  refundMethod: RefundMethod;
  mpesaNumber: string;
  mpesaName: string;
  cryptoWallet: string;
  cryptoNetwork: string;
  agreeToTerms: boolean;
  newsletter: boolean;
}

export function CustomBotRequestForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    botLogic: '',
    features: '',
    budgetAmount: '',
    refundMethod: 'mpesa',
    mpesaNumber: '',
    mpesaName: '',
    cryptoWallet: '',
    cryptoNetwork: 'USDT-TRC20',
    agreeToTerms: false,
    newsletter: false,
  });

  const cryptoNetworks = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'USDT-TRC20', label: 'USDT (TRC20)' },
    { value: 'USDT-ERC20', label: 'USDT (ERC20)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'LTC', label: 'Litecoin (LTC)' },
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid email is required';
        if (!formData.botLogic.trim()) return 'Bot logic description is required';
        if (formData.botLogic.length < 50) return 'Please provide more detailed bot logic (minimum 50 characters)';
        return null;
      
      case 2:
        if (!formData.budgetAmount) return 'Budget amount is required';
        const budget = parseFloat(formData.budgetAmount);
        if (isNaN(budget) || budget < 10) return 'Minimum budget is $10';
        if (budget > 10000) return 'Maximum budget is $10,000';
        return null;
      
      case 3:
        if (formData.refundMethod === 'mpesa') {
          if (!formData.mpesaNumber.trim()) return 'M-Pesa number is required for refunds';
          if (!formData.mpesaName.trim()) return 'M-Pesa account name is required for refunds';
          if (!/^254\d{9}$/.test(formData.mpesaNumber.replace(/\s/g, ''))) {
            return 'Please enter a valid Kenyan M-Pesa number (254XXXXXXXXX)';
          }
        } else {
          if (!formData.cryptoWallet.trim()) return 'Crypto wallet address is required for refunds';
          if (!formData.cryptoNetwork) return 'Crypto network is required';
        }
        if (!formData.agreeToTerms) return 'You must agree to the terms and conditions';
        return null;
      
      default:
        return null;
    }
  };

  const nextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const suggestBudget = () => {
    const budget = parseFloat(formData.budgetAmount);
    if (budget < 10) {
      const suggested = Math.max(25, Math.ceil(budget * 2.5));
      setFormData(prev => ({ ...prev, budgetAmount: suggested.toString() }));
      toast(`We suggest a budget of $${suggested} for better bot quality`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/custom-bot/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: formData.email,
          botLogic: formData.botLogic,
          features: formData.features,
          budgetAmount: parseFloat(formData.budgetAmount),
          refundMethod: formData.refundMethod,
          refundDetails: formData.refundMethod === 'mpesa' 
            ? { mpesaNumber: formData.mpesaNumber, mpesaName: formData.mpesaName }
            : { cryptoWallet: formData.cryptoWallet, cryptoNetwork: formData.cryptoNetwork },
          newsletter: formData.newsletter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Custom bot request submitted successfully!');
        router.push(`/custom-bot/payment/${result.data.ref_code}`);
      } else {
        throw new Error(result.error || 'Failed to submit request');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 lg:p-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
          Request Your Custom Bot
        </h2>
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {step < currentStep ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  step
                )}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Labels */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className={currentStep >= 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
            Bot Details
          </div>
          <div className={currentStep >= 2 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
            Budget
          </div>
          <div className={currentStep >= 3 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
            Refund & Terms
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Bot Details */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <EnvelopeIcon className="inline w-4 h-4 mr-1" />
                Your Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send your custom bot to this email address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CogIcon className="inline w-4 h-4 mr-1" />
                Bot Logic & Strategy *
              </label>
              <textarea
                value={formData.botLogic}
                onChange={(e) => handleInputChange('botLogic', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={6}
                placeholder="Describe your trading logic in detail. Include entry conditions, exit conditions, risk management, indicators you want to use, timeframes, etc. The more detailed, the better we can build your bot."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Current length: {formData.botLogic.length} characters (minimum 50)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Features (Optional)
              </label>
              <textarea
                value={formData.features}
                onChange={(e) => handleInputChange('features', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Any additional features like notifications, special conditions, custom indicators, etc."
              />
            </div>
          </motion.div>
        )}

        {/* Step 2: Budget */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CurrencyDollarIcon className="inline w-4 h-4 mr-1" />
                Budget Amount (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  max="10000"
                  value={formData.budgetAmount}
                  onChange={(e) => handleInputChange('budgetAmount', e.target.value)}
                  onBlur={suggestBudget}
                  className="w-full pl-8 p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10.00"
                  required
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p>Minimum: $10 • Maximum: $10,000</p>
                {parseFloat(formData.budgetAmount) < 10 && (
                  <div className="flex items-center text-amber-600">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    <span>We suggest increasing your budget for better bot quality</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                💡 Budget Guidelines
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• $10-25: Simple strategies with basic indicators</li>
                <li>• $25-50: Intermediate bots with multiple conditions</li>
                <li>• $50-100: Advanced strategies with custom features</li>
                <li>• $100+: Complex multi-timeframe, AI-enhanced bots</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Step 3: Refund Details & Terms */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Refund Method (if needed) *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="mpesa"
                    checked={formData.refundMethod === 'mpesa'}
                    onChange={(e) => handleInputChange('refundMethod', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.refundMethod === 'mpesa'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="font-medium">M-Pesa</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Kenyan mobile money
                    </div>
                  </div>
                </label>
                
                <label className="relative">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="crypto"
                    checked={formData.refundMethod === 'crypto'}
                    onChange={(e) => handleInputChange('refundMethod', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.refundMethod === 'crypto'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="font-medium">Cryptocurrency</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Bitcoin, USDT, etc.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {formData.refundMethod === 'mpesa' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    M-Pesa Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.mpesaNumber}
                    onChange={(e) => handleInputChange('mpesaNumber', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="254712345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.mpesaName}
                    onChange={(e) => handleInputChange('mpesaName', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {formData.refundMethod === 'crypto' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cryptocurrency Network *
                  </label>
                  <select
                    value={formData.cryptoNetwork}
                    onChange={(e) => handleInputChange('cryptoNetwork', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {cryptoNetworks.map(network => (
                      <option key={network.value} value={network.value}>
                        {network.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wallet Address *
                  </label>
                  <input
                    type="text"
                    value={formData.cryptoWallet}
                    onChange={(e) => handleInputChange('cryptoWallet', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your wallet address"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <a href="/terms/custom-bot-policy" target="_blank" className="text-primary-600 hover:underline">
                    Custom Bot Terms & Conditions
                  </a>{' '}
                  and understand that if my bot logic is technically impossible, I will receive a full refund. *
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.newsletter}
                  onChange={(e) => handleInputChange('newsletter', e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Subscribe to newsletter for bot updates and trading tips (optional)
                </span>
              </label>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Next Step
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </form>

      {/* Success Message */}
      {currentStep === 3 && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-sm text-green-800 dark:text-green-400">
            <strong>Next Steps:</strong> After submitting, you'll be redirected to payment. 
            Once paid, you'll receive a tracking number and your bot within 24 hours. 
            If the logic isn't technically possible, we'll refund to your selected method.
          </div>
        </div>
      )}
    </div>
  );
}