const express = require('express');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Supabase client setup with service role key for RLS
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Allowed domains for CORS and download links
const ALLOWED_ORIGINS = [
  'https://bot-delivery-system.onrender.com',
  'https://botblitz.store',
  'https://www.botblitz.store'
];

// Helper to get the base URL based on request origin
function getBaseUrl(req) {
  const origin = req.get('origin') || req.get('referer');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return 'https://botblitz.store';
}

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Debug-Source']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from 'public' directory
const publicPath = path.join(__dirname, 'public');

app.get('/sitemap.xml', async (req, res) => {
  try {
    const products = cachedData.products || [];
    const staticPages = cachedData.staticPages || [];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    sitemap += `
      <url>
        <loc>https://botblitz.store/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>\n`;

    for (const page of staticPages) {
      if (page.slug && !page.slug.includes('modal')) {
        sitemap += `
          <url>
            <loc>https://botblitz.store${page.slug}</loc>
            <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
            <changefreq>monthly</changefreq>
            <priority>0.6</priority>
          </url>\n`;
      }
    }

    for (const product of products) {
      if (!product.isArchived && product.item) {
        sitemap += `
          <url>
            <loc>https://botblitz.store/store?id=${product.item}</loc>
            <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
            <!-- Bot Name: ${sanitizeXml(product.name || '')} -->
            <!-- Description: ${sanitizeXml(product.desc || '')} -->`;
        if (product.embed && product.embed.includes('youtube.com')) {
          sitemap += `
            <video:video>
              <video:thumbnail_loc>${sanitizeXml(product.img)}</video:thumbnail_loc>
              <video:title>${sanitizeXml(product.name || '')}</video:title>
              <video:description>${sanitizeXml(product.desc || '')}</video:description>
              <video:content_loc>${sanitizeXml(product.embed)}</video:content_loc>
            </video:video>`;
        }
        sitemap += `\n</url>\n`;
      }
    }

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to generate sitemap:`, error.message);
    res.status(500).send('Failed to generate sitemap.');
  }
});

function sanitizeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.use(express.static(publicPath));
console.log(`[${new Date().toISOString()}] Serving static files from: ${publicPath}`);

// Session middleware with MemoryStore
app.use(session({
  store: new session.MemoryStore(),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: 'auto',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request URL: ${req.url}`);
  console.log(`[${new Date().toISOString()}] Session ID: ${req.sessionID}`);
  console.log(`[${new Date().toISOString()}] Session Data:`, req.session);
  console.log(`[${new Date().toISOString()}] Cookies:`, req.cookies);
  next();
});

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Cache for data
let cachedData = {
  products: [],
  categories: [],
  settings: {
    supportEmail: 'kaylie254.business@gmail.com',
    copyrightText: '© 2025 Deriv Bot Store',
    logoUrl: '',
    socials: {},
    urgentMessage: { enabled: false, text: '' },
    fallbackRate: 130,
    mpesaTill: '4933614'
  },
  staticPages: []
};

