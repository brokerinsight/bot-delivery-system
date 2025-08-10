import { supabase, supabaseAdmin } from './supabase';
import { CustomBotOrder, CustomBotOrderRequest } from '@/types';

// Generate unique tracking number
export function generateTrackingNumber(): string {
  const prefix = 'CB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Generate unique reference code
export function generateRefCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${timestamp}${random}`;
}

// Create custom bot order
export async function createCustomBotOrder(orderData: CustomBotOrderRequest): Promise<{
  success: boolean;
  data?: CustomBotOrder;
  error?: string;
  ref_code?: string;
}> {
  try {
    const trackingNumber = generateTrackingNumber();
    const refCode = generateRefCode();
    const now = new Date().toISOString();

    const orderRecord = {
      tracking_number: trackingNumber,
      client_email: orderData.client_email,
      bot_description: orderData.bot_description,
      bot_features: orderData.bot_features,
      budget_amount: orderData.budget_amount,
      payment_method: orderData.payment_method,
      refund_method: orderData.refund_method,
      refund_crypto_wallet: orderData.refund_crypto_wallet || null,
      refund_crypto_network: orderData.refund_crypto_network || null,
      refund_mpesa_number: orderData.refund_mpesa_number || null,
      refund_mpesa_name: orderData.refund_mpesa_name || null,
      status: 'pending' as const,
      payment_status: 'pending' as const,
      ref_code: refCode,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabaseAdmin
      .from('custom_bot_orders')
      .insert(orderRecord)
      .select()
      .single();

    if (error) {
      console.error('Database error creating custom bot order:', error);
      return {
        success: false,
        error: 'Failed to create order. Please try again.'
      };
    }

    return {
      success: true,
      data: data as CustomBotOrder,
      ref_code: refCode
    };
  } catch (error) {
    console.error('Error creating custom bot order:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

// Get custom bot order by ref code
export async function getCustomBotOrder(refCode: string): Promise<{
  success: boolean;
  data?: CustomBotOrder;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('custom_bot_orders')
      .select('*')
      .eq('ref_code', refCode)
      .single();

    if (error) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    return {
      success: true,
      data: data as CustomBotOrder
    };
  } catch (error) {
    console.error('Error fetching custom bot order:', error);
    return {
      success: false,
      error: 'Failed to fetch order'
    };
  }
}

// Update custom bot order status
export async function updateCustomBotOrderStatus(
  id: number,
  status: 'pending' | 'completed' | 'refunded',
  refundReason?: string,
  customRefundMessage?: string
): Promise<{
  success: boolean;
  data?: CustomBotOrder;
  error?: string;
}> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'refunded') {
      updateData.refunded_at = new Date().toISOString();
      if (refundReason) updateData.refund_reason = refundReason;
      if (customRefundMessage) updateData.custom_refund_message = customRefundMessage;
    }

    const { data, error } = await supabaseAdmin
      .from('custom_bot_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: 'Failed to update order status'
      };
    }

    return {
      success: true,
      data: data as CustomBotOrder
    };
  } catch (error) {
    console.error('Error updating custom bot order status:', error);
    return {
      success: false,
      error: 'Failed to update order status'
    };
  }
}

// Update payment status
export async function updateCustomBotPaymentStatus(
  refCode: string,
  paymentStatus: 'pending' | 'paid' | 'failed',
  paymentId?: string,
  mpesaReceiptNumber?: string
): Promise<{
  success: boolean;
  data?: CustomBotOrder;
  error?: string;
}> {
  try {
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (paymentId) updateData.payment_id = paymentId;
    if (mpesaReceiptNumber) updateData.mpesa_receipt_number = mpesaReceiptNumber;

    const { data, error } = await supabaseAdmin
      .from('custom_bot_orders')
      .update(updateData)
      .eq('ref_code', refCode)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: 'Failed to update payment status'
      };
    }

    return {
      success: true,
      data: data as CustomBotOrder
    };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return {
      success: false,
      error: 'Failed to update payment status'
    };
  }
}

// Get all custom bot orders (for admin)
export async function getAllCustomBotOrders(
  page: number = 1,
  limit: number = 20,
  status?: string,
  search?: string
): Promise<{
  success: boolean;
  data?: CustomBotOrder[];
  total?: number;
  error?: string;
}> {
  try {
    let query = supabaseAdmin
      .from('custom_bot_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`client_email.ilike.%${search}%,tracking_number.ilike.%${search}%,ref_code.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch orders'
      };
    }

    return {
      success: true,
      data: data as CustomBotOrder[],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching custom bot orders:', error);
    return {
      success: false,
      error: 'Failed to fetch orders'
    };
  }
}

// Get refund reasons
export async function getRefundReasons(): Promise<{
  success: boolean;
  data?: { id: number; reason: string }[];
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('refund_reasons')
      .select('id, reason')
      .eq('is_active', true)
      .order('reason');

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch refund reasons'
      };
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error fetching refund reasons:', error);
    return {
      success: false,
      error: 'Failed to fetch refund reasons'
    };
  }
}