import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item, price_amount, price_currency, pay_currency, email, order_description } = body;
    
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const ipnSecretKey = process.env.NOWPAYMENTS_IPN_KEY;
    
    if (!apiKey || !ipnSecretKey) {
      console.error(`[${new Date().toISOString()}] NOWPayments API configuration missing`);
      return NextResponse.json(
        { success: false, error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // Get cached data to find the product
    const cachedData = await getCachedData();
    const product = cachedData.products.find((p: any) => p.item === item);
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create payment with NOWPayments
      const response = await fetch('https://api.nowpayments.io/v1/payment', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: parseFloat(price_amount),
          price_currency: price_currency.toUpperCase(),
          pay_currency: pay_currency.toUpperCase(),
          ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/nowpayments/ipn`,
          order_id: orderId,
          order_description: order_description || `Purchase of ${product.name}`,
          is_fixed_rate: false,
          is_fee_paid_by_user: false,
        }),
      });

      const paymentData = await response.json();

      if (!response.ok) {
        console.error(`[${new Date().toISOString()}] NOWPayments API error:`, paymentData);
        return NextResponse.json(
          { success: false, error: 'Failed to create payment' },
          { status: 500 }
        );
      }

      // Store order in database
      const { error: dbError } = await supabaseAdmin
        .from('orders')
        .insert({
          item: item,
          ref_code: orderId,
          amount: parseFloat(price_amount),
          email: email,
          status: 'pending_nowpayments',
          downloaded: false,
          payment_method: 'crypto',
          payment_id: paymentData.payment_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: `NOWPayments order. Pay currency: ${pay_currency.toUpperCase()}`
        });

      if (dbError) {
        console.error(`[${new Date().toISOString()}] Database error storing NOWPayments order:`, dbError);
        return NextResponse.json(
          { success: false, error: 'Failed to store order' },
          { status: 500 }
        );
      }

      console.log(`[${new Date().toISOString()}] NOWPayments order created successfully: ${orderId}`);

      return NextResponse.json({
        success: true,
        payment_data: paymentData,
        order_id: orderId
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] NOWPayments create payment error:`, error);
      return NextResponse.json(
        { success: false, error: 'Payment service error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating NOWPayments payment:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}