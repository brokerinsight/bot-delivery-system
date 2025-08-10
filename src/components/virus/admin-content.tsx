'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { AddBotSection } from './sections/add-bot-section';
import { ManageBotsSection } from './sections/manage-bots-section';
import { SettingsSection } from './sections/settings-section';
import { StaticPagesSection } from './sections/static-pages-section';
import { OrdersSection } from './sections/orders-section';
import { DashboardSection } from './sections/dashboard-section';
import { CustomBotsSection } from './sections/custom-bots-section';

type AdminSection = 'dashboard' | 'add-bot' | 'manage-bots' | 'settings' | 'static-pages' | 'orders' | 'custom-bots';

interface AdminData {
  products: any[];
  categories: any[];
  settings: any;
  staticPages: any[];
  orders: any[];
}

export function AdminContent() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [data, setData] = useState<AdminData>({
    products: [],
    categories: [],
    settings: {},
    staticPages: [],
    orders: []
  });
  const [loading, setLoading] = useState(true);

  // Set active section based on route
  useEffect(() => {
    const path = pathname?.split('/').pop();
    switch (path) {
      case 'virus':
        setActiveSection('dashboard');
        break;
      case 'orders':
        setActiveSection('orders');
        break;
      case 'custom-bots':
        setActiveSection('custom-bots');
        break;
      case 'products':
        setActiveSection('manage-bots');
        break;
      case 'pages':
        setActiveSection('static-pages');
        break;
      case 'settings':
        setActiveSection('settings');
        break;
      default:
        setActiveSection('dashboard');
    }
  }, [pathname]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch all data from API
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      if (result.success) {
        setData({
          products: result.data.products || [],
          categories: result.data.categories || [],
          settings: result.data.settings || {},
          staticPages: result.data.staticPages || [],
          orders: []
        });
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Save data to API
  const saveData = async (payload = data) => {
    try {
      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to save data');
      
      const result = await response.json();
      if (result.success) {
        toast.success('Data saved successfully');
        return true;
      } else {
        throw new Error(result.error || 'Failed to save data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save data');
      return false;
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const result = await response.json();
      if (result.success) {
        setData(prev => ({ ...prev, orders: result.orders || [] }));
      } else {
        throw new Error(result.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    }
  };

  // Update data and re-render
  const updateData = (updates: Partial<AdminData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Render active section */}
        {activeSection === 'dashboard' && (
          <DashboardSection 
            data={data}
            onDataUpdate={updateData}
            onRefresh={fetchData}
          />
        )}
        
        {activeSection === 'add-bot' && (
          <AddBotSection 
            data={data}
            onDataUpdate={updateData}
            onSave={saveData}
          />
        )}
        
        {activeSection === 'manage-bots' && (
          <ManageBotsSection 
            data={data}
            onDataUpdate={updateData}
            onSave={saveData}
          />
        )}
        
        {activeSection === 'settings' && (
          <SettingsSection 
            data={data}
            onDataUpdate={updateData}
            onSave={saveData}
          />
        )}
        
        {activeSection === 'static-pages' && (
          <StaticPagesSection 
            data={data}
            onDataUpdate={updateData}
            onSave={saveData}
          />
        )}
        
        {activeSection === 'orders' && (
          <OrdersSection 
            data={data}
            onDataUpdate={updateData}
            onFetchOrders={fetchOrders}
          />
        )}
        
        {activeSection === 'custom-bots' && (
          <CustomBotsSection 
            data={data}
            onDataUpdate={updateData}
          />
        )}
      </div>
    </div>
  );
}