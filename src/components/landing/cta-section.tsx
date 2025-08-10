'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-3xl p-12 lg:p-16 text-center overflow-hidden"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-accent-500/20 rounded-3xl" />
          <div className="absolute top-10 right-10 w-32 h-32 bg-primary-400/30 rounded-full blur-2xl" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-accent-400/30 rounded-full blur-2xl" />
          
          {/* Content */}
          <div className="relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 dark:text-secondary-200 mb-6"
            >
              Ready to Start Your
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                Automated Trading Journey?
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-lg text-secondary-600 dark:text-secondary-300 mb-8 max-w-2xl mx-auto"
            >
              Join thousands of successful traders who trust our premium bots for consistent profits. 
              Start your journey today with our proven strategies.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
            >
              <Link
                href="/store"
                className="group px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
              >
                <span>Browse Trading Bots</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              <Link
                href="/contact"
                className="px-8 py-4 glass-modal hover:bg-white/20 dark:hover:bg-white/10 text-secondary-700 dark:text-secondary-300 font-semibold rounded-2xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300"
              >
                Contact Support
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-12 flex items-center justify-center space-x-8 text-sm text-secondary-500 dark:text-secondary-400"
            >
              <div className="flex items-center space-x-2">
                <span>✅</span>
                <span>30-Day Money Back</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🔒</span>
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>⚡</span>
                <span>Instant Access</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}