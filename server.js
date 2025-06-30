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
const { v4: uuidv4 } = require('uuid');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const RedisStore = require('connect-redis').default;
const { createClient: createRedisClient } = require('redis');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const redisClient = createRedisClient({
  url: `rediss://${process.env.VALKEY_USERNAME}:${process.env.VALKEY_PASSWORD}@${process.env.VALKEY_HOST}:${process.env.VALKEY_PORT}/0`
});

redisClient.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Redis Client Error:`, err.message);
});

redisClient.connect().then(() => {
  console.log(`[${new Date().toISOString()}] Connected to Valkey successfully`);
}).catch((err) => {
  console.error(`[${new Date().toISOString()}] Failed to connect to Valkey:`, err.message);
});

const ALLOWED_ORIGINS = [
  'https://bot-delivery-system-qlx4j.ondigitalocean.app',
  'https://botblitz.store',
  'https://www.botblitz.store'
];

function getBaseUrl(req) {
  const origin = req.get('origin') || req.get('referer');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return 'https://botblitz.store';
}

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Debug-Source']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
    mpesaTill: '4933614',
    payheroChannelId: process.env.PAYHERO_CHANNEL_ID || '2332',
    payheroPaymentUrl: process.env.PAYHERO_PAYMENT_URL || 'https://app.payhero.co.ke/lipwa/2003',
    payheroAuthToken: process.env.PAYHERO_AUTH_TOKEN || 'Basic bXNxSmtaeTJVS1RkUXMySkgzeDE6S2R4dkJrT2FTRUhQWEJqQkNJT053OHZVQ0dKNWpNSXd4MHVwdkZLYg==',
  },
  staticPages: []
};

const fallbackPaymentModal = {
  title: 'Payment Modal',
  slug: '/payment-modal',
  content: `
    <h3 id="payment-title" class="text-xl font-bold text-gray-900 mb-4"></h3>
    <p class="text-gray-600 mb-4">Please send the payment via MPESA to:</p>
    <p class="font-semibold text-gray-900">Till Number: <span id="mpesa-till-number">4933614</span></p>
    <p id="payment-amount" class="text-green-600 font-bold mt-2"></p>
    <p class="text-gray-600 mt-4">We are working to add more payment options on the checkout. Meanwhile, if you do not find your preferred Payment option, <a href="https://wa.link/11x0nx" class="text-blue-600 underline" target="_blank">contact us</a>.</p>
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
      price: parseFloat(row.price), // Assuming this is USD price
      price_kes: row.price_kes ? parseFloat(row.price_kes) : null, // Optional direct KES price
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
      mpesaTill: settingsData.mpesaTill || '4933614',
      payheroChannelId: settingsData.payheroChannelId || process.env.PAYHERO_CHANNEL_ID || '2332',
      payheroPaymentUrl: settingsData.payheroPaymentUrl || process.env.PAYHERO_PAYMENT_URL || 'https://app.payhero.co.ke/lipwa/5', // This is for Button SDK, maybe not needed now
      payheroAuthToken: settingsData.payheroAuthToken || process.env.PAYHERO_AUTH_TOKEN || 'Basic bXNxSmtaeTJVS1RkUXMySkgzeDE6S2R4dkJrT2FTRUhQWEJqQkNJT053OHZVQ0dKNWpNSXd4MHVwdkZLYg=='
    };

    const categoriesRes = await supabase.from('categories').select('name');
    const categories = [...new Set(categoriesRes.data?.map(row => row.name) || ['General'])];
    console.log(`[${new Date().toISOString()}] Loaded categories (after deduplication):`, categories);

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

