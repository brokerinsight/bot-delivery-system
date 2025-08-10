import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error(`[${new Date().toISOString()}] NOWPayments API key not configured`);
      return NextResponse.json(
        { success: false, error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // Get local order from database
    const { data: localOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('ref_code', orderId)
      .single();

    if (orderError || !localOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check payment status with NOWPayments
    const response = await fetch(`https://api.nowpayments.io/v1/payment/${localOrder.payment_id}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] NOWPayments status check failed for ${orderId}`);
      return NextResponse.json(
        { success: false, error: 'Failed to check payment status' },
        { status: 500 }
      );
    }

    const statusData = await response.json();
    let newLocalStatus = localOrder.status;
    let message = `Payment status: ${statusData.payment_status}`;

    // Handle payment confirmation (matches server.js logic)
    if (statusData.payment_status === 'finished' && localOrder.status !== 'confirmed_nowpayments') {
      newLocalStatus = 'confirmed_nowpayments';
      
      // Update order in database
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: newLocalStatus,
          notes: `NOWPayments status: finished. Actually paid: ${statusData.actually_paid} ${statusData.pay_currency}`,
          amount_paid_crypto: parseFloat(statusData.actually_paid),
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Failed to update order status for ${orderId}:`, updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update order status' },
          { status: 500 }
        );
      }

      // Send email notification (matches server.js)
      const cachedData = await getCachedData();
      const product = cachedData.products.find(p => p.item === localOrder.item);
      if (product && localOrder.email) {
        try {
          const { sendOrderNotification } = await import('@/lib/email');
          await sendOrderNotification(
            localOrder.item, 
            orderId, 
            `${statusData.actually_paid} ${statusData.pay_currency.toUpperCase()} (Email: ${localOrder.email})`
          );
          console.log(`[${new Date().toISOString()}] Email notification sent for confirmed NOWPayments order ${orderId}`);
        } catch (emailError) {
          console.error(`[${new Date().toISOString()}] Failed to send email for ${orderId}:`, emailError.message);
        }
      }
      message = 'Payment successful! Preparing download...';
    } else if (['failed', 'refunded', 'expired'].includes(statusData.payment_status) && localOrder.status !== `failed_nowpayments_${statusData.payment_status}`) {
      newLocalStatus = `failed_nowpayments_${statusData.payment_status}`;
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: newLocalStatus,
          notes: `NOWPayments status: ${statusData.payment_status}`,
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Failed to update order status for ${orderId}:`, updateError);
      }
      message = `Payment ${statusData.payment_status}.`;
    }

    return NextResponse.json({
      success: true,
      status: newLocalStatus,
      payment_status: statusData.payment_status,
      message: message,
      order_data: {
        ...localOrder,
        status: newLocalStatus
      }
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] NOWPayments status check error:`, error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}