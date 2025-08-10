import { supabase } from './supabase';
import { redisClient } from './redis';
import type { Product, Category, Settings, StaticPage, Order } from '@/types';

// Cache for in-memory data storage
let cachedData: {
  products: Product[];
  categories: Category[];
  settings: Settings;
  staticPages: StaticPage[];
} | null = null;

// Track last cache time
let lastCacheTime: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

// Default settings
const DEFAULT_SETTINGS: Settings = {
  supportEmail: 'support@derivbotstore.com',
  copyrightText: '© 2024 Deriv Bot Store',
  logoUrl: '',
  socials: {
    tiktok: '',
    whatsapp: '',
    call: '',
    instagram: '',
    x: '',
    facebook: '',
    youtube: ''
  },
  urgentMessage: { enabled: false, text: '' },
  fallbackRate: 130,
  adminEmail: '',
  adminPassword: '',
  mpesaTill: '4933614',
  payheroChannelId: process.env.PAYHERO_CHANNEL_ID || '2332',
  payheroPaymentUrl: process.env.PAYHERO_PAYMENT_URL || 'https://app.payhero.co.ke/lipwa/5',
  payheroAuthToken: process.env.PAYHERO_AUTH_TOKEN || '',
  activePaymentOptions: {
    mpesa_manual: true,
    mpesa_payhero: true,
    crypto_nowpayments: true
  }
};

// Fallback modals
const FALLBACK_PAYMENT_MODAL: StaticPage = {
  title: 'Payment Modal',
  slug: '/payment-modal',
  content: `
    <h3 id="payment-title" class="text-xl font-bold text-gray-900 mb-4"></h3>
    <p class="text-gray-600 mb-4">Please send the payment via MPESA to:</p>
    <p class="font-semibold text-gray-900">Till Number: <span id="mpesa-till-number">4933614</span></p>
    <p id="payment-amount" class="text-green-600 font-bold mt-2"></p>
    <button id="confirm-payment" class="mt-6 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">I Have Paid</button>
    <button id="payment-cancel" class="mt-2 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">Cancel</button>
  `
};

const FALLBACK_REF_CODE_MODAL: StaticPage = {
  title: 'Ref Code Modal',
  slug: '/ref-code-modal',
  content: `
    <h3 class="text-xl font-bold text-gray-900 mb-4">Enter MPESA Ref Code</h3>
    <input id="ref-code-input" type="text" placeholder="e.g., QK12345678" class="w-full p-2 border rounded-md mb-4">
    <button id="submit-ref-code" class="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Submit</button>
    <button id="ref-code-cancel" class="mt-2 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">Cancel</button>
  `
};

// Check if running during build time
function isStaticGeneration(): boolean {
  return typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME;
}

