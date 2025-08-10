import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP, validateAdminCredentials } from '@/lib/auth';
import { sendOTP } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for OTP requests
    const clientIP = getClientIP(request);
    if (!rateLimit(clientIP, 5, 15 * 60 * 1000)) { // 5 OTP requests per 15 minutes
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // First validate credentials before sending OTP
    const isValid = await validateAdminCredentials(email, password);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Send OTP
    const otpResult = await sendOTP(email);
    
    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      email: email
    });

  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}