// Fallback content for modals
const fallbackPaymentModal = {
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

const fallbackRefCodeModal = {
  title: 'Ref Code Modal',
  slug: '/ref-code-modal',
  content: `
    <h3 class="text-xl font-bold text-gray-900 mb-4">Enter MPESA Ref Code</h3>
    <input id="ref-code-input" type="text" placeholder="e.g., QK12345678" class="w-full p-2 border rounded-md mb-4">
    <button id="submit-ref-code" class="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Submit</button>
    <button id="ref-code-cancel" class="mt-2 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">Cancel</button>
  `
};

// Load data from Supabase
async function loadData() {
  try {
    const productRes = await supabase.from('products').select('*');
    const products = productRes.data?.map(row => ({
      item: row.item,
      fileId: row.file_id,
      originalFileName: row.original_file_name,
      price: parseFloat(row.price),
      name: row.name,
      desc: row.description || '',
      img: row.image || 'https://via.placeholder.com/300',
      category: row.category || 'General',
      embed: row.embed || '',
      isNew: row.is_new || false,
      isArchived: row.is_archived || false
    })) || [];

    const settingsRes = await supabase.from('settings').select('key, value');
    const settingsData = Object.fromEntries(settingsRes.data?.map(row => [row.key, row.value]) || []);
    const settings = {
      supportEmail: settingsData.supportEmail || 'kaylie254.business@gmail.com',
      copyrightText: settingsData.copyrightText || '© 2025 Deriv Bot Store',
      logoUrl: settingsData.logoUrl || '',
      socials: settingsData.socials ? JSON.parse(settingsData.socials) : {},
      urgentMessage: settingsData.urgentMessage ? JSON.parse(settingsData.urgentMessage) : { enabled: false, text: '' },
      fallbackRate: parseFloat(settingsData.fallbackRate) || 130,
      mpesaTill: settingsData.mpesaTill || '4933614'
    };

    const categoriesRes = await supabase.from('categories').select('name');
    const categories = [...new Set(categoriesRes.data?.map(row => row.name) || ['General'])];
    console.log(`[${new Date().toISOString()}] Loaded categories (after deduplication):`, categories);

    const pagesRes = await supabase.from('static_pages').select('*');
    let staticPages = pagesRes.data?.map(row => ({
      title: row.title,
      slug: row.slug,
      content: row.content // Load raw content from DB
    })) || [];

    if (!staticPages.find(page => page.slug === '/payment-modal')) {
      console.log(`[${new Date().toISOString()}] Adding fallback for /payment-modal`);
      staticPages.push(fallbackPaymentModal);
    }
    if (!staticPages.find(page => page.slug === '/ref-code-modal')) {
      console.log(`[${new Date().toISOString()}] Adding fallback for /ref-code-modal`);
      staticPages.push(fallbackRefCodeModal);
    }

    cachedData = { products, categories, settings, staticPages };
    console.log(`[${new Date().toISOString()}] Data loaded successfully from Supabase`);
    console.log(`[${new Date().toISOString()}] Loaded static pages:`, staticPages.map(p => p.slug));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading data:`, error.message);
    throw error;
  }
}

// Refresh cache periodically
async function refreshCache() {
  try {
    await loadData();
    console.log(`[${new Date().toISOString()}] Cache refreshed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error refreshing cache:`, error.message);
  }
}

// Save data to Supabase
async function saveData() {
  try {
    // Fetch existing products to preserve file_id and original_file_name
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('*');
    if (fetchError) throw fetchError;

    // Map incoming products, merging with existing data
    const updatedProducts = cachedData.products.map(p => {
      const existing = existingProducts.find(ep => ep.item === p.item);
      return {
        item: p.item,
        file_id: existing?.file_id || p.fileId,
        original_file_name: existing?.original_file_name || p.originalFileName,
        price: p.price,
        name: p.name,
        description: p.desc,
        image: p.img,
        category: p.category,
        embed: p.embed,
        is_new: p.isNew,
        is_archived: p.isArchived
      };
    });

    // Update or insert products
    for (const product of updatedProducts) {
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'item' });
      if (upsertError) throw upsertError;
    }

    // Delete products not in cachedData
    const cachedItems = cachedData.products.map(p => p.item);
    await supabase
      .from('products')
      .delete()
      .not('item', 'in', `(${cachedItems.join(',')})`);

    // Save settings
    await supabase.from('settings').delete().neq('key', null);
    await supabase.from('settings').insert(
      Object.entries(cachedData.settings).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : value
      }))
    );

    // Save categories
    await supabase.from('categories').delete().neq('name', null);
    if (cachedData.categories.length > 0) {
      await supabase.from('categories').insert(
        cachedData.categories.map(c => ({ name: c }))
      );
    }

    // Save static pages, preserving raw content
    await supabase.from('static_pages').delete().neq('slug', null);
    if (cachedData.staticPages.length > 0) {
      await supabase.from('static_pages').insert(cachedData.staticPages);
    }

    console.log(`[${new Date().toISOString()}] Data saved to Supabase`);
    await loadData(); // Reload cache
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving data:`, error.message);
    throw error;
  }
}

