const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
// Add multer for file uploads
const multer = require('multer');

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as buffers
  limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB
});

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

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) return next();
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Sitemap endpoint
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { data: products } = await supabase.from('products').select('slug, updated_at').eq('is_active', true);
    const { data: staticPages } = await supabase.from('static_pages').select('slug, updated_at');

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    sitemap += `
      <url>
        <loc>https://botblitz.store/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>\n`;

    for (const page of staticPages || []) {
      sitemap += `
        <url>
          <loc>https://botblitz.store${page.slug}</loc>
          <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.6</priority>
        </url>\n`;
    }

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
    const { data: settings } = await supabase.from('settings').select('payment_method').single();
    if (settings.payment_method !== 'payhero') {
      return res.status(400).json({ success: false, error: 'PayHero payments are disabled' });
    }

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
    req.session.payment = { product_id, amount, status: 'pending' };
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
      return res.status(200).json({ success: true });
    }

    const { data: settings } = await supabase.from('settings').select('payment_method').single();
    if (settings.payment_method !== 'payhero') {
      console.log(`[${new Date().toISOString()}] PayHero payment ignored (manual mode)`);
      return res.status(200).json({ success: true });
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
      .createSignedUrl(product.file_url, 60);
    if (!signedUrl) {
      console.error(`[${new Date().toISOString()}] Failed to generate signed URL for ${product.file_url}`);
      return res.status(200).json({ success: true });
    }

    // Store download URL in session (client must poll /api/check-payment)
    req.session.payment = { product_id: product.id, download_url: signedUrl.signedUrl, status: 'success' };
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in payment callback:`, error.message);
    res.status(200).json({ success: true });
  }
});

// Check payment status (for PayHero)
app.get('/api/check-payment', async (req, res) => {
  try {
    if (!req.session.payment || req.session.payment.status !== 'success') {
      return res.status(400).json({ success: false, error: 'No successful payment found' });
    }
    res.json({ success: true, download_url: req.session.payment.download_url });
    delete req.session.payment; // Clear session after retrieval
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking payment:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check payment' });
  }
});

app.post('/api/add-category', isAuthenticated, async (req, res) => {
  const { name } = req.body;
  try {
    const { data: category } = await supabase
      .from('categories')
      .insert([{ name }])
      .select()
      .single();
    res.json({ success: true, category });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding category:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to add category' });
  }
});

app.post('/api/delete-category', isAuthenticated, async (req, res) => {
  const { id } = req.body;
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting category:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

app.post('/api/update-settings', isAuthenticated, async (req, res) => {
  const updates = req.body;
  try {
    const { data: currentSettings } = await supabase.from('settings').select('*').single();
    const updatedSettings = { ...currentSettings, ...updates };
    const { data } = await supabase
      .from('settings')
      .upsert(updatedSettings)
      .select()
      .single();
    res.json({ success: true, settings: data });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating settings:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// New Endpoints Start Here

// /api/update-logo
app.post('/api/update-logo', isAuthenticated, upload.single('logo'), async (req, res) => {
  const logoFile = req.file;
  try {
    if (!logoFile) return res.status(400).json({ success: false, error: 'No logo file uploaded' });

    const { data: currentSettings } = await supabase
      .from('settings')
      .select('logo_url')
      .single();
    if (currentSettings.logo_url) {
      const fileName = currentSettings.logo_url.split('/').pop();
      await supabase.storage
        .from('logos')
        .remove([`logos/${fileName}`]);
    }

    const fileName = `${Date.now()}_${logoFile.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(`logos/${fileName}`, logoFile.buffer, {
        contentType: logoFile.mimetype,
        upsert: true
      });
    if (uploadError) throw uploadError;

    const logoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/logos/logos/${fileName}`;
    const { data: updatedSettings } = await supabase
      .from('settings')
      .update({ logo_url: logoUrl, updated_at: new Date() })
      .eq('id', currentSettings.id)
      .select()
      .single();
    res.json({ success: true, logo_url: updatedSettings.logo_url });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating logo:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update logo' });
  }
});

// /api/update-socials
app.post('/api/update-socials', isAuthenticated, upload.fields([
  { name: 'tiktok_logo', maxCount: 1 },
  { name: 'instagram_logo', maxCount: 1 },
  { name: 'x_logo', maxCount: 1 },
  { name: 'facebook_logo', maxCount: 1 },
  { name: 'youtube_logo', maxCount: 1 }
]), async (req, res) => {
  const platforms = ['tiktok', 'instagram', 'x', 'facebook', 'youtube'];
  try {
    const updates = {};
    for (const platform of platforms) {
      const url = req.body[`${platform}_url`];
      const logoFile = req.files[`${platform}_logo`] ? req.files[`${platform}_logo`][0] : null;
      if (url) updates[`${platform}_url`] = url;

      if (logoFile) {
        const { data: existingLink } = await supabase
          .from('social_links')
          .select('logo_url')
          .eq('platform', platform)
          .single();
        if (existingLink?.logo_url) {
          const fileName = existingLink.logo_url.split('/').pop();
          await supabase.storage
            .from('socials')
            .remove([`socials/${fileName}`]);
        }

        const fileName = `${platform}_${Date.now()}_${logoFile.originalname}`;
        const { error: uploadError } = await supabase.storage
          .from('socials')
          .upload(`socials/${fileName}`, logoFile.buffer, {
            contentType: logoFile.mimetype,
            upsert: true
          });
        if (uploadError) throw uploadError;

        const logoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/socials/socials/${fileName}`;
        updates[`${platform}_logo_url`] = logoUrl;
      }
    }

    const { data: existingLinks } = await supabase
      .from('social_links')
      .select('*');
    for (const platform of platforms) {
      const existing = existingLinks.find(l => l.platform === platform);
      if (existing) {
        await supabase
          .from('social_links')
          .update({
            url: updates[`${platform}_url`] || existing.url,
            logo_url: updates[`${platform}_logo_url`] || existing.logo_url,
            updated_at: new Date()
          })
          .eq('platform', platform);
      } else if (updates[`${platform}_url`]) {
        await supabase
          .from('social_links')
          .insert({
            platform,
            url: updates[`${platform}_url`],
            logo_url: updates[`${platform}_logo_url`],
            created_at: new Date(),
            updated_at: new Date()
          });
      }
    }
    const { data: updatedLinks } = await supabase.from('social_links').select('*');
    res.json({ success: true, social_links: updatedLinks });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating socials:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update social links' });
  }
});

