import { NextRequest, NextResponse } from 'next/server';
import { createCustomBotOrder } from '@/lib/custom-bot';
import { CustomBotOrderRequest } from '@/types';
import { rateLimit, getClientIP } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Apply rate limiting (max 3 requests per minute)
    if (!rateLimit(clientIP, 3, 60000)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'client_email',
      'bot_description',
      'bot_features',
      'budget_amount',
      'payment_method',
      'refund_method',
      'terms_accepted'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.client_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate budget amount
    if (body.budget_amount < 10) {
      return NextResponse.json(
        { success: false, error: 'Budget amount must be at least $10' },
        { status: 400 }
      );
    }

    // Validate description length
    if (body.bot_description.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Bot description must be at least 50 characters' },
        { status: 400 }
      );
    }

    // Validate features length
    if (body.bot_features.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Bot features must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['mpesa', 'crypto'].includes(body.payment_method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate refund method
    if (!['mpesa', 'crypto'].includes(body.refund_method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid refund method' },
        { status: 400 }
      );
    }

    // Validate refund method specific fields
    if (body.refund_method === 'crypto') {
      if (!body.refund_crypto_wallet || !body.refund_crypto_network) {
        return NextResponse.json(
          { success: false, error: 'Crypto wallet address and network are required for crypto refunds' },
          { status: 400 }
        );
      }
    } else if (body.refund_method === 'mpesa') {
      if (!body.refund_mpesa_number || !body.refund_mpesa_name) {
        return NextResponse.json(
          { success: false, error: 'M-Pesa number and name are required for M-Pesa refunds' },
          { status: 400 }
        );
      }
      
      // Validate M-Pesa number format
      const mpesaRegex = /^254\d{9}$/;
      const cleanNumber = body.refund_mpesa_number.replace(/\s+/g, '');
      if (!mpesaRegex.test(cleanNumber)) {
        return NextResponse.json(
          { success: false, error: 'Invalid M-Pesa number format. Use 254XXXXXXXXX' },
          { status: 400 }
        );
      }
      
      // Update with clean number
      body.refund_mpesa_number = cleanNumber;
    }

    // Validate terms acceptance
    if (!body.terms_accepted) {
      return NextResponse.json(
        { success: false, error: 'You must accept the terms and conditions' },
        { status: 400 }
      );
    }

    // Create the order
    const orderData: CustomBotOrderRequest = {
      client_email: body.client_email.toLowerCase().trim(),
      bot_description: body.bot_description.trim(),
      bot_features: body.bot_features.trim(),
      budget_amount: parseFloat(body.budget_amount),
      payment_method: body.payment_method,
      refund_method: body.refund_method,
      refund_crypto_wallet: body.refund_crypto_wallet?.trim() || undefined,
      refund_crypto_network: body.refund_crypto_network?.trim() || undefined,
      refund_mpesa_number: body.refund_mpesa_number?.trim() || undefined,
      refund_mpesa_name: body.refund_mpesa_name?.trim() || undefined,
      terms_accepted: body.terms_accepted
    };

    const result = await createCustomBotOrder(orderData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Send email notifications
    try {
      const { sendOrderConfirmationEmail, sendAdminNewOrderNotification } = await import('@/lib/email');
      
      // Send confirmation email to customer
      await sendOrderConfirmationEmail(result.data!);
      
      // Send notification email to admin
      await sendAdminNewOrderNotification(result.data!);
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the order creation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Custom bot order created successfully',
      ref_code: result.ref_code,
      tracking_number: result.data?.tracking_number,
      order_id: result.data?.id
    });

  } catch (error) {
    console.error('Custom bot order creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}