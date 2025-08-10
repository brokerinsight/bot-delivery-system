'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  TagIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
    badge: null,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingBagIcon,
    badge: '12',
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: CubeIcon,
    badge: null,
  },
  {
    name: 'Customers',
    href: '/admin/customers',
    icon: UserGroupIcon,
    badge: null,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    badge: null,
  },
  {
    name: 'Revenue',
    href: '/admin/revenue',
    icon: CurrencyDollarIcon,
    badge: null,
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: TagIcon,
    badge: null,
  },
  {
    name: 'Files',
    href: '/admin/files',
    icon: ArchiveBoxIcon,
    badge: null,
  },
  {
    name: 'Pages',
    href: '/admin/pages',
    icon: DocumentTextIcon,
    badge: null,
  },
  {
    name: 'Emails',
    href: '/admin/emails',
    icon: EnvelopeIcon,
    badge: null,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Cog6ToothIcon,
    badge: null,
  },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } z-40`}>
      <div className="flex flex-col h-full">
        {/* Toggle Button */}
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors duration-200"
          >
            <div className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
              ←
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-secondary-200'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
                  {!collapsed && (
                    <>
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
          {!collapsed && (
            <div className="text-center">
              <p className="text-xs text-secondary-500 dark:text-secondary-500">
                Deriv Bot Store Admin
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-600">
                v2.0.0
              </p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}