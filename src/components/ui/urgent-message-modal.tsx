'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UrgentMessage {
  enabled: boolean;
  text: string;
}

export function UrgentMessageModal() {
  const [urgentMessage, setUrgentMessage] = useState<UrgentMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchUrgentMessage();
  }, []);

  const fetchUrgentMessage = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      
      if (result.success && result.data.settings?.urgentMessage) {
        const message = result.data.settings.urgentMessage;
        
        // Check if message is enabled and has content
        if (message.enabled && message.text && message.text.trim() !== '' && message.text !== '<p></p>') {
          // Check if user has already dismissed this message (using localStorage)
          const dismissedMessages = JSON.parse(localStorage.getItem('dismissedUrgentMessages') || '[]');
          const messageHash = btoa(message.text).substring(0, 10); // Simple hash for message identification
          
          if (!dismissedMessages.includes(messageHash)) {
            setUrgentMessage(message);
            setIsVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching urgent message:', error);
    }
  };

  const handleDismiss = () => {
    if (urgentMessage) {
      // Store dismissed message hash in localStorage
      const dismissedMessages = JSON.parse(localStorage.getItem('dismissedUrgentMessages') || '[]');
      const messageHash = btoa(urgentMessage.text).substring(0, 10);
      
      if (!dismissedMessages.includes(messageHash)) {
        dismissedMessages.push(messageHash);
        localStorage.setItem('dismissedUrgentMessages', JSON.stringify(dismissedMessages));
      }
    }
    
    setIsVisible(false);
    setIsDismissed(true);
  };

  const cleanHtml = (html: string) => {
    // Remove Quill UI spans and clean up the HTML
    return html
      .replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      .replace(/<p><br><\/p>/g, '')
      .trim();
  };

  // Don't render if no message, already dismissed, or not visible
  if (!urgentMessage || isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`glass-card max-w-md w-full mx-auto p-6 rounded-2xl border border-white/20 shadow-2xl transform transition-transform duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🚨 Important Notice
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="text-gray-700 dark:text-gray-300 mb-6 prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: cleanHtml(urgentMessage.text) }}
        />

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg"
        >
          Got it, thanks! 👍
        </button>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .dark .glass-card {
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}