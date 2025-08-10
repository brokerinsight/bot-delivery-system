import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { supabase } from './supabase';

// Session interface
interface AdminSession {
  isAuthenticated: boolean;
  email?: string;
  username?: string;
  id?: string;
}

// Get session from cookies
export async function getSession(): Promise<AdminSession> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('admin-session');
    
    if (!sessionCookie?.value) {
      return { isAuthenticated: false };
    }

    // In a real implementation, you'd decrypt/verify the session token
    // For now, we'll use a simple JSON parse (not secure for production)
    const session = JSON.parse(sessionCookie.value);
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return { isAuthenticated: false };
  }
}

// Create session cookie
export function createSession(email: string, id: string): string {
  const session: AdminSession = {
    isAuthenticated: true,
    email,
    id
  };
  
  // In production, encrypt this session data
  return JSON.stringify(session);
}

// Authentication middleware for API routes
export async function withAuth<T>(
  handler: (request: NextRequest, context: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    const session = await getSession();
    
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}

// Validate admin credentials
export async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['adminEmail', 'adminPassword']);

    if (!settings) return false;

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const adminEmail = settingsMap.adminEmail;
    const adminPasswordHash = settingsMap.adminPassword;

    if (!adminEmail || !adminPasswordHash) return false;
    if (email !== adminEmail) return false;

    return await bcrypt.compare(password, adminPasswordHash);
  } catch (error) {
    console.error('Error validating admin credentials:', error);
    return false;
  }
}

// Rate limiting utility
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return '127.0.0.1';
}