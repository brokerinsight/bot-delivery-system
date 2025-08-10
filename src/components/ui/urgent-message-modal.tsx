'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] pt-20"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        <motion.div
          initial={{ y: -50, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: -50, scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl shadow-2xl max-w-2xl mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <h3 className="text-lg font-bold">Important Notice</h3>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div 
              className="prose prose-orange max-w-none text-secondary-800 dark:text-secondary-200"
              dangerouslySetInnerHTML={{ 
                __html: cleanHtml(urgentMessage.text) 
              }}
            />
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 px-6 py-4">
            <div className="flex justify-center">
              <button
                onClick={handleDismiss}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Got it, thanks!
              </button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-300 opacity-10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-300 to-yellow-300 opacity-10 rounded-full translate-y-12 -translate-x-12" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}