// Delete orders older than 3 days
async function deleteOldOrders() {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('orders')
      .delete()
      .lt('timestamp', threeDaysAgo);
    if (error) throw error;
    console.log(`[${new Date().toISOString()}] Old orders deleted from Supabase`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting old orders:`, error.message);
  }
}

// Middleware to check admin session
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  console.log(`[${new Date().toISOString()}] Unauthorized access attempt to ${req.url}`);
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Self-check on startup
async function selfCheck() {
  console.log(`[${new Date().toISOString()}] Starting server self-check...`);

  try {
    const { data, error } = await supabase.from('products').select('item').limit(1);
    if (error) throw error;
    console.log(`[${new Date().toISOString()}] Successfully connected to Supabase database`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to Supabase database:`, error.message);
  }

  try {
    const { data, error } = await supabase.storage.from('bots').list('', { limit: 1 });
    if (error) throw error;
    console.log(`[${new Date().toISOString()}] Successfully connected to Supabase storage`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to Supabase storage:`, error.message);
  }

  if (!global.__TEST_EMAIL_SENT__) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: '✅ BotBlitz Server Status',
        text: 'BotBlitz server is running, and email system is working correctly.'
      });
      global.__TEST_EMAIL_SENT__ = true;
      console.log(`[${new Date().toISOString()}] ✅ Test email sent successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to send test email:`, error.message);
    }
  }

  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`[${new Date().toISOString()}] public/index.html found at: ${indexPath}`);
  } else {
    console.error(`[${new Date().toISOString()}] public/index.html NOT found at: ${indexPath}`); // Fixed line
  }

  async function pingRoutes() {
    const routesToTest = [
      '/api/data',
      '/api/check-session',
      '/api/orders',
      '/api/page/cookie-policy',
      '/api/order-status/test/test',
      '/'
    ];
    for (const route of routesToTest) {
      try {
        const response = await fetch(`http://localhost:${PORT}${route}`, { method: 'GET' });
        console.log(`[${new Date().toISOString()}] Ping ${route}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to ping route ${route}:`, error.message);
      }
    }
  }
  await pingRoutes();

  console.log(`[${new Date().toISOString()}] Self-check completed`);
}
// Session check endpoint
app.get('/api/check-session', (req, res) => {
  res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    res.json(cachedData);
    console.log(`[${new Date().toISOString()}] Served /api/data successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error serving /api/data:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

app.post('/api/save-data', isAuthenticated, async (req, res) => {
  try {
    // Preserve fileId and originalFileName for products, and ensure static pages content is preserved
    cachedData = {
      ...req.body,
      products: req.body.products.map(p => ({
        ...p,
        fileId: p.fileId || cachedData.products.find(cp => cp.item === p.item)?.fileId,
        originalFileName: p.originalFileName || cachedData.products.find(cp => cp.item === p.item)?.originalFileName
      })),
      staticPages: req.body.staticPages.map(page => ({
        ...page,
        content: page.content // Preserve raw content as sent
      }))
    };

    // Handle category deletions
    const { data: existingCategories, error: catError } = await supabase
      .from('categories')
      .select('name');
    if (catError) throw catError;

    const newCategories = cachedData.categories;
    const deletedCategories = existingCategories
      .map(c => c.name)
      .filter(c => !newCategories.includes(c));

    if (deletedCategories.length > 0) {
      await supabase
        .from('categories')
        .delete()
        .in('name', deletedCategories);
      console.log(`[${new Date().toISOString()}] 🗑️ Deleted categories: ${deletedCategories.join(', ')}`);
    }

    await saveData();
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Data saved via /api/save-data`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/save-data:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/add-bot', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { item, name, price, desc, embed, category, img, isNew } = req.body;
    const file = req.file;
    if (!file) throw new Error('No file uploaded');

    // Generate a unique prefix to avoid collisions
    let attempts = 0;
    let fileId;
    let uploadSuccess = false;
    const originalFileName = file.originalname; // e.g., "botfile.zip"

    while (attempts < 5 && !uploadSuccess) {
      const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      fileId = `${uniquePrefix}_${originalFileName}`; // e.g., "1748355962817_4o58ow_botfile.zip"

      const { error: uploadError } = await supabase.storage
        .from('bots')
        .upload(fileId, file.buffer, {
          contentType: file.mimetype,
          upsert: false // Prevent overwriting existing files
        });

      if (uploadError) {
        if (uploadError.statusCode === '409') { // Conflict: file already exists
          attempts++;
          continue;
        }
        throw uploadError;
      }
      uploadSuccess = true;
    }

    if (!uploadSuccess) {
      throw new Error('Failed to upload file: too many collisions');
    }

    const product = {
      item,
      fileId,
      price: parseFloat(price),
      name,
      desc,
      img,
      category,
      embed,
      isNew: isNew === 'true',
      isArchived: false
    };

    await supabase.from('products').insert({
      item: product.item,
      file_id: product.fileId,
      price: product.price,
      name: product.name,
      description: product.desc,
      image: product.img,
      category: product.category,
      embed: product.embed,
      is_new: product.isNew,
      is_archived: product.isArchived
    });

    await loadData();
    res.json({ success: true, product: product });
    console.log(`[${new Date().toISOString()}] Bot added successfully: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

app.post('/api/delete-bot', isAuthenticated, async (req, res) => {
  try {
    const { item } = req.body;
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('item', item)
      .single();
    if (productError || !product) {
      console.log(`[${new Date().toISOString()}] Bot not found in database: ${item}`);
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const fileId = product.file_id;

    // Delete related orders first to avoid foreign key constraint violation
    const { error: deleteOrdersError } = await supabase
      .from('orders')
      .delete()
      .eq('item', item);
    if (deleteOrdersError) throw deleteOrdersError;

    // Delete the file from the bots bucket
    const { error: deleteFileError } = await supabase.storage
      .from('bots')
      .remove([fileId]);
    if (deleteFileError) throw deleteFileError;

    // Delete the product from the products table
    const { error: deleteProductError } = await supabase
      .from('products')
      .delete()
      .eq('item', item);
    if (deleteProductError) throw deleteProductError;

    await loadData();
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Bot deleted successfully: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

async function sendOrderNotification(item, refCode, amount) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Order - KES-${parseFloat(amount).toFixed(2)}`,
      text: `M-PESA Ref: ${refCode}\nItem Number: ${item}`
    });
    console.log(`[${new Date().toISOString()}] Order notification email sent successfully for ref code ${refCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send order notification email:`, error.message);
  }
}

