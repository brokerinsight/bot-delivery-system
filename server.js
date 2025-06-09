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
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const RedisStore = require('connect-redis').default;
const { createClient: createRedisClient } = require('redis');
const next = require('next');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  // Supabase client setup with service role key for RLS
  const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Create a Redis client for Valkey
  const redisClient = createRedisClient({
    url: `rediss://${process.env.VALKEY_USERNAME}:${process.env.VALKEY_PASSWORD}@${process.env.VALKEY_HOST}:${process.env.VALKEY_PORT}/0`
  });

  // Handle Redis client connection errors
  redisClient.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Redis Client Error:`, err.message);
  });

  // Connect to Redis (Valkey)
  redisClient.connect().then(() => {
    console.log(`[${new Date().toISOString()}] Connected to Valkey successfully`);
  }).catch((err) => {
    console.error(`[${new Date().toISOString()}] Failed to connect to Valkey:`, err.message);
  });

  // Allowed domains for CORS and download links
  const ALLOWED_ORIGINS = [
    'https://bot-delivery-system-qlx4j.ondigitalocean.app',
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
  app.use(express.static(publicPath));
  console.log(`[${new Date().toISOString()}] Serving static files from: ${publicPath}`);

  // Session middleware with RedisStore
  app.use(session({
    store: new RedisStore({ client: redisClient }),
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
      const productRes = await supabase
        .from('products')
        .select('*')
        .order('is_new', { ascending: false })
        .order('created_at', { ascending: false })
        .order('item', { ascending: true });

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
        adminEmail: settingsData.adminEmail || '',
        adminPassword: settingsData.adminPassword || '',
        mpesaTill: settingsData.mpesaTill || '4933614'
      };

      const categoriesRes = await supabase.from('categories').select('name');
      const categories = [...new Set(categoriesRes.data?.map(row => row.name) || ['General'])];

      const pagesRes = await supabase.from('static_pages').select('*');
      let staticPages = pagesRes.data?.map(row => ({
        title: row.title,
        slug: row.slug,
        content: row.content
      })) || [];

      if (!staticPages.find(page => page.slug === '/payment-modal')) {
        staticPages.push(fallbackPaymentModal);
      }
      if (!staticPages.find(page => page.slug === '/ref-code-modal')) {
        staticPages.push(fallbackRefCodeModal);
      }

      cachedData = { products, categories, settings, staticPages };
      await redisClient.set('cachedData', JSON.stringify(cachedData), { EX: 900 });
      console.log(`[${new Date().toISOString()}] Data loaded successfully from Supabase and cached in Valkey`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error loading data:`, error.message);
      throw error;
    }
  }

  // Refresh cache periodically
  async function refreshCache() {
    try {
      const cached = await redisClient.get('cachedData');
      if (cached) {
        cachedData = JSON.parse(cached);
        console.log(`[${new Date().toISOString()}] Cache refreshed from Valkey`);
      } else {
        await loadData();
        console.log(`[${new Date().toISOString()}] Cache refreshed from Supabase and stored in Valkey`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error refreshing cache:`, error.message);
    }
  }

  // Save data to Supabase
  async function saveData() {
    try {
      const { data: existingProducts } = await supabase
        .from('products')
        .select('*');
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

      for (const product of updatedProducts) {
        await supabase
          .from('products')
          .upsert(product, { onConflict: 'item' });
      }

      await supabase
        .from('products')
        .delete()
        .not('item', 'in', `(${cachedData.products.map(p => p.item).join(',')})`);

      await supabase.from('settings').delete().neq('key', null);
      await supabase.from('settings').insert(
        Object.entries(cachedData.settings).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : value
        }))
      );

      await supabase.from('categories').delete().neq('name', null);
      if (cachedData.categories.length > 0) {
        await supabase.from('categories').insert(
          cachedData.categories.map(c => ({ name: c }))
        );
      }

      await supabase.from('static_pages').delete().neq('slug', null);
      if (cachedData.staticPages.length > 0) {
        await supabase.from('static_pages').insert(cachedData.staticPages);
      }

      console.log(`[${new Date().toISOString()}] Data saved to Supabase`);
      await loadData();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error saving data:`, error.message);
      throw error;
    }
  }

  // Delete orders older than 3 days
  async function deleteOldOrders() {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('orders')
        .delete()
        .lt('timestamp', threeDaysAgo);
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
      console.error(`[${new Date().toISOString()}] public/index.html NOT found at: ${indexPath}`);
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

  async function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `rate-limit:${ip}`;
    const limit = 100;
    const window = 15 * 60;

    try {
      const requests = await redisClient.get(key);
      if (requests && parseInt(requests) >= limit) {
        return res.status(429).json({ success: false, error: 'Too many requests, please try again later' });
      }

      if (!requests) {
        await redisClient.set(key, 1, { EX: window });
      } else {
        await redisClient.incr(key);
      }
      next();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Rate limiting error:`, error.message);
      next();
    }
  }

  // API Routes
  app.get('/api/data', async (req, res) => {
    try {
      const cached = await redisClient.get('cachedData');
      if (cached) {
        cachedData = JSON.parse(cached);
        console.log(`[${new Date().toISOString()}] Served /api/data from Valkey cache`);
      } else {
        await loadData();
        console.log(`[${new Date().toISOString()}] Served /api/data from Supabase and cached in Valkey`);
      }
      res.json(cachedData);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error serving /api/data:`, error.message);
      res.status(500).json({ success: false, error: 'Failed to fetch data' });
    }
  });

  app.post('/api/save-data', isAuthenticated, async (req, res) => {
    try {
      cachedData = {
        ...req.body,
        products: req.body.products.map(p => ({
          ...p,
          fileId: p.fileId || cachedData.products.find(cp => cp.item === p.item)?.fileId,
          originalFileName: p.originalFileName || cachedData.products.find(cp => cp.item === p.item)?.originalFileName,
          desc: p.desc
        })),
        staticPages: req.body.staticPages
      };

      const { data: existingCategories } = await supabase
        .from('categories')
        .select('name');
      const newCategories = cachedData.categories || [];
      const existingCategoryNames = existingCategories.map(c => c.name);
      const deletedCategories = existingCategoryNames.filter(c => !newCategories.includes(c));

      if (deletedCategories.length > 0) {
        await supabase
          .from('categories')
          .delete()
          .in('name', deletedCategories);
      }

      const addedCategories = newCategories.filter(c => !existingCategoryNames.includes(c));
      if (addedCategories.length > 0) {
        await supabase.from('categories').insert(
          addedCategories.map(c => ({ name: c }))
        );
      }

      const incomingPassword = req.body.settings?.adminPassword;
      if (incomingPassword && incomingPassword.trim() !== '') {
        const saltRounds = 10;
        cachedData.settings.adminPassword = await bcrypt.hash(incomingPassword, saltRounds);
      } else if (!incomingPassword) {
        cachedData.settings.adminPassword = cachedData.settings.adminPassword || '';
      }

      if (cachedData.settings.urgentMessage && typeof cachedData.settings.urgentMessage === 'string') {
        cachedData.settings.urgentMessage = JSON.parse(cachedData.settings.urgentMessage);
      } else if (!cachedData.settings.urgentMessage) {
        cachedData.settings.urgentMessage = { enabled: false, text: '' };
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

      let attempts = 0;
      let fileId;
      let uploadSuccess = false;
      const originalFileName = file.originalname;

      while (attempts < 5 && !uploadSuccess) {
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        fileId = `${uniquePrefix}_${originalFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bots')
          .upload(fileId, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          if (uploadError.statusCode === '409') {
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
        return res.status(404).json({ success: false, error: 'Bot not found' });
      }

      const fileId = product.file_id;

      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .eq('item', item);
      if (deleteOrdersError) throw deleteOrdersError;

      const { error: deleteFileError } = await supabase.storage
        .from('bots')
        .remove([fileId]);
      if (deleteFileError) throw deleteFileError;

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

  app.post('/api/submit-ref', rateLimit, async (req, res) => {
    try {
      const { item, refCode, amount, timestamp } = req.body;
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('item', item)
        .single();
      if (productError || !product) {
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
        return res.status(400).json({ success: false, error: 'Ref code already submitted' });
      }

      const { error: insertError } = await supabase
        .from('orders')
        .insert({ item, ref_code: refCode, amount, timestamp, status: 'pending', downloaded: false });
      if (insertError) throw insertError;

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
          return res.status(500).json({ success: false, error: 'Product not found' });
        }

        downloadLink = `/download/${product.file_id}?item=${item}&refCode=${refCode}`;
      } else if (downloaded) {
        return res.status(403).json({ success: false, error: 'Ref code already used for download' });
      } else {
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
      console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
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
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      if (price !== product.price) {
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
        return res.status(403).json({ success: false, error: 'Invalid download request' });
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('item', item)
        .eq('file_id', fileId)
        .single();
      if (productError || !product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      const { data: fileData, error: fileError } = await supabase.storage
        .from('bots')
        .download(fileId);
      if (fileError) throw fileError;

      const buffer = await fileData.arrayBuffer();
      const mimeType = fileData.type || 'application/octet-stream';
      const fileIdParts = fileId.split('_');
      let finalFileName = fileIdParts.length >= 3 ? fileIdParts.slice(2).join('_') : `${item}.bin`;

      const encodedFileName = encodeURIComponent(finalFileName);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
      res.setHeader('Content-Type', mimeType);

      res.send(Buffer.from(buffer));
      console.log(`[${new Date().toISOString()}] File download completed: ${fileId} as ${finalFileName}`);

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

  app.post('/api/login', rateLimit, async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data: adminSettings, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['adminEmail', 'adminPassword']);
      if (error) throw error;

      const adminEmail = adminSettings.find(s => s.key === 'adminEmail')?.value;
      const adminPasswordHash = adminSettings.find(s => s.key === 'adminPassword')?.value;

      if (
        email === adminEmail &&
        adminPasswordHash &&
        await bcrypt.compare(password, adminPasswordHash)
      ) {
        req.session.isAuthenticated = true;
        req.session.email = email;
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
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    res.json({ success: true, page });
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
        <p>The requested file (virus.html) was not found on the server.</p>
        <p>Ensure that the 'public' directory contains 'virus.html' and that the server is deployed correctly.</p>
      `);
    }
  });

  app.post('/api/logout', (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error(`[${new Date().toISOString()}] Error destroying session:`, err.message);
          return res.status(500).json({ success: false, error: 'Failed to log out' });
        }
        res.clearCookie('sid');
        console.log(`[${new Date().toISOString()}] User logged out successfully, session destroyed`);
        res.json({ success: true });
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during logout:`, error.message);
      res.status(500).json({ success: false, error: 'Failed to log out' });
    }
  });

  // Serve Next.js pages
  app.get('*', (req, res) => {
    return handle(req, res);
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

const PORT = process.env.PORT || 10000; // Use platform-provided PORT or fallback to 10000
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