async function saveData() {
  try {
    const { data: existingProductsDb, error: fetchError } = await supabase
      .from('products')
      .select('item, file_id, original_file_name'); // Select only necessary fields
    if (fetchError) throw fetchError;

    const existingProductsMap = new Map(existingProductsDb.map(p => [p.item, p]));

    const productsToUpsert = cachedData.products.map(p => {
      const existing = existingProductsMap.get(p.item);
      return {
        item: p.item,
        file_id: existing?.file_id || p.fileId,
        original_file_name: existing?.original_file_name || p.originalFileName,
        price: p.price,
        price_kes: p.price_kes, // Save KES price if available
        name: p.name,
        description: p.desc,
        image: p.img,
        category: p.category,
        embed: p.embed,
        is_new: p.isNew,
        is_archived: p.isArchived
      };
    });

    for (const product of productsToUpsert) {
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'item' });
      if (upsertError) throw upsertError;
    }

    const currentProductItems = new Set(cachedData.products.map(p => p.item));
    const productsToDelete = existingProductsDb.filter(p => !currentProductItems.has(p.item));
    if (productsToDelete.length > 0) {
        await supabase
            .from('products')
            .delete()
            .in('item', productsToDelete.map(p => p.item));
    }

    await supabase.from('settings').delete().neq('key', null);
    await supabase.from('settings').insert(
      Object.entries(cachedData.settings).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value) // Ensure value is stringified if object, or cast to string
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
      await supabase.from('static_pages').insert(cachedData.staticPages.map(page => ({
          title: page.title,
          slug: page.slug,
          content: page.content
      })));
    }

    console.log(`[${new Date().toISOString()}] Data saved to Supabase`);
    await loadData(); // Reload cache after saving
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving data:`, error.message);
    throw error;
  }
}

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

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  console.log(`[${new Date().toISOString()}] Unauthorized access attempt to ${req.url}`);
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

async function selfCheck() {
  console.log(`[${new Date().toISOString()}] Starting server self-check...`);
  try {
    const { data, error } = await supabase.from('products').select('item').limit(1);
    if (error) throw error;
    console.log(`[${new Date().toISOString()}] Successfully connected to Supabase database`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to Supabase database:`, error.message);
  }
  // ... (other self-check items)
}

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

app.get('/api/data', async (req, res) => {
  try {
    const cached = await redisClient.get('cachedData');
    if (cached) {
      cachedData = JSON.parse(cached); // Ensure global cachedData is updated
      console.log(`[${new Date().toISOString()}] Served /api/data from Valkey cache`);
    } else {
      await loadData(); // This updates global cachedData and sets it in Redis
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

    const { data: existingCategories, error: catError } = await supabase
      .from('categories')
      .select('name');
    if (catError) throw catError;

    const newCategories = cachedData.categories || [];
    const existingCategoryNames = existingCategories.map(c => c.name);
    const deletedCategories = existingCategoryNames.filter(c => !newCategories.includes(c));

    if (deletedCategories.length > 0) {
      await supabase.from('categories').delete().in('name', deletedCategories);
    }
    const addedCategories = newCategories.filter(c => !existingCategoryNames.includes(c));
    if (addedCategories.length > 0) {
      await supabase.from('categories').insert(addedCategories.map(c => ({ name: c })));
    }

    const incomingPassword = req.body.settings?.adminPassword;
    if (incomingPassword && incomingPassword.trim() !== '') {
      const saltRounds = 10;
      cachedData.settings.adminPassword = await bcrypt.hash(incomingPassword, saltRounds);
    } else if (req.body.settings && !('adminPassword' in req.body.settings)) {
      // If adminPassword is not in the incoming settings, keep the old one from cachedData
      // This handles the case where the admin password field is left blank on the frontend,
      // intending not to change it.
      // cachedData.settings.adminPassword remains unchanged.
    }


    if (cachedData.settings.urgentMessage && typeof cachedData.settings.urgentMessage === 'string') {
      cachedData.settings.urgentMessage = JSON.parse(cachedData.settings.urgentMessage);
    } else if (!cachedData.settings.urgentMessage) {
      cachedData.settings.urgentMessage = { enabled: false, text: '' };
    }

    cachedData.settings.payheroChannelId = req.body.settings.payheroChannelId || cachedData.settings.payheroChannelId || process.env.PAYHERO_CHANNEL_ID || '2332';
    cachedData.settings.payheroAuthToken = req.body.settings.payheroAuthToken || cachedData.settings.payheroAuthToken || process.env.PAYHERO_AUTH_TOKEN || 'Basic bXNxSmtaeTJVS1RkUXMySkgzeDE6S2R4dkJrT2FTRUhQWEJqQkNJT053OHZVQ0dKNWpNSXd4MHVwdkZLYg==';

    await saveData();
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/save-data:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/add-bot', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { item, name, price, price_kes, desc, embed, category, img, isNew } = req.body;
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
    if (!uploadSuccess) throw new Error('Failed to upload file: too many collisions');

    const productData = {
      item,
      file_id: fileId,
      original_file_name: originalFileName,
      price: parseFloat(price), // USD price
      price_kes: price_kes ? parseFloat(price_kes) : null, // KES price
      name,
      description: desc,
      image: img,
      category,
      embed,
      is_new: isNew === 'true',
      is_archived: false
    };

    await supabase.from('products').insert(productData);
    await loadData(); // Refresh cache
    res.json({ success: true, product: productData });
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
      .select('file_id')
      .eq('item', item)
      .single();
    if (productError || !product) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    await supabase.from('orders').delete().eq('item', item);
    if (product.file_id) {
        await supabase.storage.from('bots').remove([product.file_id]);
    }
    await supabase.from('products').delete().eq('item', item);
    await loadData(); // Refresh cache
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

async function sendOrderNotification(item, refCode, amount) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to admin
      subject: `New Order - KES ${parseFloat(amount).toFixed(2)}`,
      text: `M-PESA Ref/Order Ref: ${refCode}\nItem Number: ${item}\nAmount: KES ${parseFloat(amount).toFixed(2)}`
    });
    console.log(`[${new Date().toISOString()}] Order notification email sent successfully for ref code ${refCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send order notification email:`, error.message);
  }
}

