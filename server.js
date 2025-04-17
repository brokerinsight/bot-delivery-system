const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const stream = require('stream');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the sessions directory exists in /tmp for Render's ephemeral filesystem
const sessionsDir = path.join('/tmp', 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
  console.log('Created sessions directory:', sessionsDir);
}

// CORS configuration
app.use(cors({
  origin: 'https://bot-delivery-system.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from 'public' directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Log static file middleware setup
console.log(`[${new Date().toISOString()}] Serving static files from: ${publicPath}`);

// Session middleware with FileStore
app.use(session({
  store: new FileStore({
    path: sessionsDir, // Use /tmp/sessions
    ttl: 24 * 60 * 60,
    retries: 2,
    logFn: console.log
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

// Load data from Google Sheets
async function loadData() {
  try {
    // Load products from SPREADSHEET_ID (Sheet1)
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

    // Load settings from PRODUCTS_SHEET_ID (settings tab)
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

    // Load categories from PRODUCTS_SHEET_ID (categories tab)
    const categoriesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A'
    });
    const categories = [...new Set(categoriesRes.data.values?.slice(1).flat() || ['General'])];
    console.log(`[${new Date().toISOString()}] Loaded categories (after deduplication):`, categories);

    // Load static pages from PRODUCTS_SHEET_ID (staticPages tab)
    const pagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C'
    });
    let staticPages = pagesRes.data.values?.slice(1).map(row => ({
      title: row[0],
      slug: row[1],
      content: row[2]
    })) || [];

    // Ensure modal pages exist in staticPages
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
    console.error(`[${new Date().toISOString()}] Error details:`, error);
    throw error;
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
    console.error(`[${new Date().toISOString()}] Error details:`, error.response ? error.response.data : error);
    throw error;
  }
}

// Generate a one-time download link
async function generateDownloadLink(fileId) {
  try {
    const fileRes = await drive.files.get({
      fileId,
      fields: 'id'
    });
    const fileIdValue = fileRes.data.id;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdValue}`;
    console.log(`[${new Date().toISOString()}] Generated download link for file ID: ${fileId}`);
    return downloadUrl;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating download link for file ID ${fileId}:`, error.message);
    return null;
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

    // Update both sheets
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
    console.error(`[${new Date().toISOString()}] Error details:`, error);
    throw error;
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

// Ensure Google Sheet tabs exist with correct headers for both spreadsheets
async function ensureSheetTabs(spreadsheetId) {
  const tabsToEnsure = {
    'Sheet1': ['ITEM NUMBER', 'FILE ID', 'PRICE', 'NAME', 'DESCRIPTION', 'IMAGE', 'CATEGORY', 'EMBED', 'IS NEW', 'IS ARCHIVED'],
    'settings': ['KEY', 'VALUE'],
    'categories': ['CATEGORY'],
    'staticPages': ['TITLE', 'SLUG', 'CONTENT'],
    'orders': ['ITEM', 'REF CODE', 'AMOUNT', 'TIMESTAMP', 'STATUS'],
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
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });

        // Add headers to the new sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!1:1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        });
        console.log(`[${new Date().toISOString()}] Added headers to ${sheetName} in spreadsheet ${spreadsheetId}: ${headers}`);
      } else {
        // Verify headers
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

  // Check Google Sheets connectivity
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

  // Ensure all required tabs exist in both spreadsheets
  await ensureSheetTabs(process.env.SPREADSHEET_ID);
  await ensureSheetTabs(process.env.PRODUCTS_SHEET_ID);

  // Check Google Drive connectivity and folder existence
  try {
    const folder = await drive.files.get({ fileId: process.env.GOOGLE_DRIVE_FOLDER_ID });
    if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error(`GOOGLE_DRIVE_FOLDER_ID (${process.env.GOOGLE_DRIVE_FOLDER_ID}) is not a folder`);
    }
    console.log(`[${new Date().toISOString()}] Successfully connected to Google Drive folder`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to Google Drive folder:`, error.message);
    console.error(`[${new Date().toISOString()}] Please verify GOOGLE_DRIVE_FOLDER_ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
  }

  // Test email sending
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

  // Check if public/index.html exists
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`[${new Date().toISOString()}] public/index.html found at: ${indexPath}`);
  } else {
    console.error(`[${new Date().toISOString()}] public/index.html NOT found at: ${indexPath}`);
  }

  // Ping all routes
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
        if (!response.ok) {
          console.error(`[${new Date().toISOString()}] Route ${route} failed with status: ${response.status}`);
        }
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
    const productIndex = cachedData.products.findIndex(p => p.item === item);
    if (productIndex === -1) {
      console.log(`[${new Date().toISOString()}] Bot not found: ${item}`);
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    // Delete the file from Google Drive
    const fileId = cachedData.products[productIndex].fileId;
    try {
      await drive.files.delete({ fileId });
      console.log(`[${new Date().toISOString()}] Deleted file from Google Drive, ID: ${fileId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting file from Google Drive:`, error.message);
    }

    // Remove from cachedData
    cachedData.products.splice(productIndex, 1);

    // Update both Google Sheets
    await saveData();
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Bot deleted successfully: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting bot:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      console.log(`[${new Date().toISOString()}] Product not found: ${item}`);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const orderData = [[item, refCode, amount, timestamp, 'pending']];

    // Append to orders in both spreadsheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:E',
      valueInputOption: 'RAW',
      resource: { values: orderData }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:E',
      valueInputOption: 'RAW',
      resource: { values: orderData }
    });

    // Send success response immediately
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Ref code submitted for item: ${item}`);

    // Send email in the background
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cachedData.settings.supportEmail,
      subject: 'New Order - Ref Code Submitted',
      html: `
        <p><strong>Item:</strong> ${product.name} (${item})</p>
        <p><strong>Ref Code:</strong> ${refCode}</p>
        <p><strong>Amount:</strong> ${amount} KES</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
      `
    }).catch(error => {
      console.error(`[${new Date().toISOString()}] Error sending email for ref code ${refCode}:`, error.message);
      console.error(`[${new Date().toISOString()}] Email error details:`, error.stack);
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting ref code:`, error.message);
    console.error(`[${new Date().toISOString()}] Error details:`, error.stack);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: 'Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to submit ref code' });
    }
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:E'
    });
    const rows = response.data.values || [];
    const orders = rows.slice(1).map(row => ({
      item: row[0],
      refCode: row[1],
      amount: row[2],
      timestamp: row[3],
      status: row[4] || 'pending'
    }));
    res.json({ success: true, orders });
    console.log(`[${new Date().toISOString()}] Orders fetched successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: 'Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }
});

app.get('/api/order-status/:item/:refCode', async (req, res) => {
  try {
    const { item, refCode } = req.params;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:E'
    });
    const rows = response.data.values || [];
    const order = rows.slice(1).find(row => row[0] === item && row[1] === refCode);
    if (!order) {
      console.log(`[${new Date().toISOString()}] Order not found: ${item}/${refCode}`);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const status = order[4] || 'pending';
    let downloadLink = null;
    if (status === 'confirmed') {
      const product = cachedData.products.find(p => p.item === item);
      if (product) {
        downloadLink = await generateDownloadLink(product.fileId);
      }
    }
    res.json({ success: true, status, downloadLink });
    console.log(`[${new Date().toISOString()}] Order status checked: ${item}/${refCode} - Status: ${status}`);
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

    for (const spreadsheetId of [process.env.SPREADSHEET_ID, process.env.PRODUCTS_SHEET_ID]) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'orders!A:E'
      });
      const rows = response.data.values || [];
      const orderIndex = rows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
      if (orderIndex === -1) {
        console.log(`[${new Date().toISOString()}] Order not found for update: ${item}/${refCode}`);
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      rows[orderIndex + 1][4] = status;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'orders!A:E',
        valueInputOption: 'RAW',
        resource: { values: rows }
      });
    }

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
    const fileId = product.fileId;

    const fileResponse = await drive.files.get({
      fileId,
      fields: 'webContentLink, mimeType, name'
    });

    const downloadLink = fileResponse.data.webContentLink;
    const email = cachedData.settings.supportEmail;
    const subject = `Your Deriv Bot Purchase - ${item}`;
    const body = `Thank you for your purchase!\n\nItem: ${item}\nRef Code: ${refCode}\nAmount: ${amount}\n\nDownload your bot here: ${downloadLink}\n\nIf you have any issues, please contact support.`;

    const emailData = [[email, subject, body]];

    // Append to emails in both spreadsheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'emails!A:C',
      valueInputOption: 'RAW',
      resource: { values: emailData }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'emails!A:C',
      valueInputOption: 'RAW',
      resource: { values: emailData }
    });

    // Remove the order from both spreadsheets
    for (const spreadsheetId of [process.env.SPREADSHEET_ID, process.env.PRODUCTS_SHEET_ID]) {
      const ordersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'orders!A:E'
      });
      const ordersRows = ordersResponse.data.values || [];
      const orderIndex = ordersRows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
      if (orderIndex !== -1) {
        ordersRows.splice(orderIndex + 1, 1);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'orders!A:E',
          valueInputOption: 'RAW',
          resource: { values: ordersRows }
        });
      }
    }

    res.json({ success: true, downloadLink });
    console.log(`[${new Date().toISOString()}] Order confirmed for item: ${item}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming order:`, error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: 'Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to confirm order' });
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
    // Check for fallback modals
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
}

initialize().catch(error => {
  console.error(`[${new Date().toISOString()}] Server initialization failed:`, error.message);
  process.exit(1);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
