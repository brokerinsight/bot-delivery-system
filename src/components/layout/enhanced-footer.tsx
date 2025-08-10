'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface StaticPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

interface SocialLink {
  title: string;
  url: string;
}

interface Settings {
  copyrightText?: string;
  supportEmail?: string;
  socialLinks?: SocialLink[];
}

export function EnhancedFooter() {
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<StaticPage | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      
      if (result.success) {
        setStaticPages(result.data.staticPages || []);
        setSettings(result.data.settings || {});
      }
    } catch (error) {
      console.error('Error loading footer data:', error);
    }
  };

  const openPageModal = (page: StaticPage) => {
    setSelectedPage(page);
    setModalOpen(true);
    document.body.classList.add('overflow-hidden');
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPage(null);
    document.body.classList.remove('overflow-hidden');
  };

  const cleanContent = (content: string) => {
    return content
      .replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      .trim();
  };

  const activePages = staticPages.filter(page => page.isActive);

  return (
    <>
      <footer className="bg-white shadow-inner mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Copyright */}
          <p className="text-gray-600">
            {settings.copyrightText || '© 2024 Deriv Bot Store. All rights reserved.'}
          </p>
          
          {/* Support Email */}
          {settings.supportEmail && (
            <p className="text-gray-500 mt-2">
              Support: <a href={`mailto:${settings.supportEmail}`} className="underline">{settings.supportEmail}</a>
            </p>
          )}
          
          {/* Social Links */}
          {settings.socialLinks && settings.socialLinks.length > 0 && (
            <div className="mt-4 flex justify-center space-x-4 flex-wrap">
              {settings.socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-green-600 transition-colors"
                >
                  {social.title}
                </a>
              ))}
            </div>
          )}
          
          {/* Static Pages Links */}
          {activePages.length > 0 && (
            <div className="mt-4 flex justify-center space-x-4 flex-wrap">
              {activePages.map(page => (
                <button
                  key={page.id}
                  onClick={() => openPageModal(page)}
                  className="text-gray-500 hover:text-green-600 transition-colors"
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </footer>

      {/* Mobile Footer Links - for mobile navigation */}
      <div id="mobile-footer-links" className="hidden">
        {activePages.map(page => (
          <button
            key={`mobile-${page.id}`}
            onClick={() => openPageModal(page)}
            className="text-gray-500 hover:text-green-600 text-sm block w-full text-left py-1"
          >
            {page.title}
          </button>
        ))}
      </div>

      {/* Static Page Modal */}
      {modalOpen && selectedPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4 pr-8">
              {selectedPage.title}
            </h3>
            
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: cleanContent(selectedPage.content) || '<p>No content available.</p>' 
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Export social links for mobile navigation
export function getMobileSocialLinks(settings: Settings) {
  return settings.socialLinks || [];
}

// Export static pages for mobile navigation
export function getMobileStaticPages(pages: StaticPage[]) {
  return pages.filter(page => page.isActive);
}