app.post('/api/submit-ref', rateLimit, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body; // amount is KES from client
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('item', item)
      .eq('ref_code', refCode) // For manual Mpesa, refCode is the Mpesa code
      .single();
    if (orderError && orderError.code !== 'PGRST116') throw orderError;
    if (existingOrder) {
      return res.status(400).json({ success: false, error: 'Ref code already submitted' });
    }

    await supabase.from('orders').insert({
        item, 
        ref_code: refCode, 
        amount: parseFloat(amount), // Store KES amount
        timestamp, 
        status: 'pending', 
        downloaded: false,
        payment_method: 'mpesa_till'
      });
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
    res.json({ success: true, orders });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

app.get('/api/order-status/:item/:refCode', async (req, res) => {
  const { item, refCode } = req.params;
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

    if ((status === 'confirmed' || status === 'confirmed_server_stk') && !downloaded) {
      const product = cachedData.products.find(p => p.item === item);
      if (!product || !product.fileId) {
        return res.status(500).json({ success: false, error: 'Product file details not found' });
      }
      downloadLink = `/download/${product.fileId}?item=${item}&refCode=${refCode}`;
    } else if (downloaded) {
      return res.status(403).json({ success: false, error: 'Ref code already used for download' });
    } else if (!status.startsWith('confirmed')) { // Covers pending, failed etc.
         return res.json({ success: true, status: order.status, message: `Payment status: ${order.status}. ${order.notes || ''}`.trim() });
    }

    res.json({ success: true, status, downloadLink });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

app.post('/api/update-order-status', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, status } = req.body;
    const validStatuses = ['confirmed', 'no payment', 'partial payment', 'pending_stk_push', 'confirmed_server_stk', 'failed_stk_initiation', 'failed_stk_cb_timeout', 'failed_amount_mismatch', 'failed_config_error'];
    if (!validStatuses.some(s => status.startsWith(s))) { // Allow for dynamic failure codes like failed_stk_cb_1032
        if (!status.startsWith('failed_stk_cb_')) { // Check if it's not a specific failure code we want to allow
            return res.status(400).json({ success: false, error: 'Invalid status value provided' });
        }
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('status')
      .eq('item', item)
      .eq('ref_code', refCode)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await supabase.from('orders').update({ status }).eq('item', item).eq('ref_code', refCode);
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// This endpoint might be redundant if manual confirmation flow is changed, but keeping for now.
app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.fileId, 60); // 60-second validity
    if (urlError) throw urlError;
    const downloadLink = signedUrlData.signedUrl;

    // This was originally for sending email with download link.
    // Now, download link is generated by /api/order-status.
    // This endpoint might just mark order as confirmed if used by admin.

    // For now, just logging and returning success.
    console.log(`[${new Date().toISOString()}] Admin manually confirmed order for item: ${item}, ref: ${refCode}`);
    res.json({ success: true, downloadLink }); // Still sending link for now
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});


app.post('/deliver-bot', async (req, res) => { // Used by Test Mode
  try {
    const { item, price, payment_method } = req.body;
    if (!item || typeof price === 'undefined' || !payment_method) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    // In test mode, price might be USD. The client sends product.price directly.
    if (parseFloat(price) !== parseFloat(product.price)) {
      return res.status(400).json({ success: false, error: 'Invalid price for test mode' });
    }

    if (!product.fileId) {
        return res.status(500).json({success: false, error: 'Product file ID missing'});
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.fileId, 60 * 5); // 5-minute validity for test download
    if (urlError) throw urlError;

    res.json({ success: true, downloadLink: signedUrlData.signedUrl });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /deliver-bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to generate test download link' });
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

    if (orderError || !order || (!order.status.startsWith('confirmed')) || order.downloaded) {
      let errorMsg = 'Invalid download request or link expired.';
      if (order && order.downloaded) errorMsg = 'File already downloaded for this order.';
      if (order && !order.status.startsWith('confirmed')) errorMsg = `Payment not confirmed (status: ${order.status}).`;
      if (!order) errorMsg = 'Order not found for this download link.';

      console.log(`[${new Date().toISOString()}] Invalid download attempt for ${fileId}: ${item}/${refCode}. Reason: ${errorMsg}`);
      return res.status(403).send(`<script>alert("${errorMsg}"); window.close();</script>`);
    }

    const product = cachedData.products.find(p => p.item === item && p.fileId === fileId);
    if (!product) {
      return res.status(404).send("<script>alert('Product file not found for this link.'); window.close();</script>");
    }

    const { data: fileData, error: fileError } = await supabase.storage
      .from('bots')
      .download(fileId);
    if (fileError) throw fileError;

    const buffer = await fileData.arrayBuffer();
    const mimeType = fileData.type || 'application/octet-stream';
    const finalFileName = product.originalFileName || `${item}.bin`;
    const encodedFileName = encodeURIComponent(finalFileName);

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Type', mimeType);
    res.send(Buffer.from(buffer));

    await supabase.from('orders').update({ downloaded: true }).eq('item', item).eq('ref_code', refCode);
    console.log(`[${new Date().toISOString()}] File download completed: ${fileId} as ${finalFileName}. Marked order as downloaded.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error downloading file ${fileId}:`, error.message);
    res.status(500).send("<script>alert('Failed to download file due to a server error.'); window.close();</script>");
  }
});

app.post('/api/login', rateLimit, async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminEmail = cachedData.settings.adminEmail;
    const adminPasswordHash = cachedData.settings.adminPassword;

    if (email === adminEmail && adminPasswordHash && await bcrypt.compare(password, adminPasswordHash)) {
      req.session.isAuthenticated = true;
      req.session.email = email;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during login:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to login' });
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
      res.json({ success: true });
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during logout:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to log out' });
  }
});