// Load all data from Supabase
export async function loadData(): Promise<typeof cachedData> {
  try {
    console.log(`[${new Date().toISOString()}] Loading data from Supabase...`);

    // Load products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('is_new', { ascending: false })
      .order('created_at', { ascending: false })
      .order('item', { ascending: true });

    if (productsError) {
      throw new Error(`Failed to load products: ${productsError.message}`);
    }

    const products: Product[] = (productsData || []).map(row => ({
      item: row.item,
      fileId: row.file_id,
      originalFileName: row.original_file_name,
      price: parseFloat(row.price),
      name: row.name,
      description: row.description || '',
      image: row.image || 'https://via.placeholder.com/300',
      category: row.category || 'General',
      embed: row.embed || '',
      isNew: row.is_new || false,
      isArchived: row.is_archived || false,
      created_at: row.created_at
    }));

    // Load settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value');

    if (settingsError) {
      throw new Error(`Failed to load settings: ${settingsError.message}`);
    }

    const settingsMap = Object.fromEntries((settingsData || []).map(row => [row.key, row.value]));
    const settings: Settings = { ...DEFAULT_SETTINGS };

    // Parse settings from database
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      if (settingsMap[key] !== undefined) {
        const dbValue = settingsMap[key];
        
        if (key === 'socials' || key === 'urgentMessage' || key === 'activePaymentOptions') {
          try {
            settings[key as keyof Settings] = JSON.parse(dbValue);
          } catch (e) {
            console.warn(`Failed to parse JSON for setting '${key}':`, e);
            settings[key as keyof Settings] = defaultValue;
          }
        } else if (key === 'fallbackRate') {
          const parsedRate = parseFloat(dbValue);
          settings[key] = isNaN(parsedRate) ? defaultValue as number : parsedRate;
        } else {
          (settings as any)[key] = dbValue;
        }
      }
    }

    // Load categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('name');

    if (categoriesError) {
      console.warn(`Failed to load categories: ${categoriesError.message}`);
    }

    const uniqueCategories = Array.from(new Set((categoriesData || []).map(row => row.name)));
    const categories: Category[] = uniqueCategories.map(name => ({ name }));
    if (categories.length === 0) {
      categories.push({ name: 'General' });
    }

    // Load static pages
    const { data: pagesData, error: pagesError } = await supabase
      .from('static_pages')
      .select('*');

    if (pagesError) {
      throw new Error(`Failed to load static pages: ${pagesError.message}`);
    }

    let staticPages: StaticPage[] = (pagesData || []).map(row => ({
      title: row.title,
      slug: row.slug,
      content: row.content,
      isActive: row.is_active !== false // Default to active if not specified
    }));

    // Add fallback modals if they don't exist
    if (!staticPages.find(page => page.slug === '/payment-modal')) {
      staticPages.push(FALLBACK_PAYMENT_MODAL);
    }
    if (!staticPages.find(page => page.slug === '/ref-code-modal')) {
      staticPages.push(FALLBACK_REF_CODE_MODAL);
    }

    // Cache the data
    cachedData = { products, categories, settings, staticPages };
    lastCacheTime = Date.now();

    // Only try to cache in Redis during runtime, not during static generation
    if (!isStaticGeneration()) {
      try {
        const cacheSuccess = await redisClient.cacheData('cachedData', cachedData, 900);
        if (cacheSuccess) {
          console.log(`[${new Date().toISOString()}] Data loaded and cached in Redis successfully`);
        } else {
          console.log(`[${new Date().toISOString()}] Data loaded (Redis caching failed)`);
        }
      } catch (redisError) {
        console.warn(`[${new Date().toISOString()}] Redis caching failed during runtime:`, redisError);
      }
    }

    console.log(`[${new Date().toISOString()}] Data loaded successfully from Supabase`);
    return cachedData;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading data:`, error);
    throw error;
  }
}

// Get cached data (load if not cached)
export async function getCachedData() {
  // Check if cache is still valid
  const now = Date.now();
  const cacheIsValid = cachedData && (now - lastCacheTime) < CACHE_TTL;
  
  if (cacheIsValid) {
    console.log(`[${new Date().toISOString()}] Served data from memory cache`);
    return cachedData!;
  }

  // Only try Redis during runtime, not during static generation
  if (!isStaticGeneration()) {
    try {
      const cached = await redisClient.getCachedData('cachedData');
      if (cached) {
        console.log(`[${new Date().toISOString()}] Served data from Redis cache`);
        cachedData = cached;
        lastCacheTime = now;
        return cached;
      }
    } catch (redisError) {
      console.warn(`[${new Date().toISOString()}] Redis fetch failed during runtime:`, redisError);
    }
  }
  
  // If no cache or during static generation, load from database
  console.log(`[${new Date().toISOString()}] Loading fresh data from database`);
  await loadData();
  return cachedData!;
}

// Save data to Supabase
export async function saveDataToDatabase(updates: {
  products?: Product[];
  categories?: Category[];
  settings?: Partial<Settings>;
  staticPages?: StaticPage[];
}) {
  try {
    console.log(`[${new Date().toISOString()}] Saving data to Supabase...`);

    // Save categories
    if (updates.categories) {
      console.log('Saving categories...');
      
      // Delete all existing categories
      await supabase.from('categories').delete().neq('name', '');
      
      // Insert new categories
      if (updates.categories.length > 0) {
        const categoriesToInsert = updates.categories.map(name => ({ name }));
        const { error } = await supabase.from('categories').insert(categoriesToInsert);
        if (error) throw error;
      }
    }

    // Save settings
    if (updates.settings) {
      console.log('Saving settings...');
      
      const settingsToUpsert = Object.entries(updates.settings).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));

      const { error } = await supabase.from('settings').upsert(settingsToUpsert, { onConflict: 'key' });
      if (error) throw error;
    }

    // Save static pages
    if (updates.staticPages) {
      console.log('Saving static pages...');
      
      const pagesToUpsert = updates.staticPages.map(page => ({
        title: page.title,
        slug: page.slug,
        content: page.content
      }));

      const { error } = await supabase.from('static_pages').upsert(pagesToUpsert, { onConflict: 'slug' });
      if (error) throw error;
    }

    // Save products
    if (updates.products) {
      console.log('Saving products...');
      
      for (const product of updates.products) {
        const productData = {
          item: product.item,
          file_id: product.fileId,
          original_file_name: product.originalFileName,
          price: product.price,
          name: product.name,
          description: product.description,
          image: product.image,
          category: product.category,
          embed: product.embed,
          is_new: product.isNew,
          is_archived: product.isArchived
        };

        const { error } = await supabase.from('products').upsert(productData, { onConflict: 'item' });
        if (error) throw error;
      }
    }

    // Reload cached data after saving
    await loadData();

    console.log(`[${new Date().toISOString()}] Data saved successfully to Supabase`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving data:`, error);
    throw error;
  }
}

