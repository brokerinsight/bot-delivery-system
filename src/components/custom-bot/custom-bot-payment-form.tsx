'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CustomBotOrder } from '@/types';
import toast from 'react-hot-toast';
import {
  CreditCardIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CustomBotPaymentFormProps {
  order: CustomBotOrder;
}

export function CustomBotPaymentForm({ order }: CustomBotPaymentFormProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    mpesaPhone: '',
    cryptoCurrency: 'bitcoin'
  });

  const handleMpesaPayment = async () => {
    if (!paymentData.mpesaPhone) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }

    // Validate M-Pesa phone number
    const phoneRegex = /^254\d{9}$/;
    const cleanPhone = paymentData.mpesaPhone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid M-Pesa number (254XXXXXXXXX)');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/custom-bot/payment/mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref_code: order.ref_code,
          phone_number: cleanPhone,
          amount: order.budget_amount
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Payment request sent! Please check your phone for M-Pesa prompt.');
        
        // Poll for payment status
        setTimeout(() => {
          checkPaymentStatus();
        }, 5000);
      } else {
        toast.error(result.error || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCryptoPayment = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/custom-bot/payment/crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref_code: order.ref_code,
          currency: paymentData.cryptoCurrency,
          amount: order.budget_amount
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to crypto payment provider
        window.location.href = result.payment_url;
      } else {
        toast.error(result.error || 'Payment initialization failed. Please try again.');
      }
    } catch (error) {
      console.error('Crypto payment error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/custom-bot/payment/status/${order.ref_code}`);
      const result = await response.json();

      if (result.success && result.payment_status === 'paid') {
        toast.success('Payment confirmed! Redirecting...');
        setTimeout(() => {
          router.push(`/custom-bot/payment/${order.ref_code}`);
        }, 2000);
      } else {
        // Check again in 5 seconds
        setTimeout(checkPaymentStatus, 5000);
      }
    } catch (error) {
      console.error('Payment status check error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Payment Methods */}
      {order.payment_method === 'mpesa' ? (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <PhoneIcon className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
              M-Pesa Payment
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                M-Pesa Phone Number *
              </label>
              <input
                type="tel"
                value={paymentData.mpesaPhone}
                onChange={(e) => setPaymentData(prev => ({ ...prev, mpesaPhone: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                placeholder="254712345678"
              />
              <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-500">
                Enter the M-Pesa number to receive the payment prompt
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Payment Instructions
              </h3>
              <ol className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>1. Click "Pay with M-Pesa" below</li>
                <li>2. You'll receive an STK push prompt on your phone</li>
                <li>3. Enter your M-Pesa PIN to complete payment</li>
                <li>4. You'll be redirected automatically upon success</li>
              </ol>
            </div>

            <motion.button
              onClick={handleMpesaPayment}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                isProcessing
                  ? 'bg-secondary-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <PhoneIcon className="w-5 h-5" />
                  <span>Pay with M-Pesa - ${order.budget_amount}</span>
                </div>
              )}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <CurrencyDollarIcon className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
              Cryptocurrency Payment
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Select Cryptocurrency *
              </label>
              <select
                value={paymentData.cryptoCurrency}
                onChange={(e) => setPaymentData(prev => ({ ...prev, cryptoCurrency: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="litecoin">Litecoin (LTC)</option>
                <option value="bitcoin_cash">Bitcoin Cash (BCH)</option>
                <option value="dogecoin">Dogecoin (DOGE)</option>
              </select>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Payment Instructions
              </h3>
              <ol className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>1. Click "Pay with Crypto" below</li>
                <li>2. You'll be redirected to our payment processor</li>
                <li>3. Send the exact amount to the provided address</li>
                <li>4. Your order will be confirmed automatically</li>
              </ol>
            </div>

            <motion.button
              onClick={handleCryptoPayment}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                isProcessing
                  ? 'bg-secondary-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Initializing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span>Pay with Crypto - ${order.budget_amount}</span>
                </div>
              )}
            </motion.button>
          </div>
        </div>
      )}

      {/* Order Timeline */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <ClockIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
            What Happens Next?
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
                Payment Confirmation
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                You'll receive an email confirmation with your tracking number immediately after payment.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
                Development Begins
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Our team will review your requirements and start developing your custom bot.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
                Delivery (24 Hours)
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Your completed custom bot will be delivered to your email with setup instructions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Need Help with Payment?
        </h3>
        <div className="space-y-3">
          <a 
            href="mailto:support@derivbotstore.com"
            className="flex items-center space-x-3 p-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-sm">📧</span>
            </div>
            <div>
              <div className="text-sm font-medium text-secondary-800 dark:text-secondary-200">Email Support</div>
              <div className="text-xs text-secondary-500">support@derivbotstore.com</div>
            </div>
          </a>
          
          <div className="text-xs text-secondary-500 dark:text-secondary-500">
            Having payment issues? Contact us immediately and we'll help resolve any problems.
          </div>
        </div>
      </div>
    </motion.div>
  );
}