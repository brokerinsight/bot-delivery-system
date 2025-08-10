'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  CreditCardIcon,
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface CustomBotOrder {
  id: number;
  ref_code: string;
  client_email: string;
  budget_amount: number;
  tracking_number: string;
  payment_status: string;
}

interface PaymentOptions {
  mpesa_manual: boolean;
  mpesa_payhero: boolean;
  crypto_nowpayments: boolean;
}

interface CustomBotPaymentFormProps {
  order: CustomBotOrder;
}

export function CustomBotPaymentForm({ order }: CustomBotPaymentFormProps) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>({
    mpesa_manual: true,
    mpesa_payhero: true,
    crypto_nowpayments: true
  });
  const [mpesaRefCode, setMpesaRefCode] = useState('');

  useEffect(() => {
    fetchPaymentOptions();
  }, []);

  const fetchPaymentOptions = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      
      if (result.success && result.data.settings?.activePaymentOptions) {
        const options = typeof result.data.settings.activePaymentOptions === 'string' 
          ? JSON.parse(result.data.settings.activePaymentOptions)
          : result.data.settings.activePaymentOptions;
        setPaymentOptions(options);
        
        // Set default to first available option
        const availableOptions = Object.entries(options).filter(([, enabled]) => enabled);
        if (availableOptions.length > 0 && !selectedMethod) {
          setSelectedMethod(availableOptions[0][0]);
        }
      }
    } catch (error) {
      console.error('Error fetching payment options:', error);
    }
  };

  const handleMpesaManualPayment = async () => {
    if (!mpesaRefCode.trim()) {
      toast.error('Please enter M-Pesa reference code');
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
          mpesa_ref_code: mpesaRefCode.trim(),
          amount: order.budget_amount
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('M-Pesa payment submitted successfully!');
        router.push(`/custom-bot/success/${order.ref_code}`);
      } else {
        throw new Error(result.error || 'Payment submission failed');
      }
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      toast.error(error.message || 'Payment submission failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaPayheroPayment = async () => {
    setIsProcessing(true);
    try {
      // This would integrate with PayHero API
      toast('PayHero M-Pesa integration coming soon. Please use manual M-Pesa for now.');
    } catch (error: any) {
      console.error('PayHero payment error:', error);
      toast.error('PayHero payment failed');
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
          amount: order.budget_amount,
          currency: 'USD'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to crypto payment gateway
        window.location.href = result.data.invoice_url;
      } else {
        throw new Error(result.error || 'Crypto payment initialization failed');
      }
    } catch (error: any) {
      console.error('Crypto payment error:', error);
      toast.error(error.message || 'Crypto payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    switch (selectedMethod) {
      case 'mpesa_manual':
        handleMpesaManualPayment();
        break;
      case 'mpesa_payhero':
        handleMpesaPayheroPayment();
        break;
      case 'crypto_nowpayments':
        handleCryptoPayment();
        break;
      default:
        toast.error('Please select a payment method');
    }
  };

  // If payment is already completed
  if (order.payment_status === 'confirmed') {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheckIcon className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
          Payment Completed
        </h2>
        
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          Your payment has been processed successfully. Development has begun!
        </p>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm text-green-700 dark:text-green-300">
            You'll receive your custom bot within 24 hours via email. 
            Check your inbox for updates and tracking information.
          </p>
        </div>
      </div>
    );
  }

  const availablePaymentMethods = [
    {
      id: 'mpesa_manual',
      name: 'M-Pesa Manual',
      description: 'Pay via M-Pesa and enter reference code',
      icon: DevicePhoneMobileIcon,
      enabled: paymentOptions.mpesa_manual
    },
    {
      id: 'mpesa_payhero',
      name: 'M-Pesa PayHero',
      description: 'Automated M-Pesa payment',
      icon: DevicePhoneMobileIcon,
      enabled: paymentOptions.mpesa_payhero
    },
    {
      id: 'crypto_nowpayments',
      name: 'Cryptocurrency',
      description: 'Pay with Bitcoin, USDT, or other crypto',
      icon: CurrencyDollarIcon,
      enabled: paymentOptions.crypto_nowpayments
    }
  ].filter(method => method.enabled);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
          Choose Payment Method
        </h2>

        {/* Payment Method Selection */}
        <div className="space-y-3 mb-6">
          {availablePaymentMethods.map((method) => (
            <label key={method.id} className="relative block">
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="sr-only"
              />
              <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center gap-4">
                  <method.icon className="w-6 h-6 text-primary-600" />
                  <div className="flex-1">
                    <div className="font-medium text-secondary-800 dark:text-secondary-200">
                      {method.name}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {method.description}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedMethod === method.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedMethod === method.id && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* M-Pesa Manual Instructions */}
        {selectedMethod === 'mpesa_manual' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-3">
              M-Pesa Payment Instructions
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <p>1. Go to M-Pesa menu on your phone</p>
              <p>2. Select "Lipa na M-Pesa" → "Pay Bill"</p>
              <p>3. Enter Business Number: <strong>174379</strong></p>
              <p>4. Account Number: <strong>{order.ref_code}</strong></p>
              <p>5. Amount: <strong>KES {Math.round(order.budget_amount * 130)}</strong></p>
              <p>6. Enter your M-Pesa PIN and confirm</p>
              <p>7. Copy the M-Pesa reference code and paste it below</p>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                M-Pesa Reference Code *
              </label>
              <input
                type="text"
                value={mpesaRefCode}
                onChange={(e) => setMpesaRefCode(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., QHX21GR34T"
                required
              />
            </div>
          </div>
        )}

        {/* Amount Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-secondary-800 dark:text-secondary-200">
              Total Amount:
            </span>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                ${order.budget_amount.toFixed(2)} USD
              </div>
              {selectedMethod === 'mpesa_manual' && (
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  ≈ KES {Math.round(order.budget_amount * 130)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing || !selectedMethod}
          className={`w-full py-4 rounded-lg font-semibold transition-colors ${
            isProcessing || !selectedMethod
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing Payment...
            </div>
          ) : (
            <>
              <CreditCardIcon className="inline w-5 h-5 mr-2" />
              Complete Payment
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="flex items-center gap-2 mt-4 text-sm text-secondary-600 dark:text-secondary-400">
          <ShieldCheckIcon className="w-4 h-4 text-green-600" />
          <span>Secure payment processing • SSL encrypted • Money-back guarantee</span>
        </div>
      </div>
    </div>
  );
}