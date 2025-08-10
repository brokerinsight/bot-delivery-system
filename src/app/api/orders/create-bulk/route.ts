import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';
import { sendOrderNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      items, 
      customer, 
      paymentMethod, 
      mpesaRefCode,
      cryptoOrderId 
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items required' },
        { status: 400 }
      );
    }

    if (!customer || !customer.email) {
      return NextResponse.json(
        { success: false, error: 'Customer information required' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method required' },
        { status: 400 }
      );
    }

    // Get cached product data
    const cachedData = await getCachedData();
    const products = cachedData.products || [];

    // Generate a main reference code for this bulk order
    const mainRefCode = 'BULK' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const createdOrders = [];
    const orderPromises = [];

    // Create individual orders for each cart item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = products.find((p: any) => p.item === item.product_id);
      
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.product_id}` },
          { status: 404 }
        );
      }

      // Generate individual ref code for each order
      const individualRefCode = `${mainRefCode}_${i + 1}`;
      
      // Determine initial status based on payment method
      let initialStatus = 'pending';
      let paymentMethodCode = '';
      
      switch (paymentMethod) {
        case 'mpesa':
          paymentMethodCode = 'mpesa_till';
          initialStatus = mpesaRefCode ? 'pending_verification' : 'pending';
          break;
        case 'crypto':
          paymentMethodCode = 'crypto_nowpayments';
          initialStatus = cryptoOrderId ? 'pending_verification' : 'pending';
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid payment method' },
            { status: 400 }
          );
      }

      // Create order data
      const orderData = {
        item: product.item,
        ref_code: individualRefCode,
        amount: product.price * (item.quantity || 1),
        status: initialStatus,
        downloaded: false,
        payment_method: paymentMethodCode,
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        customer_phone: customer.phone,
        customer_country: customer.country,
        bulk_ref_code: mainRefCode,
        mpesa_ref_code: mpesaRefCode || null,
        crypto_order_id: cryptoOrderId || null,
        quantity: item.quantity || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add order creation promise
      orderPromises.push(
        supabaseAdmin
          .from('orders')
          .insert(orderData)
          .select()
          .single()
      );
    }

    // Execute all order creations
    const orderResults = await Promise.all(orderPromises);
    
    // Check for any errors
    for (const result of orderResults) {
      if (result.error) {
        console.error('Error creating order:', result.error);
        return NextResponse.json(
          { success: false, error: 'Failed to create orders' },
          { status: 500 }
        );
      }
      createdOrders.push(result.data);
    }

    // For M-Pesa payments, if ref code provided, trigger verification process
    if (paymentMethod === 'mpesa' && mpesaRefCode) {
      // Here you would typically trigger M-Pesa verification
      // For now, we'll just log it
      console.log(`[${new Date().toISOString()}] M-Pesa bulk order created: ${mainRefCode}, ref: ${mpesaRefCode}`);
      
      // Send admin notification for manual verification
      try {
        await sendOrderNotification(
          `Bulk Order (${items.length} items)`,
          mainRefCode,
          createdOrders.reduce((sum, order) => sum + order.amount, 0)
        );
      } catch (emailError) {
        console.error('Error sending admin notification:', emailError);
      }
    }

    // For crypto payments, prepare for NOWPayments integration
    if (paymentMethod === 'crypto') {
      // The cryptoOrderId would be handled by the NOWPayments webhook
      console.log(`[${new Date().toISOString()}] Crypto bulk order created: ${mainRefCode}, crypto ID: ${cryptoOrderId}`);
    }

    // Generate download token if all orders are confirmed
    let downloadToken = null;
    const allConfirmed = createdOrders.every(order => 
      order.status.startsWith('confirmed')
    );

    if (allConfirmed) {
      try {
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/orders/create-download-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds: createdOrders.map(order => order.id),
            email: customer.email
          })
        });

        if (tokenResponse.ok) {
          const tokenResult = await tokenResponse.json();
          if (tokenResult.success) {
            downloadToken = tokenResult.token;
          }
        }
      } catch (error) {
        console.error('Error creating download token:', error);
      }
    }

    console.log(`[${new Date().toISOString()}] Bulk order completed: ${mainRefCode}, ${createdOrders.length} orders created`);

    return NextResponse.json({
      success: true,
      mainRefCode: mainRefCode,
      orders: createdOrders,
      downloadToken: downloadToken,
      paymentMethod: paymentMethod,
      totalAmount: createdOrders.reduce((sum, order) => sum + order.amount, 0)
    });

  } catch (error: any) {
    console.error('Error creating bulk order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}