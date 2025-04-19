const express = require('express');
const { google } = require('googleapis');
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
const stream = require('stream');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

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
  // Default to botblitz.store for external or non-matching origins
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
//sitemap start
app.get('/sitemap.xml', async (req, res) => {
  try {
    const products = cachedData.products || [];
    const staticPages = cachedData.staticPages || [];

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

    // Product pages
    for (const product of products) {
      if (product.item && !product.isArchived) {
        sitemap += `
          <url>
            <loc>https://botblitz.store/store?id=${product.item}</loc>
            <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>\n`;
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
//sitemap end
app.use(express.static(publicPath));

// Log static file middleware setup
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
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Log session details for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request URL: ${req.url}`);
  console.log(`[${new Date().toISOString()}] Session ID: ${req.sessionID}`);
  console.log(`[${new Date().toISOString()}] Session Data:`, req.session);
  console.log(`[${new Date().toISOString()}] Cookies:`, req.cookies);
  next();
});

// Google API setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

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

// Helper function to fetch item details
async function getItemDetails(itemNumber) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J',
    });
    const row = response.data.values.find(row => row[0] == itemNumber);
    if (!row) {
      throw new Error(`Item ${itemNumber} not found in Sheet1`);
    }
    return {
      fileId: row[1],
      price: parseFloat(row[2]),
      name: row[3],
      desc: row[4] || '',
      img: row[5] || 'https://via.placeholder.com/300',
      category: row[6] || 'General',
      embed: row[7] || '',
      isNew: row[8] === 'TRUE',
      isArchived: row[9] === 'TRUE'
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching item details for ${itemNumber}:`, error.message);
    throw error;
  }
}

// Load data from Google Sheets
async function loadData() {
  try {
    const productRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J'
    });
    const products = productRes.data.values?.slice(1).map(row => ({
      item: row[0],
      fileId: row[1],
      price: parseFloat(row[2]),
      name: row[3],
      desc: row[4] || '',
      img: row[5] || 'https://via.placeholder.com/300',
      category: row[6] || 'General',
      embed: row[7] || '',
      isNew: row[8] === 'TRUE',
      isArchived: row[9] === 'TRUE'
    })) || [];

    const settingsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B'
    });
    const settingsRows = settingsRes.data.values || [];
    if (!settingsRows[0] || settingsRows[0][0] !== 'KEY' || settingsRows[0][1] !== 'VALUE') {
      console.error(`[${new Date().toISOString()}] Invalid headers in settings tab. Expected: ["KEY", "VALUE"], Got: ${settingsRows[0]}`);
      throw new Error('Invalid headers in settings tab');
    }
    const settingsData = Object.fromEntries(settingsRows.slice(1).map(([k, v]) => [k, v]) || []);
    const settings = {
      supportEmail: settingsData.supportEmail || 'kaylie254.business@gmail.com',
      copyrightText: settingsData.copyrightText || '© 2025 Deriv Bot Store',
      logoUrl: settingsData.logoUrl || '',
      socials: settingsData.socials ? JSON.parse(settingsData.socials) : {},
      urgentMessage: settingsData.urgentMessage ? JSON.parse(settingsData.urgentMessage) : { enabled: false, text: '' },
      fallbackRate: parseFloat(settingsData.fallbackRate) || 130,
      adminEmail: settingsData.adminEmail || 'admin@kaylie254.com',
      adminPassword: settingsData.adminPassword || 'securepassword123',
      mpesaTill: settingsData.mpesaTill || '4933614'
    };

    const categoriesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A'
    });
    const categories = [...new Set(categoriesRes.data.values?.slice(1).flat() || ['General'])];
    console.log(`[${new Date().toISOString()}] Loaded categories (after deduplication):`, categories);

    const pagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C'
    });
    let staticPages = pagesRes.data.values?.slice(1).map(row => ({
      title: row[0],
      slug: row[1],
      content: row[2]
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
    console.log(`[${new Date().toISOString()}] Data loaded successfully from Google Sheets`);
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

// Stream file to Google Drive
async function streamUploadToDrive(file, filename) {
  try {
    const fileMetadata = {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    const media = {
      mimeType: file.mimetype,
      body: bufferStream
    };
    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });
    console.log(`[${new Date().toISOString()}] File uploaded to Google Drive, ID: ${driveRes.data.id}`);
    return driveRes.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error uploading file to Google Drive:`, error.message);
    throw error;
  }
}

// Save data to Google Sheets
async function saveData() {
  try {
    const productValues = [
      ['ITEM NUMBER', 'FILE ID', 'PRICE', 'NAME', 'DESCRIPTION', 'IMAGE', 'CATEGORY', 'EMBED', 'IS NEW', 'IS ARCHIVED'],
      ...cachedData.products.map(p => [
        p.item,
        p.fileId,
        p.price,
        p.name,
        p.desc,
        p.img,
        p.category,
        p.embed,
        p.isNew ? 'TRUE' : 'FALSE',
        p.isArchived ? 'TRUE' : 'FALSE'
      ])
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J',
      valueInputOption: 'RAW',
      resource: { values: productValues }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'Sheet1!A:J',
      valueInputOption: 'RAW',
      resource: { values: productValues }
    });

    const settingsForSheet = [
      ['KEY', 'VALUE'],
      ...Object.entries(cachedData.settings).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return [key, JSON.stringify(value)];
        }
        return [key, value];
      })
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B',
      valueInputOption: 'RAW',
      resource: { values: settingsForSheet }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A',
      valueInputOption: 'RAW',
      resource: { values: [['CATEGORY'], ...[...new Set(cachedData.categories)].map(c => [c])] }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C',
      valueInputOption: 'RAW',
      resource: {
        values: [['TITLE', 'SLUG', 'CONTENT'], ...cachedData.staticPages.map(p => [p.title, p.slug, p.content])]
      }
    });

    console.log(`[${new Date().toISOString()}] Data saved successfully to Google Sheets`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving data:`, error.message);
    throw error;
  }
}

// Delete orders older than 3 days
async function deleteOldOrders() {
  try {
    for (const spreadsheetId of [process.env.SPREADSHEET_ID, process.env.PRODUCTS_SHEET_ID]) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'orders!A:F'
      });
      const rows = response.data.values || [];
      if (rows.length <= 1) {
        console.log(`[${new Date().toISOString()}] No orders to delete in spreadsheet ${spreadsheetId}`);
        continue;
      }

      const currentTime = new Date();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      const filteredRows = [rows[0]];

      for (let i = 1; i < rows.length; i++) {
        const timestampStr = rows[i][3];
        let orderDate;
        try {
          orderDate = new Date(timestampStr);
          if (isNaN(orderDate.getTime())) {
            console.warn(`[${new Date().toISOString()}] Invalid timestamp for order at row ${i + 1}: ${timestampStr}, keeping order`);
            filteredRows.push(rows[i]);
            continue;
          }
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] Error parsing timestamp for order at row ${i + 1}: ${timestampStr}, keeping order`);
          filteredRows.push(rows[i]);
            continue;
        }

        const ageInMs = currentTime - orderDate;
        if (ageInMs <= threeDaysInMs) {
          filteredRows.push(rows[i]);
        } else {
          console.log(`[${new Date().toISOString()}] Deleting order at row ${i + 1} in spreadsheet ${spreadsheetId}, timestamp: ${timestampStr}`);
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'orders!A:F',
        valueInputOption: 'RAW',
        resource: { values: filteredRows }
      });
      console.log(`[${new Date().toISOString()}] Old orders deleted successfully in spreadsheet ${spreadsheetId}`);
    }
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

// Ensure Google Sheet tabs exist with correct headers
async function ensureSheetTabs(spreadsheetId) {
  const tabsToEnsure = {
    'Sheet1': ['ITEM NUMBER', 'FILE ID', 'PRICE', 'NAME', 'DESCRIPTION', 'IMAGE', 'CATEGORY', 'EMBED', 'IS NEW', 'IS ARCHIVED'],
    'settings': ['KEY', 'VALUE'],
    'categories': ['CATEGORY'],
    'staticPages': ['TITLE', 'SLUG', 'CONTENT'],
    'orders': ['ITEM', 'REF CODE', 'AMOUNT', 'TIMESTAMP', 'STATUS', 'DOWNLOADED'],
    'emails': ['EMAIL', 'SUBJECT', 'BODY']
  };

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets.map(sheet => sheet.properties.title);

    for (const [sheetName, headers] of Object.entries(tabsToEnsure)) {
      if (!existingSheets.includes(sheetName)) {
        console.log(`[${new Date().toISOString()}] Creating missing sheet ${sheetName} in spreadsheet ${spreadsheetId}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: { title: sheetName }
              }
            }]
          }
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!1:1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        });
        console.log(`[${new Date().toISOString()}] Added headers to ${sheetName} in spreadsheet ${spreadsheetId}: ${headers}`);
      } else {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!1:1`
        });
        const actualHeaders = res.data.values?.[0] || [];
        if (JSON.stringify(actualHeaders) !== JSON.stringify(headers)) {
          console.log(`[${new Date().toISOString()}] Fixing headers for ${sheetName} in spreadsheet ${spreadsheetId}. Expected: ${headers}, Got: ${actualHeaders}`);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!1:1`,
            valueInputOption: 'RAW',
            resource: { values: [headers] }
          });
          console.log(`[${new Date().toISOString()}] Headers fixed for ${sheetName} in spreadsheet ${spreadsheetId}`);
        }
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error ensuring sheet tabs for spreadsheet ${spreadsheetId}:`, error.message);
    throw error;
  }
}

// Self-check on startup
async function selfCheck() {
  console.log(`[${new Date().toISOString()}] Starting server self-check...`);

  try {
    await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    console.log(`[${new Date().toISOString()}] Successfully connected to SPREADSHEET_ID`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to SPREADSHEET_ID:`, error.message);
  }

  try {
    await sheets.spreadsheets.get({ spreadsheetId: process.env.PRODUCTS_SHEET_ID });
    console.log(`[${new Date().toISOString()}] Successfully connected to PRODUCTS_SHEET_ID`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to PRODUCTS_SHEET_ID:`, error.message);
  }

  await ensureSheetTabs(process.env.SPREADSHEET_ID);
  await ensureSheetTabs(process.env.PRODUCTS_SHEET_ID);

  try {
    const folder = await drive.files.get({ fileId: process.env.GOOGLE_DRIVE_FOLDER_ID });
    if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error(`GOOGLE_DRIVE_FOLDER_ID (${process.env.GOOGLE_DRIVE_FOLDER_ID}) is not a folder`);
    }
    console.log(`[${new Date().toISOString()}] Successfully connected to Google Drive folder`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to Google Drive folder:`, error.message);
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Test Email from Deriv Bot Store Server',
      text: 'Server is up and running!'
    });
    console.log(`[${new Date().toISOString()}] Test email sent successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send test email:`, error.message);
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
    cachedData = req.body;
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

    const driveData = await streamUploadToDrive(file, `${item}_${name}.${file.originalname.split('.').pop()}`);
    const product = {
      item,
      fileId: driveData.id,
      price: parseFloat(price),
      name,
      desc,
      img,
      category,
      embed,
      isNew: isNew === 'true',
      isArchived: false
    };

    cachedData.products.push(product);
    await saveData();
    res.json({ success: true, product });
    console.log(`[${new Date().toISOString()}] Bot added successfully: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

app.post('/api/delete-bot', isAuthenticated, async (req, res) => {
  try {
    const { item } = req.body;

    // Step 1: Find the product in cache to get the fileId and cache index
    const productIndex = cachedData.products.findIndex(p => p.item === item);
    if (productIndex === -1) {
      console.log(`[${new Date().toISOString()}] Bot not found in cache: ${item}`);
      return res.status(404).json({ success: false, error: 'Bot not found in cache' });
    }
    const fileId = cachedData.products[productIndex].fileId;

    // Step 2: Fetch Sheet1 from both spreadsheets to verify the bot exists
    const spreadsheetIds = [
      { id: process.env.SPREADSHEET_ID, name: 'SPREADSHEET_ID' },
      { id: process.env.PRODUCTS_SHEET_ID, name: 'PRODUCTS_SHEET_ID' }
    ];

    const sheetData = [];
    for (const { id, name } of spreadsheetIds) {
      // Get the sheetId for Sheet1 dynamically
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: id });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Sheet1');
      if (!sheet) {
        console.error(`[${new Date().toISOString()}] Sheet1 not found in spreadsheet ${name} (${id})`);
        return res.status(500).json({ success: false, error: `Sheet1 not found in spreadsheet ${name}` });
      }
      const sheetId = sheet.properties.sheetId;

      // Fetch Sheet1 data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: 'Sheet1!A:J'
      });
      const rows = response.data.values || [];
      const rowIndex = rows.slice(1).findIndex(row => row[0] === item);
      sheetData.push({ spreadsheetId: id, name, sheetId, rows, rowIndex });
    }

    // Step 3: Verify the bot exists in both sheets
    for (const { name, rowIndex } of sheetData) {
      if (rowIndex === -1) {
        console.warn(`[${new Date().toISOString()}] Bot not found in ${name} Sheet1: ${item}`);
        return res.status(404).json({ success: false, error: `Bot not found in ${name} Sheet1` });
      }
    }

    // Step 4: Delete the file from Google Drive
    try {
      await drive.files.delete({ fileId });
      console.log(`[${new Date().toISOString()}] Deleted file from Google Drive, ID: ${fileId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting file from Google Drive:`, error.message);
      // Continue with deletion even if Google Drive deletion fails to ensure data consistency
    }

    // Step 5: Delete the bot from both sheets
    for (const { spreadsheetId, name, sheetId, rowIndex } of sheetData) {
      const rowToDelete = rowIndex + 1; // +1 to account for header row (0-based index)
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: rowToDelete,
                    endIndex: rowToDelete + 1
                  }
                }
              }
            ]
          }
        });
        console.log(`[${new Date().toISOString()}] Deleted bot row ${rowToDelete + 1} from ${name} Sheet1: ${item}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to delete bot row from ${name} Sheet1: ${error.message}`);
        return res.status(500).json({ success: false, error: `Failed to delete bot from ${name} Sheet1` });
      }
    }

    // Step 6: Update the cache after successful deletion from both sheets
    cachedData.products.splice(productIndex, 1);

    // Step 7: Send response only after all steps are complete
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Bot deleted successfully from both sheets: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

// Standalone function to send notification email
async function sendOrderNotification(item, refCode, amount) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Order - KES-${parseFloat(amount).toFixed(2)}`,
      text: `M-PESA Ref: ${refCode}\nItem Number: ${item}`
    });
    console.log(`[${new Date().toISOString()}] Order notification email sent for ref code ${refCode}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send order notification email for ref code ${refCode}:`, error.message);
  }
}

