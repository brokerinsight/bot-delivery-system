import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { ProductDetails } from '@/components/product/product-details';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductReviews } from '@/components/product/product-reviews';
import { RelatedProducts } from '@/components/product/related-products';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Product } from '@/types';
import { generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo';
import { getCachedData } from '@/lib/data';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const cachedData = await getCachedData();
    const product = cachedData.products.find((p: any) => p.item === slug && !p.isArchived);
    return product || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} - Premium Trading Bot | Deriv Bot Store`,
    description: product.description?.slice(0, 160) + '...',
    keywords: [
      product.name,
      product.category,
      'trading bot',
      'deriv bot',
      'automated trading',
      'binary options',
      'forex trading',
    ],
    openGraph: {
      title: product.name,
      description: product.description || '',
      images: [
        {
          url: product.image || '/og-product.png',
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description || '',
      images: [product.image || '/og-product.png'],
    },
    alternates: {
      canonical: `/product/${params.slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Store', href: '/store' },
    { label: product.category, href: `/store?category=${product.category.toLowerCase()}` },
    { label: product.name, href: `/product/${params.slug}` },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Product Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Gallery */}
            <ProductGallery product={product} />
            
            {/* Product Details */}
            <ProductDetails product={product} />
          </div>
        </section>

        {/* Product Description & Specifications */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Description */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
                  Description
                </h2>
                <div className="prose prose-secondary dark:prose-invert max-w-none">
                  <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                    {product.description}
                  </p>
                  
                  {/* Additional content */}
                  <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                  <ul className="list-disc list-inside space-y-2 text-secondary-600 dark:text-secondary-300">
                    <li>Advanced risk management algorithms</li>
                    <li>Customizable position sizing</li>
                    <li>Multiple safety mechanisms</li>
                    <li>Real-time market analysis</li>
                    <li>Backtesting capabilities</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-6 mb-3">Compatible Markets</h3>
                  <ul className="list-disc list-inside space-y-2 text-secondary-600 dark:text-secondary-300">
                    <li>Binary Options (Rise/Fall, Higher/Lower)</li>
                    <li>Forex Major Pairs</li>
                    <li>Cryptocurrency pairs</li>
                    <li>Commodities (Gold, Silver, Oil)</li>
                  </ul>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
                  Specifications
                </h2>
                <div className="space-y-4">
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600 dark:text-secondary-400">File Format</span>
                      <span className="font-semibold text-secondary-800 dark:text-secondary-200">XML</span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600 dark:text-secondary-400">Platform</span>
                      <span className="font-semibold text-secondary-800 dark:text-secondary-200">Deriv Bot</span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600 dark:text-secondary-400">Strategy Type</span>
                      <span className="font-semibold text-secondary-800 dark:text-secondary-200">{product.category}</span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600 dark:text-secondary-400">Risk Level</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">Medium</span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600 dark:text-secondary-400">Experience</span>
                      <span className="font-semibold text-secondary-800 dark:text-secondary-200">Intermediate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bot Preview */}
        {product.embed && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="glass-card rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
                Bot Preview
              </h2>
              <div 
                className="rounded-2xl overflow-hidden bg-secondary-100 dark:bg-secondary-800"
                dangerouslySetInnerHTML={{ __html: product.embed }}
              />
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <ProductReviews />

        {/* Related Products */}
        <RelatedProducts 
          currentProduct={product} 
        />
      </main>
      
      <Footer />

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateProductStructuredData({
            ...product,
            description: product.description || '',
            image: product.image || '',
            fileId: product.file_id,
            originalFileName: product.original_file_name,
            isNew: product.is_new,
            isArchived: product.is_archived
          }))
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbStructuredData([
            { name: 'Home', url: '/' },
            { name: 'Store', url: '/store' },
            { name: product.category, url: `/store?category=${encodeURIComponent(product.category)}` },
            { name: product.name, url: `/product/${params.slug}` }
          ]))
        }}
      />
    </div>
  );
}