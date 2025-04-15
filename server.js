const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Session middleware with FileStore
app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 24 * 60 * 60,
    retries: 2
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Load spreadsheet IDs from environment variables
const SPREADSHEET_ID = process.env.PRODUCTS_SHEET_ID;
const ORDERS_SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Validate environment variables
if (!SPREADSHEET_ID) {
  console.error('ERROR: PRODUCTS_SHEET_ID environment variable is not set. Please set it in Render environment variables.');
  process.exit(1);
}
if (!ORDERS_SPREADSHEET_ID) {
  console.error('ERROR: SPREADSHEET_ID environment variable is not set. Please set it in Render environment variables.');
  process.exit(1);
}

// Google Sheets and Drive setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
};

// Check session endpoint
app.get('/api/check-session', (req, res) => {
  res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'settings!A1:B100'
    });
    const rows = response.data.values || [];
    const adminEmailRow = rows.find(row => row[0] === 'adminEmail');
    const adminPasswordRow = rows.find(row => row[0] === 'adminPassword');
    const adminEmail = adminEmailRow ? adminEmailRow[1] : 'admin@kaylie254.com';
    const adminPassword = adminPasswordRow ? adminPasswordRow[1] : 'securepassword123';

    if (email === adminEmail && password === adminPassword) {
      req.session.isAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Fetch data endpoint
app.get('/api/data', isAuthenticated, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:G1000'
    });
    const settingsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'settings!A1:B100'
    });
    const staticPagesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'staticPages!A1:C100'
    });

    const rows = response.data.values || [];
    const settingsRows = settingsResponse.data.values || [];
    const staticPagesRows = staticPagesResponse.data.values || [];

    const products = rows.slice(1).map(row => ({
      name: row[0] || '',
      price: parseFloat(row[1]) || 0,
      desc: row[2] || '',
      embed: row[3] || '',
      category: row[4] || '',
      item: row[5] || '',
      img: row[6] || '',
      fileId: row[7] || '',
      isNew: row[8] === 'TRUE',
      isArchived: row[9] === 'TRUE'
    }));

    const categories = settingsRows.find(row => row[0] === 'categories')?.[1]?.split(',') || [];
    const settings = {
      urgentMessage: {
        enabled: settingsRows.find(row => row[0] === 'urgentMessageEnabled')?.[1] === 'TRUE',
        text: settingsRows.find(row => row[0] === 'urgentMessageText')?.[1] || ''
      },
      supportEmail: settingsRows.find(row => row[0] === 'supportEmail')?.[1] || '',
      copyrightText: settingsRows.find(row => row[0] === 'copyrightText')?.[1] || '',
      logoUrl: settingsRows.find(row => row[0] === 'logoUrl')?.[1] || '',
      mpesaTill: settingsRows.find(row => row[0] === 'mpesaTill')?.[1] || '4933614',
      socials: {
        tiktok: settingsRows.find(row => row[0] === 'socialTikTok')?.[1] || '',
        whatsapp: settingsRows.find(row => row[0] === 'socialWhatsApp')?.[1] || '',
        call: settingsRows.find(row => row[0] === 'socialCall')?.[1] || '',
        instagram: settingsRows.find(row => row[0] === 'socialInstagram')?.[1] || '',
        x: settingsRows.find(row => row[0] === 'socialX')?.[1] || '',
        facebook: settingsRows.find(row => row[0] === 'socialFacebook')?.[1] || '',
        youtube: settingsRows.find(row => row[0] === 'socialYouTube')?.[1] || ''
      },
      fallbackRate: parseFloat(settingsRows.find(row => row[0] === 'fallbackRate')?.[1]) || 130
    };

    const staticPages = staticPagesRows.slice(1).map(row => ({
      title: row[0] || '',
      slug: row[1] || '',
      content: row[2] || ''
    }));

    res.json({ products, categories, settings, staticPages });
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