app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      console.log(`[${new Date().toISOString()}] Product not found: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F'
    });
    const rows = response.data.values || [];
    const existingOrder = rows.slice(1).find(row => row[0] === item && row[1] === refCode);
    if (existingOrder) {
      console.log(`[${new Date().toISOString()}] Ref code already submitted: ${refCode} for item: ${item}`);
      return res.status(400).json({ success: false, error: 'Ref code already submitted' });
    }

    const orderData = [[item, refCode, amount, timestamp, 'pending', 'FALSE']];

    // Save order to SPREADSHEET_ID first
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F',
      valueInputOption: 'RAW',
      resource: { values: orderData }
    });
    console.log(`[${new Date().toISOString()}] Order saved for item: ${item}, refCode: ${refCode}`);

    // Respond immediately to ensure client gets success
    res.json({ success: true });

    // Send email independently without awaiting
    Promise.resolve(sendOrderNotification(item, refCode, amount)).catch(err => {
      console.error(`[${new Date().toISOString()}] Async email error (order still saved):`, err.message);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting ref code:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to submit ref code' });
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F'
    });
    const rows = response.data.values || [];
    if (!rows[0] || rows[0].join(',') !== 'ITEM,REF CODE,AMOUNT,TIMESTAMP,STATUS,DOWNLOADED') {
      console.warn(`[${new Date().toISOString()}] Invalid headers in orders!A:F. Expected: ITEM,REF CODE,AMOUNT,TIMESTAMP,STATUS,DOWNLOADED, Got: ${rows[0] ? rows[0].join(',') : 'empty'}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'orders!A1:F1',
        valueInputOption: 'RAW',
        resource: { values: [['ITEM', 'REF CODE', 'AMOUNT', 'TIMESTAMP', 'STATUS', 'DOWNLOADED']] }
      });
      if (rows.length <= 1) {
        return res.json({ success: true, orders: [] });
      }
    }
    const orders = rows.slice(1).map(row => ({
      item: row[0] || '',
      refCode: row[1] || '',
      amount: row[2] || '',
      timestamp: row[3] || '',
      status: row[4] || 'pending',
      downloaded: row[5] === 'TRUE'
    }));
    res.json({ success: true, orders });
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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F'
    });
    const rows = response.data.values || [];
    const order = rows.slice(1).find(row => row[0] === item && row[1] === refCode);
    if (!order) {
      console.log(`[${new Date().toISOString()}] Order not found: ${item}/${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found. Please check the ref code or contact support.' });
    }
    const status = order[4] || 'pending';
    const downloaded = order[5] === 'TRUE';
    let downloadLink = null;

    if (status === 'confirmed' && !downloaded) {
      const product = cachedData.products.find(p => p.item === item) || await getItemDetails(item);
      if (product) {
        downloadLink = `${getBaseUrl(req)}/download/${product.fileId}`;
        const orderIndex = rows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
        rows[orderIndex + 1][5] = 'TRUE';
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: 'orders!A:F',
          valueInputOption: 'RAW',
          resource: { values: rows }
        });
        console.log(`[${new Date().toISOString()}] Marked order as downloaded: ${item}/${refCode}`);
      } else {
        console.error(`[${new Date().toISOString()}] Product not found in cache or Sheet1 for item: ${item}`);
        return res.status(500).json({ success: false, error: 'Product not found. Please contact support.' });
      }
    } else if (downloaded) {
      console.log(`[${new Date().toISOString()}] Ref code already used for download: ${item}/${refCode}`);
      return res.status(403).json({ success: false, error: 'Ref code already used for download. Contact support if you need assistance.' });
    } else {
      console.log(`[${new Date().toISOString()}] Order not confirmed: ${item}/${refCode}, status: ${status}`);
      return res.status(400).json({ success: false, error: `Order is ${status}. Please wait for confirmation or contact support.` });
    }

    res.json({ success: true, status, downloadLink });
    console.log(`[${new Date().toISOString()}] Order status checked: ${item}/${refCode} - Status: ${status}, Downloaded: ${downloaded}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking order status for ${item}/${refCode}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to check order status. Please contact support.' });
  }
});

