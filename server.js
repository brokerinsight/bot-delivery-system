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
const UpstashSessionStore = require('./upstash-session-store');
const { redisClient } = require('./redis-client');

dotenv.config();

// Validate critical environment variables
const requiredEnvVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value.startsWith('your-'))
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(`[${new Date().toISOString()}] ❌ Missing or invalid environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`[${new Date().toISOString()}] Please configure these variables in your .env file`);
  console.error(`[${new Date().toISOString()}] Server cannot start without proper database configuration`);
  process.exit(1);
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_ORIGINS = [
  'https://botblitz-dev.onrender.com',
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
  store: new UpstashSessionStore({ 
    client: redisClient,
    ttl: 86400 // 24 hours
  }),
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
  next();
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let isServerInitialized = false;

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
    console.log(`[${new Date().toISOString()}] Starting loadData from Supabase...`);
    
    const productRes = await supabase
      .from('products')
      .select('*')
      .order('is_new', { ascending: false })
      .order('created_at', { ascending: false })
      .order('item', { ascending: true });

    if (productRes.error) {
      throw new Error(`Supabase products query failed: ${productRes.error.message}`);
    }

    const products = productRes.data?.map(row => ({
      item: row.item,
      fileId: row.file_id,
      originalFileName: row.original_file_name,
      price: parseFloat(row.price),
      name: row.name,
      desc: row.description || '', // Map DB 'description' to 'desc' for cache
      img: row.image || 'https://via.placeholder.com/300', // Map DB 'image' to 'img' for cache
      category: row.category || 'General',
      embed: row.embed || '',
      isNew: row.is_new || false, // Map DB 'is_new' to 'isNew' for cache
      isArchived: row.is_archived || false, // Map DB 'is_archived' to 'isArchived' for cache
      discount_percentage: row.discount_percentage,
      discount_expires_at: row.discount_expires_at
    })) || [];

    // Clean up expired discounts
    const now = new Date();
    const expiredDiscountsToUpdate = [];
    for (const product of products) {
        if (product.discount_percentage && product.discount_expires_at) {
            const expiresAt = new Date(product.discount_expires_at);
            if (expiresAt <= now) {
                expiredDiscountsToUpdate.push(product.item);
                product.discount_percentage = null;
                product.discount_expires_at = null;
            }
        }
    }

    if (expiredDiscountsToUpdate.length > 0) {
        console.log(`[${new Date().toISOString()}] Found ${expiredDiscountsToUpdate.length} expired discounts. Updating database...`);
        const { error: updateError } = await supabase
            .from('products')
            .update({ discount_percentage: null, discount_expires_at: null })
            .in('item', expiredDiscountsToUpdate);

        if (updateError) {
            console.error(`[${new Date().toISOString()}] Error updating expired discounts:`, updateError.message);
        } else {
            console.log(`[${new Date().toISOString()}] Successfully updated expired discounts in the database.`);
            // Also remove from Redis, just in case
            for (const item of expiredDiscountsToUpdate) {
                await redisClient.del(`discount:${item}`);
            }
        }
    }

    const settingsRes = await supabase.from('settings').select('key, value');
    if (settingsRes.error) {
      throw new Error(`Supabase settings query failed: ${settingsRes.error.message}`);
    }
    const dbSettingsRaw = settingsRes.data || [];
    const settingsData = Object.fromEntries(dbSettingsRaw.map(row => [row.key, row.value]));

    // Define default values for all settings, including the new activePaymentOptions
    let defaultSettings = {
        supportEmail: 'kaylie254.business@gmail.com',
        copyrightText: '© 2025 Deriv Bot Store',
        logoUrl: '',
        socials: {}, // Will be stored as JSON string
        urgentMessage: { enabled: false, text: '' }, // Will be stored as JSON string
        fallbackRate: 130,
        adminEmail: '',
        adminPassword: '', // Will be hashed if set
        mpesaTill: '4933614',
        payheroChannelId: process.env.PAYHERO_CHANNEL_ID || '2332',
        payheroPaymentUrl: process.env.PAYHERO_PAYMENT_URL || 'https://app.payhero.co.ke/lipwa/5',
        payheroAuthToken: process.env.PAYHERO_AUTH_TOKEN || 'Basic bXNxSmtaeTJVS1RkUXMySkgzeDE6S2R4dkJrT2FTRUhQWEJqQkNJT053OHZVQ0dKNWpNSXd4MHVwdkZLYg==',
        activePaymentOptions: { mpesa_manual: true, mpesa_payhero: true, crypto_nowpayments: true } // Default, will be stored as JSON string
    };

    let loadedSettings = {};

    // Load settings from DB, falling back to defaults if not found or parsing fails
    for (const key in defaultSettings) {
        if (settingsData.hasOwnProperty(key)) {
            const dbValue = settingsData[key];
            if (key === 'socials' || key === 'urgentMessage' || key === 'activePaymentOptions') {
                try {
                    loadedSettings[key] = JSON.parse(dbValue);
                } catch (e) {
                    console.warn(`[${new Date().toISOString()}] Failed to parse JSON for setting '${key}' from DB: "${dbValue}". Using default.`);
                    loadedSettings[key] = defaultSettings[key];
                }
            } else if (key === 'fallbackRate') {
                const parsedRate = parseFloat(dbValue);
                loadedSettings[key] = isNaN(parsedRate) ? defaultSettings[key] : parsedRate;
            } else {
                loadedSettings[key] = dbValue; // For strings like emails, passwords (hashes), URLs, etc.
            }
        } else {
            // Setting not found in DB, use default
            loadedSettings[key] = defaultSettings[key];
            if (key === 'adminPassword' && !settingsData.hasOwnProperty('adminPassword')) { // Special handling for initial admin password
                 // If adminPassword is not in DB at all (e.g. fresh setup), and a default is set in .env, hash it.
                 // However, the current defaultSettings.adminPassword is '', so this block may not be strictly needed
                 // unless process.env.ADMIN_PASSWORD_DEFAULT is used here.
                 // For now, if not in DB, it remains empty or uses a pre-hashed value if one was ever set.
            }
        }
    }
    // Ensure complex types have their default structure if parsing failed or key was missing
    loadedSettings.socials = loadedSettings.socials || defaultSettings.socials;
    loadedSettings.urgentMessage = loadedSettings.urgentMessage || defaultSettings.urgentMessage;
    loadedSettings.activePaymentOptions = loadedSettings.activePaymentOptions || defaultSettings.activePaymentOptions;


    // Check if any default settings were used because they were missing from the DB, and if so, save them.
    // This ensures that on first startup with new settings, they get persisted.
    let mustSaveDefaults = false;
    for (const key in defaultSettings) {
        if (!settingsData.hasOwnProperty(key)) {
            mustSaveDefaults = true;
            console.log(`[${new Date().toISOString()}] Setting '${key}' not found in DB, will be initialized with default.`);
        } else if ((key === 'socials' || key === 'urgentMessage' || key === 'activePaymentOptions') && typeof loadedSettings[key] !== typeof defaultSettings[key]) {
            // This case handles if DB had a value that couldn't be parsed, and we fell back to default type.
            // This is a bit broad, could be refined. The main goal is to save if a key was entirely missing.
            try { JSON.parse(settingsData[key]); } catch (e) { mustSaveDefaults = true; }
        }
    }

    if (mustSaveDefaults) {
        console.log(`[${new Date().toISOString()}] Initializing missing settings in the database with default values...`);
        const settingsToInsert = [];
        for (const key in loadedSettings) {
            // Only add settings to insert if they were missing or defaulted due to parse error.
            // A simpler approach for initialization: just save all loadedSettings if mustSaveDefaults is true.
            // This ensures that all settings (including newly added ones like activePaymentOptions)
            // are written to the DB with their default or loaded values if any were missing.
             settingsToInsert.push({
                key,
                value: (typeof loadedSettings[key] === 'object') ? JSON.stringify(loadedSettings[key]) : String(loadedSettings[key])
            });
        }
        if (settingsToInsert.length > 0) {
            // Use upsert to be safe, though insert should work if keys are truly missing.
            // The main saveDataToDatabase clears all settings first, so this direct upsert/insert
            // during loadData is specifically for initializing defaults if the table was empty or missing keys.
            const { error: initSettingsError } = await supabase.from('settings').upsert(settingsToInsert, { onConflict: 'key' });
            if (initSettingsError) {
                console.error(`[${new Date().toISOString()}] Failed to initialize default settings in DB:`, initSettingsError.message);
            } else {
                console.log(`[${new Date().toISOString()}] Default settings initialized in DB.`);
            }
        }
    }

    const categoriesRes = await supabase.from('categories').select('name');
    if (categoriesRes.error) {
      console.warn(`[${new Date().toISOString()}] Supabase categories query failed: ${categoriesRes.error.message}`);
    }
    const categories = [...new Set(categoriesRes.data?.map(row => row.name) || ['General'])];

    const pagesRes = await supabase.from('static_pages').select('*');
    if (pagesRes.error) {
      throw new Error(`Supabase static_pages query failed: ${pagesRes.error.message}`);
    }
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
    
    // Ensure proper serialization for Redis storage
    try {
      const serializedData = JSON.stringify(cachedData);
      await redisClient.set('cachedData', serializedData, { EX: 900 });
      console.log(`[${new Date().toISOString()}] Data loaded successfully from Supabase and cached in Redis`);
    } catch (cacheError) {
      console.error(`[${new Date().toISOString()}] Failed to cache data in Redis:`, cacheError.message);
      console.log(`[${new Date().toISOString()}] Data loaded successfully from Supabase (Redis caching failed)`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading data:`, error.message);
    throw error;
  }
}

