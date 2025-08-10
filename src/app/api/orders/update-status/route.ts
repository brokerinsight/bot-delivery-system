import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateOrderStatus } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { refCode, status } = body;

    if (!refCode || !status) {
      return NextResponse.json(
        { success: false, error: 'Ref code and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'no payment', 'partial payment'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const success = await updateOrderStatus(refCode, status);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}