app.post('/api/update-order-status', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, status } = req.body;
    if (!['confirmed', 'no payment', 'partial payment'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F'
    });
    const rows = response.data.values || [];
    const orderIndex = rows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
    if (orderIndex === -1) {
      console.log(`[${new Date().toISOString()}] Order not found for update: ${item}/${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    rows[orderIndex + 1][4] = status;
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F',
      valueInputOption: 'RAW',
      resource: { values: rows }
    });

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
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      console.log(`[${new Date().toISOString()}] Product not found for order confirmation: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const downloadLink = `${getBaseUrl(req)}/download/${product.fileId}`;
    const email = cachedData.settings.supportEmail;
    const subject = `Your Deriv Bot Purchase - ${item}`;
    const body = `Thank you for your purchase!\n\nItem: ${item}\nRef Code: ${refCode}\nAmount: ${amount}\n\nDownload your bot here: ${downloadLink}\n\nIf you have any issues, please contact support.`;

    const emailData = [[email, subject, body]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'emails!A:C',
      valueInputOption: 'RAW',
      resource: { values: emailData }
    });

    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:F'
    });
    const ordersRows = ordersResponse.data.values || [];
    const orderIndex = ordersRows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
    if (orderIndex !== -1) {
      ordersRows.splice(orderIndex + 1, 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'orders!A:F',
        valueInputOption: 'RAW',
        resource: { values: ordersRows }
      });
    }

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

    const itemDetails = await getItemDetails(item);
    if (price !== itemDetails.price) {
      console.log(`[${new Date().toISOString()}] Price tampering detected for item ${item}: received ${price}, expected ${itemDetails.price}`);
      return res.status(400).json({ success: false, error: 'Invalid price. Contact support.' });
    }

    const downloadLink = `${getBaseUrl(req)}/download/${itemDetails.fileId}`;
    res.json({ success: true, downloadLink });
    console.log(`[${new Date().toISOString()}] Generated download link for item ${item}: ${downloadLink}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error delivering file for item ${req.body.item}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to generate download link. Contact support.' });
  }
});

app.get('/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId;

  // Set dynamic CORS headers for download route
  const origin = req.get('origin') || req.get('referer');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://botblitz.store');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'X-Debug-Source, Content-Type');

  const product = cachedData.products.find(p => p.fileId === fileId);
  if (!product) {
    console.log(`[${new Date().toISOString()}] Invalid fileId: ${fileId}`);
    return res.status(403).json({ success: false, error: 'Invalid file ID. Contact support.' });
  }

  console.log(`[${new Date().toISOString()}] Download request for fileId: ${fileId}`);
  try {
    const fileMetadata = await drive.files.get({ fileId, fields: 'name, mimeType' });
    const fileName = fileMetadata.data.name || `file-${fileId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType || 'application/octet-stream');
    const file = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    file.data.pipe(res);
    console.log(`[${new Date().toISOString()}] File download started: ${fileId} (${fileName})`);
    file.data.on('end', () => {
      console.log(`[${new Date().toISOString()}] File download completed: ${fileId}`);
    });
    file.data.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] Stream error during download of ${fileId}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file' });
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error downloading file ${fileId}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to download file. Contact support.' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    req.session.isAuthenticated = true;
    console.log(`[${new Date().toISOString()}] User logged in successfully, session:`, req.session);
    res.json({ success: true });
  } else {
    console.log(`[${new Date().toISOString()}] Failed login attempt with email: ${email}`);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
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
  res.json({ success: true, page });
  console.log(`[${new Date().toISOString()}] Served page: ${slug}`);
});

app.get(['/', '/index.html'], (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`[${new Date().toISOString()}] Serving index.html for request: ${req.url}`);
    res.sendFile(indexPath);
  } else {
    console.error(`[${new Date().toISOString()}] index.html not found at: ${indexPath}`);
    res.status(404).send(`
      <h1>404 - File Not Found</h1>
      <p>The requested file (index.html) was not found on the server.</p>
      <p>Please ensure that the 'public' directory contains 'index.html' and that the server is deployed correctly on Render.</p>
    `);
  }
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
      <p>Please ensure that the 'public' directory contains 'virus.html' and that the server is deployed correctly on Render.</p>
    `);
  }
});

app.get('/:slug', async (req, res) => {
  const page = cachedData.staticPages.find(p => p.slug === `/${req.params.slug}`);
  if (!page) {
    console.log(`[${new Date().toISOString()}] Static page not found: /${req.params.slug}`);
    return res.status(404).send('Page not found');
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