// /api/delete-social-logo
app.post('/api/delete-social-logo', isAuthenticated, async (req, res) => {
  const { platform } = req.body;
  try {
    if (!platform) return res.status(400).json({ success: false, error: 'Platform is required' });

    const { data: link } = await supabase
      .from('social_links')
      .select('logo_url')
      .eq('platform', platform)
      .single();
    if (link?.logo_url) {
      const fileName = link.logo_url.split('/').pop();
      await supabase.storage
        .from('socials')
        .remove([`socials/${fileName}`]);
      await supabase
        .from('social_links')
        .update({ logo_url: null, updated_at: new Date() })
        .eq('platform', platform);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting social logo:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete social logo' });
  }
});

// /api/add-page
app.post('/api/add-page', isAuthenticated, async (req, res) => {
  const { title, slug, meta, content } = req.body;
  try {
    if (!title || !slug || !content) return res.status(400).json({ success: false, error: 'Title, slug, and content are required' });

    const meta_description = meta.slice(0, 140);
    const { data, error } = await supabase
      .from('static_pages')
      .insert({
        title,
        slug,
        content,
        meta_description,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, page: data });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding page:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to add page' });
  }
});

// /api/delete-page
app.post('/api/delete-page', isAuthenticated, async (req, res) => {
  const { id } = req.body;
  try {
    if (!id) return res.status(400).json({ success: false, error: 'Page ID is required' });

    const { error } = await supabase
      .from('static_pages')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting page:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete page' });
  }
});

// /api/update-credentials
app.post('/api/update-credentials', isAuthenticated, async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', req.session.email)
      .single();
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    const password_hash = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from('admins')
      .update({ email, password_hash, updated_at: new Date() })
      .eq('id', admin.id);
    if (error) throw error;

    req.session.email = email; // Update session email
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating credentials:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update credentials' });
  }
});

// Existing Endpoints Continue Here

