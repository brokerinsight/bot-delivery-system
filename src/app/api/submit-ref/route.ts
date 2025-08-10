import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item, refCode, amount, timestamp } = body;

    // Get cached data to find the product
    const cachedData = await getCachedData();
    const product = cachedData.products.find(p => p.item === item);
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate amount matches product price
    if (parseFloat(amount) !== product.price) {
      return NextResponse.json(
        { success: false, error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Insert order into database
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        item: item,
        ref_code: refCode,
        amount: parseFloat(amount),
        status: 'pending',
        downloaded: false,
        payment_method: 'mpesa_till',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`[${new Date().toISOString()}] Error inserting order:`, error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit ref code' },
        { status: 500 }
      );
    }

    // Send email notification (async, don't wait for it) - matches server.js exactly
    Promise.resolve(sendOrderNotification(item, refCode, amount)).catch(err => {
      console.error(`[${new Date().toISOString()}] Async email error:`, err.message);
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting ref code:`, error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to submit ref code' },
      { status: 500 }
    );
  }
}

// Email notification function that imports from lib/email
async function sendOrderNotification(item: string, refCode: string, amount: number) {
  try {
    const { sendOrderNotification: emailSender } = await import('@/lib/email');
    await emailSender(item, refCode, amount);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send order notification email:`, error.message);
  }
}