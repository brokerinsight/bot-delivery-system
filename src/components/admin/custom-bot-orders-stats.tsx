'use client';

import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  TrendingUpIcon
} from '@heroicons/react/24/outline';

// Mock stats - in production, fetch from API
const mockStats = {
  totalOrders: 42,
  totalRevenue: 3680,
  pendingOrders: 8,
  completedOrders: 28,
  refundedOrders: 6,
  averageOrderValue: 87.6,
  averageCompletionTime: 18.4,
  thisMonthOrders: 15,
  thisMonthRevenue: 1340,
  conversionRate: 82.3
};

export function CustomBotOrdersStats() {
  const stats = [
    {
      name: 'Total Orders',
      value: mockStats.totalOrders,
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: CpuChipIcon,
      color: 'blue'
    },
    {
      name: 'Total Revenue',
      value: `$${mockStats.totalRevenue.toLocaleString()}`,
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: CurrencyDollarIcon,
      color: 'green'
    },
    {
      name: 'Pending Orders',
      value: mockStats.pendingOrders,
      change: '+3',
      changeType: 'neutral' as const,
      icon: ClockIcon,
      color: 'yellow'
    },
    {
      name: 'Completed Orders',
      value: mockStats.completedOrders,
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: CheckCircleIcon,
      color: 'green'
    },
    {
      name: 'Avg. Order Value',
      value: `$${mockStats.averageOrderValue}`,
      change: '+5.7%',
      changeType: 'positive' as const,
      icon: TrendingUpIcon,
      color: 'blue'
    },
    {
      name: 'Avg. Completion Time',
      value: `${mockStats.averageCompletionTime}h`,
      change: '-2.1h',
      changeType: 'positive' as const,
      icon: ClockIcon,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        icon: 'text-blue-600 dark:text-blue-400'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        icon: 'text-green-600 dark:text-green-400'
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        icon: 'text-yellow-600 dark:text-yellow-400'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        icon: 'text-purple-600 dark:text-purple-400'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangeColorClasses = (changeType: 'positive' | 'negative' | 'neutral') => {
    const classes = {
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400',
      neutral: 'text-secondary-500 dark:text-secondary-400'
    };
    return classes[changeType];
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
        Overview
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const colorClasses = getColorClasses(stat.color);
          const IconComponent = stat.icon;
          
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white dark:bg-secondary-800 rounded-xl p-6 shadow-sm border border-secondary-200 dark:border-secondary-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                      <IconComponent className={`w-5 h-5 ${colorClasses.icon}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400 truncate">
                        {stat.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {stat.value}
                    </p>
                    <p className={`text-sm ${getChangeColorClasses(stat.changeType)} mt-1`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                This Month
              </h3>
              <p className="text-sm text-green-600 dark:text-green-300">
                {mockStats.thisMonthOrders} orders • ${mockStats.thisMonthRevenue.toLocaleString()} revenue
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center space-x-3">
            <TrendingUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                Conversion Rate
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {mockStats.conversionRate}% of requests become orders
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center space-x-3">
            <ClockIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                Quality Metrics
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                {((mockStats.completedOrders / (mockStats.completedOrders + mockStats.refundedOrders)) * 100).toFixed(1)}% success rate
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}