// New endpoint for server-side STK push initiation
app.post('/api/initiate-server-stk-push', rateLimit, async (req, res) => {
  try {
    const { item, amount_kes, phone, customerName } = req.body;

    if (!item || !amount_kes || !phone) {
      return res.status(400).json({ success: false, error: 'Missing required fields: item, amount_kes, phone' });
    }

    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      console.log(`[${new Date().toISOString()}] ServerSTK: Product not found for item: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const clientReportedKesAmount = Math.round(parseFloat(amount_kes));
    let expectedServerKesPrice;

    if (product.price_kes) { // Prefer direct KES price if available
        expectedServerKesPrice = Math.round(parseFloat(product.price_kes));
    } else { // Fallback to USD price conversion
        expectedServerKesPrice = Math.round(parseFloat(product.price) * (cachedData.settings.fallbackRate || 130));
    }

    if (clientReportedKesAmount !== expectedServerKesPrice) {
        console.error(`[${new Date().toISOString()}] ServerSTK: Amount mismatch for item ${item}. Client KES: ${clientReportedKesAmount}, Server Expected KES: ${expectedServerKesPrice}. Product USD Price: ${product.price}, Product KES Price: ${product.price_kes}, Rate: ${cachedData.settings.fallbackRate || 130}`);
        return res.status(400).json({ success: false, error: 'Price verification failed. Please try again or contact support.' });
    }

    const amountToCharge = clientReportedKesAmount;

    const serverSideReference = `SRV-PH-${item}-${uuidv4()}`;
    const normalizedPhone = phone.startsWith('+') ? phone.substring(1) : (phone.startsWith('0') ? `254${phone.substring(1)}` : phone);

    const { error: insertError } = await supabase.from('orders').insert({
      item: item,
      ref_code: serverSideReference,
      amount: amountToCharge,
      timestamp: new Date().toISOString(),
      status: 'pending_stk_push',
      downloaded: false,
      payment_method: 'payhero_server_stk',
      phone_number: normalizedPhone,
      customer_name: customerName || 'Valued Customer'
    });

    if (insertError) {
      console.error(`[${new Date().toISOString()}] ServerSTK: Error saving initial order to DB:`, insertError.message);
      throw insertError;
    }
    console.log(`[${new Date().toISOString()}] ServerSTK: Initial order saved to DB for item ${item}, ref ${serverSideReference} with KES amount ${amountToCharge}`);

    const payheroApiUrl = 'https://backend.payhero.co.ke/api/v2/payments';
    const payheroChannelId = cachedData.settings.payheroChannelId;
    const payheroAuthToken = cachedData.settings.payheroAuthToken;
    const callbackUrl = `${getBaseUrl(req)}/api/payhero-callback`;

    if (!payheroAuthToken || !payheroChannelId) {
        console.error(`[${new Date().toISOString()}] ServerSTK: PayHero auth token or channel ID is not configured.`);
        await supabase.from('orders').update({ status: 'failed_config_error' }).eq('ref_code', serverSideReference);
        return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' });
    }

    const payheroRequestBody = {
      amount: amountToCharge,
      phone_number: normalizedPhone,
      channel_id: parseInt(payheroChannelId),
      provider: "sasapay",
      network_code: "63902",
      external_reference: serverSideReference,
      customer_name: customerName || 'Valued Customer',
      callback_url: callbackUrl
    };

    console.log(`[${new Date().toISOString()}] ServerSTK: Initiating STK push to PayHero with body:`, JSON.stringify(payheroRequestBody));

    const response = await fetch(payheroApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': payheroAuthToken
      },
      body: JSON.stringify(payheroRequestBody)
    });

    const payheroResponse = await response.json();

    if (!response.ok || !payheroResponse.success || payheroResponse.status !== 'QUEUED') {
      console.error(`[${new Date().toISOString()}] ServerSTK: PayHero STK Push initiation API call failed. Status: ${response.status}, Response:`, payheroResponse);
      await supabase.from('orders').update({ status: 'failed_stk_initiation', notes: JSON.stringify(payheroResponse) }).eq('ref_code', serverSideReference);
      return res.status(500).json({ success: false, error: payheroResponse.message || 'Failed to initiate payment with PayHero.' });
    }

    console.log(`[${new Date().toISOString()}] ServerSTK: PayHero STK Push initiated successfully for ref ${serverSideReference}. PayHero Response:`, payheroResponse);
    res.json({
        success: true,
        message: 'STK Push initiated. Please check your phone.',
        serverReference: serverSideReference
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ServerSTK: Error in /api/initiate-server-stk-push:`, error.message, error.stack);
    res.status(500).json({ success: false, error: 'Server error during STK push payment initiation.' });
  }
});

