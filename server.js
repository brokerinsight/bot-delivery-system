const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
  console.log('Created sessions directory:', sessionsDir);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Session middleware with FileStore
app.use(session({
  store: new FileStore({
    path: sessionsDir,
    ttl: 24 * 60 * 60,
    retries: 2,
    logFn: console.log // Add logging for session store operations
  }),
  name: 'sid', // Explicitly name the session cookie
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' ? true : false, // Ensure secure is false in non-HTTPS environments
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Log session details for debugging
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
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
    fallbackRate: 130
  },
  staticPages: []
};

// Load data from Google Sheets
async function loadData() {
  try {
    const productRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:D'
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
    const settingsData = Object.fromEntries(settingsRes.data.values?.map(([k, v]) => [k, v]) || []);
    const settings = {
      supportEmail: settingsData.supportEmail || 'kaylie254.business@gmail.com',
      copyrightText: settingsData.copyrightText || '© 2025 Deriv Bot Store',
      logoUrl: settingsData.logoUrl || '',
      socials: JSON.parse(settingsData.socials || '{}'),
      urgentMessage: JSON.parse(settingsData.urgentMessage || '{"enabled":false,"text":""}'),
      fallbackRate: parseFloat(settingsData.fallbackRate) || 130,
      adminEmail: settingsData.adminEmail || 'admin@kaylie254.com',
      adminPassword: settingsData.adminPassword || 'securepassword123'
    };

    const categoriesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A'
    });
    const categories = categoriesRes.data.values?.flat() || ['General'];

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
    console.error('Error loading data:', error);
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
        values: Object.entries(cachedData.settings)
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'categories!A:A',
      valueInputOption: 'RAW',
      resource: { values: cachedData.categories.map(c => [c]) }
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
    console.error('Error saving data:', error);
    throw error;
  }
}

// Middleware to check admin session
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Add a session check endpoint for debugging
app.get('/api/check-session', (req, res) => {
  res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

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
    console.error('Error adding bot:', error);
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
      spreadsheetId: process.env.SPREADSHEET_ID,
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
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: `Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to submit ref code' });
    }
  }
});

// Add /api/orders endpoint
app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:D'
    });
    const rows = response.data.values || [];
    const orders = rows.slice(1).map(row => ({
      item: row[0],
      refCode: row[1],
      amount: row[2],
      timestamp: row[3]
    }));
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: `Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }
});

// Add /api/confirm-order endpoint (used by virus.html)
app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const product = cachedData.products.find(p => p.item === item);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const fileId = product.fileId;

    const fileResponse = await drive.files.get({
      fileId,
      fields: 'webContentLink, mimeType, name'
    });

    const downloadLink = fileResponse.data.webContentLink;
    const email = cachedData.settings.supportEmail; // Use the support email as the recipient for now
    const subject = `Your Deriv Bot Purchase - ${item}`;
    const body = `Thank you for your purchase!\n\nItem: ${item}\nRef Code: ${refCode}\nAmount: ${amount}\n\nDownload your bot here: ${downloadLink}\n\nIf you have any issues, please contact support.`;

    // Log the email to be sent (you might want to store this in a separate sheet)
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'emails!A:C',
      valueInputOption: 'RAW',
      resource: {
        values: [[email, subject, body]]
      }
    });

    // Remove the order from the orders sheet
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'orders!A:D'
    });
    const ordersRows = ordersResponse.data.values || [];
    const orderIndex = ordersRows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
    if (orderIndex !== -1) {
      ordersRows.splice(orderIndex + 1, 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'orders!A:D',
        valueInputOption: 'RAW',
        resource: { values: ordersRows }
      });
    }

    res.json({ success: true, downloadLink });
  } catch (error) {
    console.error('Error confirming order:', error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: `Invalid SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to confirm order' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === cachedData.settings.adminEmail && password === cachedData.settings.adminPassword) {
    req.session.isAuthenticated = true;
    console.log('User logged in successfully, session:', req.session);
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