app.post('/api/update-bot', isAuthenticated, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bot_file', maxCount: 1 }
]), async (req, res) => {
  const { id, name, price, category_id, description, embed_link, is_active } = req.body;
  const thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
  const bot_file = req.files['bot_file'] ? req.files['bot_file'][0] : null;

  try {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Bot not found' });

    let thumbnailPath = product.thumbnail_url;
    let botPath = product.file_url;

    if (thumbnail) {
      await supabase.storage.from('thumbnails').remove([thumbnailPath]);
      thumbnailPath = `thumbnails/${product.file_id}_${name}.jpg`;
      await supabase.storage.from('thumbnails').upload(thumbnailPath, thumbnail.buffer, { contentType: 'image/jpeg' });
    }

    if (bot_file) {
      await supabase.storage.from('bots').remove([botPath]);
      botPath = `bots/${product.file_id}_${name}.zip`;
      await supabase.storage.from('bots').upload(botPath, bot_file.buffer, { contentType: 'application/zip' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const excerpt = description.slice(0, 247) + '...';
    const meta_description = excerpt.slice(0, 140);

    const { data: updatedProduct } = await supabase
      .from('products')
      .update({
        name,
        price_kes: parseFloat(price),
        category_id,
        description,
        embed_link,
        thumbnail_url: thumbnailPath,
        file_url: botPath,
        slug,
        excerpt,
        meta_description,
        is_active: is_active === 'true' // FormData sends boolean as string
      })
      .eq('id', id)
      .select()
      .single();

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update bot' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Error logging out:`, err.message);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Submit manual payment ref code
app.post('/api/submit-ref', async (req, res) => {
  const { product_id, ref_code, amount, timestamp, customer_email } = req.body;
  try {
    const { data: settings } = await supabase.from('settings').select('payment_method').single();
    if (settings.payment_method !== 'manual') {
      return res.status(400).json({ success: false, error: 'Manual payments are disabled' });
    }

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.price_kes !== amount) return res.status(400).json({ success: false, error: 'Invalid amount' });

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('product_id', product_id)
      .eq('ref_code', ref_code)
      .single();
    if (existingOrder) return res.status(400).json({ success: false, error: 'Ref code already submitted' });

    const { error } = await supabase.from('orders').insert([
      { product_id, ref_code, status: 'pending', amount_kes: amount, customer_email, created_at: timestamp }
    ]);
    if (error) throw error;

    res.json({ success: true });
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
  const { product_id, ref_code, status } = req.body;
  try {
    if (!['confirmed', 'no payment', 'partial payment'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('product_id', product_id)
      .eq('ref_code', ref_code);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// Confirm order (admin)
app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  const { product_id, ref_code } = req.body;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('file_url')
      .eq('id', product_id)
      .single();
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const { data: signedUrl } = await supabase.storage
      .from('bots')
      .createSignedUrl(product.file_url, 60);
    if (!signedUrl) throw new Error('Failed to generate signed URL');

    await supabase.from('orders').delete().eq('product_id', product_id).eq('ref_code', ref_code);
    res.json({ success: true, downloadLink: signedUrl.signedUrl });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

// Check order status
app.get('/api/order-status/:product_id/:ref_code', async (req, res) => {
  const { product_id, ref_code } = req.params;
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('product_id', product_id)
      .eq('ref_code', ref_code)
      .single();
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (order.status === 'confirmed') {
      const { data: product } = await supabase
        .from('products')
        .select('file_url')
        .eq('id', product_id)
        .single();
      if (!product) return res.status(500).json({ success: false, error: 'Product not found' });

      const { data: signedUrl } = await supabase.storage
        .from('bots')
        .createSignedUrl(product.file_url, 60);
      if (!signedUrl) throw new Error('Failed to generate signed URL');

      await supabase
        .from('orders')
        .delete()
        .eq('product_id', product_id)
        .eq('ref_code', ref_code);
      res.json({ success: true, status: order.status, downloadLink: signedUrl.signedUrl });
    } else {
      res.status(400).json({ success: false, error: `Order is ${order.status}` });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

// Add bot (admin)
app.post('/api/add-bot', isAuthenticated, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bot_file', maxCount: 1 }
]), async (req, res) => {
  const { name, price, description, embed_link, category_id, is_active } = req.body;
  const thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
  const bot_file = req.files['bot_file'] ? req.files['bot_file'][0] : null;

  try {
    if (!thumbnail || !bot_file) return res.status(400).json({ success: false, error: 'Thumbnail and bot file are required' });

    const file_id = crypto.randomUUID();
    const thumbnailPath = `thumbnails/${file_id}_${name}.jpg`;
    const botPath = `bots/${file_id}_${name}.zip`;

    const [thumbnailRes, botRes] = await Promise.all([
      supabase.storage.from('thumbnails').upload(thumbnailPath, thumbnail.buffer, { contentType: 'image/jpeg' }),
      supabase.storage.from('bots').upload(botPath, bot_file.buffer, { contentType: 'application/zip' })
    ]);
    if (thumbnailRes.error || botRes.error) throw new Error('File upload failed');

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
        thumbnail_url: thumbnailPath,
        file_url: botPath,
        file_id,
        slug,
        excerpt,
        meta_description,
        is_active: is_active === 'true'
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
  try {
    const { data: admin } = await supabase
      .from('admins')
      .select('email, password_hash')
      .eq('email', email)
      .single();
    if (!admin) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    req.session.isAuthenticated = true;
    req.session.email = email; // Store email in session for /api/update-credentials
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error logging in:`, error.message);
    res.status(500).json({ success: false, error: 'Login failed' });
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

    const { data: signedThumbnail } = await supabase.storage
      .from('thumbnails')
      .createSignedUrl(product.thumbnail_url, 3600); // 1-hour signed URL for thumbnail

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
          <img src="${signedThumbnail.signedUrl}" alt="${product.name}" class="w-full max-w-3xl mx-auto rounded-lg mb-4">
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

// Serve virus.html
app.get('/virus.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'virus.html'));
});

// Delete old orders (3 days)
async function deleteOldOrders() {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await supabase
      .from('orders')
      .delete()
      .lt('created_at', threeDaysAgo.toISOString());
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
