import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCachedData } from '@/lib/data';

// Mark this route as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication for admin routes
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await getCachedData();
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}