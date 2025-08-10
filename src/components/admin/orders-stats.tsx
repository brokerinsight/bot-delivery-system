'use client';

import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'Total Orders',
    value: '147',
    change: '+12',
    changeLabel: 'from yesterday',
    icon: ShoppingBagIcon,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Total Revenue',
    value: '$18,429',
    change: '+$2,341',
    changeLabel: 'from last week',
    icon: CurrencyDollarIcon,
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'Confirmed Orders',
    value: '89',
    change: '60.5%',
    changeLabel: 'conversion rate',
    icon: CheckCircleIcon,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    name: 'Pending Orders',
    value: '23',
    change: '-5',
    changeLabel: 'from yesterday',
    icon: ClockIcon,
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    name: 'Failed Payments',
    value: '12',
    change: '+3',
    changeLabel: 'needs attention',
    icon: XCircleIcon,
    color: 'from-red-500 to-red-600',
  },
  {
    name: 'Avg Order Value',
    value: '$125.40',
    change: '+$8.20',
    changeLabel: 'from last week',
    icon: ExclamationTriangleIcon,
    color: 'from-purple-500 to-purple-600',
  },
];

export function OrdersStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="glass-card rounded-2xl p-6 hover-lift"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
              {stat.name}
            </p>
            <div className="flex items-center text-xs">
              <span className={`font-medium ${
                stat.change.startsWith('+') 
                  ? 'text-green-600 dark:text-green-400' 
                  : stat.change.startsWith('-')
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}>
                {stat.change}
              </span>
              <span className="text-secondary-500 dark:text-secondary-500 ml-1">
                {stat.changeLabel}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}