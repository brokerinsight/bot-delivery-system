'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  DocumentIcon, 
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface FileData {
  id: string;
  name: string;
  filename: string;
  size: string;
  downloadUrl: string;
}

interface TokenData {
  orderId: number;
  files: FileData[];
  customerEmail: string;
  orderDate: string;
  expiresAt: Date;
  used: boolean;
}

interface DownloadContentProps {
  tokenData: TokenData;
  token: string;
}

export function DownloadContent({ tokenData, token }: DownloadContentProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const handleDownload = async (file: FileData) => {
    if (downloadingFiles.has(file.id)) return;

    setDownloadingFiles(prev => new Set(prev).add(file.id));
    setDownloadProgress(prev => ({ ...prev, [file.id]: 0 }));

    try {
      // Simulate download progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setDownloadProgress(prev => ({ ...prev, [file.id]: progress }));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create download link (in real implementation, this would be a secure API call)
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadedFiles(prev => new Set(prev).add(file.id));
      toast.success(`${file.name} downloaded successfully!`);

      // Mark token as used (in real implementation, this would be an API call)
      console.log(`Marking token ${token} as used`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${file.name}`);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const handleDownloadAll = async () => {
    for (const file of tokenData.files) {
      if (!downloadedFiles.has(file.id) && !downloadingFiles.has(file.id)) {
        await handleDownload(file);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const timeUntilExpiry = new Date(tokenData.expiresAt).getTime() - new Date().getTime();
  const hoursUntilExpiry = Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60 * 60)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Download Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
            Your Downloads
          </h2>
          <div className="flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-500">
            <ClockIcon className="w-4 h-4" />
            <span>Expires in {hoursUntilExpiry} hours</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-secondary-600 dark:text-secondary-400">
            {tokenData.files.length} file{tokenData.files.length !== 1 ? 's' : ''} ready for download
          </p>
          <button
            onClick={handleDownloadAll}
            disabled={downloadingFiles.size > 0}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
          >
            Download All
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-4">
        {tokenData.files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center space-x-4">
              {/* File Icon */}
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                {downloadedFiles.has(file.id) ? (
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                ) : (
                  <DocumentIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-1">
                  {file.name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-secondary-600 dark:text-secondary-400">
                  <span>{file.filename}</span>
                  <span>•</span>
                  <span>{file.size}</span>
                </div>

                {/* Download Progress */}
                {downloadingFiles.has(file.id) && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-secondary-600 dark:text-secondary-400">Downloading...</span>
                      <span className="text-secondary-600 dark:text-secondary-400">
                        {downloadProgress[file.id] || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress[file.id] || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Success */}
                {downloadedFiles.has(file.id) && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Downloaded successfully</span>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingFiles.has(file.id)}
                className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 ${
                  downloadedFiles.has(file.id)
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default'
                    : downloadingFiles.has(file.id)
                    ? 'bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
                }`}
              >
                {downloadedFiles.has(file.id) ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Downloaded</span>
                  </>
                ) : downloadingFiles.has(file.id) ? (
                  <>
                    <div className="w-5 h-5">
                      <div className="spinner w-5 h-5 border-2" />
                    </div>
                    <span>Downloading</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Order Information */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Order Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Order ID:</span>
            <span className="ml-2 font-mono text-secondary-800 dark:text-secondary-200">
              #{tokenData.orderId}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Email:</span>
            <span className="ml-2 text-secondary-800 dark:text-secondary-200">
              {tokenData.customerEmail}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Purchase Date:</span>
            <span className="ml-2 text-secondary-800 dark:text-secondary-200">
              {new Date(tokenData.orderDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Expires:</span>
            <span className="ml-2 text-secondary-800 dark:text-secondary-200">
              {new Date(tokenData.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="glass-card rounded-2xl p-6 border-l-4 border-amber-500">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-amber-600 dark:text-amber-400 text-sm">⚠</span>
          </div>
          <div>
            <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
              Important Notice
            </h4>
            <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
              <li>• Download links expire after 24 hours for security</li>
              <li>• Save files to a secure location after downloading</li>
              <li>• Keep your purchase receipt for future reference</li>
              <li>• Contact support if you need help with setup</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}