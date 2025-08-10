import { NextRequest, NextResponse } from 'next/server';
import { getAllCustomBotOrders } from '@/lib/custom-bot';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getSession(request);
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getAllCustomBotOrders(page, limit, status, search);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil((result.total || 0) / limit)
    });

  } catch (error) {
    console.error('Admin custom bot orders API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}