async function refreshCache() {
  try {
    const cached = await redisClient.get('cachedData');
    if (cached) {
      try {
        // Validate cached data before parsing
        if (typeof cached === 'string') {
          cachedData = JSON.parse(cached);
          console.log(`[${new Date().toISOString()}] Cache refreshed from Redis`);
        } else if (typeof cached === 'object' && cached !== null) {
          cachedData = cached;
          console.log(`[${new Date().toISOString()}] Cache refreshed from Redis (object format)`);
        } else {
          throw new Error(`Invalid cached data type: ${typeof cached}`);
        }
      } catch (parseError) {
        console.error(`[${new Date().toISOString()}] Error parsing cached data during refresh:`, parseError.message);
        // If cache is corrupted, clear it and reload from Supabase
        await redisClient.del('cachedData');
        await loadData();
        console.log(`[${new Date().toISOString()}] Cache refreshed from Supabase due to parsing error`);
      }
    } else {
      await loadData();
      console.log(`[${new Date().toISOString()}] Cache refreshed from Supabase and stored in Redis`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error refreshing cache:`, error.message);
  }
}

async function saveDataToDatabase(tasks = {}) {
  try {
    if (tasks.categories) {
      console.log(`[${new Date().toISOString()}] Saving categories...`);
      const { data: dbCategories, error: fetchCatError } = await supabase.from('categories').select('name');
      if (fetchCatError) throw fetchCatError;
      const dbCategoryNames = new Set(dbCategories.map(c => c.name));
      const cachedCategoryNames = new Set(cachedData.categories.filter(c => typeof c === 'string' && c.trim() !== ''));

      const categoriesToInsert = [...cachedCategoryNames].filter(name => !dbCategoryNames.has(name)).map(name => ({ name }));
      const categoriesToDelete = [...dbCategoryNames].filter(name => !cachedCategoryNames.has(name));

      if (categoriesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('categories').insert(categoriesToInsert);
        if (insertError) throw insertError;
        console.log(`[${new Date().toISOString()}] Inserted categories:`, categoriesToInsert.map(c=>c.name));
      }
      if (categoriesToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('categories').delete().in('name', categoriesToDelete);
        if (deleteError) throw deleteError;
        console.log(`[${new Date().toISOString()}] Deleted categories:`, categoriesToDelete);
      }
      console.log(`[${new Date().toISOString()}] Categories saved to Supabase.`);
    }

    if (tasks.settings) {
      console.log(`[${new Date().toISOString()}] Saving settings...`);
      await supabase.from('settings').delete().neq('key', 'this_is_a_dummy_condition_to_delete_all'); // Clear all existing
      if (Object.keys(cachedData.settings).length > 0) {
        const settingsToInsert = Object.entries(cachedData.settings).map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
        const { error: settingsError } = await supabase.from('settings').insert(settingsToInsert);
        if (settingsError) throw settingsError;
      }
      console.log(`[${new Date().toISOString()}] Settings saved to Supabase.`);
    }

    if (tasks.staticPages) {
      console.log(`[${new Date().toISOString()}] Saving static pages...`);
      // Upsert logic for static pages (based on slug as PK)
      if (cachedData.staticPages.length > 0) {
        const pagesToUpsert = cachedData.staticPages.map(page => ({
            title: page.title, slug: page.slug, content: page.content
        }));
        const { error: pagesError } = await supabase.from('static_pages').upsert(pagesToUpsert, { onConflict: 'slug' });
        if (pagesError) throw pagesError;
      }
      // Delete pages that are in DB but not in cache anymore
      const { data: dbPages, error: fetchPagesError } = await supabase.from('static_pages').select('slug');
      if (fetchPagesError) throw fetchPagesError;
      const dbPageSlugs = new Set(dbPages.map(p => p.slug));
      const cachedPageSlugs = new Set(cachedData.staticPages.map(p => p.slug));
      const pagesToDelete = [...dbPageSlugs].filter(slug => !cachedPageSlugs.has(slug));
      if (pagesToDelete.length > 0) {
        const { error: deletePagesError } = await supabase.from('static_pages').delete().in('slug', pagesToDelete);
        if (deletePagesError) throw deletePagesError;
        console.log(`[${new Date().toISOString()}] Deleted static pages:`, pagesToDelete);
      }
      console.log(`[${new Date().toISOString()}] Static pages saved to Supabase.`);
    }

    if (tasks.products) {
      console.log(`[${new Date().toISOString()}] Saving products...`);
      const productsToProcess = Array.isArray(tasks.products) ? tasks.products : cachedData.products;

      const { data: existingProductsDbData, error: fetchProdError } = await supabase
        .from('products')
        .select('item, file_id, original_file_name');
      if (fetchProdError) throw fetchProdError;
      const existingProductsMap = new Map(existingProductsDbData.map(p => [p.item, p]));

      const productsToUpsert = productsToProcess.map(productBeingProcessed => {
        // productBeingProcessed is from client if tasks.products is an array, or from cachedData otherwise.
        // It might have an .originalItem property if client sent it (for ID changes).
        const itemForDbLookup = productBeingProcessed.originalItem && productBeingProcessed.originalItem !== productBeingProcessed.item
                               ? productBeingProcessed.originalItem
                               : productBeingProcessed.item;
        const existingDbProduct = existingProductsMap.get(itemForDbLookup);

        return {
          item: productBeingProcessed.item,
          file_id: productBeingProcessed.fileId || existingDbProduct?.file_id,
          original_file_name: productBeingProcessed.originalFileName || existingDbProduct?.original_file_name,
          price: parseFloat(productBeingProcessed.price) || 0,
          name: productBeingProcessed.name,
          description: productBeingProcessed.desc,
          image: productBeingProcessed.img,
          category: productBeingProcessed.category,
          embed: productBeingProcessed.embed,
          is_new: typeof productBeingProcessed.isNew === 'boolean' ? productBeingProcessed.isNew : String(productBeingProcessed.isNew).toLowerCase() === 'true',
          is_archived: typeof productBeingProcessed.isArchived === 'boolean' ? productBeingProcessed.isArchived : String(productBeingProcessed.isArchived).toLowerCase() === 'true',
          discount_percentage: productBeingProcessed.discount_percentage,
          discount_expires_at: productBeingProcessed.discount_expires_at,
          originalItem: productBeingProcessed.originalItem // Carry over originalItem if present
        };
      });

      if (productsToUpsert.length > 0) {
        for (const productDataToUpsert of productsToUpsert) { // Renamed loop variable
          const originalItemToDelete = productDataToUpsert.originalItem;

          if (originalItemToDelete && originalItemToDelete !== productDataToUpsert.item) {
            const { error: deleteOldError } = await supabase.from('products').delete().eq('item', originalItemToDelete);
            if (deleteOldError) {
                console.warn(`[${new Date().toISOString()}] Failed to delete old product record for item ${originalItemToDelete} during ID change: ${deleteOldError.message}`);
            } else {
                console.log(`[${new Date().toISOString()}] Deleted old product record for item ${originalItemToDelete} due to ID change to ${productDataToUpsert.item}`);
            }
          }

          // Remove originalItem before upserting as it's not a DB column
          const { originalItem, ...dbProductPayload } = productDataToUpsert;
          const { error: upsertError } = await supabase.from('products').upsert(dbProductPayload, { onConflict: 'item' });
          if (upsertError) {
            console.error(`[${new Date().toISOString()}] Error upserting product ${dbProductPayload.item}:`, upsertError.message, upsertError.details);
            throw upsertError;
          }

          // After successful upsert, update Redis for discount
          if (dbProductPayload.discount_percentage && dbProductPayload.discount_percentage > 0 && dbProductPayload.discount_expires_at) {
            const now = new Date();
            const expiresAt = new Date(dbProductPayload.discount_expires_at);
            if (expiresAt > now) {
              const ttl = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);
              await redisClient.set(`discount:${dbProductPayload.item}`, dbProductPayload.discount_percentage, { EX: ttl });
              console.log(`[${new Date().toISOString()}] Set discount for ${dbProductPayload.item} in Redis with TTL ${ttl}s`);
            } else {
              // Discount is already expired, ensure it's removed from Redis
              await redisClient.del(`discount:${dbProductPayload.item}`);
            }
          } else {
            // No discount or invalid discount, ensure it's removed from Redis
            await redisClient.del(`discount:${dbProductPayload.item}`);
            console.log(`[${new Date().toISOString()}] Removed discount for ${dbProductPayload.item} from Redis`);
          }
        }
        console.log(`[${new Date().toISOString()}] ${productsToUpsert.length} products processed (upserted/updated) in Supabase.`);
      } else {
        console.log(`[${new Date().toISOString()}] No products to upsert in this specific products task.`);
      }

      // If tasks.products was true (meaning a full sync was implied for products), then do deletions
      if (tasks.products === true) {
        const currentProductItems = new Set(cachedData.products.map(p => p.item));
        const productsStillInDbToDelete = existingProductsDb.filter(p => !currentProductItems.has(p.item));
        if (productsStillInDbToDelete.length > 0) {
          const {error: deleteError} = await supabase.from('products').delete().in('item', productsStillInDbToDelete.map(p => p.item));
          if(deleteError) throw deleteError;
          console.log(`[${new Date().toISOString()}] Deleted ${productsStillInDbToDelete.length} orphaned products from Supabase.`);
        }
      }
      console.log(`[${new Date().toISOString()}] Products saved to Supabase.`);
    }

    console.log(`[${new Date().toISOString()}] Specific data successfully saved to Supabase via saveDataToDatabase() for tasks:`, tasks);
    await loadData(); // Refresh cache from DB after all changes
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
    // Check connection to products table (existing check)
    const { data: productData, error: productError } = await supabase.from('products').select('item').limit(1);
    if (productError) throw productError;
    console.log(`[${new Date().toISOString()}] Successfully connected to Supabase database (checked products table).`);

    // The 'settings' table creation is now handled manually by the user.
    // We can still check if we can query it, as a basic health check.
    const { data: settingsData, error: settingsCheckError } = await supabase
      .from('settings')
      .select('key')
      .limit(1);

    if (settingsCheckError) {
      console.warn(`[${new Date().toISOString()}] Warning: Could not perform a basic check on the 'settings' table during self-check. This might be okay if the table is empty or if there's a transient issue. Error: ${settingsCheckError.message}. Ensure the table exists and is accessible.`);
      // Not throwing an error here, as the table might be legitimately empty.
      // loadData will handle initializing defaults if specific keys are missing.
    } else {
      console.log(`[${new Date().toISOString()}] Successfully performed a basic check on the 'settings' table.`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed Supabase self-check (after removing auto table creation):`, error.message);
    // Depending on the severity, you might want to prevent the server from starting
    // For now, just log the error.
  }
}

// Helper function to execute raw SQL (if not already available/used)
// Supabase client itself doesn't directly expose a raw SQL execution for DDL like CREATE TABLE IF NOT EXISTS
// in a simple way without using rpc. Let's define a helper if needed, or use rpc.
// For CREATE TABLE IF NOT EXISTS, using an RPC function in Supabase is a common way.
// Let's assume an RPC function `execute_sql` exists or can be created in Supabase dashboard:

function getFinalPrice(product) {
  if (!product) return 0;
  const now = new Date();
  const expiresAt = product.discount_expires_at ? new Date(product.discount_expires_at) : null;
  const hasActiveDiscount = product.discount_percentage > 0 && expiresAt && expiresAt > now;

  if (hasActiveDiscount) {
    return product.price * (1 - product.discount_percentage / 100);
  }
  return product.price;
}

async function getProductWithDiscount(productId) {
    const product = cachedData.products.find(p => p.item === productId);
    if (!product) {
        return { product: null, finalPrice: 0 };
    }
    const finalPrice = getFinalPrice(product);
    return { product, finalPrice };
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

app.get('/api/get-final-price/:item', async (req, res) => {
    const { item } = req.params;
    const { product, finalPrice } = await getProductWithDiscount(item);

    if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const exchangeRate = cachedData.settings.fallbackRate || 130;
    const finalKesPrice = Math.round(finalPrice * exchangeRate);

    res.json({
        success: true,
        item: product.item,
        finalUsdPrice: finalPrice,
        finalKesPrice: finalKesPrice,
        exchangeRate: exchangeRate
    });
});

app.get('/api/data', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] /api/data request received`);
    
    // Check if server is initialized
    if (!isServerInitialized) {
      console.log(`[${new Date().toISOString()}] Server still initializing, serving default cached data`);
      res.json(cachedData);
      return;
    }
    
    // Check if Redis client is ready
    if (!redisClient.isReady()) {
      console.log(`[${new Date().toISOString()}] Redis client not ready, serving cached data from memory`);
      res.json(cachedData);
      return;
    }
    
    const cached = await redisClient.get('cachedData');
    if (cached) {
      try {
        // Validate that cached is a string and not an object before parsing
        if (typeof cached === 'string') {
          cachedData = JSON.parse(cached);
          console.log(`[${new Date().toISOString()}] Served /api/data from Upstash Redis cache`);
        } else if (typeof cached === 'object' && cached !== null) {
          // If Redis returned an object directly (some Redis clients do this)
          cachedData = cached;
          console.log(`[${new Date().toISOString()}] Served /api/data from Upstash Redis cache (object format)`);
        } else {
          throw new Error(`Invalid cached data type: ${typeof cached}`);
        }
      } catch (parseError) {
        console.error(`[${new Date().toISOString()}] Error parsing cached data from Redis:`, parseError.message);
        console.error(`[${new Date().toISOString()}] Cached data type: ${typeof cached}, First 100 chars:`, String(cached).substring(0, 100));
        
        // Clear the corrupted cache and load fresh data
        await redisClient.del('cachedData');
        console.log(`[${new Date().toISOString()}] Cleared corrupted cache, loading fresh data from Supabase`);
        await loadData();
        console.log(`[${new Date().toISOString()}] Served /api/data from Supabase after cache corruption`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] No cached data in Redis, loading from Supabase`);
      await loadData();
      console.log(`[${new Date().toISOString()}] Served /api/data from Supabase and cached in Upstash Redis`);
    }
    res.json(cachedData);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error serving /api/data:`, error);
    console.error(`[${new Date().toISOString()}] Error stack:`, error.stack);
    res.status(500).json({ success: false, error: 'Failed to fetch data', details: error.message });
  }
});

app.post('/api/save-data', isAuthenticated, async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Processing /api/save-data request`);
    let overallDataChanged = false; // Flag to track if any part of cachedData changed

    // Handle Products: Merge updates or replace if a full list is sent.
    // This assumes `virus.html` sends product updates within an array `req.body.products`.
    // If `req.body.products` is intended to be a complete replacement:
    if (req.body.hasOwnProperty('products') && Array.isArray(req.body.products)) {
        console.log(`[${new Date().toISOString()}] Processing products update...`);
        const productCacheMap = new Map(cachedData.products.map(p => [p.item, p]));
        let productsChangedThisSave = false;

        req.body.products.forEach(incomingProduct => {
            const existingProduct = productCacheMap.get(incomingProduct.originalItem || incomingProduct.item);
            const productDataForCache = {
                ...existingProduct,
                item: incomingProduct.item,
                fileId: incomingProduct.fileId || existingProduct?.fileId,
                originalFileName: incomingProduct.originalFileName || existingProduct?.originalFileName,
                price: parseFloat(incomingProduct.price) || 0,
                name: incomingProduct.name,
                desc: incomingProduct.desc,
                img: incomingProduct.img,
                category: incomingProduct.category,
                embed: incomingProduct.embed,
                isNew: incomingProduct.isNew === true || String(incomingProduct.isNew).toLowerCase() === 'true',
                isArchived: incomingProduct.isArchived === true || String(incomingProduct.isArchived).toLowerCase() === 'true',
                discount_percentage: incomingProduct.discount_percentage,
                discount_expires_at: incomingProduct.discount_expires_at
            };

            if (incomingProduct.originalItem && incomingProduct.originalItem !== incomingProduct.item) {
                productCacheMap.delete(incomingProduct.originalItem);
            }
            productCacheMap.set(incomingProduct.item, productDataForCache);
            productsChangedThisSave = true;
        });

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
                    console.log(`[${new Date().toISOString()}] Admin password has been updated.`);
                }
            } else if (newPassword === '') {
                console.log(`[${new Date().toISOString()}] Admin password field was sent as an empty string; password NOT updated.`);
            }
        }

        const updatableSimpleSettings = [
            'supportEmail', 'copyrightText', 'logoUrl',
            'fallbackRate', 'mpesaTill',
            'payheroChannelId', 'payheroAuthToken', 'payheroPaymentUrl',
            'adminEmail'
        ];

        for (const key of updatableSimpleSettings) {
            if (newSettingsRequest.hasOwnProperty(key)) {
                let newValue = newSettingsRequest[key];
                if (key === 'fallbackRate') {
                    const parsedRate = parseFloat(newValue);
                    newValue = isNaN(parsedRate) ? cachedData.settings.fallbackRate : parsedRate;
                }
                if (newValue !== cachedData.settings[key]) {
                    cachedData.settings[key] = newValue;
                    settingsValuesChangedInThisRequest = true;
                    console.log(`[${new Date().toISOString()}] Setting updated: ${key} = ${newValue}`);
                }
            }
        }

        // Handle settings that are sent as JSON strings from client and stored as objects in cache
        const jsonStringSettings = ['socials', 'urgentMessage', 'activePaymentOptions'];
        for (const key of jsonStringSettings) {
            if (newSettingsRequest.hasOwnProperty(key)) {
                const newJsonStringValue = newSettingsRequest[key];
                if (typeof newJsonStringValue === 'string') {
                    try {
                        const newObjectValue = JSON.parse(newJsonStringValue);
                        // Compare stringified versions to detect change accurately
                        if (JSON.stringify(cachedData.settings[key] || null) !== JSON.stringify(newObjectValue)) {
                            cachedData.settings[key] = newObjectValue; // Update cache with the parsed object
                            settingsValuesChangedInThisRequest = true;
                            console.log(`[${new Date().toISOString()}] Setting updated (from JSON string): ${key} = `, newObjectValue);
                        }
                    } catch (e) {
                        console.warn(`[${new Date().toISOString()}] Received invalid JSON for setting ${key}:`, newJsonStringValue, e.message);
                    }
                } else if (typeof newSettingsRequest[key] === 'object' && (key === 'socials' || key === 'urgentMessage')) {
                    // This handles cases where client might send it as object directly (e.g. old implementation for socials/urgent)
                    if (JSON.stringify(cachedData.settings[key] || null) !== JSON.stringify(newSettingsRequest[key])) {
                        cachedData.settings[key] = newSettingsRequest[key];
                        settingsValuesChangedInThisRequest = true;
                        console.log(`[${new Date().toISOString()}] Setting updated (from object): ${key} = `, newSettingsRequest[key]);
                    }
                }
                 else {
                    console.warn(`[${new Date().toISOString()}] Received non-string/non-object (for socials/urgent) for setting ${key}, ignoring. Value:`, newSettingsRequest[key]);
                }
            }
        }

        if (settingsValuesChangedInThisRequest) {
            overallDataChanged = true; // If any setting value changed, mark overall data as changed.
        } else if (Object.keys(newSettingsRequest).length > 0 && !overallDataChanged) {
             // This case means settings were in the request, but no individual value change was detected by the loops above.
             // This might happen if the client sends the exact same data as what's in the cache.
            console.log(`[${new Date().toISOString()}] Settings were provided in request, but no individual setting values differed from current cache.`);
        }
    }

    const saveTasks = {};
    if (req.body.hasOwnProperty('products') && Array.isArray(req.body.products) && overallDataChanged) {
      // Pass the actual array of products if it's a specific update
      saveTasks.products = req.body.products;
    } else if (req.body.hasOwnProperty('products') && overallDataChanged) {
      // Fallback or if products key is present but not an array (e.g. indicating full sync from cache)
      // This case needs careful consideration based on client behavior.
      // For now, assume if 'products' key is there, it implies cachedData.products might have changed.
      saveTasks.products = true; // Indicates full sync from cachedData.products
    }

    if (req.body.hasOwnProperty('categories') && overallDataChanged) {
      saveTasks.categories = true;
    }
    if (req.body.hasOwnProperty('staticPages') && overallDataChanged) {
      saveTasks.staticPages = true;
    }
    if (req.body.hasOwnProperty('settings') && overallDataChanged) {
      saveTasks.settings = true;
    }

    if (Object.keys(saveTasks).length > 0) {
        await saveDataToDatabase(saveTasks); // Pass specific tasks to the save function
        res.json({ success: true, message: "Data saved successfully." });
        console.log(`[${new Date().toISOString()}] Specific data saved via /api/save-data for tasks:`, saveTasks);
    } else if (overallDataChanged && Object.keys(saveTasks).length === 0) {
        // This case might happen if overallDataChanged was true due to logic not tied to a specific req.body key,
        // or if a key was present but didn't lead to overallDataChanged being true (which is a bit contradictory).
        // For safety, if overallDataChanged is true but no specific task identified, save all.
        // However, the current logic for overallDataChanged should align with specific req.body keys.
        // This path should ideally not be hit if logic is correct.
        console.warn(`[${new Date().toISOString()}] overallDataChanged was true, but no specific save tasks identified. This might indicate an issue. Proceeding to save all as a fallback.`);
        await saveDataToDatabase({ products: true, categories: true, staticPages: true, settings: true });
        res.json({ success: true, message: "Data saved successfully (fallback to all)." });
    }
    else {
        res.json({ success: true, message: "No changes detected in the provided data to save." });
        console.log(`[${new Date().toISOString()}] /api/save-data called, but no data changed in cache or no specific save tasks; DB save skipped.`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/save-data route:`, error.message, error.stack);
    const errorMessage = error.details ? `${error.message} - Details: ${error.details}` : error.message;
    res.status(500).json({ success: false, error: `Failed to save data: ${errorMessage}` });
  }
});


