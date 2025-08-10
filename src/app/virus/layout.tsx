'use client';

import { useState, useEffect } from 'react';
import { VirusLogin } from '@/components/virus/virus-login';
import { Toaster } from 'react-hot-toast';

export default function VirusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session', { 
        credentials: 'include' 
      });
      const result = await response.json();
      
      setIsAuthenticated(result.isAuthenticated);
    } catch (error) {
      console.error('Session check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <VirusLogin />
        <Toaster position="top-right" />
      </>
    );
  }

  // Show admin panel if authenticated
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}