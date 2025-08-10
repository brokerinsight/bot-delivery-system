import { NextRequest, NextResponse } from 'next/server';
import { getCachedData } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const data = await getCachedData();
    let products = data.products.filter((product: any) => !product.isArchived);

    // Filter by category
    if (category && category !== 'all') {
      products = products.filter((product: any) => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((product: any) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = products.length;
    const paginatedProducts = products.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      categories: data.categories,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}