app.post('/api/add-bot', isAuthenticated, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), async (req, res) => {
  try {
    const { item, name, price, desc, embed, category, isNew } = req.body;

    const botFile = req.files['file'] ? req.files['file'][0] : null;
    const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;

    if (!botFile) throw new Error('No bot file uploaded');
    if (!imageFile) throw new Error('No image file uploaded');

    // 1. Upload Bot File
    let botFileId;
    const botOriginalFileName = botFile.originalname;
    const botUniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    botFileId = `${botUniquePrefix}_${botOriginalFileName}`;
    const { error: botUploadError } = await supabase.storage
      .from('bots')
      .upload(botFileId, botFile.buffer, { contentType: botFile.mimetype, upsert: false });
    if (botUploadError) throw botUploadError;

    // 2. Upload Image File
    let imageUrl;
    const imageFileName = `${Date.now()}_${imageFile.originalname}`;
    const { error: imageUploadError } = await supabase.storage
        .from('thumbnails')
        .upload(imageFileName, imageFile.buffer, { contentType: imageFile.mimetype, upsert: false });

    if (imageUploadError) {
        // If image upload fails, clean up the already uploaded bot file
        await supabase.storage.from('bots').remove([botFileId]);
        throw imageUploadError;
    }

    const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(imageFileName);
    imageUrl = publicUrl;

    // 3. Save to Database
    const productForDB = {
        item,
        file_id: botFileId,
        original_file_name: botOriginalFileName,
        price: parseFloat(price) || 0,
        name,
        description: desc,
        image: imageUrl,
        category,
        embed,
        is_new: isNew === 'true' || isNew === true,
        is_archived: false,
        discount_percentage: null,
        discount_expires_at: null
    };

    const { error: insertError } = await supabase.from('products').insert(productForDB);
    if (insertError) {
        console.error(`[${new Date().toISOString()}] Error inserting new bot into DB:`, insertError.message, insertError.details);
        // Attempt to delete the orphaned files from storage
        await supabase.storage.from('bots').remove([botFileId]);
        await supabase.storage.from('thumbnails').remove([imageFileName]);
        console.log(`[${new Date().toISOString()}] Orphaned files ${botFileId} and ${imageFileName} deleted from storage due to DB insert failure.`);
        throw insertError;
    }

    await loadData(); // Refresh cache
    const newProductInCache = cachedData.products.find(p => p.item === item);
    res.json({ success: true, product: newProductInCache || productForDB });
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

app.post('/api/update-bot', isAuthenticated, upload.single('imageFile'), async (req, res) => {
  try {
    const {
      originalItem, item, name, price, desc, embed, category, isNew, isArchived,
      discount_percentage, discount_duration
    } = req.body;
    const imageFile = req.file;

    // 1. Fetch existing product to get old image URL
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('image')
      .eq('item', originalItem)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, error: 'Bot to update not found.' });
    }
    const oldImageUrl = existingProduct.image;
    let newImageUrl = oldImageUrl;

    // 2. If new image is provided, upload it
    if (imageFile) {
      const imageFileName = `${Date.now()}_${imageFile.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(imageFileName, imageFile.buffer, { contentType: imageFile.mimetype, upsert: false });

      if (uploadError) {
        throw new Error('Failed to upload new image: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(imageFileName);
      newImageUrl = publicUrl;
    }

    // 3. Prepare the update payload for the database
    const productUpdatePayload = {
      item,
      name,
      price: parseFloat(price),
      description: desc,
      embed,
      category,
      image: newImageUrl,
      is_new: isNew === 'true',
      is_archived: isArchived === 'true',
      discount_percentage: parseFloat(discount_percentage) || null
    };

    const discountDurationHours = parseInt(discount_duration, 10);
    if (discountDurationHours && discountDurationHours > 0) {
        const now = new Date();
        productUpdatePayload.discount_expires_at = new Date(now.getTime() + discountDurationHours * 60 * 60 * 1000).toISOString();
    } else if (!productUpdatePayload.discount_percentage) {
        productUpdatePayload.discount_expires_at = null;
    }

    // 4. Update the database
    const { error: updateError } = await supabase
      .from('products')
      .update(productUpdatePayload)
      .eq('item', originalItem);

    if (updateError) {
      // If DB update fails, we should delete the newly uploaded image to prevent orphans
      if (imageFile && newImageUrl) {
        const newFileName = newImageUrl.split('/').pop();
        await supabase.storage.from('thumbnails').remove([newFileName]);
      }
      throw new Error('Failed to update bot in database: ' + updateError.message);
    }

    // 5. If DB update was successful and a new image was uploaded, delete the old one
    if (imageFile && oldImageUrl && oldImageUrl !== newImageUrl) {
      const oldFileName = oldImageUrl.split('/').pop();
      if (oldFileName && oldFileName.includes('supabase')) { // Basic check to avoid trying to delete placeholder images
        await supabase.storage.from('thumbnails').remove([oldFileName]);
      }
    }

    await loadData(); // Refresh cache
    const updatedProduct = cachedData.products.find(p => p.item === item);
    res.json({ success: true, product: updatedProduct });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating bot:`, error.message, error.stack);
    res.status(500).json({ success: false, error: 'Failed to update bot' });
  }
});

