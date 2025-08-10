import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://derivbotstore.com';

  const robotsTxt = `User-agent: *
Allow: /
Allow: /store
Allow: /product/*

# Disallow admin and private pages
Disallow: /virus/
Disallow: /download/
Disallow: /checkout/
Disallow: /cart/

# Disallow API routes
Disallow: /api/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 1 day
    },
  });
}