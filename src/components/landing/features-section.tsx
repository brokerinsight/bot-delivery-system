'use client';

import { motion } from 'framer-motion';
import { 
  RocketLaunchIcon, 
  ShieldCheckIcon, 
  ChartBarIcon, 
  CpuChipIcon,
  ClockIcon,
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';

export function FeaturesSection() {
  const features = [
    {
      icon: RocketLaunchIcon,
      title: 'High-Performance Algorithms',
      description: 'Advanced trading algorithms optimized for maximum profitability and minimal risk.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: 'Bank-grade security with 99.9% uptime guarantee for uninterrupted trading.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Real-Time Analytics',
      description: 'Comprehensive market analysis and performance tracking in real-time.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: CpuChipIcon,
      title: 'AI-Powered Intelligence',
      description: 'Machine learning algorithms that adapt to market conditions automatically.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: ClockIcon,
      title: '24/7 Automation',
      description: 'Round-the-clock trading execution without human intervention required.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Proven ROI',
      description: 'Consistent returns with documented performance history and backtesting.',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
            Why Choose Our
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"> Trading Bots?</span>
          </h2>
          <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
            Experience the power of professional-grade automation with features designed for both beginners and expert traders.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group glass-card p-8 rounded-2xl hover-lift cursor-pointer"
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                {feature.title}
              </h3>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary-500 to-transparent rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-secondary-600 dark:text-secondary-300 mb-6">
            Ready to automate your trading strategy?
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Get Started Today
          </button>
        </motion.div>
      </div>
    </section>
  );
}