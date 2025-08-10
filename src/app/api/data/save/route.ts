import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveDataToDatabase } from '@/lib/data';

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

    const body = await request.json();
    const { products, categories, settings, staticPages } = body;

    // Validate that at least one type of data is being saved
    if (!products && !categories && !settings && !staticPages) {
      return NextResponse.json(
        { success: false, error: 'No data provided to save' },
        { status: 400 }
      );
    }

    // Save data to database
    await saveDataToDatabase({
      products,
      categories,
      settings,
      staticPages
    });

    return NextResponse.json({
      success: true,
      message: 'Data saved successfully'
    });
  } catch (error) {
    console.error('Data save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save data' },
      { status: 500 }
    );
  }
}