const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const sanitizeHtml = require('sanitize-html');

dotenv.config();
const app = express();

// CORS configuration
const ALLOWED_ORIGINS = ['https://botblitz.store', 'https://www.botblitz.store'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  store: new session.MemoryStore(),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'secure-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_DATABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Sitemap endpoint
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { data: products } = await supabase.from('products').select('slug, updated_at').eq('is_active', true);
    const { data: staticPages } = await supabase.from('static_pages').select('slug, updated_at');

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Homepage
    sitemap += `
      <url>
        <loc>https://botblitz.store/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>\n`;

    // Static pages
    for (const page of staticPages || []) {
      sitemap += `
        <url>
          <loc>https://botblitz.store${page.slug}</loc>
          <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.6</priority>
        </url>\n`;
    }

    // Product pages
    for (const product of products || []) {
      sitemap += `
        <url>
          <loc>https://botblitz.store/product/${product.slug}</loc>
          <lastmod>${new Date(product.updated_at).toISOString().split('T')[0]}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>\n`;
    }

    sitemap += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating sitemap:`, error.message);
    res.status(500).send('Failed to generate sitemap.');
  }
});

// Session check
app.get('/api/check-session', (req, res) => {
  res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

// Fetch all data
app.get('/api/data', async (req, res) => {
  try {
    const [productsRes, categoriesRes, settingsRes, staticPagesRes, socialLinksRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('categories').select('*'),
      supabase.from('settings').select('*').limit(1).single(),
      supabase.from('static_pages').select('*'),
      supabase.from('social_links').select('*')
    ]);
    res.json({
      products: productsRes.data || [],
      categories: categoriesRes.data || [],
      settings: settingsRes.data || {},
      staticPages: staticPagesRes.data || [],
      socialLinks: socialLinksRes.data || []
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

// Initiate PayHero payment
app.post('/api/initiate-payment', async (req, res) => {
  const { product_id, amount } = req.body;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, price_kes, name, slug')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.price_kes !== amount) return res.status(400).json({ success: false, error: 'Invalid amount' });

    const response = await axios.post(
      'https://api.payhero.co.ke/payments',
      {
        channel_id: 2328,
        amount,
        reference: product_id,
        callback_url: 'https://botblitz.store/api/payment-callback'
      },
      {
        headers: {
          Authorization: process.env.PAYHERO_BASIC_AUTH_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true, payment_url: response.data.payment_url });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error initiating payment:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
});

// PayHero callback
app.post('/api/payment-callback', async (req, res) => {
  try {
    const { status, user_reference, amount } = req.body;
    if (status !== 'success') {
      console.log(`[${new Date().toISOString()}] Payment failed for ref ${user_reference}: ${status}`);
      return res.status(200).json({ success: true }); // Acknowledge webhook
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, file_url, name')
      .eq('id', user_reference)
      .eq('is_active', true)
      .single();
    if (!product) {
      console.error(`[${new Date().toISOString()}] Product not found for ref ${user_reference}`);
      return res.status(200).json({ success: true });
    }

    const { data: signedUrl } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.file_url, 60); // 1-minute signed URL
    if (!signedUrl) {
      console.error(`[${new Date().toISOString()}] Failed to generate signed URL for ${product.file_url}`);
      return res.status(200).json({ success: true });
    }

    // Notify frontend via session or temporary storage (simplified)
    console.log(`[${new Date().toISOString()}] Payment successful for ref ${user_reference}, download: ${signedUrl.signedUrl}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in payment callback:`, error.message);
    res.status(200).json({ success: true }); // Acknowledge webhook
  }
});

// Submit manual payment ref code
app.post('/api/submit-ref', async (req, res) => {
  const { item, refCode, amount, timestamp } = req.body;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', item)
      .eq('is_active', true)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('item_id', item)
      .eq('ref_code', refCode)
      .single();
    if (existingOrder) return res.status(400).json({ success: false, error: 'Ref code already submitted' });

    const { error } = await supabase.from('orders').insert([
      { item_id: item, ref_code: refCode, amount, timestamp, status: 'pending', downloaded: false }
    ]);
    if (error) throw error;

    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Order saved: ${item}/${refCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting ref code:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to submit ref code' });
  }
});

// Fetch orders (admin)
app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const { data: orders } = await supabase.from('orders').select('*');
    res.json({ success: true, orders: orders || [] });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Update order status (admin)
app.post('/api/update-order-status', isAuthenticated, async (req, res) => {
  const { item, refCode, status } = req.body;
  try {
    if (!['confirmed', 'no payment', 'partial payment'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('item_id', item)
      .eq('ref_code', refCode);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// Confirm order (admin)
app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  const { item, refCode } = req.body;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('file_url')
      .eq('id', item)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const { data: signedUrl } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.file_url, 60);
    if (!signedUrl) throw new Error('Failed to generate signed URL');

    await supabase.from('orders').delete().eq('item_id', item).eq('ref_code', refCode);
    res.json({ success: true, downloadLink: signedUrl.signedUrl });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

// Check order status
app.get('/api/order-status/:item/:refCode', async (req, res) => {
  const { item, refCode } = req.params;
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('item_id', item)
      .eq('ref_code', refCode)
      .single();
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (order.status === 'confirmed' && !order.downloaded) {
      const { data: product } = await supabase
        .from('products')
        .select('file_url')
        .eq('id', item)
        .single();
      if (!product) return res.status(500).json({ success: false, error: 'Product not found' });

      const { data: signedUrl } = await supabase.storage
        .from('bots')
        .createSignedUrl(product.file_url, 60);
      if (!signedUrl) throw new Error('Failed to generate signed URL');

      await supabase
        .from('orders')
        .update({ downloaded: true })
        .eq('item_id', item)
        .eq('ref_code', refCode);
      res.json({ success: true, status: order.status, downloadLink: signedUrl.signedUrl });
    } else if (order.downloaded) {
      res.status(403).json({ success: false, error: 'Ref code already used' });
    } else {
      res.status(400).json({ success: false, error: `Order is ${order.status}` });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

// Add bot (admin)
app.post('/api/add-bot', isAuthenticated, async (req, res) => {
  const { name, price, description, embed_link, category_id, thumbnail, bot_file } = req.body;
  try {
    const { data: thumbnailUrl } = await supabase.storage
      .from('thumbnails')
      .upload(`thumbnails/${Date.now()}_${name}.jpg`, thumbnail, { contentType: 'image/jpeg' });
    const { data: botUrl } = await supabase.storage
      .from('bots')
      .upload(`bots/${Date.now()}_${name}.zip`, bot_file, { contentType: 'application/zip' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const excerpt = description.slice(0, 247) + '...';
    const meta_description = excerpt.slice(0, 140);

    const { data: product } = await supabase.from('products').insert([
      {
        name,
        price_kes: parseFloat(price),
        description,
        embed_link,
        category_id,
        thumbnail_url: thumbnailUrl.path,
        file_url: botUrl.path,
        slug,
        excerpt,
        meta_description,
        is_active: true
      }
    ]).select().single();

    res.json({ success: true, product });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

// Delete bot (admin)
app.post('/api/delete-bot', isAuthenticated, async (req, res) => {
  const { id } = req.body;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('thumbnail_url, file_url')
      .eq('id', id)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Bot not found' });

    await Promise.all([
      supabase.storage.from('thumbnails').remove([product.thumbnail_url]),
      supabase.storage.from('bots').remove([product.file_url]),
      supabase.from('products').delete().eq('id', id)
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

// Admin login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: settings } = await supabase.from('settings').select('admin_email, admin_password').single();
  if (email === settings.admin_email && password === settings.admin_password) {
    req.session.isAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Static page
app.get('/api/page/:slug', async (req, res) => {
  const slug = `/${req.params.slug}`;
  try {
    const { data: page } = await supabase
      .from('static_pages')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, page });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching page:`, error.message);
    res.status(404).json({ success: false, error: 'Page not found' });
  }
});

