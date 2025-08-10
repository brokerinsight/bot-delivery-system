import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: { item: string; refCode: string } }
) {
  const { item, refCode } = params;

  console.log(`[${new Date().toISOString()}] Order status request: ${item}/${refCode}`);

  try {
    // Get order from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();

    if (orderError || !order) {
      console.log(`[${new Date().toISOString()}] Order not found: ${item}/${refCode}`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const status = order.status;
    const downloaded = order.downloaded;
    const notes = order.notes || '';
    let downloadLink = null;
    let userFriendlyMessage = `Payment status: ${status}. ${notes}`.trim();

    // If order is confirmed and not downloaded, generate download link
    if ((status === 'confirmed' || status === 'confirmed_server_stk') && !downloaded) {
      const cachedData = await getCachedData();
      const product = cachedData.products.find(p => p.item === item);
      
      if (!product || !product.fileId) {
        console.error(`[${new Date().toISOString()}] Order Status: Product file details not found for item ${item} (Ref: ${refCode})`);
        return NextResponse.json({
          success: false,
          status,
          notes,
          error: 'Product file details not found, cannot generate download link.'
        }, { status: 500 });
      }

      downloadLink = `/download/${product.fileId}?item=${item}&refCode=${refCode}`;
      userFriendlyMessage = 'Payment confirmed! Preparing download...';
    } else if (downloaded) {
      userFriendlyMessage = 'File already downloaded for this order.';
      // Still return success, but indicate already downloaded
      return NextResponse.json({
        success: true,
        status,
        notes,
        message: userFriendlyMessage,
        downloaded: true
      });
    } else if (status.startsWith('failed_')) {
      userFriendlyMessage = notes || `Payment failed with status: ${status}. Please contact support if issue persists.`;
    } else if (status === 'pending_stk_push') {
      userFriendlyMessage = notes || 'STK push sent to your phone. Please enter your M-PESA PIN to complete the payment.';
    } else if (status === 'pending') {
      userFriendlyMessage = notes || 'Payment is being processed. Please wait...';
    } else if (status === 'no payment') {
      userFriendlyMessage = 'No payment received yet. Please try again or contact support.';
    } else if (status === 'partial payment') {
      userFriendlyMessage = 'Partial payment received. Please contact support to resolve.';
    }

    console.log(`[${new Date().toISOString()}] Order status response for ${item}/${refCode}: ${status}, message: ${userFriendlyMessage}`);

    return NextResponse.json({
      success: true,
      status,
      notes,
      message: userFriendlyMessage,
      downloadLink,
      downloaded
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status for ${item}/${refCode}:`, error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to check order status' },
      { status: 500 }
    );
  }
}