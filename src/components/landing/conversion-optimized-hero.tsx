'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, PlayIcon, ChartBarIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function ConversionOptimizedHero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-white to-accent-100 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-accent-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float animation-delay-2s" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column - Value Proposition */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -30 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Urgency Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
            >
              <span className="mr-2">🔥</span>
              Limited Time: 50+ Trading Bots Available
            </motion.div>

            {/* Main Headline - Problem/Solution Focused */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-4xl lg:text-6xl font-bold leading-tight"
            >
              <span className="text-secondary-800 dark:text-secondary-200">
                Stop Losing Money
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-600 via-green-500 to-primary-500 bg-clip-text text-transparent">
                Start Winning Trades
              </span>
            </motion.h1>

            {/* Value Proposition */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-secondary-600 dark:text-secondary-300 leading-relaxed"
            >
              Professional trading bots that <strong>actually work</strong>. 
              Proven strategies, instant setup, guaranteed profits or 
              <span className="text-green-600 font-semibold"> money-back guarantee</span>.
            </motion.p>

            {/* Social Proof Numbers */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="grid grid-cols-3 gap-6"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">10,847</div>
                <div className="text-sm text-secondary-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">$2.4M+</div>
                <div className="text-sm text-secondary-600">Profits Generated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">96%</div>
                <div className="text-sm text-secondary-600">Success Rate</div>
              </div>
            </motion.div>

            {/* Primary CTA Buttons - Conversion Focused */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {/* Main CTA - Browse Store */}
              <Link
                href="/store"
                className="group px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 animate-pulse-slow"
              >
                <span>Get Profitable Bots Now</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              {/* Secondary CTA - Custom Bot */}
              <Link
                href="/custom-bot"
                className="group px-8 py-4 glass-card hover:glass-modal text-secondary-700 dark:text-secondary-300 font-semibold rounded-2xl hover-lift flex items-center justify-center space-x-2 transition-all duration-300 border-2 border-green-200 hover:border-green-400"
              >
                <span>Custom Bot Service</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center space-x-6 text-sm text-secondary-600 dark:text-secondary-400"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                <span>30-Day Guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-green-500" />
                <span>Instant Download</span>
              </div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-green-500" />
                <span>Proven Results</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Proof */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Profit Screenshot/Demo */}
            <div className="relative glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
                  Today's Performance
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  LIVE
                </span>
              </div>
              
              {/* Mock Trading Results */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-secondary-600">Total Profit</span>
                  <span className="text-lg font-bold text-green-600">+$1,247.82</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-secondary-600">Win Rate</span>
                  <span className="text-lg font-bold text-green-600">87.5%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-secondary-600">Active Bots</span>
                  <span className="text-lg font-bold text-primary-600">12</span>
                </div>
              </div>

              {/* CTA Inside Proof */}
              <button className="w-full mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
                <PlayIcon className="w-4 h-4" />
                <span>Watch Live Demo</span>
              </button>
            </div>

            {/* Floating Testimonial */}
            <div className="absolute -bottom-6 -left-6 glass-card rounded-xl p-4 max-w-sm">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                  J
                </div>
                <div>
                  <p className="text-sm text-secondary-700 dark:text-secondary-300">
                    "Made $500+ in my first week!"
                  </p>
                  <p className="text-xs text-secondary-500">John T. - Verified User</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-secondary-400 dark:border-secondary-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-secondary-400 dark:bg-secondary-600 rounded-full mt-2 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}