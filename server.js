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
    adminEmail: '',
    adminPassword: ''
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
      price: parseFloat(row.price),
      // price_kes removed as it's not in the products table schema
      name: row.name,
      desc: row.description || '', // Map DB 'description' to 'desc' for cache
      img: row.image || 'https://via.placeholder.com/300', // Map DB 'image' to 'img' for cache
      category: row.category || 'General',
      embed: row.embed || '',
      isNew: row.is_new || false, // Map DB 'is_new' to 'isNew' for cache
      isArchived: row.is_archived || false // Map DB 'is_archived' to 'isArchived' for cache
    })) || [];

    const settingsRes = await supabase.from('settings').select('key, value');
    const settingsData = Object.fromEntries(settingsRes.data?.map(row => [row.key, row.value]) || []);

    let loadedSettings = {
        supportEmail: 'kaylie254.business@gmail.com',
        copyrightText: '© 2025 Deriv Bot Store',
        logoUrl: '',
        socials: {},
        urgentMessage: { enabled: false, text: '' },
        fallbackRate: 130,
        adminEmail: '',
        adminPassword: '',
        mpesaTill: '4933614',
        payheroChannelId: process.env.PAYHERO_CHANNEL_ID || '2332',
        payheroPaymentUrl: process.env.PAYHERO_PAYMENT_URL || 'https://app.payhero.co.ke/lipwa/5',
        payheroAuthToken: process.env.PAYHERO_AUTH_TOKEN || 'Basic bXNxSmtaeTJVS1RkUXMySkgzeDE6S2R4dkJrT2FTRUhQWEJqQkNJT053OHZVQ0dKNWpNSXd4MHVwdkZLYg=='
    };

    for (const key in loadedSettings) {
        if (settingsData.hasOwnProperty(key)) {
            if (key === 'socials' || key === 'urgentMessage') {
                try {
                    loadedSettings[key] = JSON.parse(settingsData[key]);
                } catch (e) {
                    console.warn(`[${new Date().toISOString()}] Failed to parse JSON for setting ${key}:`, settingsData[key]);
                }
            } else if (key === 'fallbackRate') {
                loadedSettings[key] = parseFloat(settingsData[key]) || loadedSettings[key];
            } else {
                loadedSettings[key] = settingsData[key];
            }
        }
    }
    loadedSettings.socials = loadedSettings.socials || {};
    loadedSettings.urgentMessage = loadedSettings.urgentMessage || { enabled: false, text: '' };

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

    cachedData = { products, categories, settings: loadedSettings, staticPages };
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

