'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LoginStep {
  CREDENTIALS: 'credentials';
  OTP: 'otp';
}

const STEPS: LoginStep = {
  CREDENTIALS: 'credentials',
  OTP: 'otp'
};

export function VirusLogin() {
  const router = useRouter();
  const [step, setStep] = useState<keyof LoginStep>('CREDENTIALS');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });

  // Timer for OTP expiry
  useEffect(() => {
    if (step === 'OTP' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setStep('CREDENTIALS');
            toast.error('OTP expired. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, timeRemaining]);

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/check-session', { 
        credentials: 'include' 
      });
      const result = await response.json();
      
      if (result.isAuthenticated) {
        router.push('/virus');
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setStep('OTP');
        setTimeRemaining(300); // 5 minutes
        toast.success('OTP sent to your email');
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP request error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Login successful!');
        router.push('/virus');
      } else {
        toast.error(result.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setTimeRemaining(300);
        toast.success('OTP resent to your email');
      } else {
        toast.error(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('OTP resend error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-sm w-full">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
          Admin Login
        </h2>
        
        {step === 'CREDENTIALS' ? (
          <form onSubmit={handleRequestOTP}>
            <div className="mb-4">
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="login-email"
                className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6 relative">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                className="mt-1 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-10"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-9 text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP Code
              </label>
              <p className="text-sm text-gray-600 mb-3">
                We've sent a 6-digit code to <strong>{formData.email}</strong>
              </p>
              <input
                type="text"
                className="w-full p-3 border rounded-md text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  handleInputChange('otp', value);
                }}
                placeholder="000000"
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-4 text-center">
              {timeRemaining > 0 ? (
                <p className="text-sm text-gray-600">
                  Code expires in: <span className="font-mono text-red-600">{formatTime(timeRemaining)}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-sm text-green-600 hover:text-green-700 underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
              disabled={isLoading || formData.otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep('CREDENTIALS');
                setFormData(prev => ({ ...prev, otp: '' }));
                setTimeRemaining(0);
              }}
              className="w-full bg-gray-600 text-white p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              disabled={isLoading}
            >
              Back to Login
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure admin access for Deriv Bot Store
          </p>
        </div>
      </div>
    </div>
  );
}