// Save data endpoint
app.post('/api/save-data', isAuthenticated, async (req, res) => {
  try {
    const { products, categories, settings, staticPages } = req.body;

    // Prepare products data for Google Sheets
    const productRows = [['name', 'price', 'desc', 'embed', 'category', 'item', 'img', 'fileId', 'isNew', 'isArchived']].concat(
      products.map(p => [
        p.name, p.price, p.desc, p.embed || '', p.category, p.item, p.img, p.fileId || '', p.isNew ? 'TRUE' : 'FALSE', p.isArchived ? 'TRUE' : 'FALSE'
      ])
    );

    // Prepare settings data
    const settingsRows = [
      ['key', 'value'],
      ['categories', categories.join(',')],
      ['urgentMessageEnabled', settings.urgentMessage.enabled ? 'TRUE' : 'FALSE'],
      ['urgentMessageText', settings.urgentMessage.text],
      ['supportEmail', settings.supportEmail],
      ['copyrightText', settings.copyrightText],
      ['logoUrl', settings.logoUrl],
      ['mpesaTill', settings.mpesaTill],
      ['socialTikTok', settings.socials.tiktok],
      ['socialWhatsApp', settings.socials.whatsapp],
      ['socialCall', settings.socials.call],
      ['socialInstagram', settings.socials.instagram],
      ['socialX', settings.socials.x],
      ['socialFacebook', settings.socials.facebook],
      ['socialYouTube', settings.socials.youtube],
      ['fallbackRate', settings.fallbackRate],
      ['adminEmail', settings.adminEmail || 'admin@kaylie254.com'],
      ['adminPassword', settings.adminPassword || 'securepassword123']
    ];

    // Prepare static pages data
    const staticPagesRows = [['title', 'slug', 'content']].concat(
      staticPages.map(page => [page.title, page.slug, page.content])
    );

    // Update Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:J1000',
      valueInputOption: 'RAW',
      resource: { values: productRows }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'settings!A1:B100',
      valueInputOption: 'RAW',
      resource: { values: settingsRows }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'staticPages!A1:C100',
      valueInputOption: 'RAW',
      resource: { values: staticPagesRows }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving data:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

// Add bot endpoint
app.post('/api/add-bot', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { name, price, desc, embed, category, item, img, isNew } = req.body;
    const file = req.file;

    const fileMetadata = {
      name: file.originalname,
      parents: ['1Y2Z3X4W5V6U7T8S9R0Q1P2O3N4M5L6K7J']
    };
    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path)
    };
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });
    const fileId = driveResponse.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    fs.unlinkSync(file.path);

    const product = {
      name,
      price: parseFloat(price),
      desc,
      embed: embed || '',
      category,
      item,
      img,
      fileId,
      isNew: isNew === 'true',
      isArchived: false
    };

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error adding bot:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add bot' });
  }
});

// Submit ref code endpoint
app.post('/api/submit-ref', async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    await sheets.spreadsheets.values.append({
      spreadsheetId: ORDERS_SPREADSHEET_ID,
      range: 'Sheet1!A1:D1',
      valueInputOption: 'RAW',
      resource: {
        values: [[item, refCode, amount, timestamp]]
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting ref code:', error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: `Invalid ORDERS_SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to submit ref code' });
    }
  }
});

// Fetch orders endpoint
app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ORDERS_SPREADSHEET_ID,
      range: 'Sheet1!A1:D1000'
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
      res.status(400).json({ success: false, error: `Invalid ORDERS_SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }
});

// Confirm order endpoint
app.post('/api/confirm-order', isAuthenticated, async (req, res) => {
  try {
    const { item, refCode, amount, timestamp } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:J1000'
    });
    const rows = response.data.values || [];
    const productRow = rows.slice(1).find(row => row[5] === item);
    if (!productRow) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const fileId = productRow[7];

    const fileResponse = await drive.files.get({
      fileId,
      fields: 'webContentLink, mimeType, name'
    });

    const downloadLink = fileResponse.data.webContentLink;
    const email = 'recipient@example.com'; // Replace with actual recipient email
    const subject = `Your Deriv Bot Purchase - ${item}`;
    const body = `Thank you for your purchase!\n\nItem: ${item}\nRef Code: ${refCode}\nAmount: ${amount}\n\nDownload your bot here: ${downloadLink}\n\nIf you have any issues, please contact support.`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'emails!A1:C1',
      valueInputOption: 'RAW',
      resource: {
        values: [[email, subject, body]]
      }
    });

    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ORDERS_SPREADSHEET_ID,
      range: 'Sheet1!A1:D1000'
    });
    const ordersRows = ordersResponse.data.values || [];
    const orderIndex = ordersRows.slice(1).findIndex(row => row[0] === item && row[1] === refCode);
    if (orderIndex !== -1) {
      ordersRows.splice(orderIndex + 1, 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId: ORDERS_SPREADSHEET_ID,
        range: 'Sheet1!A1:D1000',
        valueInputOption: 'RAW',
        resource: { values: ordersRows }
      });
    }

    res.json({ success: true, downloadLink });
  } catch (error) {
    console.error('Error confirming order:', error.message);
    if (error.response && error.response.status === 400) {
      res.status(400).json({ success: false, error: `Invalid ORDERS_SPREADSHEET_ID. Please check the SPREADSHEET_ID environment variable.` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to confirm order' });
    }
  }
});

// Fetch static page content
app.get('/api/page/:slug', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'staticPages!A1:C100'
    });
    const rows = response.data.values || [];
    const page = rows.slice(1).find(row => row[1] === `/${req.params.slug}`);
    if (page) {
      res.json({ success: true, page: { title: page[0], slug: page[1], content: page[2] } });
    } else {
      res.status(404).json({ success: false, error: 'Page not found' });
    }
  } catch (error) {
    console.error('Error fetching page:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch page' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