app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('item', item)
      .single();
    if (productError || !product) {
      console.log(`[${new Date().toISOString()}] Product not found: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();
    if (orderError && orderError.code !== 'PGRST116') throw orderError;
    if (existingOrder) {
      console.log(`[${new Date().toISOString()}] Ref code already submitted: ${refCode} for item: ${item}`);
      return res.status(400).json({ success: false, error: 'Ref code already submitted' });
    }

    const { error: insertError } = await supabase
      .from('orders')
      .insert({ item, ref_code: refCode, amount, timestamp, status: 'pending', downloaded: false });
    if (insertError) throw insertError;

    console.log(`[${new Date().toISOString()}] Order saved for item: ${item}, refCode: ${refCode}`);
    res.json({ success: true });

    Promise.resolve(sendOrderNotification(item, refCode, amount)).catch(err => {
      console.error(`[${new Date().toISOString()}] Async email error:`, err.message);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting ref code:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to submit ref code' });
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const { data: orders, error } = await supabase.from('orders').select('*');
    if (error) throw error;

    res.json({
      success: true,
      orders: orders.map(row => ({
        item: row.item,
        refCode: row.ref_code,
        amount: row.amount,
        timestamp: row.timestamp,
        status: row.status,
        downloaded: row.downloaded
      }))
    });
    console.log(`[${new Date().toISOString()}] Orders fetched successfully, count: ${orders.length}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

app.get('/api/order-status/:item/:refCode', async (req, res) => {
  const { item, refCode } = req.params;
  console.log(`[${new Date().toISOString()}] Order status request for ${item}/${refCode}`);

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();
    if (error || !order) {
      console.log(`[${new Date().toISOString()}] Order not found: ${item}/${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const status = order.status;
    const downloaded = order.downloaded;
    let downloadLink = null;

    if (status === 'confirmed' && !downloaded) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('item', item)
        .single();
      if (productError || !product) {
        console.error(`[${new Date().toISOString()}] Product not found for item: ${item}`);
        return res.status(500).json({ success: false, error: 'Product not found' });
      }

      // Generate a server-side download URL
      downloadLink = `/download/${product.file_id}?item=${item}&refCode=${refCode}`;
    } else if (downloaded) {
      console.log(`[${new Date().toISOString()}] Ref code already used for download: ${item}/${refCode}`);
      return res.status(403).json({ success: false, error: 'Ref code already used for download' });
    } else {
      console.log(`[${new Date().toISOString()}] Order not confirmed: ${item}/${refCode}, status: ${status}`);
      return res.status(400).json({ success: false, error: `Order is ${status}` });
    }

    res.json({ success: true, status, downloadLink });
    console.log(`[${new Date().toISOString()}] Order status checked: ${item}/${refCode} - Status: ${status}, Downloaded: ${downloaded}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

app.post('/api/update-order-status', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, status } = req.body;
    if (!['confirmed', 'no payment', 'partial payment'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();
    if (error || !order) {
      console.log(`[${new Date().toISOString()}] Order not found for update: ${item}/${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await supabase
      .from('orders')
      .update({ status })
      .eq('item', item)
      .eq('ref_code', refCode);

    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Order status updated: ${item}/${refCode} - New Status: ${status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('item', item)
      .single();
    if (productError || !product) {
      console.log(`[${new Date().toISOString()}] Product not found for order confirmation: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.file_id, 60);
    if (urlError) throw urlError;
    const downloadLink = signedUrlData.signedUrl;

    const email = cachedData.settings.supportEmail;
    const subject = `Your Deriv Bot Purchase - ${item}`;
    const body = `Thank you for your purchase!\n\nItem: ${item}\nRef Code: ${refCode}\nAmount: ${amount}\n\nDownload your bot here: ${downloadLink}\n\nIf you have any issues, please contact support.`;

    await supabase.from('emails').insert({ email, subject, body });

    await supabase
      .from('orders')
      .delete()
      .eq('item', item)
      .eq('ref_code', refCode);

    res.json({ success: true, downloadLink });
    console.log(`[${new Date().toISOString()}] Order confirmed for item: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message); // Fixed line
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

app.post('/deliver-bot', async (req, res) => {
  try {
    const { item, price, payment_method } = req.body;

    if (!item || !price || !payment_method) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: item, price, payment_method' });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('item', item)
      .single();
    if (productError || !product) {
      console.log(`[${new Date().toISOString()}] Product not found: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    if (price !== product.price) {
      console.log(`[${new Date().toISOString()}] Price tampering detected for item ${item}: received ${price}, expected ${product.price}`);
      return res.status(400).json({ success: false, error: 'Invalid price' });
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.file_id, 60);
    if (urlError) throw urlError;
    const downloadLink = signedUrlData.signedUrl;

    res.json({ success: true, downloadLink });
    console.log(`[${new Date().toISOString()}] Generated download link for item ${item}: ${downloadLink}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error delivering file for item ${req.body.item}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to generate download link' });
  }
});

app.get('/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  const item = req.query.item;
  const refCode = req.query.refCode;

  // Validate request
  if (!item || !refCode) {
    return res.status(400).json({ success: false, error: 'Missing item or refCode' });
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();
    if (orderError || !order || order.status !== 'confirmed' || order.downloaded) {
      console.log(`[${new Date().toISOString()}] Invalid download request for ${fileId}: ${item}/${refCode}`);
      return res.status(403).json({ success: false, error: 'Invalid download request' });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('item', item)
      .eq('file_id', fileId)
      .single();
    if (productError || !product) {
      console.log(`[${new Date().toISOString()}] Product not found for fileId: ${fileId}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch the file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('bots')
      .download(fileId);
    if (fileError) throw fileError;

    const buffer = await fileData.arrayBuffer();
    const mimeType = fileData.type || 'application/octet-stream';

    // Extract the original file name from the file_id
    // file_id format: "<timestamp>_<random>_botfile.zip"
    const fileIdParts = fileId.split('_');
    let finalFileName;
    if (fileIdParts.length >= 3) {
      // New format: <timestamp>_<random>_botfile.zip
      finalFileName = fileIdParts.slice(2).join('_'); // Rejoin parts after the second underscore
    } else {
      // Old format: file_<timestamp>_<random> (or other unexpected formats)
      finalFileName = `${item}.bin`;
      console.warn(`[${new Date().toISOString()}] Old or invalid file_id format detected for ${fileId}, using fallback name: ${finalFileName}`);
    }

    // Encode the file name for the Content-Disposition header
    const encodedFileName = encodeURIComponent(finalFileName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Type', mimeType);

    // Send the file
    res.send(Buffer.from(buffer));
    console.log(`[${new Date().toISOString()}] File download completed: ${fileId} as ${finalFileName}`);

    // Mark the order as downloaded after successful download
    await supabase
      .from('orders')
      .update({ downloaded: true })
      .eq('item', item)
      .eq('ref_code', refCode);
    console.log(`[${new Date().toISOString()}] Marked order as downloaded: ${item}/${refCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error downloading file ${fileId}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: adminSettings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['adminEmail', 'adminPassword']);
    if (error) throw error;

    console.log(`[${new Date().toISOString()}] Admin settings from DB:`, adminSettings);

    const adminEmail = adminSettings.find(s => s.key === 'adminEmail')?.value;
    const adminPasswordHash = adminSettings.find(s => s.key === 'adminPassword')?.value;

    console.log(`[${new Date().toISOString()}] Admin Email: ${adminEmail}, Password Hash: ${adminPasswordHash}`);

    if (
      email === adminEmail &&
      adminPasswordHash &&
      await bcrypt.compare(password, adminPasswordHash)
    ) {
      req.session.isAuthenticated = true;
      console.log(`[${new Date().toISOString()}] User logged in successfully, session:`, email);
      res.json({ success: true });
    } else {
      console.log(`[${new Date().toISOString()}] Failed login attempt with email: ${email}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during login:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

app.get('/api/page/:slug', async (req, res) => {
  const slug = `/${req.params.slug}`;
  let page = cachedData.staticPages.find(p => p.slug === slug);
  if (!page) {
    if (slug === '/payment-modal') page = fallbackPaymentModal;
    if (slug === '/ref-code-modal') page = fallbackRefCodeModal;
  }
  if (!page) {
    console.log(`[${new Date().toISOString()}] Page not found: ${slug}`);
    return res.status(404).json({ success: false, error: 'Page not found' });
  }
  res.json({ success: true, page }); // Serve raw content as loaded
  console.log(`[${new Date().toISOString()}] Served page: ${slug}`);
});

app.get('/virus.html', (req, res) => {
  const virusPath = path.join(__dirname, 'public', 'virus.html');
  if (fs.existsSync(virusPath)) {
    console.log(`[${new Date().toISOString()}] Serving virus.html for request: ${req.url}`);
    res.sendFile(virusPath);
  } else {
    console.error(`[${new Date().toISOString()}] virus.html not found at: ${virusPath}`);
    res.status(404).send(`
      <h1>404 - File Not Found</h1>
      <p>The requested file (virus.html) was not found on the code.  
      </p>
      <p>Ensure that the 'public' directory contains 'virus.html' and that the server is deployed correctly.</p>
    `);
  }
});

app.get('/:slug', async (req, res) => {
  const page = cachedData.staticPages.find(p => p.slug === `/${req.params.slug}`);
  if (!page) {
    console.log(`[${new Date().toISOString()}] Static page not found: /${req.params.slug}`);
    return res.status(404).send('Not found');
  }
  const htmlContent = sanitizeHtml(marked(page.content));
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${page.title} - Deriv Bot Store</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <a href="/" class="text-xl font-bold text-gray-800">Deriv Bot Store</a>
            </div>
          </div>
        </div>
      </nav>
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">${page.title}</h1>
        <div class="prose">${htmlContent}</div>
      </main>
    </body>
    </html>
  `);
});

// Initialize server
async function initialize() {
  await selfCheck();
  await loadData();
  await deleteOldOrders();
  setInterval(deleteOldOrders, 24 * 60 * 60 * 1000);
  setInterval(refreshCache, 15 * 60 * 1000);
}

initialize().catch(error => {
  console.error(`[${new Date().toISOString()}] Server initialization failed:`, error.message);
  process.exit(1);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
