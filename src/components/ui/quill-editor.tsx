'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="border rounded-lg p-12 bg-gray-50 dark:bg-gray-800 animate-pulse">Loading editor...</div>
});

import 'react-quill/dist/quill.snow.css';

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
  const quillRef = useRef<any>(null);

  // Toolbar configurations
  const toolbarConfigs = {
    minimal: [
      ['bold', 'italic'],
      ['link'],
      ['clean']
    ],
    basic: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      ['link'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
    full: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  const modules = {
    toolbar: toolbarConfigs[toolbar],
    clipboard: {
      matchVisual: false,
    },
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align', 'direction',
    'code-block', 'script'
  ];

  useImperativeHandle(ref, () => ({
    getEditor: () => null,
    focus: () => {},
    blur: () => {},
    clear: () => {
      onChange('');
    }
  }));

  // Clean HTML output to remove Quill artifacts
  const cleanHtml = (html: string) => {
    if (!html) return '';
    
    return html
      .replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      .replace(/<p><br><\/p>/g, '<p></p>')
      .trim();
  };

  const handleChange = (content: string) => {
    const cleaned = cleanHtml(content);
    onChange(cleaned);
  };

  return (
    <div className={`quill-editor-wrapper ${className}`}>
      <style jsx global>{`
        .quill-editor-wrapper .ql-container {
          min-height: ${minHeight};
          font-family: inherit;
        }
        
        .quill-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 12px 15px;
          line-height: 1.6;
        }
        
        .quill-editor-wrapper .ql-toolbar {
          border-top: 1px solid #e5e7eb;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          border-bottom: none;
          border-radius: 0.5rem 0.5rem 0 0;
          background: #f9fafb;
        }
        
        .quill-editor-wrapper .ql-container {
          border-bottom: 1px solid #e5e7eb;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 0.5rem 0.5rem;
          background: white;
        }
        
        .dark .quill-editor-wrapper .ql-toolbar {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }
        
        .dark .quill-editor-wrapper .ql-container {
          background: #1f2937;
          border-color: #4b5563;
          color: #f3f4f6;
        }
        
        .dark .quill-editor-wrapper .ql-editor {
          color: #f3f4f6;
        }
        
        .dark .quill-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
        }
        
        .quill-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: #6b7280;
        }
        
        .dark .quill-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: #d1d5db;
        }
        
        .quill-editor-wrapper .ql-toolbar .ql-fill {
          fill: #6b7280;
        }
        
        .dark .quill-editor-wrapper .ql-toolbar .ql-fill {
          fill: #d1d5db;
        }
        
        .quill-editor-wrapper .ql-tooltip {
          z-index: 1000;
        }
        
        ${disabled ? `
          .quill-editor-wrapper .ql-toolbar {
            opacity: 0.5;
            pointer-events: none;
          }
          .quill-editor-wrapper .ql-container {
            opacity: 0.7;
          }
        ` : ''}
      `}</style>
      
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={disabled}
      />
    </div>
  );
});

QuillEditor.displayName = 'QuillEditor';

export { QuillEditor };