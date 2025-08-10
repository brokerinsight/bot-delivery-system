import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadOrders } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orders = await loadOrders();

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}