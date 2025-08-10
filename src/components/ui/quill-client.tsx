'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Dynamic import for Quill
let Quill: any = null;

interface QuillClientProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  toolbar?: 'full' | 'basic' | 'minimal';
}

export interface QuillClientRef {
  getEditor: () => any;
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

export const QuillClient = forwardRef<QuillClientRef, QuillClientProps>(({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  toolbar = 'full'
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);

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
      ['link', 'image'],
      ['clean']
    ]
  };

  useImperativeHandle(ref, () => ({
    getEditor: () => quillRef.current,
    focus: () => quillRef.current?.focus(),
    blur: () => quillRef.current?.blur(),
    clear: () => {
      if (quillRef.current) {
        quillRef.current.setText('');
      }
    }
  }));

  useEffect(() => {
    const initQuill = async () => {
      if (!Quill) {
        // Dynamic import of Quill
        const QuillModule = await import('quill');
        Quill = QuillModule.default;
        
        // Quill styles are imported statically in the main component
      }

      if (containerRef.current && !quillRef.current) {
        quillRef.current = new Quill(containerRef.current, {
          theme: 'snow',
          placeholder: placeholder,
          readOnly: disabled,
          modules: {
            toolbar: toolbarConfigs[toolbar],
            clipboard: {
              matchVisual: false,
            },
          },
          formats: [
            'header', 'font', 'size',
            'bold', 'italic', 'underline', 'strike', 'blockquote',
            'list', 'bullet', 'indent',
            'link', 'image', 'video',
            'color', 'background',
            'align', 'direction',
            'code-block', 'script'
          ]
        });

        // Handle text changes
        quillRef.current.on('text-change', () => {
          if (!isUpdatingRef.current) {
            const html = quillRef.current.root.innerHTML;
            const cleanedHtml = cleanHtml(html);
            onChange(cleanedHtml);
          }
        });

        // Set initial content
        if (value) {
          isUpdatingRef.current = true;
          quillRef.current.root.innerHTML = value;
          isUpdatingRef.current = false;
        }
      }
    };

    initQuill();

    return () => {
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && !isUpdatingRef.current) {
      const currentContent = quillRef.current.root.innerHTML;
      if (currentContent !== value) {
        isUpdatingRef.current = true;
        quillRef.current.root.innerHTML = value || '';
        isUpdatingRef.current = false;
      }
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
    }
  }, [disabled]);

  // Clean HTML output to remove Quill artifacts
  const cleanHtml = (html: string) => {
    if (!html) return '';
    
    return html
      .replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      .replace(/<p><br><\/p>/g, '')
      .replace(/^<p><\/p>$/, '')
      .trim();
  };

  return <div ref={containerRef} />;
});

QuillClient.displayName = 'QuillClient';