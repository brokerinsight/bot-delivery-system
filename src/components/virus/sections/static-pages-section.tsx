'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { QuillEditor, QuillEditorRef } from '@/components/ui/quill-editor';

interface StaticPagesSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onSave: (payload?: any) => Promise<boolean>;
}

interface StaticPage {
  id?: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

export function StaticPagesSection({ data, onDataUpdate, onSave }: StaticPagesSectionProps) {
  const [pages, setPages] = useState<StaticPage[]>(data.staticPages || []);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [isNewPage, setIsNewPage] = useState(false);
  const [newPage, setNewPage] = useState<StaticPage>({
    title: '',
    slug: '',
    content: '',
    isActive: true
  });
  const newPageEditorRef = useRef<QuillEditorRef>(null);
  const editPageEditorRef = useRef<QuillEditorRef>(null);

  useEffect(() => {
    setPages(data.staticPages || []);
  }, [data.staticPages]);

  const openEditModal = (page: StaticPage) => {
    setEditingPage({ ...page });
    setIsNewPage(false);
    setEditModalOpen(true);
  };

  const openNewPageModal = () => {
    setEditingPage({ ...newPage });
    setIsNewPage(true);
    setEditModalOpen(true);
  };

  const closeModal = () => {
    setEditModalOpen(false);
    setEditingPage(null);
    setIsNewPage(false);
    // Clear editors
    if (editPageEditorRef.current) {
      editPageEditorRef.current.clear();
    }
    if (newPageEditorRef.current) {
      newPageEditorRef.current.clear();
    }
  };

  const generateSlug = (title: string) => {
    return '/' + title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const savePage = async () => {
    if (!editingPage) return;

    // Validation
    if (!editingPage.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!editingPage.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    // Ensure slug starts with /
    if (!editingPage.slug.startsWith('/')) {
      setEditingPage({ ...editingPage, slug: '/' + editingPage.slug });
      return;
    }

    // Check for duplicate slugs
    const existingPage = pages.find(p => 
      p.slug === editingPage.slug && 
      (!editingPage.id || p.id !== editingPage.id)
    );
    
    if (existingPage) {
      toast.error('A page with this slug already exists');
      return;
    }

    try {
      let updatedPages: StaticPage[];
      
      if (isNewPage) {
        // Add new page
        const newPageWithId = {
          ...editingPage,
          id: Date.now() // Simple ID generation
        };
        updatedPages = [...pages, newPageWithId];
      } else {
        // Update existing page
        updatedPages = pages.map(p => 
          p.id === editingPage.id ? editingPage : p
        );
      }

      const success = await onSave({ staticPages: updatedPages });
      if (success) {
        setPages(updatedPages);
        onDataUpdate({ staticPages: updatedPages });
        closeModal();
        toast.success(isNewPage ? 'Page created successfully' : 'Page updated successfully');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save page');
    }
  };

  const deletePage = async (pageId: number) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      const updatedPages = pages.filter(p => p.id !== pageId);
      const success = await onSave({ staticPages: updatedPages });
      
      if (success) {
        setPages(updatedPages);
        onDataUpdate({ staticPages: updatedPages });
        toast.success('Page deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    }
  };

  const togglePageStatus = async (pageId: number) => {
    try {
      const updatedPages = pages.map(p => 
        p.id === pageId ? { ...p, isActive: !p.isActive } : p
      );
      
      const success = await onSave({ staticPages: updatedPages });
      if (success) {
        setPages(updatedPages);
        onDataUpdate({ staticPages: updatedPages });
        toast.success('Page status updated');
      }
    } catch (error) {
      console.error('Error updating page status:', error);
      toast.error('Failed to update page status');
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
              Static Pages
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              Manage your website's static pages and content.
            </p>
          </div>
          
          <button
            onClick={openNewPageModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Add New Page
          </button>
        </div>
      </div>

      {/* Special Pages Info */}
      <div className="glass-card rounded-2xl p-6 bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Special Pages</h3>
        <p className="text-sm text-blue-700 mb-2">
          Some pages have special functionality:
        </p>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• <code>/payment-modal</code> - Content for payment modal</li>
          <li>• <code>/ref-code-modal</code> - Content for reference code modal</li>
          <li>• <code>/terms-of-service</code> - Terms of service page</li>
          <li>• <code>/privacy-policy</code> - Privacy policy page</li>
        </ul>
      </div>

      {/* Pages List */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Pages ({pages.length})
        </h3>
        
        {pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pages found</p>
            <p className="text-gray-400">Create your first page to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{page.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        page.isActive 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-gray-600 bg-gray-100'
                      }`}>
                        {page.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      URL: <code className="bg-gray-100 px-1 rounded">{page.slug}</code>
                    </p>
                    
                    <div className="text-sm text-gray-600">
                      <p className="line-clamp-2">
                        {page.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                        {page.content.length > 150 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => togglePageStatus(page.id!)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        page.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {page.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => openEditModal(page)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Page"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => deletePage(page.id!)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Page"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editModalOpen && editingPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {isNewPage ? 'Create New Page' : 'Edit Page'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={editingPage.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setEditingPage({
                        ...editingPage, 
                        title,
                        // Auto-generate slug if it's empty or matches the previous title
                        slug: isNewPage || !editingPage.slug || editingPage.slug === generateSlug(editingPage.title)
                          ? generateSlug(title)
                          : editingPage.slug
                      });
                    }}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter page title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    value={editingPage.slug}
                    onChange={(e) => setEditingPage({...editingPage, slug: e.target.value})}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="/page-url"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must start with /. Example: /about-us
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Content *
                </label>
                <QuillEditor
                  ref={editPageEditorRef}
                  value={editingPage.content}
                  onChange={(value) => setEditingPage({...editingPage, content: value})}
                  placeholder="Enter page content..."
                  toolbar="full"
                  minHeight="300px"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use rich formatting to create professional-looking content for your static page.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingPage.isActive}
                  onChange={(e) => setEditingPage({...editingPage, isActive: e.target.checked})}
                  className="mr-2 h-4 w-4 text-green-600"
                />
                <label className="text-sm font-medium text-gray-700">
                  Page is active and visible to visitors
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={savePage}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {isNewPage ? 'Create Page' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}