import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds, email } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order IDs required' },
        { status: 400 }
      );
    }

    // Fetch all orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('id', orderIds);

    if (ordersError || !orders || orders.length === 0) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Orders not found' },
        { status: 404 }
      );
    }

    // Verify all orders are confirmed and not downloaded
    const invalidOrders = orders.filter(order => 
      !order.status.startsWith('confirmed') || order.downloaded
    );

    if (invalidOrders.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Some orders are not eligible for download' },
        { status: 400 }
      );
    }

    // Get product data
    const cachedData = await getCachedData();
    const products = cachedData.products || [];

    // Build file list
    const files = [];
    for (const order of orders) {
      const product = products.find(p => p.item === order.item);
      if (product && product.fileId) {
        files.push({
          id: product.fileId,
          name: product.name,
          filename: `${product.item}.zip`,
          downloadUrl: `/api/download/${product.fileId}?item=${order.item}&refCode=${order.ref_code}`,
          size: product.size || 'Unknown',
          orderId: order.id
        });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No downloadable files found' },
        { status: 404 }
      );
    }

    // Generate token
    const token = 'DL' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('download_tokens')
      .insert({
        token: token,
        order_ids: orderIds,
        files: JSON.stringify(files),
        customer_email: email,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Error creating download token:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to create download token' },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] Download token created: ${token} for ${files.length} files`);

    return NextResponse.json({
      success: true,
      token: token,
      expiresAt: expiresAt.toISOString(),
      files: files
    });

  } catch (error: any) {
    console.error('Error creating download token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}