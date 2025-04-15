const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage() });

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

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
    // Load products
    const productsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:I'
    });
    const productsData = productsRes.data.values?.slice(1) || [];
    cachedData.products = productsData.map(row => ({
      item: row[0] || '',
      fileId: row[1] || '',
      price: parseFloat(row[2]) || 0,
      name: row[3] || '',
      desc: row[4] || '',
      embed: row[5] || '',
      category: row[6] || '',
      img: row[7] || '',
      isNew: row[8] === 'TRUE'
    }));

    // Load categories
    const categoriesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A'
    });
    cachedData.categories = categoriesRes.data.values?.slice(1)?.map(row => row[0])?.filter(Boolean) || [];

    // Load settings
    const settingsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B'
    });
    let settingsData = settingsRes.data.values?.slice(1) || [];
    // If settings sheet is empty, initialize with default values
    if (settingsData.length === 0) {
      settingsData = Object.entries(cachedData.settings);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.PRODUCTS_SHEET_ID,
        range: 'settings!A:B',
        valueInputOption: 'RAW',
        resource: { values: [['key', 'value'], ...settingsData] }
      });
    }
    const settings = {
      supportEmail: settingsData.find(row => row[0] === 'supportEmail')?.[1] || 'kaylie254.business@gmail.com',
      copyrightText: settingsData.find(row => row[0] === 'copyrightText')?.[1] || '© 2025 Deriv Bot Store',
      logoUrl: settingsData.find(row => row[0] === 'logoUrl')?.[1] || '',
      socials: JSON.parse(settingsData.find(row => row[0] === 'socials')?.[1] || '{}'),
      urgentMessage: JSON.parse(settingsData.find(row => row[0] === 'urgentMessage')?.[1] || '{"enabled":false,"text":""}'),
      fallbackRate: parseFloat(settingsData.find(row => row[0] === 'fallbackRate')?.[1]) || 130,
      adminEmail: settingsData.find(row => row[0] === 'adminEmail')?.[1] || 'admin@kaylie254.com',
      adminPassword: settingsData.find(row => row[0] === 'adminPassword')?.[1] || 'securepassword123',
      mpesaTill: settingsData.find(row => row[0] === 'mpesaTill')?.[1] || '4933614'
    };
    cachedData.settings = settings;

    // Load static pages
    const staticPagesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C'
    });
    cachedData.staticPages = staticPagesRes.data.values?.slice(1)?.map(row => ({
      title: row[0] || '',
      slug: row[1] || '',
      content: row[2] || ''
    })) || [];
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Refresh cache
async function refreshCache() {
  await loadData();
}

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/virus.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'virus.html'));
});

app.get('/api/data', async (req, res) => {
  await refreshCache();
  res.json(cachedData);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/add-bot', upload.single('file'), async (req, res) => {
  try {
    const { item, name, price, desc, embed, category, img, isNew } = req.body;
    const file = req.file;

    // Upload file to Google Drive
    const fileMetadata = {
      name: file.originalname,
      parents: [process.env.DRIVE_FOLDER_ID]
    };
    const media = {
      mimeType: file.mimetype,
      body: file.buffer
    };
    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });
    const fileId = driveRes.data.id;

    // Update spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'RAW',
      resource: {
        values: [[item, fileId, price, name, desc, embed, category, img, isNew === 'true' ? 'TRUE' : 'FALSE']]
      }
    });

    const newProduct = { item, fileId, price: parseFloat(price), name, desc, embed, category, img, isNew: isNew === 'true' };
    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error adding bot:', error);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

app.post('/api/save-data', async (req, res) => {
  try {
    const { products, categories, settings, staticPages } = req.body;

    // Update products
    const productValues = products.map(p => [
      p.item, p.fileId, p.price, p.name, p.desc, p.embed, p.category, p.img, p.isNew ? 'TRUE' : 'FALSE'
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'RAW',
      resource: { values: [['ITEM NUMBER', 'FILE ID', 'PRICE', 'NAME', 'DESC', 'EMBED', 'CATEGORY', 'IMG', 'IS NEW'], ...productValues] }
    });

    // Update categories
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A',
      valueInputOption: 'RAW',
      resource: { values: [['CATEGORY'], ...categories.map(c => [c])] }
    });

    // Update settings
    const settingsValues = Object.entries(settings).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B',
      valueInputOption: 'RAW',
      resource: { values: [['key', 'value'], ...settingsValues] }
    });

    // Update static pages
    const pageValues = staticPages.map(p => [p.title, p.slug, p.content]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'staticPages!A:C',
      valueInputOption: 'RAW',
      resource: { values: [['TITLE', 'SLUG', 'CONTENT'], ...pageValues] }
    });

    await refreshCache();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/save-order', async (req, res) => {
  try {
    const { item, refCode, amount } = req.body;
    const timestamp = new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'orders!A:D',
      valueInputOption: 'RAW',
      resource: { values: [[item, refCode, amount, timestamp]] }
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Pending_Orders!A:D',
      valueInputOption: 'RAW',
      resource: { values: [[item, refCode, amount, timestamp]] }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ success: false, error: 'Failed to save order' });
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
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

app.post('/api/confirm-order', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    // Move to Confirmed_Orders in SPREADSHEET_ID
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
    console.error('Error confirming order:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});

app.get('/api/page/:slug', async (req, res) => {
  const page = cachedData.staticPages.find(p => p.slug === `/${req.params.slug}`);
  if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
  res.json({ success: true, page });
});

app.get('/download/:item', async (req, res) => {
  try {
    const item = req.params.item;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) return res.status(404).send('Product not found');

    const fileId = product.fileId;
    const fileRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${item}.xml"`);
    fileRes.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await loadData();
});
