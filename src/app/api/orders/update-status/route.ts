import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateOrderStatus, getCachedData } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';
import { adminWebSocket } from '@/lib/websocket-server';

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

    // Validate status - matches server.js validStatuses
    const validStatuses = ['confirmed', 'no payment', 'partial payment', 'pending_stk_push', 'confirmed_server_stk', 'failed_stk_initiation', 'failed_stk_cb_timeout', 'failed_amount_mismatch'];
    if (!validStatuses.some(s => status.startsWith(s))) {
      if (!status.startsWith('failed_stk_cb_')) {
        return NextResponse.json(
          { success: false, error: 'Invalid status value provided' },
          { status: 400 }
        );
      }
    }

    // Get order details before updating (needed for email notification)
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('ref_code', refCode)
      .single();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const success = await updateOrderStatus(refCode, status);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Send email notification if status was updated to confirmed_server_stk (matches server.js)
    if (status === 'confirmed_server_stk') {
      try {
        const { sendOrderNotification } = await import('@/lib/email');
        await sendOrderNotification(order.item, refCode, order.amount);
        console.log(`[${new Date().toISOString()}] Order notification email sent for ${refCode} after status update to confirmed_server_stk.`);
      } catch (emailError) {
        console.error(`[${new Date().toISOString()}] Failed to send order notification email:`, emailError instanceof Error ? emailError.message : emailError);
        // Don't fail the request if email fails
      }
    }

    // Broadcast order update via WebSocket
    adminWebSocket.broadcastOrderUpdate({
      action: 'statusUpdated',
      refCode,
      status,
      timestamp: new Date().toISOString()
    });

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