const express = require('express');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const { createClient } = require('redis');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Redis setup for sessions
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', err => console.error('Redis error:', err));
redisClient.connect().catch(err => console.error('Redis connect error:', err));

// CORS setup
app.use(cors({
  origin: 'https://bot-delivery-system.onrender.com',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session setup
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Google APIs setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Cache and data
let cachedData = {
  products: [],
  settings: {},
  categories: [],
  staticPages: [],
  orders: [],
  emails: []
};
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const PRODUCTS_SHEET_ID = process.env.PRODUCTS_SHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Startup checks
async function initialize() {
  console.log('Initializing server...');
  const checks = [
    { name: 'Sheet1 (Main)', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A1:K1' }) },
    { name: 'Sheet1 (Products)', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: PRODUCTS_SHEET_ID, range: 'Sheet1!A1:K1' }) },
    { name: 'settings', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: PRODUCTS_SHEET_ID, range: 'settings!A1:B' }) },
    { name: 'categories', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: PRODUCTS_SHEET_ID, range: 'categories!A1:A' }) },
    { name: 'staticPages', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: PRODUCTS_SHEET_ID, range: 'staticPages!A1:C' }) },
    { name: 'orders', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'orders!A1:D' }) },
    { name: 'emails', fn: () => sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'emails!A1:C' }) },
    { name: 'Google Drive', fn: () => drive.files.get({ fileId: GOOGLE_DRIVE_FOLDER_ID }) },
    { name: 'Nodemailer', fn: () => transporter.verify() }
  ];

  for (const check of checks) {
    try {
      await check.fn();
      console.log(`${check.name}: OK`);
    } catch (error) {
      console.error(`${check.name}: FAILED - ${error.message}`);
    }
  }
}

// Load data from Google Sheets
async function loadData() {
  try {
    // Load products (Sheet1)
    const productRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:K'
    });
    const headers = ['item', 'fileId', 'price', 'name', 'desc', 'img', 'category', 'embed', 'isNew', 'isArchived'];
    cachedData.products = productRes.data.values?.map(row =>
      headers.reduce((obj, header, i) => ({ ...obj, [header]: row[i] || '' }), {})
    ) || [];

    // Load settings
    const settingsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: PRODUCTS_SHEET_ID,
      range: 'settings!A2:B'
    });
    cachedData.settings = settingsRes.data.values?.reduce((obj, [key, value]) => {
      try {
        return { ...obj, [key]: JSON.parse(value) };
      } catch {
        return { ...obj, [key]: value };
      }
    }, { mpesaTill: '4933614', fallbackRate: 130 }) || {};

    // Load categories
    const catRes = await sheets.spreadsheets.values.get({
      spreadsheetId: PRODUCTS_SHEET_ID,
      range: 'categories!A2:A'
    });
    cachedData.categories = catRes.data.values?.flat() || [];

    // Load static pages
    const pagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: PRODUCTS_SHEET_ID,
      range: 'staticPages!A2:C'
    });
    cachedData.staticPages = pagesRes.data.values?.map(([title, slug, content]) => ({
      title, slug, content
    })) || [];

    // Load orders
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'orders!A2:D'
    });
    cachedData.orders = ordersRes.data.values?.map(([item, refCode, amount, timestamp]) => ({
      item, refCode, amount, timestamp
    })) || [];

    // Load emails
    const emailsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'emails!A2:C'
    });
    cachedData.emails = emailsRes.data.values?.map(([email, subject, body]) => ({
      email, subject, body
    })) || [];
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Save data to Google Sheets
async function saveData(range, values, spreadsheetId = SPREADSHEET_ID) {
  try {
    // Get existing data to determine last row
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${range.split('!')[0]}!A1:K`
    });
    const lastRow = res.data.values ? res.data.values.length : 1;

    // Append new data below last row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values }
    });

    // If Sheet1, sync to other spreadsheet
    if (range.includes('Sheet1')) {
      const otherId = spreadsheetId === SPREADSHEET_ID ? PRODUCTS_SHEET_ID : SPREADSHEET_ID;
      const otherRes = await sheets.spreadsheets.values.get({
        spreadsheetId: otherId,
        range: 'Sheet1!A1:K'
      });
      const otherLastRow = otherRes.data.values ? otherRes.data.values.length : 1;
      await sheets.spreadsheets.values.append({
        spreadsheetId: otherId,
        range: 'Sheet1',
        valueInputOption: 'RAW',
        resource: { values }
      });
    }
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

// Edit data by item
async function editData(item, updates, spreadsheetId = SPREADSHEET_ID) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:K'
    });
    const rows = res.data.values || [];
    const headers = ['item', 'fileId', 'price', 'name', 'desc', 'img', 'category', 'embed', 'isNew', 'isArchived'];
    const rowIndex = rows.findIndex(row => row[0] === item);
    if (rowIndex === -1) throw new Error(`Item ${item} not found`);

    const updatedRow = headers.map((header, i) => updates[header] || rows[rowIndex][i] || '');
    rows[rowIndex] = updatedRow;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${rowIndex + 2}:K${rowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [updatedRow] }
    });

    // Sync to other spreadsheet
    const otherId = spreadsheetId === SPREADSHEET_ID ? PRODUCTS_SHEET_ID : SPREADSHEET_ID;
    const otherRes = await sheets.spreadsheets.values.get({
      spreadsheetId: otherId,
      range: 'Sheet1!A2:K'
    });
    const otherRows = otherRes.data.values || [];
    const otherRowIndex = otherRows.findIndex(row => row[0] === item);
    if (otherRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: otherId,
        range: `Sheet1!A${otherRowIndex + 2}:K${otherRowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [updatedRow] }
      });
    }
  } catch (error) {
    console.error('Error editing data:', error);
    throw error;
  }
}

