import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedData } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;
  const { searchParams } = new URL(request.url);
  const item = searchParams.get('item');
  const refCode = searchParams.get('refCode');

  console.log(`[${new Date().toISOString()}] Download request: fileId=${fileId}, item=${item}, refCode=${refCode}`);

  if (!item || !refCode) {
    console.log(`[${new Date().toISOString()}] Missing item or refCode in download request`);
    return new NextResponse(
      `<script>alert("Invalid download link - missing parameters."); window.close();</script>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  try {
    // Get order from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();

    if (orderError || !order) {
      console.log(`[${new Date().toISOString()}] Order not found for download: ${item}/${refCode}`);
      return new NextResponse(
        `<script>alert("Order not found for this download link."); window.close();</script>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Validate order status and download eligibility
    let errorMsg = '';
    if (order.downloaded) {
      errorMsg = 'File already downloaded for this order.';
    } else if (!order.status.startsWith('confirmed')) {
      errorMsg = `Payment not confirmed (status: ${order.status}).`;
    }

    if (errorMsg) {
      console.log(`[${new Date().toISOString()}] Invalid download attempt for ${fileId}: ${item}/${refCode}. Reason: ${errorMsg}`);
      return new NextResponse(
        `<script>alert("${errorMsg}"); window.close();</script>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Get product data
    const cachedData = await getCachedData();
    const product = cachedData.products.find(p => p.item === item && p.fileId === fileId);
    
    if (!product) {
      console.log(`[${new Date().toISOString()}] Product file not found for download: ${fileId}/${item}`);
      return new NextResponse(
        `<script>alert("Product file not found for this link."); window.close();</script>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Download file from Supabase storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('bots')
      .download(fileId);

    if (fileError) {
      console.error(`[${new Date().toISOString()}] Error downloading file from storage:`, fileError);
      throw fileError;
    }

    // Convert to buffer
    const buffer = await fileData.arrayBuffer();
    const mimeType = fileData.type || 'application/octet-stream';
    const finalFileName = product.original_file_name || product.originalFileName || `${item}.bin`;
    const encodedFileName = encodeURIComponent(finalFileName);

    // Mark order as downloaded
    await supabaseAdmin
      .from('orders')
      .update({ downloaded: true, updated_at: new Date().toISOString() })
      .eq('item', item)
      .eq('ref_code', refCode);

    console.log(`[${new Date().toISOString()}] File download completed: ${fileId} as ${finalFileName}. Marked order as downloaded.`);

    // Return file
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Content-Type': mimeType,
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error downloading file ${fileId}:`, error.message);
    return new NextResponse(
      `<script>alert("Failed to download file due to a server error."); window.close();</script>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}