async function sendOrderNotification(item, refCode, amount) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cachedData.settings.supportEmail || process.env.EMAIL_USER,
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
    const { item, refCode, amount, timestamp, used_exchange_rate } = req.body;
    const { product, finalPrice: finalUsdPrice } = await getProductWithDiscount(item);
    if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const exchangeRate = (used_exchange_rate && !isNaN(parseFloat(used_exchange_rate)))
        ? parseFloat(used_exchange_rate)
        : (cachedData.settings.fallbackRate || 130);

    const expectedKesAmount = Math.round(finalUsdPrice * exchangeRate);
    const submittedKesAmount = Math.round(parseFloat(amount));

    // Allow a 1 KES tolerance for rounding differences
    if (Math.abs(submittedKesAmount - expectedKesAmount) > 1) {
        console.warn(`[${new Date().toISOString()}] Manual Till: Amount mismatch for item ${item}. Submitted KES: ${submittedKesAmount}, Server Expected KES: ${expectedKesAmount} (using rate ${exchangeRate})`);
        return res.status(400).json({ success: false, error: `The amount paid (${submittedKesAmount} KES) does not match the expected amount (${expectedKesAmount} KES). Please refresh and try again or contact support.` });
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
    const notes = order.notes || '';
    let downloadLink = null;
    let userFriendlyMessage = `Payment status: ${status}. ${notes}`.trim();

    if ((status === 'confirmed' || status === 'confirmed_server_stk') && !downloaded) {
      const product = cachedData.products.find(p => p.item === item);
      if (!product || !product.fileId) {
        console.error(`[${new Date().toISOString()}] Order Status: Product file details not found for item ${item} (Ref: ${refCode})`);
        return res.status(500).json({ success: false, status, notes, error: 'Product file details not found, cannot generate download link.' });
      }
      downloadLink = `/download/${product.fileId}?item=${item}&refCode=${refCode}`;
      userFriendlyMessage = 'Payment confirmed! Preparing download...';
    } else if (downloaded) {
      userFriendlyMessage = 'File already downloaded for this order.';
      // Still return a success true, but with a message indicating it's already downloaded.
      // Client can decide not to attempt download again.
      return res.json({ success: true, status, notes, message: userFriendlyMessage, downloaded: true });
    } else if (status.startsWith('failed_')) {
        userFriendlyMessage = notes || `Payment failed with status: ${status}. Please contact support if issue persists.`;
    } else if (status === 'pending_stk_push') {
        userFriendlyMessage = notes || 'STK push sent to your phone. Please enter your M-PESA PIN to complete the payment.';
    }
    // For any other status, the generic message `Payment status: ${status}. ${notes}` is fine.

    res.json({ success: true, status, notes, downloadLink, message: userFriendlyMessage });
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
    const { item, phone, customerName, used_exchange_rate } = req.body;

    if (!item || !phone) {
      return res.status(400).json({ success: false, error: 'Missing required fields: item, phone' });
    }

    const normalizedPhoneForRateLimit = phone.startsWith('+') ? phone.substring(1) : (phone.startsWith('0') ? `254${phone.substring(1)}` : phone);
    const rateLimitKey = `stk_pending:${normalizedPhoneForRateLimit}`;
    const STK_RATE_LIMIT_TTL = 5 * 60; // 5 minutes in seconds

    try {
      const existingRequest = await redisClient.get(rateLimitKey);
      if (existingRequest) {
        console.log(`[${new Date().toISOString()}] ServerSTK: Rate limit hit for phone ${normalizedPhoneForRateLimit}. Existing request found.`);
        return res.status(429).json({ success: false, error: 'You have a pending payment. Please complete it or wait 5 minutes to try again.' });
      }
    } catch (redisError) {
      console.error(`[${new Date().toISOString()}] ServerSTK: Redis GET error for rate limiting for phone ${normalizedPhoneForRateLimit}:`, redisError.message);
      // Proceed without rate limiting if Redis read fails, to not block payment.
    }

    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      console.log(`[${new Date().toISOString()}] ServerSTK: Product not found for item: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const finalUsdPrice = getFinalPrice(product);
    const exchangeRate = (used_exchange_rate && !isNaN(parseFloat(used_exchange_rate)) && parseFloat(used_exchange_rate) > 0)
      ? parseFloat(used_exchange_rate)
      : (cachedData.settings.fallbackRate || 130);

    const amountToCharge = Math.round(finalUsdPrice * exchangeRate);

    console.log(`[${new Date().toISOString()}] ServerSTK: Initiating payment for item ${item}. Final USD Price: ${finalUsdPrice}, Exchange Rate: ${exchangeRate}, Amount to Charge (KES): ${amountToCharge}`);

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
      provider: "m-pesa",
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
      // Do NOT set rate limit key if PayHero initiation failed, allow user to retry sooner.
      await supabase.from('orders').update({ status: 'failed_stk_initiation', notes: JSON.stringify(payheroResponse) }).eq('ref_code', serverSideReference);
      return res.status(500).json({ success: false, error: payheroResponse.message || 'Failed to initiate payment with PayHero.' });
    }

    // If PayHero STK push was successfully initiated, set the rate limit key in Redis
    try {
      await redisClient.set(rateLimitKey, 'true', { EX: STK_RATE_LIMIT_TTL });
      console.log(`[${new Date().toISOString()}] ServerSTK: Rate limit key set for phone ${normalizedPhoneForRateLimit} with TTL ${STK_RATE_LIMIT_TTL}s.`);
    } catch (redisError) {
      console.error(`[${new Date().toISOString()}] ServerSTK: Redis SET error for rate limiting for phone ${normalizedPhoneForRateLimit}:`, redisError.message);
      // Continue with successful response even if Redis SET fails, as payment was initiated.
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
  try {
    // 1. Common parsing logic for the callback body
    if (!req.body || typeof req.body !== 'object') {
        console.error(`[${new Date().toISOString()}] PayHero CB: Received empty or invalid body:`, req.body);
        return res.status(400).json({ error: 'Invalid callback body from PayHero' });
    }
    const { response: payheroResponseData, status: overallCallbackStatus } = req.body;
    if (!payheroResponseData || typeof payheroResponseData !== 'object') {
        console.error(`[${new Date().toISOString()}] PayHero CB: Invalid or missing 'response' object in callback. Body:`, req.body);
        return res.status(400).json({ error: 'Invalid callback structure from PayHero: missing response object' });
    }
    const { ExternalReference, ResultCode, ResultDesc, Status: paymentGatewayStatus, MpesaReceiptNumber, Amount, Phone: PayerPhone } = payheroResponseData;
    if (!ExternalReference) {
        console.error(`[${new Date().toISOString()}] PayHero CB: Missing ExternalReference. Body:`, req.body);
        return res.status(400).json({ error: 'Missing ExternalReference in PayHero callback' });
    }

    const refCode = ExternalReference;

    // 2. Decision based on reference prefix
    if (refCode.startsWith('CB-')) {
      // --- CUSTOM BOT ORDER LOGIC ---
      console.log(`[${new Date().toISOString()}] PayHero CB: Processing Custom Bot Order for ref ${refCode}`);

      if (overallCallbackStatus === true && ResultCode === 0 && paymentGatewayStatus === "Success") {
        console.log(`[${new Date().toISOString()}] PayHero CB: Payment SUCCEEDED for Custom Bot ref ${refCode}.`);
        const movedOrder = await moveCustomBotOrderFromCache(refCode);

        if (movedOrder) {
          // Order was in cache and is now in DB. Update it with the receipt number.
          if (MpesaReceiptNumber) {
            await supabase
              .from('custom_bot_orders')
              .update({ mpesa_receipt_number: MpesaReceiptNumber, updated_at: new Date().toISOString() })
              .eq('ref_code', refCode);
          }
          console.log(`[${new Date().toISOString()}] PayHero CB: Custom bot payment SUCCESS for cached order: ${refCode}`);
        } else {
          // Order was not in cache, must be in DB already. Update its status.
          const { data: order, error: orderError } = await supabase
            .from('custom_bot_orders')
            .select('*')
            .eq('ref_code', refCode)
            .single();

          if (orderError || !order) {
            console.error(`[${new Date().toISOString()}] PayHero CB: Custom bot order not found in DB for callback: ${refCode}`);
            return res.status(200).json({ success: false, error: 'Order not found' });
          }

          if (order.payment_status !== 'paid') {
              const updateData = { payment_status: 'paid', updated_at: new Date().toISOString() };
              if (MpesaReceiptNumber) {
                updateData.mpesa_receipt_number = MpesaReceiptNumber;
              }
              await supabase.from('custom_bot_orders').update(updateData).eq('ref_code', refCode);
              await sendCustomBotPaymentConfirmation(order); // Send confirmation email
              console.log(`[${new Date().toISOString()}] PayHero CB: Custom bot payment SUCCESS for existing DB order: ${refCode}`);
          } else {
              console.log(`[${new Date().toISOString()}] PayHero CB: Custom bot order ${refCode} was already marked as paid. Ignoring duplicate callback.`);
          }
        }
      } else {
        // Payment failed
        console.log(`[${new Date().toISOString()}] PayHero CB: Custom bot payment FAILED for ref ${refCode}. ResultCode: ${ResultCode}, Desc: ${ResultDesc}`);
        const failureReason = ResultDesc || 'Payment failed with an unknown error from the provider.';

        // Use the new helper to move the failed order from Redis to the DB
        await moveAndFailCustomBotOrderFromCache(refCode, failureReason);
      }
      // Respond to PayHero for custom bot flow
      return res.status(200).json({ success: true, message: "Callback processed for custom bot order." });

    } else {
      // --- STANDARD PRODUCT ORDER LOGIC (existing logic) ---
      console.log(`[${new Date().toISOString()}] PayHero CB: Processing Standard Product Order for ref ${refCode}`);
      const serverSideReference = refCode;

      const { data: order, error: orderFetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('ref_code', serverSideReference)
        .eq('payment_method', 'payhero_server_stk')
        .single();

      if (orderFetchError && orderFetchError.code !== 'PGRST116') {
          console.error(`[${new Date().toISOString()}] PayHero CB: DB error fetching standard order ${serverSideReference}:`, orderFetchError.message);
          throw orderFetchError;
      }

      if (!order) {
        console.error(`[${new Date().toISOString()}] PayHero CB: Standard order not found for ref_code ${serverSideReference}.`);
        return res.status(200).json({ error: 'Order not found, callback acknowledged to prevent PayHero retries.' });
      }

      if (order.status === 'confirmed_server_stk' || order.status === 'failed_amount_mismatch') {
          console.log(`[${new Date().toISOString()}] PayHero CB: Standard order ${serverSideReference} already processed as ${order.status}. Ignoring duplicate callback.`);
          return res.status(200).json({ message: `Order already processed as ${order.status}` });
      }

      const mpesaReceiptIfAvailable = MpesaReceiptNumber || null;
      const notesForUpdate = ResultDesc || (paymentGatewayStatus !== "Success" ? `${paymentGatewayStatus} (Code: ${ResultCode})` : `Unknown PayHero Status (Code: ${ResultCode})`);

      let updatePayload = {
          status: order.status,
          notes: order.notes,
          mpesa_receipt_number: order.mpesa_receipt_number,
          payer_phone_number: order.payer_phone_number
      };

      if (mpesaReceiptIfAvailable) updatePayload.mpesa_receipt_number = mpesaReceiptIfAvailable;
      if (PayerPhone) updatePayload.payer_phone_number = PayerPhone;

      if (overallCallbackStatus === true && ResultCode === 0 && paymentGatewayStatus === "Success") {
        console.log(`[${new Date().toISOString()}] PayHero CB: Payment SUCCEEDED for standard order ${serverSideReference}.`);
        const orderStoredKesAmount = Math.round(parseFloat(order.amount));
        const callbackReceivedKesAmount = Math.round(parseFloat(Amount));

        if (orderStoredKesAmount !== callbackReceivedKesAmount) {
          console.warn(`[${new Date().toISOString()}] PayHero CB: Amount mismatch for standard order ${serverSideReference}. Order KES: ${orderStoredKesAmount}, CB KES: ${callbackReceivedKesAmount}.`);
          updatePayload.status = 'failed_amount_mismatch';
          updatePayload.notes = `Amount mismatch. Expected: ${orderStoredKesAmount}, Received: ${callbackReceivedKesAmount}. Original Note: ${notesForUpdate||''}`.trim();
        } else {
          updatePayload.status = 'confirmed_server_stk';
          updatePayload.notes = `Payment confirmed successfully via PayHero STK. ${notesForUpdate || ''}`.trim();
        }
      } else {
        console.log(`[${new Date().toISOString()}] PayHero CB: Payment FAILED for standard order ${serverSideReference}. ResultCode: ${ResultCode}, Desc: ${ResultDesc}`);
        // Use a generic failure status per user feedback, as specific M-Pesa codes are not reliable via PayHero.
        const failureStatus = 'failed_stk_push';
        // The `notesForUpdate` variable already contains the `ResultDesc` from PayHero, which is the desired failure reason.
        const failureNote = notesForUpdate || 'Payment failed. Please check your M-Pesa account and try again.';

        updatePayload.status = failureStatus;
        updatePayload.notes = failureNote.trim();
      }

      let dbUpdateError = null;
      if (updatePayload.status !== order.status || updatePayload.notes !== order.notes || updatePayload.mpesa_receipt_number !== order.mpesa_receipt_number || updatePayload.payer_phone_number !== order.payer_phone_number) {
          try {
              const { error: updateError } = await supabase.from('orders').update(updatePayload).eq('ref_code', serverSideReference);
              if (updateError) throw updateError;
              console.log(`[${new Date().toISOString()}] PayHero CB: Standard order ${serverSideReference} updated to status: '${updatePayload.status}'.`);
              if (updatePayload.status === 'confirmed_server_stk') {
                  await sendOrderNotification(order.item, serverSideReference, order.amount);
              }
          } catch (supaError) {
              dbUpdateError = supaError;
              console.error(`[${new Date().toISOString()}] PayHero CB: DATABASE UPDATE FAILED for standard order ${serverSideReference}.`, supaError);
          }
      } else {
          console.log(`[${new Date().toISOString()}] PayHero CB: No change needed for standard order ${serverSideReference}. DB update skipped.`);
      }

      if (dbUpdateError) {
          console.error(`[${new Date().toISOString()}] PayHero CB: Critical - DB update failed for ${serverSideReference} but responding 200 to PayHero to prevent immediate retry.`);
          return res.status(200).json({ success: false, message: "Callback acknowledged, but internal processing error occurred." });
      } else {
          return res.status(200).json({ success: true, message: "Callback processed for standard order." });
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PayHero CB: General error processing callback:`, error.message, error.stack);
    res.status(500).json({ error: 'Internal server error processing callback' });
  }
});

