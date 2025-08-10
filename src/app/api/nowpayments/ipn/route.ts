import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const ipnSecretKey = process.env.NOWPAYMENTS_IPN_KEY;
  
  if (!ipnSecretKey) {
    console.error(`[${new Date().toISOString()}] NOWPayments IPN Secret Key not configured. IPN ignored.`);
    return NextResponse.json(
      { error: 'IPN configuration error' },
      { status: 500 }
    );
  }

  try {
    const body = await request.text();
    const bodyObj = JSON.parse(body);

    // Verify the IPN signature (matches server.js verification)
    const receivedSignature = request.headers.get('x-nowpayments-sig');
    const computedSignature = crypto
      .createHmac('sha512', ipnSecretKey)
      .update(body)
      .digest('hex');

    if (receivedSignature !== computedSignature) {
      console.error(`[${new Date().toISOString()}] NOWPayments IPN: Signature verification failed`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const {
      payment_id,
      payment_status,
      pay_address,
      pay_amount,
      pay_currency,
      order_id: orderId,
      order_description,
      purchase_id,
      price_amount,
      price_currency,
      actually_paid,
      outcome_amount,
      outcome_currency
    } = bodyObj;

    console.log(`[${new Date().toISOString()}] NOWPayments IPN received for order ${orderId}: ${payment_status}`);

    // Get order from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('ref_code', orderId)
      .single();

    if (orderError || !order) {
      console.error(`[${new Date().toISOString()}] NOWPayments IPN: Order not found for ${orderId}`);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let newLocalStatus = order.status;
    let notificationSent = false;

    if (payment_status === 'finished' && order.status !== 'confirmed_nowpayments') {
      newLocalStatus = 'confirmed_nowpayments';
      
      // Update order in database
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: newLocalStatus,
          notes: `Payment confirmed via NOWPayments`,
          amount_paid_crypto: parseFloat(actually_paid),
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] NOWPayments IPN: Failed to update order ${orderId}:`, updateError);
        return NextResponse.json(
          { error: 'Database update failed' },
          { status: 500 }
        );
      }

      console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} confirmed`);

      // Send email notification if product exists and order has email (matches server.js)
      const cachedData = await getCachedData();
      const product = cachedData.products.find((p: any) => p.item === order.item);
      if (product && order.email && !order.downloaded) {
        try {
          const { sendOrderNotification } = await import('@/lib/email');
          await sendOrderNotification(
            order.item, 
            orderId, 
            `${actually_paid} ${pay_currency.toUpperCase()} (Email: ${order.email})`
          );
          notificationSent = true;
          console.log(`[${new Date().toISOString()}] NOWPayments IPN: Email notification sent for ${orderId}`);
        } catch (emailError) {
          console.error(`[${new Date().toISOString()}] NOWPayments IPN: Failed to send email for ${orderId}:`, emailError instanceof Error ? emailError.message : emailError);
        }
      }
    } else if (payment_status === 'partially_paid' && order.status !== 'partially_paid_nowpayments') {
      newLocalStatus = 'partially_paid_nowpayments';
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: newLocalStatus,
          notes: `Partial payment received via NOWPayments`,
          amount_paid_crypto: parseFloat(actually_paid),
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] NOWPayments IPN: Failed to update order ${orderId}:`, updateError);
      } else {
        console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} partially paid`);
      }
    } else if (['failed', 'refunded', 'expired'].includes(payment_status) && !order.status.includes('failed_nowpayments')) {
      newLocalStatus = `failed_nowpayments_${payment_status}`;
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: newLocalStatus,
          notes: `NOWPayments status: ${payment_status}`,
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] NOWPayments IPN: Failed to update order ${orderId}:`, updateError);
      } else {
        console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} ${payment_status}`);
      }
    }

    return NextResponse.json({
      success: true,
      status: newLocalStatus,
      notification_sent: notificationSent
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] NOWPayments IPN error:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'IPN processing failed' },
      { status: 500 }
    );
  }
}