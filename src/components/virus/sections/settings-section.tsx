'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { QuillEditor, QuillEditorRef } from '@/components/ui/quill-editor';

interface SettingsSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onSave: (payload?: any) => Promise<boolean>;
}

interface PaymentOptions {
  mpesa_manual: boolean;
  mpesa_payhero: boolean;
  crypto_nowpayments: boolean;
}

export function SettingsSection({ data, onDataUpdate, onSave }: SettingsSectionProps) {
  const [settings, setSettings] = useState(data.settings || {});
  const [categories, setCategories] = useState(data.categories || []);
  const [newCategory, setNewCategory] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>({
    mpesa_manual: true,
    mpesa_payhero: true,
    crypto_nowpayments: true
  });
  const [adminCredentials, setAdminCredentials] = useState({
    username: '',
    oldPassword: '',
    newPassword: ''
  });
  const [urgentMessage, setUrgentMessage] = useState({
    enabled: false,
    text: ''
  });
  const urgentMessageEditorRef = useRef<QuillEditorRef>(null);

  useEffect(() => {
    setSettings(data.settings || {});
    setCategories(data.categories || []);
    
    // Parse payment options
    if (data.settings?.activePaymentOptions) {
      try {
        const parsed = typeof data.settings.activePaymentOptions === 'string' 
          ? JSON.parse(data.settings.activePaymentOptions)
          : data.settings.activePaymentOptions;
        setPaymentOptions(parsed);
      } catch {
        // Keep defaults
      }
    }
    
    // Parse urgent message
    if (data.settings?.urgentMessage) {
      try {
        const message = typeof data.settings.urgentMessage === 'string' 
          ? JSON.parse(data.settings.urgentMessage)
          : data.settings.urgentMessage;
        setUrgentMessage({
          enabled: message.enabled || false,
          text: message.text || ''
        });
      } catch {
        setUrgentMessage({ enabled: false, text: '' });
      }
    }
  }, [data]);

  const updateSetting = async (key: string, value: any) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    
    const success = await onSave({ settings: { [key]: value } });
    if (success) {
      onDataUpdate({ settings: updatedSettings });
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }

    const updatedCategories = [...categories, newCategory.trim()];
    setCategories(updatedCategories);
    setNewCategory('');
    
    const success = await onSave({ categories: updatedCategories });
    if (success) {
      onDataUpdate({ categories: updatedCategories });
      toast.success('Category added successfully');
    }
  };

  const deleteCategory = async (categoryToDelete: string) => {
    if (categoryToDelete === 'General') {
      toast.error('Cannot delete the General category');
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${categoryToDelete}"? Products in this category will be moved to "General".`)) {
      return;
    }

    const updatedCategories = categories.filter((cat: string) => cat !== categoryToDelete);
    const updatedProducts = data.products.map((product: any) => ({
      ...product,
      category: product.category === categoryToDelete ? 'General' : product.category
    }));

    setCategories(updatedCategories);
    
    const success = await onSave({ 
      categories: updatedCategories, 
      products: updatedProducts 
    });
    
    if (success) {
      onDataUpdate({ categories: updatedCategories, products: updatedProducts });
      toast.success('Category deleted successfully');
    }
  };

  const savePaymentOptions = async () => {
    if (!paymentOptions.mpesa_manual && !paymentOptions.mpesa_payhero && !paymentOptions.crypto_nowpayments) {
      toast.error('At least one payment method must be selected');
      return;
    }

    const paymentOptionsJson = JSON.stringify(paymentOptions);
    await updateSetting('activePaymentOptions', paymentOptionsJson);
    toast.success('Payment options saved successfully');
  };

  const saveUrgentMessage = async () => {
    try {
      const urgentMessageData = {
        enabled: urgentMessage.enabled,
        text: urgentMessage.text
      };
      
      const urgentMessageJson = JSON.stringify(urgentMessageData);
      await updateSetting('urgentMessage', urgentMessageJson);
      toast.success('Urgent message saved successfully');
    } catch (error) {
      console.error('Error saving urgent message:', error);
      toast.error('Failed to save urgent message');
    }
  };

  const changeAdminCredentials = async () => {
    if (!adminCredentials.username || !adminCredentials.oldPassword || !adminCredentials.newPassword) {
      toast.error('All fields are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCredentials),
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Admin credentials updated successfully');
        setAdminCredentials({ username: '', oldPassword: '', newPassword: '' });
      } else {
        toast.error(result.error || 'Failed to update credentials');
      }
    } catch (error) {
      toast.error('Failed to update credentials');
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
          Settings
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your store settings, payment options, and categories.
        </p>
      </div>

      {/* Categories Management */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h3>
        
        {/* Add New Category */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 p-2 border rounded-md"
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          />
          <button
            onClick={addCategory}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Category
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {categories.map((category: string) => (
            <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>{category}</span>
              {category !== 'General' && (
                <button
                  onClick={() => deleteCategory(category)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Settings */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Configuration</h3>
        
        {/* M-Pesa Till */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            M-Pesa Till Number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.mpesaTill || ''}
              onChange={(e) => setSettings({...settings, mpesaTill: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="Enter M-Pesa Till Number"
            />
            <button
              onClick={() => updateSetting('mpesaTill', settings.mpesaTill)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* PayHero Settings */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PayHero Channel ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.payheroChannelId || ''}
              onChange={(e) => setSettings({...settings, payheroChannelId: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="Enter PayHero Channel ID"
            />
            <button
              onClick={() => updateSetting('payheroChannelId', settings.payheroChannelId)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PayHero Payment URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={settings.payheroPaymentUrl || ''}
              onChange={(e) => setSettings({...settings, payheroPaymentUrl: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="Enter PayHero Payment URL"
            />
            <button
              onClick={() => updateSetting('payheroPaymentUrl', settings.payheroPaymentUrl)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PayHero Auth Token
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.payheroAuthToken || ''}
              onChange={(e) => setSettings({...settings, payheroAuthToken: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="Enter PayHero Auth Token"
            />
            <button
              onClick={() => updateSetting('payheroAuthToken', settings.payheroAuthToken)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* Payment Options */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Payment Options</h4>
          <p className="text-sm text-gray-500 mb-3">
            Select the payment methods to be available on the storefront. At least one must be selected.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={paymentOptions.mpesa_manual}
                onChange={(e) => setPaymentOptions({...paymentOptions, mpesa_manual: e.target.checked})}
                className="mr-3 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">M-Pesa Manual Till</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={paymentOptions.mpesa_payhero}
                onChange={(e) => setPaymentOptions({...paymentOptions, mpesa_payhero: e.target.checked})}
                className="mr-3 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">M-Pesa PayHero (STK Push)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={paymentOptions.crypto_nowpayments}
                onChange={(e) => setPaymentOptions({...paymentOptions, crypto_nowpayments: e.target.checked})}
                className="mr-3 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Crypto (NOWPayments)</span>
            </label>
          </div>
          
          <button
            onClick={savePaymentOptions}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save Payment Options
          </button>
        </div>
      </div>

      {/* Store Settings */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Settings</h3>
        
        {/* Copyright Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Copyright Text
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.copyrightText || ''}
              onChange={(e) => setSettings({...settings, copyrightText: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="© 2024 Your Store Name"
            />
            <button
              onClick={() => updateSetting('copyrightText', settings.copyrightText)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* Support Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={settings.supportEmail || ''}
              onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
              className="flex-1 p-2 border rounded-md"
              placeholder="support@yourstore.com"
            />
            <button
              onClick={() => updateSetting('supportEmail', settings.supportEmail)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* Urgent Message */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
            <h4 className="text-lg font-semibold text-gray-900">Urgent Message</h4>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-2">
              <strong>How it works:</strong> When enabled, this message will appear as a popup modal on all frontend pages 
              for users who haven't dismissed it yet.
            </p>
            <ul className="text-xs text-orange-700 dark:text-orange-400 list-disc list-inside space-y-1">
              <li>Users can dismiss the message by clicking "Got it, thanks!"</li>
              <li>Once dismissed, the same message won't show again to that user</li>
              <li>Edit the message and save to show it to all users again</li>
              <li>Use rich formatting to make your message stand out</li>
            </ul>
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={urgentMessage.enabled}
              onChange={(e) => setUrgentMessage(prev => ({
                ...prev,
                enabled: e.target.checked
              }))}
              className="mr-3 h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Urgent Message (Show popup on frontend)
            </label>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Content
            </label>
            <QuillEditor
              ref={urgentMessageEditorRef}
              value={urgentMessage.text}
              onChange={(value) => setUrgentMessage(prev => ({
                ...prev,
                text: value
              }))}
              placeholder="Enter your urgent message here. You can use rich formatting to make it stand out..."
              disabled={!urgentMessage.enabled}
              toolbar="basic"
              minHeight="150px"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tip: Use bold text, colors, and formatting to make your message more noticeable.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={saveUrgentMessage}
              disabled={!urgentMessage.enabled && !urgentMessage.text.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Save Urgent Message
            </button>
            
            {urgentMessage.enabled && urgentMessage.text.trim() && (
              <button
                onClick={() => {
                  setUrgentMessage(prev => ({ ...prev, enabled: false }));
                  saveUrgentMessage();
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Disable & Save
              </button>
            )}
          </div>
          
          {urgentMessage.enabled && urgentMessage.text.trim() && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✅ <strong>Active:</strong> This urgent message will appear on all frontend pages as a popup modal.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Social Media Links */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
        
        {['facebook', 'twitter', 'instagram', 'youtube', 'telegram', 'whatsapp'].map((platform) => (
          <div key={platform} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
              {platform} URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings[`${platform}Url`] || ''}
                onChange={(e) => setSettings({...settings, [`${platform}Url`]: e.target.value})}
                className="flex-1 p-2 border rounded-md"
                placeholder={`https://${platform}.com/yourpage`}
              />
              <button
                onClick={() => updateSetting(`${platform}Url`, settings[`${platform}Url`])}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Credentials */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Admin Credentials</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Username
            </label>
            <input
              type="text"
              value={adminCredentials.username}
              onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
              className="w-full p-2 border rounded-md"
              placeholder="Enter new username"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminCredentials.oldPassword}
                onChange={(e) => setAdminCredentials({...adminCredentials, oldPassword: e.target.value})}
                className="w-full p-2 border rounded-md pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-500"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={adminCredentials.newPassword}
              onChange={(e) => setAdminCredentials({...adminCredentials, newPassword: e.target.value})}
              className="w-full p-2 border rounded-md pr-10"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 top-2 text-gray-500"
            >
              {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <button
          onClick={changeAdminCredentials}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Update Credentials
        </button>
      </div>
    </div>
  );
}