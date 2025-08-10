'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  CreditCardIcon,
  DevicePhoneMobileIcon,
  CurrencyBitcoinIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useCartStore } from '@/lib/cart';
import toast from 'react-hot-toast';

type PaymentMethod = 'mpesa' | 'crypto' | 'card';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  paymentMethod: PaymentMethod;
  mpesaPhone: string;
  cryptoCurrency: string;
  agreeToTerms: boolean;
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: 'KE',
    paymentMethod: 'mpesa',
    mpesaPhone: '',
    cryptoCurrency: 'BTC',
    agreeToTerms: false,
  });

  const paymentMethods = [
    {
      id: 'mpesa' as PaymentMethod,
      name: 'M-Pesa',
      description: 'Pay with M-Pesa mobile money',
      icon: DevicePhoneMobileIcon,
      available: true,
    },
    {
      id: 'crypto' as PaymentMethod,
      name: 'Cryptocurrency',
      description: 'Pay with Bitcoin, USDT, or other crypto',
      icon: CurrencyBitcoinIcon,
      available: true,
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Credit/Debit Card',
      description: 'Pay with Visa, Mastercard, or others',
      icon: CreditCardIcon,
      available: false, // Coming soon
    },
  ];

  const cryptoCurrencies = [
    { code: 'BTC', name: 'Bitcoin' },
    { code: 'USDT', name: 'Tether USD' },
    { code: 'ETH', name: 'Ethereum' },
    { code: 'LTC', name: 'Litecoin' },
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call to process payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a mock reference code
      const refCode = 'REF' + Math.random().toString(36).substr(2, 9).toUpperCase();

      // Create order
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.item,
          quantity: item.quantity,
          price: item.product.price,
        })),
        customer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          country: formData.country,
        },
        payment: {
          method: formData.paymentMethod,
          reference: refCode,
        },
      };

      console.log('Order data:', orderData);

      // Clear cart
      clearCart();

      // Show success message
      toast.success('Order placed successfully!');

      // Redirect to success page
      router.push(`/download/${refCode}`);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {/* Customer Information */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
          Customer Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="John"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Doe"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+254700000000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Country *
            </label>
            <select
              required
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="RW">Rwanda</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
          Payment Method
        </h2>
        
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="relative">
              <input
                type="radio"
                id={method.id}
                name="paymentMethod"
                value={method.id}
                checked={formData.paymentMethod === method.id}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value as PaymentMethod)}
                disabled={!method.available}
                className="sr-only"
              />
              <label
                htmlFor={method.id}
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.paymentMethod === method.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <method.icon className="w-6 h-6 text-secondary-600 dark:text-secondary-400 mr-4" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-semibold text-secondary-800 dark:text-secondary-200">
                      {method.name}
                    </span>
                    {!method.available && (
                      <span className="ml-2 px-2 py-1 bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 text-xs rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    {method.description}
                  </p>
                </div>
                {formData.paymentMethod === method.id && (
                  <CheckCircleIcon className="w-6 h-6 text-primary-600" />
                )}
              </label>
            </div>
          ))}
        </div>

        {/* Payment Method Specific Fields */}
        {formData.paymentMethod === 'mpesa' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              M-Pesa Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.mpesaPhone}
              onChange={(e) => handleInputChange('mpesaPhone', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="254700000000"
            />
            <p className="text-sm text-secondary-500 dark:text-secondary-500 mt-2">
              You will receive an M-Pesa prompt on this number
            </p>
          </div>
        )}

        {formData.paymentMethod === 'crypto' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Preferred Cryptocurrency *
            </label>
            <select
              required
              value={formData.cryptoCurrency}
              onChange={(e) => handleInputChange('cryptoCurrency', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {cryptoCurrencies.map((crypto) => (
                <option key={crypto.code} value={crypto.code}>
                  {crypto.name} ({crypto.code})
                </option>
              ))}
            </select>
            <p className="text-sm text-secondary-500 dark:text-secondary-500 mt-2">
              You will receive payment instructions after placing your order
            </p>
          </div>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            checked={formData.agreeToTerms}
            onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
            className="mt-1 w-4 h-4 text-primary-600 bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 rounded focus:ring-primary-500 dark:focus:ring-primary-600"
          />
          <label htmlFor="terms" className="text-sm text-secondary-600 dark:text-secondary-400">
            I agree to the{' '}
            <a href="/terms" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline">
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline">
              Privacy Policy
            </a>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !formData.agreeToTerms}
        className="w-full px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-secondary-400 disabled:to-secondary-400 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="spinner" />
            <span>Processing Payment...</span>
          </div>
        ) : (
          'Complete Order'
        )}
      </button>
    </motion.form>
  );
}