// Dynamic static page rendering
app.get('/:slug', async (req, res) => {
  try {
    const { data: page } = await supabase
      .from('static_pages')
      .select('*')
      .eq('slug', `/${req.params.slug}`)
      .single();
    if (!page) return res.status(404).send('Page not found');

    const htmlContent = sanitizeHtml(page.content);
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${page.meta_description || 'BotBlitz Store - Legal and policy information'}">
        <title>${page.title} - BotBlitz Store</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100">
        <nav class="bg-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="text-xl font-bold text-gray-800">BotBlitz Store</a>
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
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error rendering static page:`, error.message);
    res.status(404).send('Page not found');
  }
});

// Product page rendering
app.get('/product/:slug', async (req, res) => {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();
    if (!product) return res.status(404).send('Product not found');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${product.meta_description}">
        <title>${product.name} - BotBlitz Store</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100">
        <nav class="bg-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="text-xl font-bold text-gray-800">BotBlitz Store</a>
              </div>
            </div>
          </div>
        </nav>
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">${product.name}</h1>
          <img src="${product.thumbnail_url}" alt="${product.name}" class="w-full max-w-3xl mx-auto rounded-lg mb-4">
          <div class="prose mb-4">${sanitizeHtml(product.description)}</div>
          ${product.embed_link ? `<div class="embed-container mb-4"><iframe src="${product.embed_link}" frameborder="0" allowfullscreen class="rounded-lg"></iframe></div>` : ''}
          <p class="text-green-600 font-bold mb-4">KES ${product.price_kes}</p>
          <a href="/" class="text-blue-600 underline">Back to Home</a>
        </main>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error rendering product page:`, error.message);
    res.status(404).send('Product not found');
  }
});

// Serve index.html
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin.html
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Delete old orders (3 days)
async function deleteOldOrders() {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await supabase
      .from('orders')
      .delete()
      .lt('timestamp', threeDaysAgo.toISOString());
    console.log(`[${new Date().toISOString()}] Deleted orders older than 3 days`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting old orders:`, error.message);
  }
}

// Initialize server
async function initialize() {
  await deleteOldOrders();
  setInterval(deleteOldOrders, 24 * 60 * 60 * 1000);
  console.log(`[${new Date().toISOString()}] Server initialized`);
}

initialize().catch(error => {
  console.error(`[${new Date().toISOString()}] Server initialization failed:`, error.message);
  process.exit(1);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
