'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  BellIcon, 
  MagnifyingGlassIcon, 
  SunIcon, 
  MoonIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useConnectionStatus } from '@/lib/websocket';

export function AdminHeader() {
  const [mounted, setMounted] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isConnected = useConnectionStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DB</span>
          </div>
          <h1 className="text-xl font-bold text-secondary-800 dark:text-secondary-200">
            Admin Panel
          </h1>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search orders, products, customers..."
              className="w-full pl-10 pr-4 py-2 bg-secondary-100 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              ) : (
                <MoonIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              )}
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors duration-200">
            <BellIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors duration-200"
            >
              <UserCircleIcon className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
              <div className="text-left">
                <div className="text-sm font-medium text-secondary-800 dark:text-secondary-200">
                  Admin User
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-500">
                  admin@derivbotstore.com
                </div>
              </div>
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  <a
                    href="#"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </a>
                  <a
                    href="/"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>View Store</span>
                  </a>
                  <hr className="my-2 border-secondary-200 dark:border-secondary-700" />
                  <a
                    href="#"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Sign Out</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}