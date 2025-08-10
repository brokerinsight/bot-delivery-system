import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit, getClientIP, createSession } from '@/lib/auth';
import { verifyOTP } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for OTP verification
    const clientIP = getClientIP(request);
    if (!rateLimit(clientIP, 10, 15 * 60 * 1000)) { // 10 verification attempts per 15 minutes
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpResult = verifyOTP(email, otp);
    
    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error || 'Invalid OTP' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = createSession(email, `admin-${Date.now()}`);
    const cookieStore = cookies();
    
    cookieStore.set('admin-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    console.log(`[${new Date().toISOString()}] Admin login successful: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      email: email
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}