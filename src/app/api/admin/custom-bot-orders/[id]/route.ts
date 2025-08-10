import { NextRequest, NextResponse } from 'next/server';
import { updateCustomBotOrderStatus } from '@/lib/custom-bot';
import { sendBotDeliveryEmail, sendRefundNotificationEmail } from '@/lib/email';
import { getSession } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, refund_reason, custom_refund_message } = body;

    // Validate input
    if (!status || !['pending', 'completed', 'refunded'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await updateCustomBotOrderStatus(
      parseInt(id),
      status,
      refund_reason,
      custom_refund_message
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Send appropriate email notifications
    try {
      if (status === 'completed') {
        await sendBotDeliveryEmail(result.data!);
      } else if (status === 'refunded') {
        await sendRefundNotificationEmail(result.data!);
      }
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
      // Don't fail the status update if email fails
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Order status updated to ${status}`
    });

  } catch (error) {
    console.error('Admin order update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}