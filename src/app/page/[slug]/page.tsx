import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { getCachedData } from '@/lib/data';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

interface StaticPageProps {
  params: {
    slug: string;
  };
}

interface StaticPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

async function getStaticPage(slug: string): Promise<StaticPage | null> {
  try {
    const cachedData = await getCachedData();
    const page = cachedData.staticPages?.find((p: StaticPage) => p.slug === `/${slug}` && p.isActive);
    return page || null;
  } catch (error) {
    console.error('Error fetching static page:', error);
    return null;
  }
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const page = await getStaticPage(params.slug);
  
  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return generateSEOMetadata({
    title: page.title,
    description: `${page.title} - Deriv Bot Store`,
  });
}

export default async function StaticPage({ params }: StaticPageProps) {
  const page = await getStaticPage(params.slug);

  if (!page) {
    notFound();
  }

  const cleanContent = (content: string) => {
    return content
      .replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      .trim();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-8">
              {page.title}
            </h1>
            
            <div 
              className="text-secondary-700 dark:text-secondary-300 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: cleanContent(page.content) || '<p>No content available.</p>' 
              }}
            />
          </article>
        </div>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}

// Generate static params for static pages
export async function generateStaticParams() {
  try {
    // During static generation, directly query Supabase to avoid Redis calls
    const { data: pagesData, error } = await import('@/lib/supabase').then(mod => 
      mod.supabase.from('static_pages').select('slug, is_active')
    );
    
    if (error) {
      console.warn('Error generating static params:', error);
      return [
        { slug: 'about' },
        { slug: 'contact' },
        { slug: 'privacy' },
        { slug: 'terms' }
      ];
    }
    
    return (pagesData || [])
      .filter((page: any) => page.is_active !== false && page.slug && page.slug.startsWith('/'))
      .map((page: any) => ({
        slug: page.slug.substring(1), // Remove leading slash
      }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Return fallback static pages
    return [
      { slug: 'about' },
      { slug: 'contact' },
      { slug: 'privacy' },
      { slug: 'terms' }
    ];
  }
}