// Load orders
export async function loadOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to load orders: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      item: row.item,
      ref_code: row.ref_code,
      amount: row.amount,
      timestamp: row.timestamp,
      status: row.status,
      downloaded: row.downloaded || false,
      payment_method: row.payment_method || 'mpesa_till',
      email: row.email,
      mpesa_receipt_number: row.mpesa_receipt_number,
      notes: row.notes,
      payer_phone_number: row.payer_phone_number,
      currency_paid: row.currency_paid,
      nowpayments_payment_id: row.nowpayments_payment_id,
      amount_paid_crypto: row.amount_paid_crypto
    }));
  } catch (error) {
    console.error('Error loading orders:', error);
    throw error;
  }
}

// Update order status
export async function updateOrderStatus(refCode: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('ref_code', refCode);

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

// Delete product
export async function deleteProduct(item: string): Promise<boolean> {
  try {
    // Delete from database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('item', item);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    // Remove from cache
    if (cachedData) {
      cachedData.products = cachedData.products.filter(p => p.item !== item);
    }

    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
}

// Add product with file upload
export async function addProduct(productData: Omit<Product, 'fileId' | 'originalFileName'>, file: File): Promise<Product | null> {
  try {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${productData.item}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create product record
    const product: Product = {
      ...productData,
      fileId: uploadData.path,
      originalFileName: file.name,
      created_at: new Date().toISOString()
    };

    const dbProduct = {
      item: product.item,
      file_id: product.fileId,
      original_file_name: product.originalFileName,
      price: product.price,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      embed: product.embed,
      is_new: product.isNew,
      is_archived: product.isArchived
    };

    const { error: dbError } = await supabase
      .from('products')
      .insert(dbProduct);

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('files').remove([filePath]);
      throw new Error(`Failed to create product: ${dbError.message}`);
    }

    // Add to cache
    if (cachedData) {
      cachedData.products.push(product);
    }

    return product;
  } catch (error) {
    console.error('Error adding product:', error);
    return null;
  }
}