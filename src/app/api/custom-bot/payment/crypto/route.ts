import { NextRequest, NextResponse } from 'next/server';
import { getCustomBotOrder, updateCustomBotPaymentStatus } from '@/lib/custom-bot';
import { sendPaymentConfirmationEmail, sendAdminPaymentNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ref_code, currency, amount } = body;

    // Validate input
    if (!ref_code || !currency || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the order
    const orderResult = await getCustomBotOrder(ref_code);
    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.data;

    // Validate order status
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment already processed' },
        { status: 400 }
      );
    }

    // Validate amount
    if (parseFloat(amount) !== order.budget_amount) {
      return NextResponse.json(
        { success: false, error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Validate currency
    const supportedCurrencies = ['bitcoin', 'ethereum', 'litecoin', 'bitcoin_cash', 'dogecoin'];
    if (!supportedCurrencies.includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported cryptocurrency' },
        { status: 400 }
      );
    }

    try {
      // TODO: Integrate with your existing crypto payment provider (NOWPayments, etc.)
      // This is a placeholder that simulates the payment process
      
      // For demo purposes, we'll create a mock payment URL
      const mockPaymentId = `CRYPTO_${Date.now()}`;
      const mockPaymentUrl = `https://nowpayments.io/payment/?iid=${mockPaymentId}`;

      // Update payment status to pending
      const updateResult = await updateCustomBotPaymentStatus(
        ref_code,
        'pending', // Will be updated to 'paid' by callback
        mockPaymentId
      );

      if (!updateResult.success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update payment status' },
          { status: 500 }
        );
      }

      // Here you would integrate with your actual crypto payment provider
      // Example for NOWPayments:
      // const paymentResponse = await createNOWPayment({
      //   price_amount: amount,
      //   price_currency: 'usd',
      //   pay_currency: currency,
      //   order_id: ref_code,
      //   order_description: `Custom Bot Order ${order.tracking_number}`,
      //   ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/custom-bot/payment/callback/crypto`,
      //   success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/custom-bot/payment/${ref_code}`,
      //   cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/custom-bot/payment/${ref_code}`
      // });

      return NextResponse.json({
        success: true,
        message: 'Crypto payment initiated successfully',
        payment_id: mockPaymentId,
        payment_url: mockPaymentUrl,
        status: 'pending'
      });

    } catch (paymentError) {
      console.error('Crypto payment error:', paymentError);
      
      // Update payment status to failed
      await updateCustomBotPaymentStatus(ref_code, 'failed');
      
      return NextResponse.json(
        { success: false, error: 'Payment processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Crypto payment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle crypto payment status updates (webhook)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_id, status, ref_code } = body;

    // Validate webhook (in production, verify signature)
    if (!payment_id || !status || !ref_code) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Get the order
    const orderResult = await getCustomBotOrder(ref_code);
    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (status === 'finished' || status === 'paid') {
      // Update payment status to paid
      const updateResult = await updateCustomBotPaymentStatus(
        ref_code,
        'paid',
        payment_id
      );

      if (updateResult.success) {
        // Send email notifications
        try {
          await sendPaymentConfirmationEmail(updateResult.data!);
          await sendAdminPaymentNotification(updateResult.data!);
        } catch (emailError) {
          console.error('Error sending payment confirmation emails:', emailError);
        }
      }
    } else if (status === 'failed' || status === 'expired') {
      // Update payment status to failed
      await updateCustomBotPaymentStatus(ref_code, 'failed', payment_id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Crypto webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}