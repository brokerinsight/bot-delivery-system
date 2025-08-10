'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Animated 404 */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              404
            </h1>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 0.9, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut'
              }}
              className="absolute -top-4 -right-4 text-yellow-400"
            >
              <ExclamationTriangleIcon className="w-16 h-16" />
            </motion.div>
          </div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-300 mb-2">
            The page you're looking for seems to have vanished into the digital void.
          </p>
          <p className="text-gray-400">
            Don't worry, even the best bots sometimes take a wrong turn!
          </p>
        </motion.div>

        {/* Floating Bot Animation */}
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="mb-12"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-4xl">🤖</span>
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 min-w-[200px]"
            >
              <HomeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Go Home
            </motion.button>
          </Link>

          <Link href="/store">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 min-w-[200px]"
            >
              <ShoppingBagIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Browse Store
            </motion.button>
          </Link>

          <Link href="/custom-bot">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 min-w-[200px]"
            >
              <span className="text-lg">🤖</span>
              Custom Bot
            </motion.button>
          </Link>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Go back to previous page</span>
          </button>
        </motion.div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
          <p className="text-gray-300 text-sm mb-4">
            If you believe this is an error, please check the URL or contact our support team.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/terms/privacy-policy" className="text-blue-400 hover:text-blue-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms/custom-bot-policy" className="text-blue-400 hover:text-blue-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/page/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}