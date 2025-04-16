// server.js (full version with bug fixes and preserved structure)

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

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

// CORS config
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Session config
app.use(session({
  store: new FileStore({ path: sessionsDir, ttl: 86400 }),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: 'auto', httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
}));

// Google setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

let cachedData = {
  products: [],
  categories: [],
  settings: {},
  staticPages: []
};

async function loadData() {
  try {
    const [productRes, settingsRes, categoriesRes, pagesRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.SPREADSHEET_ID, range: 'Sheet1!A:J' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.PRODUCTS_SHEET_ID, range: 'settings!A:B' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.PRODUCTS_SHEET_ID, range: 'categories!A:A' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.PRODUCTS_SHEET_ID, range: 'staticPages!A:C' })
    ]);

    const settingsMap = Object.fromEntries(settingsRes.data.values?.map(([k, v]) => [k, v]) || []);
    cachedData = {
      products: productRes.data.values?.slice(1).map(row => ({
        item: row[0], fileId: row[1], price: +row[2], name: row[3], desc: row[4], img: row[5],
        category: row[6], embed: row[7], isNew: row[8] === 'TRUE', isArchived: row[9] === 'TRUE'
      })) || [],
      categories: categoriesRes.data.values?.slice(1).flat() || ['General'],
      settings: {
        supportEmail: settingsMap.supportEmail,
        fallbackRate: parseFloat(settingsMap.fallbackRate) || 130,
        adminEmail: settingsMap.adminEmail,
        adminPassword: settingsMap.adminPassword
      },
      staticPages: pagesRes.data.values?.slice(1).map(row => ({ title: row[0], slug: row[1], content: row[2] })) || []
    };
  } catch (err) { console.error('Failed to load data:', err); }
}

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

app.get('/api/check-session', (req, res) => {
  res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

// 🧾 Save updated static pages
app.post('/api/pages/save', isAuthenticated, async (req, res) => {
  const { title, slug, content } = req.body;
  const pages = cachedData.staticPages;
  const cleanSlug = slug.toLowerCase();
  const pageIndex = pages.findIndex(p => p.slug === cleanSlug);

  if (pageIndex !== -1) pages[pageIndex] = { title, slug: cleanSlug, content };
  else pages.push({ title, slug: cleanSlug, content });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.PRODUCTS_SHEET_ID,
    range: 'staticPages!A:C',
    valueInputOption: 'RAW',
    resource: { values: [['TITLE', 'SLUG', 'CONTENT'], ...pages.map(p => [p.title, p.slug, p.content])] }
  });

  res.json({ success: true });
});

// ❌ Delete a static page
app.post('/api/pages/delete', isAuthenticated, async (req, res) => {
  const { slug } = req.body;
  cachedData.staticPages = cachedData.staticPages.filter(p => p.slug !== slug);
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.PRODUCTS_SHEET_ID,
    range: 'staticPages!A:C',
    valueInputOption: 'RAW',
    resource: { values: [['TITLE', 'SLUG', 'CONTENT'], ...cachedData.staticPages.map(p => [p.title, p.slug, p.content])] }
  });
  res.json({ success: true });
});

// 📩 Submit MPESA ref
app.post('/api/submit-ref', async (req, res) => {
  const { item, refCode, amount } = req.body;
  const time = new Date().toLocaleString();
  const row = [[item, refCode, amount, time]];

  try {
    await Promise.all([
      sheets.spreadsheets.values.append({ spreadsheetId: process.env.SPREADSHEET_ID, range: 'orders!A:D', valueInputOption: 'RAW', resource: { values: row } }),
      sheets.spreadsheets.values.append({ spreadsheetId: process.env.PRODUCTS_SHEET_ID, range: 'orders!A:D', valueInputOption: 'RAW', resource: { values: row } })
    ]);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'kaylie254.business@gmail.com',
      subject: `New Sale – Ref ID: ${refCode}, Price: ${amount}`,
      text: `New order\nRef ID: ${refCode}\nPrice: ${amount}`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Submit Ref Error:', err);
    res.status(500).json({ success: false });
  }
});

// 📥 Upload file
app.post('/api/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  const file = req.file;
  const name = file.originalname;

  try {
    const response = await drive.files.create({
      requestBody: { name, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] },
      media: { mimeType: file.mimetype, body: Buffer.from(file.buffer) },
      fields: 'id'
    });
    res.json({ success: true, fileId: response.data.id });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(401).json({ success: false, error: 'Unauthorized upload attempt' });
  }
});

// 📋 Admin view orders
app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SPREADSHEET_ID, range: 'orders!A:D' });
    const orders = result.data.values?.slice(1).map(row => ({ item: row[0], refCode: row[1], amount: row[2], timestamp: row[3] })) || [];
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Order load error:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
});

// 🔐 Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    req.session.isAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// 🌐 Static page route
app.get('/:slug', (req, res) => {
  const page = cachedData.staticPages.find(p => p.slug === `/${req.params.slug}`);
  if (!page) return res.status(404).send('Page not found');
  const html = sanitizeHtml(marked(page.content));
  res.send(`<html><head><title>${page.title}</title><script src="https://cdn.tailwindcss.com"></script></head><body><div class="p-6 max-w-4xl mx-auto">${html}</div></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