// NOWPayments API Endpoints
app.get('/api/nowpayments/currencies', async (req, res) => {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error(`[${new Date().toISOString()}] NOWPayments API key is not set.`);
      return res.status(500).json({ success: false, error: 'Server configuration error for payments.' });
    }
    // It's good practice to check API status first, though not strictly required for just getting currencies.
    // const statusResponse = await fetch('https://api.nowpayments.io/v1/status');
    // if (!statusResponse.ok) throw new Error('NOWPayments API is not available');

    const currenciesResponse = await fetch('https://api.nowpayments.io/v1/full-currencies', {
      headers: { 'x-api-key': apiKey }
    });
    if (!currenciesResponse.ok) {
      const errorData = await currenciesResponse.json();
      console.error(`[${new Date().toISOString()}] Error fetching NOWPayments currencies:`, errorData);
      throw new Error(errorData.message || `Failed to fetch currencies from NOWPayments API (Status: ${currenciesResponse.status})`);
    }
    const data = await currenciesResponse.json();
    // The 'full-currencies' endpoint returns an object with a 'currencies' array
    const enabledCurrencies = data.currencies.filter(c => c.enable);
    // Removed the loop that fetched all minimum amounts.
    // The frontend will now request minimum amount check on demand via /api/nowpayments/create-payment
    res.json({ success: true, currencies: enabledCurrencies });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/nowpayments/currencies: ${error.message}`, error.stack);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch NOWPayments currencies' });
  }
});

app.post('/api/nowpayments/create-payment', rateLimit, async (req, res) => {
  try {
    const { item, price_amount, price_currency, pay_currency, email, order_description } = req.body;
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const ipnSecretKey = process.env.NOWPAYMENTS_IPN_KEY; // Though not used in this request, ensure it's configured for IPN handling

    if (!apiKey || !ipnSecretKey) {
      console.error(`[${new Date().toISOString()}] NOWPayments API key or IPN secret key is not set.`);
      return res.status(500).json({ success: false, error: 'Server configuration error for payments.' });
    }

    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    // Always use the server-calculated final price
    const finalUsdPrice = getFinalPrice(product);
    console.log(`[${new Date().toISOString()}] NOWPayments: Creating payment for item ${item}. Client sent price: ${price_amount}, Server calculated final price: ${finalUsdPrice.toFixed(2)}`);


    // Step 1: Get minimum payment amount for the selected pay_currency
    // currency_to should be your store's default payout currency (e.g., 'usd' if prices are in USD)
    const minAmountResponse = await fetch(`https://api.nowpayments.io/v1/min-amount?currency_from=${pay_currency.toLowerCase()}&currency_to=${price_currency.toLowerCase()}`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!minAmountResponse.ok) {
      const minErrorText = await minAmountResponse.text(); // Use text() for more flexible error parsing
      let minErrorJson = {};
      try {
        minErrorJson = JSON.parse(minErrorText);
      } catch(e) {
        console.error(`[${new Date().toISOString()}] NOWPayments: Non-JSON error fetching minimum payment amount for ${pay_currency} to ${price_currency}: ${minErrorText}`);
      }
      const errorMessage = minErrorJson.message || `Failed to fetch minimum payment amount from NOWPayments (Status: ${minAmountResponse.status}, Body: ${minErrorText})`;
      console.error(`[${new Date().toISOString()}] NOWPayments: Error fetching minimum payment amount for ${pay_currency} to ${price_currency}:`, minErrorJson.message || minErrorText);
      return res.status(500).json({ success: false, error: errorMessage });
    }
    const minAmountData = await minAmountResponse.json();
    const minimumCryptoAmount = parseFloat(minAmountData.min_amount);

    if (!minimumCryptoAmount && minimumCryptoAmount !== 0) { // Check if it's a valid number (0 is a valid min amount)
        console.error(`[${new Date().toISOString()}] NOWPayments: min_amount was not a valid number or not found in response for ${pay_currency} to ${price_currency}. Data:`, minAmountData);
        return res.status(500).json({ success: false, error: `Could not determine minimum payment amount for ${pay_currency.toUpperCase()}.` });
    }

    // Step 2: Get estimated price in the selected crypto currency
    // This is the amount the user will actually need to send in the chosen crypto.
    const estimateResponse = await fetch(`https://api.nowpayments.io/v1/estimate?amount=${finalUsdPrice}&currency_from=${price_currency.toLowerCase()}&currency_to=${pay_currency.toLowerCase()}`, {
        headers: { 'x-api-key': apiKey }
    });

    if (!estimateResponse.ok) {
        const estErrorText = await estimateResponse.text();
        let estErrorJson = {};
        try {
            estErrorJson = JSON.parse(estErrorText);
        } catch(e) {
            console.error(`[${new Date().toISOString()}] NOWPayments: Non-JSON error fetching estimate for ${finalUsdPrice} ${price_currency} to ${pay_currency}: ${estErrorText}`);
        }
        const errorMessage = estErrorJson.message || `Could not get payment estimate from NOWPayments (Status: ${estimateResponse.status}, Body: ${estErrorText})`;
        console.error(`[${new Date().toISOString()}] NOWPayments: Error fetching estimate for ${finalUsdPrice} ${price_currency} to ${pay_currency}:`, estErrorJson.message || estErrorText);
        return res.status(500).json({ success: false, error: errorMessage });
    }
    const estimateData = await estimateResponse.json();
    const estimatedCryptoAmount = parseFloat(estimateData.estimated_amount);

    if (!estimatedCryptoAmount && estimatedCryptoAmount !== 0) { // Check if it's a valid number
        console.error(`[${new Date().toISOString()}] NOWPayments: Estimate data did not return a valid estimated_amount for ${pay_currency}. Data:`, estimateData);
        return res.status(500).json({ success: false, error: `Could not retrieve estimated crypto amount for ${pay_currency.toUpperCase()}.`});
    }

    // Step 3: Compare estimated crypto amount with the minimum crypto amount
    if (estimatedCryptoAmount < minimumCryptoAmount) {
        console.warn(`[${new Date().toISOString()}] NOWPayments: Estimated crypto amount ${estimatedCryptoAmount} ${pay_currency.toUpperCase()} is less than minimum ${minimumCryptoAmount} ${pay_currency.toUpperCase()}.`);
        return res.status(400).json({
            success: false,
            error: `The amount for ${product.name} (${finalUsdPrice.toFixed(2)} ${price_currency.toUpperCase()}) is below the minimum required for ${pay_currency.toUpperCase()}. Minimum: ${minimumCryptoAmount} ${pay_currency.toUpperCase()}. Your order's equivalent: ~${estimatedCryptoAmount} ${pay_currency.toUpperCase()}. Please increase the quantity or contact support if prices seem incorrect.`,
            type: 'min_amount_error', // Add a type for easier frontend handling
            min_amount: minimumCryptoAmount,
            estimated_amount: estimatedCryptoAmount,
            currency: pay_currency.toUpperCase()
        });
    }

    const orderId = `NP-${item}-${uuidv4()}`; // Unique order ID for our system
    const ipnCallbackUrl = `${getBaseUrl(req)}/api/nowpayments/ipn`;

    const nowPaymentsRequestBody = {
      price_amount: finalUsdPrice,
      price_currency: price_currency, // e.g., 'usd'
      pay_currency: pay_currency,     // e.g., 'btc'
      ipn_callback_url: ipnCallbackUrl,
      order_id: orderId, // Our internal unique order ID
      order_description: order_description || product.name,
      // You might want to add is_fixed_rate: true if you want to lock the exchange rate for a period
    };

    const paymentResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nowPaymentsRequestBody)
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || !paymentData.payment_id) {
      console.error(`[${new Date().toISOString()}] Error creating NOWPayments payment:`, paymentData);
      throw new Error(paymentData.message || `Failed to create payment with NOWPayments (Status: ${paymentResponse.status})`);
    }

    // Store order in our database
    await supabase.from('orders').insert({
      item: item,
      ref_code: orderId, // Using our generated orderId as ref_code
      nowpayments_payment_id: paymentData.payment_id, // Store NOWPayments' payment_id
      amount: finalUsdPrice, // Store the final USD amount
      currency_paid: pay_currency.toLowerCase(), // Store the crypto currency used for payment
      email: email, // Store customer's email
      timestamp: new Date().toISOString(),
      status: 'pending_nowpayments', // Initial status
      downloaded: false,
      payment_method: 'nowpayments'
    });

    // For QR code, you might need a library or use a service.
    // NOWPayments doesn't directly provide a QR code image URL in the create_payment response.
    // The QR code is typically generated by the merchant using the pay_address and pay_amount.
    // For simplicity, we'll send back the details and let the client generate QR if needed,
    // or the client can just display the address and amount.
    // If you use a QR code generation library on the server (e.g., 'qrcode'):
    // const qrCodeDataURL = await QRCode.toDataURL(paymentData.pay_address);
    // For now, we'll just return the payment details.

    res.json({
      success: true,
      orderId: orderId, // Our internal order ID
      payment: paymentData, // Full response from NOWPayments create_payment
      // qrCodeUrl: qrCodeDataURL // If you generate QR on server
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/nowpayments/create-payment: ${error.message}`, error.stack);
    res.status(500).json({ success: false, error: error.message || 'Failed to create NOWPayments payment' });
  }
});

app.get('/api/nowpayments/payment-status/:orderId', async (req, res) => {
  const { orderId } = req.params; // This is our internal orderId (ref_code)
  const apiKey = process.env.NOWPAYMENTS_API_KEY;

  if (!apiKey) {
    console.error(`[${new Date().toISOString()}] NOWPayments API key is not set for status check.`);
    return res.status(500).json({ success: false, error: 'Server configuration error.' });
  }

  try {
    const { data: localOrder, error: dbError } = await supabase
      .from('orders')
      .select('nowpayments_payment_id, item, status, downloaded, email') // Include email
      .eq('ref_code', orderId)
      .single();

    if (dbError || !localOrder) {
      return res.status(404).json({ success: false, error: 'Order not found in local database.' });
    }

    if (!localOrder.nowpayments_payment_id) {
        return res.status(400).json({ success: false, error: 'NOWPayments payment ID not associated with this order.' });
    }

    // If already confirmed and downloaded, or confirmed by IPN, no need to poll NOWPayments again.
    if (localOrder.status === 'confirmed_nowpayments' && localOrder.downloaded) {
        return res.json({ success: true, payment_status: 'finished', message: 'File already downloaded.', downloaded: true });
    }
    if (localOrder.status === 'confirmed_nowpayments' && !localOrder.downloaded) {
        const product = cachedData.products.find(p => p.item === localOrder.item);
        if (product && product.fileId) {
            const downloadLink = `/download/${product.fileId}?item=${localOrder.item}&refCode=${orderId}`;
            return res.json({ success: true, payment_status: 'finished', message: 'Payment confirmed, download ready.', downloadLink });
        }
    }


    const statusResponse = await fetch(`https://api.nowpayments.io/v1/payment/${localOrder.nowpayments_payment_id}`, {
      headers: { 'x-api-key': apiKey }
    });
    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      console.error(`[${new Date().toISOString()}] Error fetching NOWPayments status for ${localOrder.nowpayments_payment_id}:`, statusData);
      throw new Error(statusData.message || `Failed to get payment status from NOWPayments (Status: ${statusResponse.status})`);
    }

    let newLocalStatus = localOrder.status;
    let message = statusData.message || `NOWPayments status: ${statusData.payment_status}`;
    let downloadLink = null;

    if (statusData.payment_status === 'finished' && localOrder.status !== 'confirmed_nowpayments') {
      newLocalStatus = 'confirmed_nowpayments';
      await supabase.from('orders').update({ status: newLocalStatus, notes: `NOWPayments status: finished. Actually paid: ${statusData.actually_paid} ${statusData.pay_currency}` }).eq('ref_code', orderId);

      // Send email notification
      const product = cachedData.products.find(p => p.item === localOrder.item);
      if (product && localOrder.email) {
          await sendOrderNotification(localOrder.item, orderId, `${statusData.actually_paid} ${statusData.pay_currency.toUpperCase()} (Email: ${localOrder.email})`);
      }
      message = 'Payment successful! Preparing download...';
    } else if (['failed', 'refunded', 'expired'].includes(statusData.payment_status) && localOrder.status !== `failed_nowpayments_${statusData.payment_status}`) {
      newLocalStatus = `failed_nowpayments_${statusData.payment_status}`;
      await supabase.from('orders').update({ status: newLocalStatus, notes: `NOWPayments status: ${statusData.payment_status}` }).eq('ref_code', orderId);
      message = `Payment ${statusData.payment_status}.`;
    }
    // Other statuses like 'waiting', 'confirming', 'sending' don't usually change our 'pending_nowpayments' status until final.

    if (newLocalStatus === 'confirmed_nowpayments' && !localOrder.downloaded) {
        const product = cachedData.products.find(p => p.item === localOrder.item);
        if (product && product.fileId) {
            downloadLink = `/download/${product.fileId}?item=${localOrder.item}&refCode=${orderId}`;
        } else {
            console.error(`[${new Date().toISOString()}] Product or fileId not found for confirmed NOWPayment order ${orderId}, item ${localOrder.item}`);
            message = "Payment confirmed, but error preparing download. Contact support.";
        }
    }

    res.json({ success: true, payment_status: statusData.payment_status, current_local_status: newLocalStatus, message, downloadLink });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/nowpayments/payment-status/${orderId}: ${error.message}`);
    res.status(500).json({ success: false, error: error.message || 'Failed to get NOWPayments status' });
  }
});

const crypto = require('crypto'); // For IPN verification

app.post('/api/nowpayments/ipn', async (req, res) => {
  const ipnSecretKey = process.env.NOWPAYMENTS_IPN_KEY;
  if (!ipnSecretKey) {
    console.error(`[${new Date().toISOString()}] NOWPayments IPN Secret Key not configured. IPN ignored.`);
    return res.status(500).send('IPN configuration error.');
  }

  const receivedHmac = req.headers['x-nowpayments-sig'];
  const requestBody = req.body; // Assuming express.json() middleware is used

  if (!receivedHmac || !requestBody) {
    console.log(`[${new Date().toISOString()}] NOWPayments IPN: Missing signature or body.`);
    return res.status(400).send('Missing signature or body.');
  }

  try {
    // Verify signature (using Node.js example from NOWPayments docs)
    const sortedBody = {};
    Object.keys(requestBody).sort().forEach(key => {
      sortedBody[key] = requestBody[key];
    });
    const stringifiedBody = JSON.stringify(sortedBody);

    const hmac = crypto.createHmac('sha512', ipnSecretKey);
    hmac.update(stringifiedBody);
    const calculatedSignature = hmac.digest('hex');

    if (calculatedSignature !== receivedHmac) {
      console.warn(`[${new Date().toISOString()}] NOWPayments IPN: HMAC signature mismatch. Received: ${receivedHmac}, Calculated: ${calculatedSignature}. Body:`, JSON.stringify(requestBody));
      return res.status(403).send('Invalid signature.');
    }

    console.log(`[${new Date().toISOString()}] NOWPayments IPN: Signature VERIFIED. Processing IPN for order_id: ${requestBody.order_id}, payment_id: ${requestBody.payment_id}, status: ${requestBody.payment_status}`);

    const orderId = requestBody.order_id; // This is our internal orderId
    const nowpaymentsPaymentId = requestBody.payment_id;
    const paymentStatus = requestBody.payment_status;
    const payAmount = requestBody.pay_amount;
    const actuallyPaid = requestBody.actually_paid;
    const payCurrency = requestBody.pay_currency;

    const { data: order, error: dbError } = await supabase
      .from('orders')
      .select('item, status, email, downloaded') // Include email
      .eq('ref_code', orderId)
      .eq('nowpayments_payment_id', nowpaymentsPaymentId)
      .single();

    if (dbError || !order) {
      console.error(`[${new Date().toISOString()}] NOWPayments IPN: Order not found for ref_code ${orderId} and NP payment_id ${nowpaymentsPaymentId}. DB Error:`, dbError);
      // Still respond 200 to NOWPayments to prevent retries for non-existent orders.
      return res.status(200).send('Order not found, IPN acknowledged.');
    }

    let newLocalStatus = order.status;
    let notificationSent = false;

    if (paymentStatus === 'finished' && order.status !== 'confirmed_nowpayments') {
      newLocalStatus = 'confirmed_nowpayments';
      const updatePayload = {
        status: newLocalStatus,
        notes: `NOWPayments IPN: finished. Paid: ${actuallyPaid} ${payCurrency}. Original pay amount: ${payAmount} ${payCurrency}.`,
        amount_paid_crypto: parseFloat(actuallyPaid)
      };
      if (parseFloat(actuallyPaid) < parseFloat(payAmount)) {
        updatePayload.notes += ` Potential partial payment detected.`;
        // You might want a different status for partial payments if you decide to handle them distinctly
        // e.g., newLocalStatus = 'partially_paid_nowpayments';
      }
      await supabase.from('orders').update(updatePayload).eq('ref_code', orderId);

      console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} updated to ${newLocalStatus}.`);

      const product = cachedData.products.find(p => p.item === order.item);
      if (product && order.email && !order.downloaded) {
          await sendOrderNotification(order.item, orderId, `${actuallyPaid} ${payCurrency.toUpperCase()} (Email: ${order.email})`);
          notificationSent = true;
      }
    } else if (paymentStatus === 'partially_paid' && order.status !== 'partially_paid_nowpayments') {
      newLocalStatus = 'partially_paid_nowpayments';
      await supabase.from('orders').update({
          status: newLocalStatus,
          notes: `NOWPayments IPN: partially_paid. Paid: ${actuallyPaid} ${payCurrency} of expected ${payAmount} ${payCurrency}.`,
          amount_paid_crypto: parseFloat(actuallyPaid)
      }).eq('ref_code', orderId);
      console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} updated to ${newLocalStatus}.`);
      // Decide if you want to email for partial payments. Usually not for delivery.
    } else if (['failed', 'refunded', 'expired'].includes(paymentStatus) && !order.status.startsWith('failed_nowpayments_') && order.status !== 'confirmed_nowpayments' && order.status !== 'partially_paid_nowpayments') {
      newLocalStatus = `failed_nowpayments_${paymentStatus}`;
      await supabase.from('orders').update({ status: newLocalStatus, notes: `NOWPayments IPN: ${paymentStatus}` }).eq('ref_code', orderId);
      console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} updated to ${newLocalStatus}.`);
    } else {
        console.log(`[${new Date().toISOString()}] NOWPayments IPN: Order ${orderId} status '${paymentStatus}' received. Local status is '${order.status}'. No specific action or already processed.`);
    }

    res.status(200).send('IPN received and processed.');

  } catch (error) {
    console.error(`[${new Date().toISOString()}] NOWPayments IPN: Error processing IPN: ${error.message}`, error.stack, "Request Body:", JSON.stringify(requestBody));
    res.status(500).send('Error processing IPN.');
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

app.get('/:slug', async (req, res) => {
  // Decode URL-encoded slug to handle spaces and special characters
  const slug = `/${decodeURIComponent(req.params.slug)}`;
  if (cachedData.staticPages.some(p => p.slug === slug && p.slug !== '/payment-modal' && p.slug !== '/ref-code-modal')) {
      console.log(`[${new Date().toISOString()}] Request for static page slug ${slug}, serving index.html for client-side handling.`);
      res.sendFile(path.join(publicPath, 'index.html'));
      return;
  }
  console.log(`[${new Date().toISOString()}] Unhandled slug ${slug}, serving index.html.`);
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Custom Bot Order API Endpoints
app.post('/api/custom-bot/create', rateLimit, async (req, res) => {
  try {
    const { 
      email, 
      botDescription, 
      botFeatures, 
      budget, 
      paymentMethod, 
      refundMethod,
      refundCryptoWallet,
      refundCryptoNetwork,
      refundMpesaNumber,
      refundMpesaName
    } = req.body;

    // Validate required fields
    if (!email || !botDescription || !botFeatures || !budget || !paymentMethod || !refundMethod) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate budget minimum (changed from $50 to $30)
    if (budget < 30) {
      return res.status(400).json({ success: false, error: 'Minimum budget is $30' });
    }

    // Validate text limits (300 characters each)
    if (botDescription.length > 300) {
      return res.status(400).json({ success: false, error: 'Bot description must be 300 characters or less' });
    }
    
    if (botFeatures.length > 300) {
      return res.status(400).json({ success: false, error: 'Technical requirements must be 300 characters or less' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Validate refund details based on method
    if (refundMethod === 'crypto') {
      if (!refundCryptoWallet || !refundCryptoNetwork) {
        return res.status(400).json({ success: false, error: 'Crypto wallet address and network are required for crypto refund method' });
      }
    } else if (refundMethod === 'mpesa') {
      if (!refundMpesaNumber || !refundMpesaName) {
        return res.status(400).json({ success: false, error: 'MPESA number and name are required for MPESA refund method' });
      }
      // Validate MPESA number format
      const mpesaRegex = /^(\+254|254|07|01)\d{8,9}$/;
      if (!mpesaRegex.test(refundMpesaNumber.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid MPESA number format' });
      }
    }

    // Generate reference code for caching
    const refCode = `CB-${uuidv4()}`;

    // Calculate KES amount for payment
    const exchangeRate = cachedData.settings?.fallbackRate || 130;
    const kesAmount = Math.round(budget * exchangeRate);

    // Determine payment ID based on method
    let paymentId = null;
    if (paymentMethod === 'nowpayments') {
      paymentId = `np-${refCode}`;
    }

    // Create order data for Redis caching (12-hour TTL)
    const orderData = {
      client_email: email,
      bot_description: botDescription,
      bot_features: botFeatures,
      budget_amount: budget,
      payment_method: paymentMethod,
      refund_method: refundMethod,
      refund_crypto_wallet: refundMethod === 'crypto' ? refundCryptoWallet : null,
      refund_crypto_network: refundMethod === 'crypto' ? refundCryptoNetwork : null,
      refund_mpesa_number: refundMethod === 'mpesa' ? refundMpesaNumber.trim() : null,
      refund_mpesa_name: refundMethod === 'mpesa' ? refundMpesaName.trim() : null,
      ref_code: refCode,
      payment_id: paymentId,
      status: 'pending_payment',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    };

    // Cache order in Redis with 12-hour TTL (43200 seconds)
    // Exception: For manual till, create order immediately in database for admin dashboard
    if (paymentMethod === 'mpesa_manual') {
      // Generate tracking number for manual till orders
      const trackingNumber = `CB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const dbOrderData = {
        ...orderData,
        tracking_number: trackingNumber,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedOrder, error: insertError } = await supabase
        .from('custom_bot_orders')
        .insert([dbOrderData])
        .select()
        .single();

      if (insertError) {
        console.error(`[${new Date().toISOString()}] Error creating custom bot order:`, insertError);
        return res.status(500).json({ success: false, error: 'Failed to create custom bot order' });
      }

      console.log(`[${new Date().toISOString()}] Manual till custom bot order created: ${trackingNumber} for ${email}`);

      // Send notification email to admin (without tracking number for client yet)
      try {
        await sendCustomBotAdminNotification(insertedOrder);
      } catch (emailError) {
        console.error(`[${new Date().toISOString()}] Failed to send admin notification email:`, emailError.message);
      }

      return res.json({
        success: true,
        order: {
          trackingNumber,
          clientEmail: email,
          refCode,
          paymentMethod
        },
        kesAmount,
        exchangeRate
      });
    } else {
      // For other payment methods, cache in Redis
      try {
        await redisClient.set(`custom_bot_order:${refCode}`, JSON.stringify(orderData), { EX: 43200 });
        console.log(`[${new Date().toISOString()}] Custom bot order cached in Redis: ${refCode} for ${email}`);
      } catch (redisError) {
        console.error(`[${new Date().toISOString()}] Error caching custom bot order in Redis:`, redisError);
        return res.status(500).json({ success: false, error: 'Failed to cache custom bot order' });
      }

      return res.json({
        success: true,
        order: {
          clientEmail: email,
          refCode,
          paymentMethod
        },
        kesAmount,
        exchangeRate
      });
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in custom bot creation:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get custom bot orders (for admin)
app.get('/api/custom-bot/orders', isAuthenticated, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('custom_bot_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${new Date().toISOString()}] Error fetching custom bot orders:`, error);
      return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in custom bot orders fetch:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update custom bot order status (for admin)
app.post('/api/custom-bot/update-status', isAuthenticated, async (req, res) => {
  try {
    const { orderId, status, refundReason, customRefundMessage } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'Order ID and status are required' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'refunded') {
      updateData.refunded_at = new Date().toISOString();
      if (refundReason) {
        updateData.refund_reason = refundReason;
      }
      if (customRefundMessage) {
        updateData.custom_refund_message = customRefundMessage;
      }
    }

    const { data: updatedOrder, error } = await supabase
      .from('custom_bot_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Error updating custom bot order:`, error);
      return res.status(500).json({ success: false, error: 'Failed to update order' });
    }

    // Send appropriate email based on status
    try {
      if (status === 'completed') {
        await sendCustomBotCompletionEmail(updatedOrder);
      } else if (status === 'refunded') {
        await sendCustomBotRefundEmail(updatedOrder);
      }
    } catch (emailError) {
      console.error(`[${new Date().toISOString()}] Failed to send status update email:`, emailError.message);
    }

    console.log(`[${new Date().toISOString()}] Custom bot order ${updatedOrder.tracking_number} updated to ${status}`);
    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating custom bot order:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Confirm payment for custom bot order (for admin)
app.post('/api/custom-bot/confirm-payment', isAuthenticated, async (req, res) => {
  try {
    const { orderId, mpesaReceiptNumber } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    // Get the order first to check current status
    const { data: order, error: orderError } = await supabase
      .from('custom_bot_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updateData = {
      payment_status: 'paid',
      updated_at: new Date().toISOString()
    };

    if (mpesaReceiptNumber) {
      updateData.mpesa_receipt_number = mpesaReceiptNumber;
    }

    const { data: updatedOrder, error } = await supabase
      .from('custom_bot_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Error confirming payment:`, error);
      return res.status(500).json({ success: false, error: 'Failed to confirm payment' });
    }

    // For manual till payments, now send the confirmation email with tracking number to client
    if (order.payment_method === 'mpesa_manual' && order.payment_status !== 'paid') {
      try {
        await sendCustomBotOrderConfirmation(
          updatedOrder.client_email, 
          updatedOrder.tracking_number, 
          updatedOrder.bot_description, 
          updatedOrder.budget_amount, 
          updatedOrder.payment_method
        );
      } catch (emailError) {
        console.error(`[${new Date().toISOString()}] Failed to send customer confirmation email:`, emailError.message);
      }
    }

    // Send payment confirmation email
    try {
      await sendCustomBotPaymentConfirmation(updatedOrder);
    } catch (emailError) {
      console.error(`[${new Date().toISOString()}] Failed to send payment confirmation email:`, emailError.message);
    }

    console.log(`[${new Date().toISOString()}] Payment confirmed for custom bot order ${updatedOrder.tracking_number}`);
    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming payment:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Custom Bot Email Functions
async function sendCustomBotOrderConfirmation(email, trackingNumber, description, budget, paymentMethod) {
  const subject = `Custom Bot Order Confirmation - ${trackingNumber}`;
  const text = `
Dear Customer,

Thank you for your custom bot order! Here are the details:

Tracking Number: ${trackingNumber}
Description: ${description}
Budget: $${budget}
Payment Method: ${paymentMethod}

Your custom bot will be created and delivered to this email address within 24 hours.

If you have any questions, please contact us with your tracking number.

Best regards,
Deriv Bot Store Team
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text
  });
}

async function sendCustomBotAdminNotification(order) {
  const subject = `New Custom Bot Order - ${order.tracking_number}`;
  const text = `
New custom bot order received:

Tracking Number: ${order.tracking_number}
Client Email: ${order.client_email}
Budget: $${order.budget_amount}
Payment Method: ${order.payment_method}

Description:
${order.bot_description}

Features:
${order.bot_features}

Refund Method: ${order.refund_method}
${order.refund_method === 'crypto' ? `Crypto Wallet: ${order.refund_crypto_wallet}\nNetwork: ${order.refund_crypto_network}` : ''}
${order.refund_method === 'mpesa' ? `MPESA Number: ${order.refund_mpesa_number}\nMPESA Name: ${order.refund_mpesa_name}` : ''}

Please review and process this order in the admin panel.
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: cachedData.settings.supportEmail || process.env.EMAIL_USER,
    subject,
    text
  });
}

async function sendCustomBotCompletionEmail(order) {
  const subject = `Your Custom Bot is Ready! - ${order.tracking_number}`;
  const text = `
Dear Customer,

Great news! Your custom bot has been completed and sent to your email.

Tracking Number: ${order.tracking_number}
Description: ${order.bot_description}

Please check your email inbox (including spam folder) for your custom bot files.

If you don't receive the bot files within the next few minutes, please contact us with your tracking number.

Thank you for choosing Deriv Bot Store!

Best regards,
Deriv Bot Store Team
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject,
    text
  });
}

async function sendCustomBotRefundEmail(order) {
  const subject = `Refund Processed - ${order.tracking_number}`;
  const refundMethod = order.refund_method === 'crypto' 
    ? `Cryptocurrency (${order.refund_crypto_network} - ${order.refund_crypto_wallet})`
    : `MPESA (${order.refund_mpesa_number} - ${order.refund_mpesa_name})`;
  
  const text = `
Dear Customer,

We regret to inform you that your custom bot order has been refunded.

Tracking Number: ${order.tracking_number}
Refund Reason: ${order.refund_reason || 'Technical impossibility'}
${order.custom_refund_message ? `Additional Message: ${order.custom_refund_message}` : ''}

Your refund of $${order.budget_amount} will be processed to your chosen refund method:
${refundMethod}

Refunds typically process within 1-3 business days depending on the payment method.

If you have any questions about your refund, please contact us with your tracking number.

Best regards,
Deriv Bot Store Team
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject,
    text
  });
}

async function sendCustomBotPaymentConfirmation(order) {
  const subject = `Payment Confirmed - ${order.tracking_number}`;
  const text = `
Dear Customer,

Your payment has been confirmed and your custom bot order is now being processed.

Tracking Number: ${order.tracking_number}
Amount: $${order.budget_amount}

Your custom bot will be created and sent to your email within 24 hours.

Thank you for your payment!

Best regards,
Deriv Bot Store Team
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject,
    text
  });
}

// Custom Bot PayHero Payment Integration
app.post('/api/custom-bot/payhero-payment', rateLimit, async (req, res) => {
  try {
    const { refCode, amount, customerName, phoneNumber } = req.body;

    if (!refCode || !amount || !customerName || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get the custom bot order from Redis
    const order = await redisClient.get(`custom_bot_order:${refCode}`);
    if (!order) {
      console.error(`[${new Date().toISOString()}] Custom Bot PayHero: Order not found in Redis for refCode: ${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found or has expired. Please create the order again.' });
    }

    // Verify amount
    const exchangeRate = cachedData.settings?.fallbackRate || 130;
    const expectedKesAmount = Math.round(order.budget_amount * exchangeRate);
    if (Math.round(amount) !== expectedKesAmount) {
        console.warn(`[${new Date().toISOString()}] Custom Bot PayHero: Amount mismatch for ref ${refCode}. Expected ~${expectedKesAmount}, got ${amount}. Proceeding anyway.`);
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : 
                           (phoneNumber.startsWith('0') ? `254${phoneNumber.substring(1)}` : phoneNumber);

    // Create PayHero payment request
    const payheroApiUrl = 'https://backend.payhero.co.ke/api/v2/payments';
    const payheroChannelId = cachedData.settings.payheroChannelId;
    const payheroAuthToken = cachedData.settings.payheroAuthToken;
    const callbackUrl = `${getBaseUrl(req)}/api/payhero-callback`;

    if (!payheroAuthToken || !payheroChannelId) {
      console.error(`[${new Date().toISOString()}] Custom Bot PayHero: PayHero configuration missing.`);
      return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' });
    }

    const payheroPayload = {
      amount: Math.round(amount),
      phone_number: normalizedPhone,
      channel_id: parseInt(payheroChannelId),
      provider: "m-pesa",
      external_reference: refCode,
      customer_name: customerName,
      callback_url: callbackUrl
    };

    const payheroResponse = await fetch(payheroApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': payheroAuthToken
      },
      body: JSON.stringify(payheroPayload)
    });

    const payheroData = await payheroResponse.json();

    if (payheroResponse.ok && (payheroData.status === 'success' || payheroData.status === 'QUEUED')) {
      console.log(`[${new Date().toISOString()}] PayHero STK push initiated for custom bot ${refCode}`);
      
      res.json({
        success: true,
        message: 'STK Push initiated. Please check your phone.',
        clientEmail: order.client_email,
        paymentId: payheroData.data?.id || null
      });
    } else {
      console.error(`[${new Date().toISOString()}] Custom Bot PayHero: payment initiation failed.`, payheroData);
      throw new Error(payheroData.message || 'PayHero payment failed');
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Custom bot PayHero payment error:`, error.message);
    res.status(500).json({ success: false, error: error.message || 'Payment processing failed' });
  }
});

// Custom Bot PayHero Callback (DELETED - Logic merged into /api/payhero-callback)

// Custom Bot PayHero Status Check
app.get('/api/custom-bot/payhero-status/:refCode', async (req, res) => {
  try {
    const { refCode } = req.params;

    // Check Redis first for a pending order that hasn't hit the callback yet
    const cachedOrder = await redisClient.get(`custom_bot_order:${refCode}`);
    if (cachedOrder) {
        // This is the "happy path" while waiting for the STK push.
        return res.json({
            success: true,
            status: 'pending_stk_push', // A consistent status for the frontend
            message: 'STK Push sent. Please check your phone and enter your M-PESA PIN to complete the payment.'
        });
    }

    // If not in Redis, check the database for a confirmed or failed order
    const { data: dbOrder, error: dbError } = await supabase
        .from('custom_bot_orders')
        .select('payment_status, tracking_number') // Select the fields we need
        .eq('ref_code', refCode)
        .single();

    if (dbError && dbError.code !== 'PGRST116') {
        console.error(`[${new Date().toISOString()}] DB error fetching custom bot payhero status for ${refCode}:`, dbError);
        return res.status(500).json({ success: false, error: 'Database error.' });
    }

    if (!dbOrder) {
        return res.status(404).json({ success: false, status: 'expired', message: 'Order not found. It may have expired. Please try again.' });
    }

    // Construct a user-friendly message based on the DB status
    let message = 'Checking status...';
    const paymentStatus = dbOrder.payment_status;

    if (paymentStatus === 'paid') {
        message = 'Payment successful! Your custom bot order is being processed.';
    } else if (paymentStatus && paymentStatus.startsWith('failed:')) {
        // Extract the reason from "failed: The reason text"
        const reason = paymentStatus.substring('failed:'.length).trim();
        message = `Payment failed: ${reason}`;
    } else if (paymentStatus === 'pending') {
        message = 'Payment is pending verification.';
    } else {
        // Fallback for any other status (e.g., if it's just 'failed' without a reason)
        message = `Order status: ${paymentStatus}`;
    }

    res.json({
        success: true,
        status: dbOrder.payment_status, // Send the raw status for the frontend
        trackingNumber: dbOrder.tracking_number,
        message: message // Send the user-friendly message
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in custom bot payhero-status check:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Endpoint to delete a pending order from Redis if it times out
app.delete('/api/custom-bot/order/:refCode', async (req, res) => {
    try {
        const { refCode } = req.params;
        const result = await redisClient.del(`custom_bot_order:${refCode}`);
        if (result > 0) {
            console.log(`[${new Date().toISOString()}] Deleted pending custom bot order from Redis due to timeout: ${refCode}`);
            res.json({ success: true, message: 'Pending order cancelled.' });
        } else {
            console.log(`[${new Date().toISOString()}] Attempted to delete timed-out order, but it was not found in Redis (already processed or expired): ${refCode}`);
            res.status(404).json({ success: false, error: 'Pending order not found, it may have already been processed.' });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting pending order from Redis:`, error.message);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Custom Bot NOWPayments Integration
app.post('/api/custom-bot/nowpayments-payment', rateLimit, async (req, res) => {
  try {
    const { refCode, amount, email, currency } = req.body;

    if (!refCode || !amount || !email || !currency) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get the custom bot order from Redis
    const order = await redisClient.get(`custom_bot_order:${refCode}`);
    if (!order) {
      console.error(`[${new Date().toISOString()}] Custom Bot NOWPayments: Order not found in Redis for refCode: ${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found or has expired. Please create the order again.' });
    }

    // Verify amount (USD budget)
    if (parseFloat(amount) !== order.budget_amount) {
        console.warn(`[${new Date().toISOString()}] Custom Bot NOWPayments: Amount mismatch for ref ${refCode}. Expected ${order.budget_amount}, got ${amount}.`);
        return res.status(400).json({ success: false, error: 'Price mismatch. Please create the order again.' });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error(`[${new Date().toISOString()}] Custom Bot NOWPayments: API key is not set.`);
      return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' });
    }

    const ipnCallbackUrl = `${getBaseUrl(req)}/api/custom-bot/nowpayments-callback`;

    const nowPaymentsPayload = {
      price_amount: parseFloat(amount),
      price_currency: 'usd',
      pay_currency: currency.toLowerCase(),
      ipn_callback_url: ipnCallbackUrl,
      order_id: refCode,
      order_description: `Custom Bot Order - ${refCode}`,
      is_fee_paid_by_user: false,
      is_fixed_rate: true,
      customer_email: email
    };

    const nowPaymentsResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(nowPaymentsPayload)
    });

    const nowPaymentsData = await nowPaymentsResponse.json();

    if (nowPaymentsResponse.ok && nowPaymentsData.payment_id) {
      // Update the order in Redis with the payment_id from NOWPayments
      order.payment_id = nowPaymentsData.payment_id;
      await redisClient.set(`custom_bot_order:${refCode}`, JSON.stringify(order), { EX: 43200 }); // Reset TTL

      console.log(`[${new Date().toISOString()}] NOWPayments payment created for custom bot ${refCode}: ${nowPaymentsData.payment_id}`);

      res.json({
        success: true,
        orderId: refCode,
        paymentId: nowPaymentsData.payment_id,
        payAmount: nowPaymentsData.pay_amount,
        payCurrency: nowPaymentsData.pay_currency,
        payAddress: nowPaymentsData.pay_address,
        clientEmail: order.client_email
      });
    } else {
      console.error(`[${new Date().toISOString()}] Custom Bot NOWPayments: payment creation failed.`, nowPaymentsData);
      throw new Error(nowPaymentsData.message || 'NOWPayments payment creation failed');
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Custom bot NOWPayments error:`, error.message);
    res.status(500).json({ success: false, error: error.message || 'Payment processing failed' });
  }
});

// Custom Bot Manual Payment Reference Code Submission
app.post('/api/custom-bot/submit-ref-code', rateLimit, async (req, res) => {
  try {
    const { refCode, mpesaRefCode, amount, timestamp } = req.body;
    
    if (!refCode || !mpesaRefCode || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate Mpesa reference code format
    if (!mpesaRefCode.match(/^[A-Z0-9]{8,12}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid MPESA reference code format' });
    }

    // Get the custom bot order
    const { data: order, error: orderError } = await supabase
      .from('custom_bot_orders')
      .select('*')
      .eq('ref_code', refCode)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Update order with reference code and set status to pending verification
    const { data: updatedOrder, error: updateError } = await supabase
      .from('custom_bot_orders')
      .update({ 
        customer_mpesa_code: mpesaRefCode,
        payment_status: 'pending',
        amount_paid_kes: parseFloat(amount),
        updated_at: new Date().toISOString()
      })
      .eq('ref_code', refCode)
      .select()
      .single();

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Error updating custom bot order with ref code:`, updateError);
      return res.status(500).json({ success: false, error: 'Failed to submit reference code' });
    }

    // Send notification to admin about the reference code submission
    try {
      const subject = `Custom Bot Reference Code Submitted - ${order.tracking_number}`;
      const text = `
Custom bot order reference code submitted:

Tracking Number: ${order.tracking_number}
Client Email: ${order.client_email}
Budget: $${order.budget_amount}
MPESA Reference Code: ${mpesaRefCode}
Amount: ${amount} KES

Please verify this payment in your MPESA account and confirm the order.

Admin Panel: ${getBaseUrl(req)}/virus.html
`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: cachedData.settings.supportEmail,
        subject: subject,
        text: text
      });
    } catch (emailError) {
      console.error(`[${new Date().toISOString()}] Failed to send custom bot ref code notification:`, emailError.message);
    }

    console.log(`[${new Date().toISOString()}] Custom bot reference code submitted: ${refCode} - ${mpesaRefCode}`);
    
    res.json({ 
      success: true, 
      message: 'Reference code submitted successfully. Your order is being verified.',
      order: updatedOrder
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in custom bot ref code submission:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Custom Bot NOWPayments Status Check
app.get('/api/custom-bot/nowpayments-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params; // This is the refCode for the custom bot order
    
    // Check Redis first for a pending order, then check the database for a confirmed one.
    let order = await redisClient.get(`custom_bot_order:${orderId}`);
    const isFromCache = !!order;

    if (!order) {
      const { data: dbOrder, error: dbError } = await supabase
        .from('custom_bot_orders')
        .select('*')
        .eq('ref_code', orderId)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        console.error(`[${new Date().toISOString()}] DB error fetching status for custom bot order ${orderId}:`, dbError);
        return res.status(500).json({ success: false, error: 'Database error while checking order status.' });
      }
      order = dbOrder;
    }

    if (!order) {
      console.log(`[${new Date().toISOString()}] Custom bot order status check: Order not found in cache or DB for refCode ${orderId}`);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // If order is already completed, return success
    if (order.payment_status === 'paid') {
      return res.json({ 
        success: true, 
        payment_status: 'finished',
        status: 'confirmed_nowpayments',
        message: 'Payment successful! Your custom bot order is being processed.',
        order: order
      });
    }

    // If order doesn't have a NOWPayments payment ID, return current status
    if (!order.payment_id) {
      return res.json({
        success: true,
        payment_status: 'waiting',
        status: 'pending_nowpayments',
        message: 'Waiting for payment...'
      });
    }

    // Check with NOWPayments API
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'NOWPayments configuration missing' });
    }

    const statusResponse = await fetch(`https://api.nowpayments.io/v1/payment/${order.payment_id}`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!statusResponse.ok) {
      return res.status(500).json({ success: false, error: 'Failed to check payment status' });
    }

    const statusData = await statusResponse.json();
    
    // Update our database if payment is confirmed
    if (statusData.payment_status === 'finished' && order.payment_status !== 'paid') {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('custom_bot_orders')
        .update({ 
          payment_status: 'paid',
          amount_paid_crypto: statusData.actually_paid,
          currency_paid: statusData.pay_currency,
          updated_at: new Date().toISOString()
        })
        .eq('ref_code', orderId)
        .select()
        .single();

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Error updating NOWPayments status in DB:`, updateError);
        // Don't block the response, but log the error. The client will poll again.
      } else {
        // Send confirmation email
        try {
          await sendCustomBotPaymentConfirmation(updatedOrder || order);
        } catch (emailError) {
          console.error(`[${new Date().toISOString()}] Failed to send custom bot payment confirmation email:`, emailError.message);
        }

        // If the update was successful, we can return the final success response with the order details
        return res.json({
            success: true,
            payment_status: 'finished',
            status: 'confirmed_nowpayments',
            message: 'Payment successful! Your custom bot order is being processed.',
            order: updatedOrder // Return the full order object with the tracking number
        });
      }
    }

    // If we reach here, the payment is still pending or has failed.
    let message = 'Waiting for payment confirmation...';
    if (statusData.payment_status === 'finished') {
      message = 'Payment successful! Your custom bot order is being processed.';
    } else if (['failed', 'refunded', 'expired'].includes(statusData.payment_status)) {
      message = `Payment ${statusData.payment_status}. Please contact support if needed.`;
    }

    res.json({
      success: true,
      payment_status: statusData.payment_status,
      status: statusData.payment_status === 'finished' ? 'confirmed_nowpayments' : 'pending_nowpayments',
      message: message,
      order: order // Also include the order object in pending responses
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking custom bot NOWPayments status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check payment status' });
  }
});

// Custom Bot NOWPayments Callback
app.post('/api/custom-bot/nowpayments-callback', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Custom bot NOWPayments callback received:`, JSON.stringify(req.body, null, 2));

    const { order_id, payment_status, outcome_amount, outcome_currency } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Missing order ID' });
    }

    if (['finished', 'confirmed'].includes(payment_status)) {
      // Try to move cached order to database first
      const movedOrder = await moveCustomBotOrderFromCache(order_id);
      
      if (movedOrder) {
        // Update with crypto payment details if provided
        if (outcome_amount && outcome_currency) {
          await supabase
            .from('custom_bot_orders')
            .update({ 
              amount_paid_crypto: parseFloat(outcome_amount),
              currency_paid: outcome_currency,
              updated_at: new Date().toISOString()
            })
            .eq('ref_code', order_id);
        }
        
        console.log(`[${new Date().toISOString()}] Custom bot NOWPayments payment success for cached order: ${order_id}`);
        return res.json({ success: true });
      }

      // If not cached, check if order exists in database
      const { data: order, error: orderError } = await supabase
        .from('custom_bot_orders')
        .select('*')
        .eq('ref_code', order_id)
        .single();

      if (orderError || !order) {
        console.error(`[${new Date().toISOString()}] Custom bot order not found for NOWPayments callback: ${order_id}`);
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Update existing database order
      const updateData = {
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      };

      if (outcome_amount && outcome_currency) {
        updateData.amount_paid_crypto = parseFloat(outcome_amount);
        updateData.currency_paid = outcome_currency;
      }

      await supabase
        .from('custom_bot_orders')
        .update(updateData)
        .eq('ref_code', order_id);

      // Send payment confirmation email
      try {
        await sendCustomBotPaymentConfirmation(order);
      } catch (emailError) {
        console.error(`[${new Date().toISOString()}] Failed to send payment confirmation:`, emailError.message);
      }
    } else if (['failed', 'refunded', 'expired'].includes(payment_status)) {
      // Handle failed payment for database orders only
      const { data: order } = await supabase
        .from('custom_bot_orders')
        .select('*')
        .eq('ref_code', order_id)
        .single();

      if (order) {
        await supabase
          .from('custom_bot_orders')
          .update({
            payment_status: 'failed',
            status: 'failed', // Also update the main order status
            updated_at: new Date().toISOString()
          })
          .eq('ref_code', order_id);
      }
      // For cached orders, we just let them expire from Redis
    }

    console.log(`[${new Date().toISOString()}] Custom bot NOWPayments payment ${payment_status} for ${order_id}`);
    res.json({ success: true });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Custom bot NOWPayments callback error:`, error.message);
    res.status(500).json({ success: false, error: 'Callback processing failed' });
  }
});

async function initialize() {
  console.log(`[${new Date().toISOString()}] Starting server initialization...`);
  
  await selfCheck();
  
  // Wait for Redis client to initialize with more detailed feedback
  let retries = 0;
  const maxRetries = 20; // Increased retries for better reliability
  while (!redisClient.isReady() && retries < maxRetries) {
    console.log(`[${new Date().toISOString()}] Waiting for Redis client to be ready... (attempt ${retries + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
  
  if (!redisClient.isReady()) {
    console.warn(`[${new Date().toISOString()}] ⚠️  Redis client not ready after ${retries} attempts, proceeding with fallback mode`);
  } else {
    console.log(`[${new Date().toISOString()}] ✅ Redis client is ready`);
  }
  
  await loadData();
  await deleteOldOrders();
  
  // Set up periodic tasks
  setInterval(deleteOldOrders, 24 * 60 * 60 * 1000);
  setInterval(refreshCache, 15 * 60 * 1000);
  
  isServerInitialized = true;
  console.log(`[${new Date().toISOString()}] ✅ Server initialization complete - all systems ready`);
}

initialize().catch(error => {
  console.error(`[${new Date().toISOString()}] Server initialization failed:`, error.message);
  process.exit(1);
});

// Helper function to move a FAILED cached order from Redis to the database
async function moveAndFailCustomBotOrderFromCache(refCode, failureReason) {
  try {
    const cachedOrderStr = await redisClient.get(`custom_bot_order:${refCode}`);
    if (!cachedOrderStr) {
      console.warn(`[${new Date().toISOString()}] No cached order found in Redis to fail for ref code: ${refCode}. It might have already been processed or expired.`);
      return null;
    }

    const cachedOrder = JSON.parse(cachedOrderStr);

    const trackingNumber = `CB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const dbOrderData = {
      ...cachedOrder,
      tracking_number: trackingNumber,
      status: 'failed', // Main order status
      payment_status: `failed: ${failureReason}`, // Detailed payment status
      created_at: cachedOrder.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from('custom_bot_orders')
      .insert([dbOrderData])
      .select()
      .single();

    if (insertError) {
      console.error(`[${new Date().toISOString()}] Error moving FAILED cached order to database:`, insertError);
      // Don't delete from Redis if DB insert fails, to allow for potential retry
      return null;
    }

    // On successful insert, remove from Redis cache
    await redisClient.del(`custom_bot_order:${refCode}`);
    console.log(`[${new Date().toISOString()}] Moved FAILED cached order to database with tracking number: ${trackingNumber}`);

    // Not sending a failure email to the user automatically to avoid spam. Admin can review.

    return insertedOrder;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in moveAndFailCustomBotOrderFromCache:`, error.message);
    return null;
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`[${new Date().toISOString()}] 🌐 Server running on port ${PORT}`);
  
  // Wait for initialization to complete before showing ready message
  const checkInit = setInterval(() => {
    if (isServerInitialized) {
      console.log(`[${new Date().toISOString()}] 🚀 Server is ready to handle requests`);
      clearInterval(checkInit);
    }
  }, 100);
});

// Helper function to move cached order from Redis to database with tracking number
async function moveCustomBotOrderFromCache(refCode) {
  try {
    // Get cached order from Redis - it will be an object if it's a JSON string
    const cachedOrder = await redisClient.get(`custom_bot_order:${refCode}`);
    if (!cachedOrder) {
      console.error(`[${new Date().toISOString()}] No cached order found in Redis for ref code: ${refCode}`);
      return null;
    }
    
    // Generate tracking number
    const trackingNumber = `CB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    // Create database order with tracking number
    const dbOrderData = {
      ...cachedOrder,
      tracking_number: trackingNumber,
      status: 'pending',
      payment_status: 'paid',
      created_at: cachedOrder.created_at,
      updated_at: new Date().toISOString()
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from('custom_bot_orders')
      .insert([dbOrderData])
      .select()
      .single();

    if (insertError) {
      console.error(`[${new Date().toISOString()}] Error moving cached order to database:`, insertError);
      return null;
    }

    // Remove from Redis cache
    await redisClient.del(`custom_bot_order:${refCode}`);
    
    // Send confirmation emails with tracking number
    try {
      await sendCustomBotOrderConfirmation(
        insertedOrder.client_email, 
        insertedOrder.tracking_number, 
        insertedOrder.bot_description, 
        insertedOrder.budget_amount, 
        insertedOrder.payment_method
      );
    } catch (emailError) {
      console.error(`[${new Date().toISOString()}] Failed to send customer confirmation email:`, emailError.message);
    }

    try {
      await sendCustomBotPaymentConfirmation(insertedOrder);
    } catch (emailError) {
      console.error(`[${new Date().toISOString()}] Failed to send payment confirmation email:`, emailError.message);
    }

    console.log(`[${new Date().toISOString()}] Moved cached order to database with tracking number: ${trackingNumber}`);
    return insertedOrder;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error moving cached order to database:`, error);
    return null;
  }
}
