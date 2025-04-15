const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

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
    adminEmail: 'admin@kaylie254.com',
    adminPassword: 'securepassword123',
    mpesaTill: '4933614'
  },
  staticPages: []
};

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
    let settingsData = settingsRes.data.values?.slice(1) || [];
    // If settings sheet is empty, initialize with default values
    if (settingsData.length === 0) {
      settingsData = Object.entries(cachedData.settings).map(([key, value]) => [
        key,
        typeof value === 'object' ? JSON.stringify(value) : value
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.PRODUCTS_SHEET_ID,
        range: 'settings!A:B',
        valueInputOption: 'RAW',
        resource: { values: [['key', 'value'], ...settingsData] }
      });
    }
    const settingsObj = Object.fromEntries(settingsData);
    const settings = {
      supportEmail: settingsObj.supportEmail || 'kaylie254.business@gmail.com',
      copyrightText: settingsObj.copyrightText || '© 2025 Deriv Bot Store',
      logoUrl: settingsObj.logoUrl || '',
      socials: JSON.parse(settingsObj.socials || '{}'),
      urgentMessage: JSON.parse(settingsObj.urgentMessage || '{"enabled":false,"text":""}'),
      fallbackRate: parseFloat(settingsObj.fallbackRate) || 130,
      adminEmail: settingsObj.adminEmail || 'admin@kaylie254.com',
      adminPassword: settingsObj.adminPassword || 'securepassword123',
      mpesaTill: settingsObj.mpesaTill || '4933614'
    };

    const categoriesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A'
    });
    const categories = categoriesRes.data.values?.flat().slice(1) || ['General'];

    const pagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C'
    });
    const staticPages = pagesRes.data.values?.slice(1).map(row => ({
      title: row[0],
      slug: row[1],
      content: row[2]
    })) || [];

    cachedData = { products, categories, settings, staticPages };
  } catch (error) {
    console.error('Error loading data:', error.message);
  }
}

// Save data to Google Sheets
async function saveData() {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J',
      valueInputOption: 'RAW',
      resource: {
        values: [
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
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B',
      valueInputOption: 'RAW',
      resource: {
        values: [['key', 'value'], ...Object.entries(cachedData.settings).map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : value
        ])]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A',
      valueInputOption: 'RAW',
      resource: { values: [['CATEGORY'], ...cachedData.categories.map(c => [c])] }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C',
      valueInputOption: 'RAW',
      resource: {
        values: [
          ['TITLE', 'SLUG', 'CONTENT'],
          ...cachedData.staticPages.map(p => [p.title, p.slug, p.content])
        ]
      }
    });
  } catch (error) {
    console.error('Error saving data:', error.message);
    throw error;
  }
}

// Middleware to check admin session
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) return next();
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Load data on startup
loadData();

// API Routes
app.get('/api/data', async (req, res) => {
  res.json(cachedData);
});

app.post('/api/save-data', isAuthenticated, async (req, res) => {
  try {
    cachedData = req.body;
    await saveData();
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/add-bot', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { item, name, price, desc, embed, category, img, isNew } = req.body;
    const file = req.file;

    // Upload file to Google Drive
    const fileMetadata = {
      name: `${item}_${name}.${file.originalname.split('.').pop()}`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };
    const media = { mimeType: file.mimetype, body: file.buffer };
    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });

    const product = {
      item,
      fileId: driveRes.data.id,
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
  } catch (error) {
    console.error('Error adding bot:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Log order
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:D',
      valueInputOption: 'RAW',
      resource: { values: [[item, refCode, amount, timestamp]] }
    });

    // Generate download link
    const fileRes = await drive.files.get({
      fileId: product.fileId,
      fields: 'webContentLink'
    });

    // Send email to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cachedData.settings.supportEmail,
      subject: 'New Order - Ref Code Submitted',
      html: `
        <p><strong>Item:</strong> ${product.name} (${item})</p>
        <p><strong>Ref Code:</strong> ${refCode}</p>
        <p><strong>Amount:</strong> ${amount} KES</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <p><strong>Download Link:</strong> <a href="${fileRes.data.webContentLink}">${product.name}</a></p>
      `
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting ref code:', error.message);
    res.status(500).json({ success: false, error: 'Failed to submit ref code' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:D'
    });
    const orders = ordersRes.data.values?.slice(1)?.map(row => ({
      item: row[0],
      refCode: row[1],
      amount: row[2],
      timestamp: row[3]
    })) || [];
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

app.post('/api/confirm-order', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    // Log to Confirmed_Orders in SPREADSHEET_ID
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Confirmed_Orders!A:D',
      valueInputOption: 'RAW',
      resource: { values: [[item, refCode, amount, timestamp]] }
    });
    // Remove from orders in PRODUCTS_SHEET_ID
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:D'
    });
    const orders = ordersRes.data.values || [];
    const updatedOrders = orders.filter(row => row[1] !== refCode); // Remove by refCode
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:D',
      valueInputOption: 'RAW',
      resource: { values: updatedOrders.length > 1 ? updatedOrders : [['ITEM', 'REF CODE', 'AMOUNT', 'TIMESTAMP']] }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error confirming order:', error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    req.session.isAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Static page routes
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/virus.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'virus.html'));
});

app.get('/:slug', async (req, res) => {
  const page = cachedData.staticPages.find(p => p.slug === `/${req.params.slug}`);
  if (!page) return res.status(404).send('Page not found');
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