// Delete product and shift rows
async function deleteProduct(item) {
  try {
    for (const spreadsheetId of [SPREADSHEET_ID, PRODUCTS_SHEET_ID]) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A2:K'
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === item);
      if (rowIndex === -1) continue;

      // Delete file from Drive
      if (rows[rowIndex][1]) {
        await drive.files.delete({ fileId: rows[rowIndex][1] }).catch(err => console.error('Drive delete error:', err));
      }

      // Remove row and shift others up
      rows.splice(rowIndex, 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A2:K',
        valueInputOption: 'RAW',
        resource: { values: rows }
      });
    }
    await loadData();
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Middleware for authentication
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  console.error('Unauthorized access attempt:', req.url);
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Stream file upload to Google Drive
async function streamUploadToDrive(file, filename) {
  const fileMetadata = {
    name: filename,
    parents: [GOOGLE_DRIVE_FOLDER_ID]
  };
  const media = {
    mimeType: file.mimetype,
    body: Readable.from(file.buffer)
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, webContentLink'
    });
    return res.data;
  } catch (error) {
    console.error('Drive upload error:', error);
    throw error;
  }
}

// Routes
app.get('/api/data', async (req, res) => {
  try {
    await loadData();
    res.json({
      success: true,
      data: {
        products: cachedData.products,
        settings: cachedData.settings,
        categories: cachedData.categories,
        staticPages: cachedData.staticPages
      }
    });
  } catch (error) {
    console.error('Error in /api/data:', error);
    res.status(500).json({ success: false, error: 'Failed to load data' });
  }
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    res.json({ success: true });
  } else {
    console.error('Login failed for:', req.body);
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

app.post('/api/add-bot', isAuthenticated, async (req, res) => {
  try {
    const { file, body: { item, price, name, desc, img, category, embed, isNew, isArchived } } = req;
    if (!file) throw new Error('No file uploaded');

    // Stream upload to Drive
    const driveData = await streamUploadToDrive(file, file.originalname);

    // Save to Sheet1
    const values = [[
      item,
      driveData.id,
      price,
      name,
      desc,
      img,
      category,
      embed,
      isNew === 'true' ? 'TRUE' : 'FALSE',
      isArchived === 'true' ? 'TRUE' : 'FALSE'
    ]];
    await saveData('Sheet1', values);
    await saveData('Sheet1', values, PRODUCTS_SHEET_ID);

    await loadData();
    res.json({ success: true, fileId: driveData.id });
  } catch (error) {
    console.error('Error in /api/add-bot:', error);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) throw new Error('Product not found');

    // Save order
    await saveData('orders', [[item, refCode, amount, timestamp]]);

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cachedData.settings.supportEmail,
      subject: `New Order: ${item}`,
      text: `Item: ${item}\nRef Code: ${refCode}\nAmount: ${amount} KES\nTimestamp: ${timestamp}`
    });

    await loadData();
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/submit-ref:', error);
    res.status(500).json({ success: false, error: 'Failed to submit ref code' });
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    await loadData();
    res.json({ success: true, data: cachedData.orders });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
});

app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) throw new Error('Product not found');

    const file = await drive.files.get({
      fileId: product.fileId,
      fields: 'webContentLink'
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cachedData.settings.supportEmail,
      subject: `Order Confirmed: ${item}`,
      text: `Download link: ${file.data.webContentLink}`
    });

    res.json({ success: true, downloadLink: file.data.webContentLink });
  } catch (error) {
    console.error('Error in /api/confirm-order:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

app.post('/api/save-data', isAuthenticated, async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'product') {
      await editData(data.item, data);
    } else if (type === 'category') {
      await saveData('categories', [[data]], PRODUCTS_SHEET_ID);
    } else if (type === 'staticPage') {
      await saveData('staticPages', [[data.title, data.slug, data.content]], PRODUCTS_SHEET_ID);
    }
    await loadData();
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/save-data:', error);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/delete-product', isAuthenticated, async (req, res) => {
  try {
    const { item } = req.body;
    await deleteProduct(item);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/delete-product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initialize();
  await loadData();
});
