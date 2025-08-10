import { NextRequest, NextResponse } from 'next/server';
import { getCustomBotOrder, updateCustomBotPaymentStatus } from '@/lib/custom-bot';
import { sendPaymentConfirmationEmail, sendAdminPaymentNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ref_code, phone_number, amount } = body;

    // Validate input
    if (!ref_code || !phone_number || !amount) {
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

    // TODO: Integrate with your existing M-Pesa payment system
    // This is a placeholder that simulates the payment process
    
    // For now, we'll simulate payment processing
    const mockPaymentId = `MPESA_${Date.now()}`;
    const mockReceiptNumber = `MP${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      // Here you would integrate with your actual M-Pesa payment provider
      // Example:
      // const paymentResponse = await initiatePayHeroPayment({
      //   phone_number,
      //   amount,
      //   reference: ref_code,
      //   callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/custom-bot/payment/callback/mpesa`
      // });

      // For demo purposes, we'll simulate a successful payment
      // In production, this would be handled by the payment callback
      
      // Update payment status
      const updateResult = await updateCustomBotPaymentStatus(
        ref_code,
        'paid', // In real implementation, this would be 'pending' until callback confirms
        mockPaymentId,
        mockReceiptNumber
      );

      if (!updateResult.success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update payment status' },
          { status: 500 }
        );
      }

      // Send email notifications
      try {
        await sendPaymentConfirmationEmail(updateResult.data!);
        await sendAdminPaymentNotification(updateResult.data!);
      } catch (emailError) {
        console.error('Error sending payment confirmation emails:', emailError);
        // Don't fail the payment if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Payment initiated successfully',
        payment_id: mockPaymentId,
        status: 'paid' // In real implementation, this would be 'pending'
      });

    } catch (paymentError) {
      console.error('M-Pesa payment error:', paymentError);
      
      // Update payment status to failed
      await updateCustomBotPaymentStatus(ref_code, 'failed');
      
      return NextResponse.json(
        { success: false, error: 'Payment processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('M-Pesa payment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}