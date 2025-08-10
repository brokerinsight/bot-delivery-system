'use client';

import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UsersIcon, 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'Total Revenue',
    value: '$124,563',
    change: '+12.5%',
    changeType: 'positive',
    icon: CurrencyDollarIcon,
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'Orders Today',
    value: '47',
    change: '+8.2%',
    changeType: 'positive',
    icon: ShoppingBagIcon,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Total Customers',
    value: '2,847',
    change: '+23.1%',
    changeType: 'positive',
    icon: UsersIcon,
    color: 'from-purple-500 to-purple-600',
  },
  {
    name: 'Conversion Rate',
    value: '3.24%',
    change: '-2.1%',
    changeType: 'negative',
    icon: ChartBarIcon,
    color: 'from-orange-500 to-orange-600',
  },
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className={`flex items-center space-x-1 text-sm font-medium ${
              stat.changeType === 'positive' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {stat.changeType === 'positive' ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
              )}
              <span>{stat.change}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {stat.name}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}