async function saveDataToDatabase() {
  try {
    // Save Categories first due to FK constraint from products.category -> categories.name
    await supabase.from('categories').delete().neq('name', 'this_is_a_dummy_condition_to_delete_all');
    if (cachedData.categories.length > 0) {
      const categoriesToInsert = cachedData.categories.map(c => ({ name: c }));
      const { error: catError } = await supabase.from('categories').insert(categoriesToInsert);
      if (catError) {
          console.error(`[${new Date().toISOString()}] Error inserting categories:`, catError.message, catError.details);
          throw catError;
      }
      console.log(`[${new Date().toISOString()}] Categories saved to Supabase.`);
    } else {
      console.log(`[${new Date().toISOString()}] No categories to save to Supabase.`);
    }

    // Save Settings
    await supabase.from('settings').delete().neq('key', 'this_is_a_dummy_condition_to_delete_all');
    if (Object.keys(cachedData.settings).length > 0) {
        const settingsToInsert = Object.entries(cachedData.settings).map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
        const { error: settingsError } = await supabase.from('settings').insert(settingsToInsert);
        if (settingsError) {
            console.error(`[${new Date().toISOString()}] Error inserting settings:`, settingsError.message, settingsError.details);
            throw settingsError;
        }
        console.log(`[${new Date().toISOString()}] Settings saved to Supabase.`);
    } else {
        console.log(`[${new Date().toISOString()}] No settings to save to Supabase.`);
    }


    // Save Static Pages
    await supabase.from('static_pages').delete().neq('slug', 'this_is_a_dummy_condition_to_delete_all');
    if (cachedData.staticPages.length > 0) {
      const pagesToInsert = cachedData.staticPages.map(page => ({
          title: page.title, slug: page.slug, content: page.content
      }));
      const { error: pagesError } = await supabase.from('static_pages').insert(pagesToInsert);
      if (pagesError) {
          console.error(`[${new Date().toISOString()}] Error inserting static pages:`, pagesError.message, pagesError.details);
          throw pagesError;
      }
      console.log(`[${new Date().toISOString()}] Static pages saved to Supabase.`);
    } else {
      console.log(`[${new Date().toISOString()}] No static pages to save to Supabase.`);
    }

    // Save Products (depends on categories being present)
    const { data: existingProductsDb, error: fetchError } = await supabase
      .from('products')
      .select('item, file_id, original_file_name');
    if (fetchError) throw fetchError;
    const existingProductsMap = new Map(existingProductsDb.map(p => [p.item, p]));

    const productsToUpsert = cachedData.products.map(p => {
      const existing = existingProductsMap.get(p.item);
      // This mapping must EXACTLY match your Supabase 'products' table column names
      return {
        item: p.item, // PK
        file_id: p.fileId || existing?.file_id,
        original_file_name: p.originalFileName || existing?.original_file_name,
        price: parseFloat(p.price) || 0,
        // price_kes removed
        name: p.name,
        description: p.desc, // DB column is 'description'
        image: p.img,       // DB column is 'image'
        category: p.category,
        embed: p.embed,
        is_new: typeof p.isNew === 'boolean' ? p.isNew : String(p.isNew).toLowerCase() === 'true',
        is_archived: typeof p.isArchived === 'boolean' ? p.isArchived : String(p.isArchived).toLowerCase() === 'true'
        // created_at is managed by DB default on insert, and should not be updated manually here
        // unless specifically intended (which is not the case for general upserts).
      };
    });

    if (productsToUpsert.length > 0) {
        for (const product of productsToUpsert) {
          const { error: upsertError } = await supabase.from('products').upsert(product, { onConflict: 'item' });
          if (upsertError) {
              console.error(`[${new Date().toISOString()}] Error upserting product ${product.item}:`, upsertError.message, upsertError.details);
              throw upsertError;
          }
        }
        console.log(`[${new Date().toISOString()}] ${productsToUpsert.length} products upserted to Supabase.`);
    } else {
        console.log(`[${new Date().toISOString()}] No products to upsert in this saveDataToDatabase call.`);
    }
    const currentProductItems = new Set(cachedData.products.map(p => p.item));
    const productsToDelete = existingProductsDb.filter(p => !currentProductItems.has(p.item));
    if (productsToDelete.length > 0) {
      await supabase.from('products').delete().in('item', productsToDelete.map(p => p.item));
    }

    // Save Settings
    await supabase.from('settings').delete().neq('key', 'this_is_a_dummy_condition_to_delete_all');
    const settingsToInsert = Object.entries(cachedData.settings).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
    await supabase.from('settings').insert(settingsToInsert);

    // Save Categories
    await supabase.from('categories').delete().neq('name', 'this_is_a_dummy_condition_to_delete_all');
    if (cachedData.categories.length > 0) {
      await supabase.from('categories').insert(cachedData.categories.map(c => ({ name: c })));
    }

    // Save Static Pages
    await supabase.from('static_pages').delete().neq('slug', 'this_is_a_dummy_condition_to_delete_all');
    if (cachedData.staticPages.length > 0) {
      await supabase.from('static_pages').insert(cachedData.staticPages.map(page => ({
          title: page.title, slug: page.slug, content: page.content
      })));
    }

    console.log(`[${new Date().toISOString()}] All data successfully saved to Supabase via saveDataToDatabase()`);
    await loadData();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in saveDataToDatabase:`, error.message, error.stack);
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
    console.log(`[${new Date().toISOString()}] Received payload for /api/save-data:`, JSON.stringify(req.body, null, 2));
    let overallDataChanged = false; // Flag to track if any part of cachedData changed

    // Handle Products: Merge updates or replace if a full list is sent.
    // This assumes `virus.html` sends product updates within an array `req.body.products`.
    // If `req.body.products` is intended to be a complete replacement:
    if (req.body.hasOwnProperty('products') && Array.isArray(req.body.products)) {
        console.log(`[${new Date().toISOString()}] Processing products update...`);
        // Create a map of existing products for efficient lookup and update
        const productCacheMap = new Map(cachedData.products.map(p => [p.item, p]));
        let productsChangedThisSave = false;

        req.body.products.forEach(incomingProduct => {
            const existingProduct = productCacheMap.get(incomingProduct.item);
            const productDataForCache = {
                item: incomingProduct.item,
                fileId: incomingProduct.fileId || existingProduct?.fileId,
                originalFileName: incomingProduct.originalFileName || existingProduct?.originalFileName,
                price: parseFloat(incomingProduct.price) || 0,
                price_kes: incomingProduct.price_kes ? parseFloat(incomingProduct.price_kes) : null,
                name: incomingProduct.name,
                desc: incomingProduct.desc,
                img: incomingProduct.img,
                category: incomingProduct.category,
                embed: incomingProduct.embed,
                isNew: incomingProduct.isNew === true || String(incomingProduct.isNew).toLowerCase() === 'true',
                isArchived: incomingProduct.isArchived === true || String(incomingProduct.isArchived).toLowerCase() === 'true'
            };

            if (existingProduct) {
                // Update existing product in map
                productCacheMap.set(incomingProduct.item, { ...existingProduct, ...productDataForCache });
            } else {
                // Add new product to map
                productCacheMap.set(incomingProduct.item, productDataForCache);
            }
            productsChangedThisSave = true; // Assume change if products array is processed
        });

        // If the admin panel sends the *entire* list of products every time it saves one product,
        // then simply replacing cachedData.products is fine.
        // If it sends only *changed/new* products, we need a more careful merge or rely on item IDs.
        // The current logic using productCacheMap aims to merge/update.
        // Convert map back to array
        cachedData.products = Array.from(productCacheMap.values());
        if(productsChangedThisSave) overallDataChanged = true;
        console.log(`[${new Date().toISOString()}] Products data updated in cache. Total products: ${cachedData.products.length}`);
    }


    // Handle Categories: Assume req.body.categories is the full new list
    if (req.body.hasOwnProperty('categories') && Array.isArray(req.body.categories)) {
        if (JSON.stringify(cachedData.categories) !== JSON.stringify(req.body.categories)) {
            cachedData.categories = [...new Set(req.body.categories)];
            overallDataChanged = true;
            console.log(`[${new Date().toISOString()}] Categories data updated in cache.`);
        }
    }

    // Handle Static Pages: Assume req.body.staticPages is the full new list
    if (req.body.hasOwnProperty('staticPages') && Array.isArray(req.body.staticPages)) {
         if (JSON.stringify(cachedData.staticPages) !== JSON.stringify(req.body.staticPages)) {
            cachedData.staticPages = req.body.staticPages;
            overallDataChanged = true;
            console.log(`[${new Date().toISOString()}] Static pages data updated in cache.`);
        }
    }

    // Handle Settings (granular updates)
    if (req.body.settings && typeof req.body.settings === 'object') {
        const newSettingsRequest = req.body.settings;
        let settingsValuesChangedInThisRequest = false;

        // Explicitly handle adminPassword first
        if (newSettingsRequest.hasOwnProperty('adminPassword')) {
            const newPassword = newSettingsRequest.adminPassword;
            if (typeof newPassword === 'string' && newPassword.trim() !== '') {
                const saltRounds = 10;
                const newPasswordHash = await bcrypt.hash(newPassword.trim(), saltRounds);
                if (newPasswordHash !== cachedData.settings.adminPassword) {
                    cachedData.settings.adminPassword = newPasswordHash;
                    settingsValuesChangedInThisRequest = true;
                    overallDataChanged = true; // Mark overall change
                    console.log(`[${new Date().toISOString()}] Admin password has been updated.`);
                }
            } else if (newPassword === '') { // Explicitly empty password sent
                console.log(`[${new Date().toISOString()}] Admin password field was sent as an empty string; password NOT updated.`);
                // Do nothing, retain existing hash
            }
            // If adminPassword is not in newSettingsRequest, it's not touched.
        }

        const updatableSimpleSettings = [
            'supportEmail', 'copyrightText', 'logoUrl',
            'fallbackRate', 'mpesaTill',
            'payheroChannelId', 'payheroAuthToken', 'payheroPaymentUrl',
            'adminEmail' // adminEmail can be updated like any other simple setting
        ];

        for (const key of updatableSimpleSettings) {
            if (newSettingsRequest.hasOwnProperty(key)) {
                let newValue = newSettingsRequest[key];
                if (key === 'fallbackRate') {
                    const parsedRate = parseFloat(newValue);
                    // Use existing if new value is NaN, otherwise use new value (even if it's null/empty string from form)
                    newValue = isNaN(parsedRate) ? cachedData.settings.fallbackRate : (parsedRate);
                }

                if (newValue !== cachedData.settings[key]) {
                    cachedData.settings[key] = newValue;
                    settingsValuesChangedInThisRequest = true;
                    overallDataChanged = true; // Mark overall change
                    console.log(`[${new Date().toISOString()}] Setting updated: ${key} = ${newValue}`);
                }
            }
        }

        if (newSettingsRequest.hasOwnProperty('socials')) {
            if (typeof newSettingsRequest.socials === 'object' && JSON.stringify(newSettingsRequest.socials) !== JSON.stringify(cachedData.settings.socials)) {
                cachedData.settings.socials = newSettingsRequest.socials;
                settingsValuesChangedInThisRequest = true;
                overallDataChanged = true; // Mark overall change
                console.log(`[${new Date().toISOString()}] Socials settings updated.`);
            } else if (typeof newSettingsRequest.socials !== 'object') {
                console.warn(`[${new Date().toISOString()}] Received non-object for socials settings, ignoring.`);
            }
        }

        if (newSettingsRequest.hasOwnProperty('urgentMessage')) {
            if (typeof newSettingsRequest.urgentMessage === 'object' && JSON.stringify(newSettingsRequest.urgentMessage) !== JSON.stringify(cachedData.settings.urgentMessage)) {
                cachedData.settings.urgentMessage = newSettingsRequest.urgentMessage;
                settingsValuesChangedInThisRequest = true;
                overallDataChanged = true; // Mark overall change
                console.log(`[${new Date().toISOString()}] Urgent message settings updated.`);
            } else if (typeof newSettingsRequest.urgentMessage !== 'object') {
                console.warn(`[${new Date().toISOString()}] Received non-object for urgentMessage settings, ignoring.`);
            }
        }

        if (!settingsValuesChangedInThisRequest && Object.keys(newSettingsRequest).length > 0) {
            console.log(`[${new Date().toISOString()}] Settings were provided in request, but no individual setting values differed from current cache for this specific save operation.`);
        }
    }

    if (overallDataChanged) {
        await saveDataToDatabase();
        res.json({ success: true, message: "Data saved successfully." });
        console.log(`[${new Date().toISOString()}] Data saved successfully via /api/save-data due to detected changes.`);
    } else {
        res.json({ success: true, message: "No changes detected in the provided data to save." });
        console.log(`[${new Date().toISOString()}] /api/save-data called, but no data changed in cache; DB save skipped.`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/save-data route:`, error.message, error.stack);
    // Check if the error has a 'details' property, which Supabase errors often do
    const errorMessage = error.details ? `${error.message} - ${error.details}` : error.message;
    res.status(500).json({ success: false, error: `Failed to save data: ${errorMessage}` });
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

    const productData = { // This is for cachedData
      item,
      fileId: fileId, // from upload
      originalFileName: originalFileName, // from upload
      price: parseFloat(price) || 0,
      price_kes: price_kes ? parseFloat(price_kes) : null,
      name,
      desc, // field name in cachedData
      img,  // field name in cachedData
      category,
      embed,
      isNew: isNew === 'true' || isNew === true,
      isArchived: false
    };

    // Directly insert into DB, then update cache via loadData()
    // DB schema mapping:
    const productForDB = {
        item: productData.item,
        file_id: productData.fileId,
        original_file_name: productData.originalFileName,
        price: productData.price,
        // price_kes removed as it's not in the DB schema for products
        name: productData.name,
        description: productData.desc,
        image: productData.img,
        category: productData.category,
        embed: productData.embed,
        is_new: productData.isNew,
        is_archived: productData.isArchived
        // created_at will be set by DB default
    };

    const { error: insertError } = await supabase.from('products').insert(productForDB);
    if (insertError) {
        console.error(`[${new Date().toISOString()}] Error inserting new bot into DB:`, insertError.message, insertError.details);
        // Attempt to delete the orphaned file from storage
        if (productData.fileId) {
            await supabase.storage.from('bots').remove([productData.fileId]);
            console.log(`[${new Date().toISOString()}] Orphaned file ${productData.fileId} deleted from storage due to DB insert failure.`);
        }
        throw insertError; // This will be caught by the main catch block
    }

    await loadData(); // Refresh cache after successful DB operation
    // The productData for the response should reflect the structure in cachedData,
    // which might differ slightly from productForDB (e.g. desc vs description).
    // loadData() populates cachedData correctly, so find the newly added product from there.
    const newProductInCache = cachedData.products.find(p => p.item === productData.item);
    res.json({ success: true, product: newProductInCache || productData });
    console.log(`[${new Date().toISOString()}] Bot added successfully: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding bot:`, error.message, error.stack);
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
    await loadData();
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
      to: process.env.EMAIL_USER,
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
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
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

    await supabase.from('orders').insert({
        item, 
        ref_code: refCode, 
        amount: parseFloat(amount),
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
    } else if (!status.startsWith('confirmed')) {
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
    if (!validStatuses.some(s => status.startsWith(s))) {
        if (!status.startsWith('failed_stk_cb_')) {
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

app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.fileId, 60);
    if (urlError) throw urlError;
    const downloadLink = signedUrlData.signedUrl;

    console.log(`[${new Date().toISOString()}] Admin manually confirmed order for item: ${item}, ref: ${refCode}`);
    res.json({ success: true, downloadLink });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});


app.post('/deliver-bot', async (req, res) => {
  try {
    const { item, price, payment_method } = req.body;
    if (!item || typeof price === 'undefined' || !payment_method) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    if (parseFloat(price) !== parseFloat(product.price)) {
      return res.status(400).json({ success: false, error: 'Invalid price for test mode' });
    }

    if (!product.fileId) {
        return res.status(500).json({success: false, error: 'Product file ID missing'});
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.fileId, 60 * 5);
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

app.post('/api/initiate-server-stk-push', rateLimit, async (req, res) => {
  try {
    const { item, amount_kes, phone, customerName, used_exchange_rate } = req.body;

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
    let rateUsedForVerification = null;

    if (product.price_kes) {
        expectedServerKesPrice = Math.round(parseFloat(product.price_kes));
        rateUsedForVerification = 'N/A (Direct KES price used)';
    } else if (used_exchange_rate && !isNaN(parseFloat(used_exchange_rate)) && parseFloat(used_exchange_rate) > 0) {
        rateUsedForVerification = parseFloat(used_exchange_rate);
        expectedServerKesPrice = Math.round(parseFloat(product.price) * rateUsedForVerification);
        console.log(`[${new Date().toISOString()}] ServerSTK: Using client-provided exchange rate for verification: ${rateUsedForVerification}`);
    } else {
        rateUsedForVerification = cachedData.settings.fallbackRate || 130;
        expectedServerKesPrice = Math.round(parseFloat(product.price) * rateUsedForVerification);
        console.warn(`[${new Date().toISOString()}] ServerSTK: Client did not provide a valid exchange rate. Falling back to server rate: ${rateUsedForVerification} for item ${item}.`);
    }

    if (clientReportedKesAmount !== expectedServerKesPrice) {
        console.error(`[${new Date().toISOString()}] ServerSTK: Amount mismatch for item ${item}. Client KES: ${clientReportedKesAmount}, Server Expected KES: ${expectedServerKesPrice}. Product USD Price: ${product.price}, Product KES Price: ${product.price_kes}, Rate Used for Verification: ${rateUsedForVerification}`);
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
      payment_method: 'payhero_server_stk'
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

    const mpesaReceiptIfAvailable = MpesaReceiptNumber || null;
    const notesForUpdate = ResultDesc || (paymentGatewayStatus !== "Success" ? paymentGatewayStatus : null);

    let updatePayload = {
        status: '',
        notes: notesForUpdate
    };

    if (overallCallbackStatus === true && ResultCode === 0 && paymentGatewayStatus === "Success") {
      console.log(`[${new Date().toISOString()}] DirectAPI CB: Payment SUCCEEDED for order ${serverSideReference}. Amount: ${Amount}, Receipt: ${mpesaReceiptIfAvailable}`);

      const orderStoredKesAmount = Math.round(parseFloat(order.amount));
      const callbackReceivedKesAmount = Math.round(parseFloat(Amount));

      if (orderStoredKesAmount !== callbackReceivedKesAmount) {
        console.warn(`[${new Date().toISOString()}] DirectAPI CB: Amount mismatch for order ${serverSideReference}. Order KES: ${orderStoredKesAmount}, PayHero CB KES: ${callbackReceivedKesAmount}. Updating to 'failed_amount_mismatch'.`);
        updatePayload.status = 'failed_amount_mismatch';
        updatePayload.notes = `Amount mismatch. Expected: ${orderStoredKesAmount}, Received: ${callbackReceivedKesAmount}. Original Note: ${notesForUpdate||''}`.trim();
      } else {
        updatePayload.status = 'confirmed_server_stk';
        await sendOrderNotification(order.item, serverSideReference, order.amount);
        console.log(`[${new Date().toISOString()}] DirectAPI CB: Order ${serverSideReference} status updated to confirmed_server_stk.`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] DirectAPI CB: Payment FAILED or PENDING for order ${serverSideReference}. ResultCode: ${ResultCode}, Desc: ${ResultDesc}, Status: ${paymentGatewayStatus}`);
      updatePayload.status = `failed_stk_cb_${ResultCode || 'unknown'}`;

      if (ResultCode === 1) {
        updatePayload.status = 'failed_stk_insufficient_funds';
      } else if (ResultCode === 1032) {
        updatePayload.status = 'failed_stk_cancelled_by_user';
      } else if (ResultCode === 1037) {
        updatePayload.status = 'failed_stk_timeout';
      } else if (ResultCode === 2001) {
        updatePayload.status = 'failed_stk_invalid_pin';
      }
      console.log(`[${new Date().toISOString()}] DirectAPI CB: Order ${serverSideReference} final failure status: ${updatePayload.status}`);
    }

    await supabase.from('orders').update(updatePayload).eq('ref_code', serverSideReference);
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
  if (cachedData.staticPages.some(p => p.slug === slug && p.slug !== '/payment-modal' && p.slug !== '/ref-code-modal')) {
      console.log(`[${new Date().toISOString()}] Request for static page slug ${slug}, serving index.html for client-side handling.`);
      res.sendFile(path.join(publicPath, 'index.html'));
      return;
  }
  console.log(`[${new Date().toISOString()}] Unhandled slug ${slug}, serving index.html.`);
  res.sendFile(path.join(publicPath, 'index.html'));
});


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
