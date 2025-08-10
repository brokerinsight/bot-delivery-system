import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { addProduct } from '@/lib/data';
import { adminWebSocket } from '@/lib/websocket-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Extract form fields
    const item = formData.get('item') as string;
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('desc') as string;
    const embed = formData.get('embed') as string;
    const category = formData.get('category') as string;
    const image = formData.get('img') as string;
    const isNew = formData.get('isNew') === 'true';
    const file = formData.get('file') as File;

    // Validate required fields
    if (!item || !name || !price || !category || !file) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type (should be .xml for trading bots)
    if (!file.name.toLowerCase().endsWith('.xml')) {
      return NextResponse.json(
        { success: false, error: 'File must be an XML file' },
        { status: 400 }
      );
    }

    const productData = {
      item,
      name,
      price,
      description: description || '',
      image: image || 'https://via.placeholder.com/300',
      category,
      embed: embed || '',
      isNew,
      isArchived: false,
      created_at: new Date().toISOString()
    };

    const product = await addProduct(productData, file);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Failed to add product' },
        { status: 500 }
      );
    }

    // Broadcast product update via WebSocket
    adminWebSocket.broadcastProductUpdate({
      action: 'added',
      product: product
    });

    return NextResponse.json({
      success: true,
      product,
      message: 'Product added successfully'
    });
  } catch (error) {
    console.error('Add product error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add product' },
      { status: 500 }
    );
  }
}