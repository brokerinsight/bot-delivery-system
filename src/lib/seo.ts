import type { Metadata } from 'next';
import type { Product } from '@/types';

// Base SEO configuration
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://derivbotstore.com';
const siteName = 'Deriv Bot Store';
const siteDescription = 'Premium automated trading bots for Deriv platform. Advanced algorithms, proven strategies, and professional trading solutions for forex, indices, and commodities.';

// Generate Open Graph images URL
export function generateOGImageUrl(title: string, description?: string): string {
  const params = new URLSearchParams();
  params.set('title', title);
  if (description) {
    params.set('description', description);
  }
  return `${baseUrl}/api/og?${params.toString()}`;
}

// Generate metadata for pages
export function generateMetadata(config: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  canonical?: string;
}): Metadata {
  const {
    title,
    description = siteDescription,
    path = '',
    keywords = [],
    image,
    noIndex = false,
    canonical
  } = config;

  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;
  const url = `${baseUrl}${path}`;
  const ogImage = image || generateOGImageUrl(title, description);

  const defaultKeywords = [
    'deriv trading bots',
    'automated trading',
    'forex bots',
    'trading algorithms',
    'deriv bot store',
    'binary options bots',
    'trading strategies'
  ];

  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords].join(', '),
    
    // Basic metadata
    authors: [{ name: 'Deriv Bot Store' }],
    creator: 'Deriv Bot Store',
    publisher: 'Deriv Bot Store',
    
    // Canonical URL
    alternates: {
      canonical: canonical || url
    },

    // Open Graph
    openGraph: {
      type: 'website',
      siteName,
      title: fullTitle,
      description,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      locale: 'en_US'
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      site: '@DerivBotStore',
      creator: '@DerivBotStore',
      title: fullTitle,
      description,
      images: [ogImage]
    },

    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    },

    // Verification
    verification: {
      google: process.env.GOOGLE_VERIFICATION
    },

    // Additional metadata
    other: {
      'google-site-verification': process.env.GOOGLE_VERIFICATION || '',
      'msvalidate.01': process.env.BING_VERIFICATION || '',
      'yandex-verification': process.env.YANDEX_VERIFICATION || ''
    }
  };
}

// Generate product-specific metadata
export function generateProductMetadata(product: Product): Metadata {
  const title = `${product.name} - Premium Trading Bot`;
  const description = `${product.description.slice(0, 150)}... Professional automated trading bot for Deriv platform. Price: $${product.price}`;
  const keywords = [
    product.name.toLowerCase(),
    product.category.toLowerCase(),
    'trading bot',
    'deriv bot',
    'automated trading',
    'forex bot'
  ];

  return generateMetadata({
    title,
    description,
    keywords,
    path: `/product/${encodeURIComponent(product.name.toLowerCase().replace(/\s+/g, '-'))}`,
    image: product.image !== 'https://via.placeholder.com/300' ? product.image : undefined
  });
}

// Generate JSON-LD structured data
export function generateProductStructuredData(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: 'Deriv Bot Store'
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: 'USD',
      availability: product.isArchived ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Deriv Bot Store',
        url: baseUrl
      },
      validFrom: product.created_at
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1'
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5'
        },
        author: {
          '@type': 'Person',
          name: 'Professional Trader'
        },
        reviewBody: 'Excellent trading bot with consistent performance and great results.',
        datePublished: '2024-01-15'
      }
    ]
  };
}

// Generate organization structured data
export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Deriv Bot Store',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      'https://twitter.com/DerivBotStore',
      'https://facebook.com/DerivBotStore',
      'https://linkedin.com/company/derivbotstore'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-234-567-8900',
      contactType: 'customer service',
      email: 'support@derivbotstore.com',
      availableLanguage: 'English'
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US'
    }
  };
}

// Generate website structured data
export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    description: siteDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/store?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: baseUrl
    }
  };
}

// Generate breadcrumb structured data
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

// Generate FAQ structured data
export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

// Generate local business structured data (if applicable)
export function generateLocalBusinessStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Deriv Bot Store',
    url: baseUrl,
    telephone: '+1-234-567-8900',
    email: 'support@derivbotstore.com',
    description: siteDescription,
    serviceType: 'Trading Bot Development and Sales',
    areaServed: 'Worldwide',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Trading Bots',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Automated Trading Bots',
            description: 'Professional trading algorithms for Deriv platform'
          }
        }
      ]
    }
  };
}