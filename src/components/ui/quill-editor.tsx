'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import 'quill/dist/quill.snow.css';

// Only import Quill on client side to avoid SSR issues
const QuillClient = dynamic(
  () => import('./quill-client').then(mod => mod.QuillClient),
  { 
    ssr: false,
    loading: () => (
      <div className="border rounded-lg p-12 bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
);

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  toolbar?: 'full' | 'basic' | 'minimal';
  className?: string;
}

export interface QuillEditorRef {
  getEditor: () => any;
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  minHeight = '200px',
  toolbar = 'full',
  className = ''
}, ref) => {
  const editorRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current?.getEditor?.() || null,
    focus: () => editorRef.current?.focus?.(),
    blur: () => editorRef.current?.blur?.(),
    clear: () => {
      onChange('');
      editorRef.current?.clear?.();
    }
  }));

  return (
    <div className={`quill-editor-wrapper ${className}`}>
      <style jsx>{`
        .quill-editor-wrapper {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .quill-editor-wrapper :global(.ql-container) {
          min-height: ${minHeight};
          font-family: inherit;
        }
        
        .quill-editor-wrapper :global(.ql-editor) {
          min-height: ${minHeight};
          padding: 12px 15px;
          line-height: 1.6;
        }
        
        .quill-editor-wrapper :global(.ql-toolbar) {
          border-top: 1px solid #e5e7eb;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          border-bottom: none;
          border-radius: 0.5rem 0.5rem 0 0;
          background: #f9fafb;
        }
        
        .quill-editor-wrapper :global(.ql-container) {
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        
        .quill-editor-wrapper :global(.ql-snow .ql-tooltip) {
          z-index: 9999;
        }
        
        ${disabled ? `
          .quill-editor-wrapper {
            opacity: 0.7;
          }
        ` : ''}
      `}</style>
      
      <QuillClient
        ref={editorRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        toolbar={toolbar}
      />
    </div>
  );
});

QuillEditor.displayName = 'QuillEditor';

export { QuillEditor };