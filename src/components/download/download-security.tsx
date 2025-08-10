'use client';

import { motion } from 'framer-motion';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface TokenData {
  orderId: number;
  files: any[];
  customerEmail: string;
  orderDate: string;
  expiresAt: Date;
  used: boolean;
}

interface DownloadSecurityProps {
  tokenData: TokenData;
}

export function DownloadSecurity({ tokenData }: DownloadSecurityProps) {
  const timeUntilExpiry = new Date(tokenData.expiresAt).getTime() - new Date().getTime();
  const hoursUntilExpiry = Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60 * 60)));
  const minutesUntilExpiry = Math.max(0, Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Security Information */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ShieldCheckIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Security Information
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <ClockIcon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Time Remaining
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                {hoursUntilExpiry}h {minutesUntilExpiry}m until link expires
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                One-Time Use
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                This link can only be used once for security
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Use */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          How to Use Your Bot
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Download the File
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Click the download button to save the XML file to your device
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Open Deriv Bot
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Log in to your Deriv account and navigate to the Bot platform
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Import Strategy
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Use the "Import" button to upload your XML file
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-0.5">
              4
            </div>
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Configure & Run
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Adjust settings as needed and start your automated trading
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Need Help?
        </h3>
        
        <div className="space-y-4">
          <a
            href="mailto:support@derivbotstore.com"
            className="flex items-center space-x-3 p-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
          >
            <EnvelopeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Email Support
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                support@derivbotstore.com
              </p>
            </div>
          </a>
          
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                WhatsApp Support
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Get instant help via WhatsApp
              </p>
            </div>
          </a>
          
          <a
            href="tel:+1234567890"
            className="flex items-center space-x-3 p-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
          >
            <PhoneIcon className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-secondary-800 dark:text-secondary-200">
                Phone Support
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                +1 (234) 567-890
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Important Notes */}
      <div className="glass-card rounded-2xl p-6 border-l-4 border-blue-500">
        <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Important Notes
        </h3>
        
        <div className="space-y-3 text-sm text-secondary-600 dark:text-secondary-400">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <p>Test the strategy on a demo account before using real money</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <p>Monitor your trades and adjust settings based on market conditions</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <p>Keep your files backed up in a secure location</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <p>Trading involves risk - never invest more than you can afford to lose</p>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
          Complete Setup Guide
        </h3>
        <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
          Download our comprehensive guide for detailed setup instructions
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
          Download Setup Guide
        </button>
      </div>
    </motion.div>
  );
}