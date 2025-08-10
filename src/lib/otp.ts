import crypto from 'crypto';
import { sendAdminOTPEmail } from './email';

interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, OTPData>();

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of Array.from(otpStore.entries())) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate new OTP
    const code = generateOTP();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store OTP
    otpStore.set(email, {
      code,
      email,
      expiresAt,
      attempts: 0
    });

    // Send OTP email
    const emailResult = await sendAdminOTPEmail(email, code);
    
    if (!emailResult.success) {
      otpStore.delete(email);
      return { success: false, error: 'Failed to send OTP email' };
    }

    console.log(`[${new Date().toISOString()}] OTP sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending OTP:`, error);
    return { success: false, error: 'Failed to generate OTP' };
  }
}

export function verifyOTP(email: string, code: string): { success: boolean; error?: string } {
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    return { success: false, error: 'No OTP found for this email' };
  }

  // Check if expired
  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);
    return { success: false, error: 'OTP has expired' };
  }

  // Check attempts (max 3 attempts)
  if (otpData.attempts >= 3) {
    otpStore.delete(email);
    return { success: false, error: 'Too many failed attempts' };
  }

  // Verify code
  if (otpData.code !== code) {
    otpData.attempts++;
    return { success: false, error: 'Invalid OTP code' };
  }

  // Success - remove OTP
  otpStore.delete(email);
  console.log(`[${new Date().toISOString()}] OTP verified successfully for ${email}`);
  return { success: true };
}

export function getOTPTimeRemaining(email: string): number {
  const otpData = otpStore.get(email);
  if (!otpData) return 0;
  
  const remaining = otpData.expiresAt - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000)); // seconds
}