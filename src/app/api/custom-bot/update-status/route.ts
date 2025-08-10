import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCustomBotCompletionEmail, sendCustomBotRefundEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orderId, status, refundReason, customMessage } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    if (!['completed', 'refunded'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Fetch the order first
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('custom_bot_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update the order status
    const { error: updateError } = await supabaseAdmin
      .from('custom_bot_orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Send appropriate email notification
    try {
      if (status === 'completed') {
        await sendCustomBotCompletionEmail(order);
      } else if (status === 'refunded') {
        await sendCustomBotRefundEmail(
          order,
          refundReason || 'Technical limitations',
          customMessage || ''
        );
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: `Order ${status} successfully`
    });

  } catch (error: any) {
    console.error('Error updating custom bot order status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}