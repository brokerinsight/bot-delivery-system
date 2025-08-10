import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Mark this route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    return NextResponse.json({
      success: true,
      isAuthenticated: session.isAuthenticated,
      email: session.email
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}