// Modified endpoint for PayHero callback (to handle Direct API STK Push callback)
app.post('/api/payhero-callback', async (req, res) => {
  console.log(`[${new Date().toISOString()}] PayHero Direct API Callback Received:`, JSON.stringify(req.body));
  try {
    const { response: payheroResponseData, status: overallCallbackStatus } = req.body;

    if (!payheroResponseData || typeof payheroResponseData !== 'object') {
        console.error(`[${new Date().toISOString()}] DirectAPI CB: Invalid 'response' structure. Body:`, req.body);
        return res.status(400).json({ error: 'Invalid callback structure from PayHero' });
    }

    const { ExternalReference, ResultCode, ResultDesc, Status: paymentGatewayStatus, MpesaReceiptNumber, Amount } = payheroResponseData;

    if (!ExternalReference) {
      console.error(`[${new Date().toISOString()}] DirectAPI CB: Missing ExternalReference. Body:`, req.body);
      return res.status(400).json({ error: 'Missing ExternalReference in PayHero callback' });
    }

    const serverSideReference = ExternalReference;

    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('ref_code', serverSideReference)
      .eq('payment_method', 'payhero_server_stk')
      .single();

    if (orderFetchError && orderFetchError.code !== 'PGRST116') {
        console.error(`[${new Date().toISOString()}] DirectAPI CB: DB error fetching order ${serverSideReference}:`, orderFetchError.message);
        throw orderFetchError;
    }

    if (!order) {
      console.error(`[${new Date().toISOString()}] DirectAPI CB: Order not found for ref_code ${serverSideReference}. This might happen if STK initiation failed silently or callback is for an unknown ref.`);
      return res.status(200).json({ error: 'Order not found, callback acknowledged to prevent PayHero retries.' });
    }

    if (order.status === 'confirmed_server_stk' || order.status === 'failed_amount_mismatch') {
        console.log(`[${new Date().toISOString()}] DirectAPI CB: Order ${serverSideReference} already processed as ${order.status}. Ignoring duplicate callback.`);
        return res.status(200).json({ message: `Order already processed as ${order.status}` });
    }

    const mpesaReceipt = MpesaReceiptNumber || null;
    const notesForUpdate = ResultDesc || (paymentGatewayStatus !== "Success" ? paymentGatewayStatus : null);

    if (overallCallbackStatus === true && ResultCode === 0 && paymentGatewayStatus === "Success") {
      console.log(`[${new Date().toISOString()}] DirectAPI CB: Payment SUCCEEDED for order ${serverSideReference}. Amount: ${Amount}, Receipt: ${mpesaReceipt}`);

      const orderStoredKesAmount = Math.round(parseFloat(order.amount));
      const callbackReceivedKesAmount = Math.round(parseFloat(Amount));

      if (orderStoredKesAmount !== callbackReceivedKesAmount) {
        console.warn(`[${new Date().toISOString()}] DirectAPI CB: Amount mismatch for order ${serverSideReference}. Order KES: ${orderStoredKesAmount}, PayHero CB KES: ${callbackReceivedKesAmount}. Updating to 'failed_amount_mismatch'.`);
        await supabase.from('orders').update({ status: 'failed_amount_mismatch', mpesa_receipt: mpesaReceipt, notes: `Amount mismatch. Expected: ${orderStoredKesAmount}, Received: ${callbackReceivedKesAmount}. ${notesForUpdate||''}`.trim() }).eq('ref_code', serverSideReference);
      } else {
        await supabase.from('orders').update({ status: 'confirmed_server_stk', mpesa_receipt: mpesaReceipt, notes: notesForUpdate }).eq('ref_code', serverSideReference);
        await sendOrderNotification(order.item, serverSideReference, order.amount);
        console.log(`[${new Date().toISOString()}] DirectAPI CB: Order ${serverSideReference} status updated to confirmed_server_stk.`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] DirectAPI CB: Payment FAILED or PENDING for order ${serverSideReference}. ResultCode: ${ResultCode}, Desc: ${ResultDesc}, Status: ${paymentGatewayStatus}`);
      await supabase.from('orders').update({ status: `failed_stk_cb_${ResultCode || 'unknown'}`, mpesa_receipt: mpesaReceipt, notes: notesForUpdate }).eq('ref_code', serverSideReference);
    }

    res.status(200).json({ success: true, message: "Callback processed." });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] DirectAPI CB: Error processing:`, error.message, error.stack);
    res.status(500).json({ error: 'Internal server error processing callback' });
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
});

app.get('/virus.html', (req, res) => {
  const virusPath = path.join(__dirname, 'public', 'virus.html');
  if (fs.existsSync(virusPath)) {
    res.sendFile(virusPath);
  } else {
    res.status(404).send('virus.html not found');
  }
});

app.get('/:slug', async (req, res) => {
  const slug = `/${req.params.slug}`;
  // Serve index.html for any top-level slug that isn't an API route or known file,
  // letting client-side routing handle it if it's a page defined in staticPages.
  // This prevents direct loading of static page content outside the modal.
  if (staticPages.some(p => p.slug === slug && p.slug !== '/payment-modal' && p.slug !== '/ref-code-modal')) {
      // If you want to render static pages server-side directly at their slug, implement that here.
      // For now, redirecting to root to let client handle via modals or show products.
      // Or, send index.html and let client JS figure out it's a static page from URL.
      // For simplicity with current setup, we'll let client handle via modals.
      // If you want true static pages at /slug URLs, this needs more advanced SSR or templating.
      console.log(`[${new Date().toISOString()}] Request for static page slug ${slug}, serving index.html for client-side handling.`);
      res.sendFile(path.join(publicPath, 'index.html'));
      return;
  }
  // Fallback for other slugs to also serve index.html (for client-side routing if any)
  // or handle as 404 if preferred.
  console.log(`[${new Date().toISOString()}] Unhandled slug ${slug}, serving index.html.`);
  res.sendFile(path.join(publicPath, 'index.html'));
});


async function initialize() {
  await selfCheck(); // Basic checks
  await loadData();   // Initial data load
  await deleteOldOrders(); // Initial cleanup
  setInterval(deleteOldOrders, 24 * 60 * 60 * 1000); // Daily cleanup
  setInterval(refreshCache, 15 * 60 * 1000); // Refresh cache every 15 mins
}

initialize().catch(error => {
  console.error(`[${new Date().toISOString()}] Server initialization failed:`, error.message);
  process.exit(1);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
