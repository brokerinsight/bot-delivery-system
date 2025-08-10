'use client';

import { motion } from 'framer-motion';
import {
  ClockIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export function CustomBotInfo() {
  return (
    <div className="space-y-6">
      {/* Pricing Info */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Pricing Guide
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Simple Strategy</span>
            <span className="font-semibold text-secondary-800 dark:text-secondary-200">$10-25</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Medium Complexity</span>
            <span className="font-semibold text-secondary-800 dark:text-secondary-200">$25-50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Advanced Features</span>
            <span className="font-semibold text-secondary-800 dark:text-secondary-200">$50-100</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Complex Multi-Strategy</span>
            <span className="font-semibold text-secondary-800 dark:text-secondary-200">$100+</span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300">
            💡 <strong>Tip:</strong> Provide a detailed description to get an accurate quote for your strategy.
          </p>
        </div>
      </motion.div>

      {/* Delivery Time */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <ClockIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Delivery Timeline
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>Standard:</strong> 24 hours
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>Complex:</strong> 2-3 days
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>Advanced:</strong> 3-5 days
            </span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            ⚡ Most orders are completed within 24 hours!
          </p>
        </div>
      </motion.div>

      {/* Guarantee */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <ShieldCheckIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Our Guarantee
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              100% refund if technically impossible
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              7-day support after delivery
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Secure payment processing
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Confidential strategy handling
            </span>
          </div>
        </div>
      </motion.div>

      {/* What's Included */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            What You Get
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Custom XML bot file for Deriv
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Setup and installation guide
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Basic configuration instructions
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Testing recommendations
            </span>
          </div>
        </div>
      </motion.div>

      {/* Customer Reviews */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <StarIcon className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Customer Reviews
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="border-l-4 border-yellow-400 pl-3">
            <div className="flex items-center space-x-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
              "Amazing service! Got my martingale bot in just 12 hours."
            </p>
            <p className="text-xs text-secondary-500">- John M.</p>
          </div>
          
          <div className="border-l-4 border-yellow-400 pl-3">
            <div className="flex items-center space-x-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
              "Professional team, exactly what I needed for my strategy."
            </p>
            <p className="text-xs text-secondary-500">- Sarah K.</p>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">4.9/5</span>
          </div>
          <p className="text-xs text-secondary-500 mt-1">Based on 147+ reviews</p>
        </div>
      </motion.div>

      {/* Support */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
            Need Help?
          </h3>
        </div>
        
        <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
          Have questions about your custom bot requirements? Our team is here to help!
        </p>
        
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
          
          <a 
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-sm">💬</span>
            </div>
            <div>
              <div className="text-sm font-medium text-secondary-800 dark:text-secondary-200">WhatsApp</div>
              <div className="text-xs text-secondary-500">Quick response</div>
            </div>
          </a>
        </div>
      </motion.div>

      {/* Risk Warning */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6"
      >
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5">⚠️</div>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              Trading Risk Warning
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Trading involves substantial risk. Only trade with money you can afford to lose. 
              Test all bots on demo accounts first. Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}