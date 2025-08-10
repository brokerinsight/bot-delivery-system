import { NextRequest, NextResponse } from 'next/server';
import { getCustomBotOrder } from '@/lib/custom-bot';

interface PaymentStatusParams {
  params: {
    ref_code: string;
  };
}

export async function GET(request: NextRequest, { params }: PaymentStatusParams) {
  try {
    const { ref_code } = params;

    if (!ref_code) {
      return NextResponse.json(
        { success: false, error: 'Reference code is required' },
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

    return NextResponse.json({
      success: true,
      payment_status: order.payment_status,
      order_status: order.status,
      tracking_number: order.tracking_number,
      created_at: order.created_at,
      updated_at: order.updated_at,
      completed_at: order.completed_at,
      refunded_at: order.refunded_at
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}