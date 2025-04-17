// ==================== DERIV BOT SYSTEM SERVER ======================
// ✅ Full Structure Restored — Render Environment Variables Only
// 🔐 Google Sheets, Drive, Session, Upload, and Mailer Integrated

const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionsPath = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsPath)) fs.mkdirSync(sessionsPath);

app.use(
  session({
    store: new FileStore({ path: sessionsPath }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 86400000 },
  })
);

// ✅ Google Auth Setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// ✅ Nodemailer Setup (from Render Environment)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, message) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message,
    };
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Email sending failed:', err.message);
  }
}

// ✅ Route: Heartbeat Check (logs + system ping)
app.get('/api/ping', async (req, res) => {
  try {
    const driveRes = await drive.files.list({ pageSize: 1 });
    const sheetRes = await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    await sendEmail(process.env.EMAIL_USER, 'Server Pinged ✅', 'Kaylie Server is live and connected.');

    return res.json({
      success: true,
      driveConnected: true,
      sheetConnected: true,
      sheetTitle: sheetRes.data.properties.title,
    });
  } catch (err) {
    console.error('Ping failed:', err.message);
    return res.status(500).json({ success: false, error: 'Server check failed' });
  }
});

// ✅ Route: Login (Admin Panel)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B',
    });
    const values = sheet.data.values;
    const creds = Object.fromEntries(values);

    if (email === creds.adminEmail && password === creds.adminPassword) {
      req.session.isAuthenticated = true;
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ✅ Route: Frontend Store Product List
app.get('/api/data', async (req, res) => {
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J',
    });
    const products = data.data.values;
    res.json({ success: true, products });
  } catch (err) {
    console.error('Data fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load products' });
  }
});

// ✅ Route: Add New Bot
app.post('/api/add-bot', upload.single('file'), async (req, res) => {
  try {
    const { item, name, price, desc, embed, category, img, isNew } = req.body;
    const file = req.file;

    if (!file || !item || !name || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const fileMeta = {
      name: file.originalname,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: file.mimetype,
      body: Buffer.from(file.buffer),
    };

    const uploadedFile = await drive.files.create({
      resource: fileMeta,
      media,
      fields: 'id',
    });

    const fileId = uploadedFile.data.id;
    const row = [item, fileId, price, name, desc || '', img || '', category || '', embed || '', isNew || 'FALSE', 'FALSE'];

    const appendToSheets = async (spreadsheetId) => {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] },
      });
    };

    await appendToSheets(process.env.SPREADSHEET_ID);
    await appendToSheets(process.env.PRODUCTS_SHEET_ID);

    res.json({ success: true, message: 'Bot added successfully', fileId });
  } catch (err) {
    console.error('Add bot error:', err.message);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// ✅ Utility: Save Data to Both Sheets
async function saveDataToSheets(rowIndex, updatedRow) {
  const updateSheet = async (spreadsheetId) => {
    const range = `Sheet1!A${rowIndex + 1}:J${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [updatedRow] },
    });
  };

  await updateSheet(process.env.SPREADSHEET_ID);
  await updateSheet(process.env.PRODUCTS_SHEET_ID);
}

// ✅ Route: Edit Product
app.post('/api/edit-product', async (req, res) => {
  const { item, price, name, desc, embed, category, img, isNew, isArchived } = req.body;
  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:J',
    });
    const rows = sheet.data.values;
    const headers = rows[0];
    const data = rows.slice(1);

    const index = data.findIndex(row => row[0] === item);
    if (index === -1) return res.status(404).json({ success: false, error: 'Product not found' });

    const rowIndex = index + 1; // Add 1 to skip headers
    const existing = data[index];
    const updatedRow = [
      item,
      existing[1], // fileId (unchanged)
      price || existing[2],
      name || existing[3],
      desc || existing[4],
      img || existing[5],
      category || existing[6],
      embed || existing[7],
      isNew || existing[8],
      isArchived || existing[9],
    ];

    await saveDataToSheets(rowIndex, updatedRow);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error('Edit product error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// ✅ Route: Delete Product
app.post('/api/delete-product', async (req, res) => {
  const { item } = req.body;
  try {
    const deleteFromSheet = async (spreadsheetId) => {
      const sheet = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:J',
      });
      const rows = sheet.data.values;
      const headers = rows[0];
      const data = rows.slice(1);

      const index = data.findIndex(row => row[0] === item);
      if (index === -1) return false;

      data.splice(index, 1);
      const updatedRows = [headers, ...data];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: updatedRows },
      });
      return true;
    };

    const deletedPrimary = await deleteFromSheet(process.env.SPREADSHEET_ID);
    const deletedBackup = await deleteFromSheet(process.env.PRODUCTS_SHEET_ID);

    if (!deletedPrimary && !deletedBackup) {
      return res.status(404).json({ success: false, error: 'Product not found in either sheet' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// ✅ Route: Confirm Order
app.post('/api/confirm-order', async (req, res) => {
  const { item, ref, name, price } = req.body;
  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'Sheet1!A:J',
    });
    const rows = sheet.data.values;
    const headers = rows[0];
    const data = rows.slice(1);

    const index = data.findIndex(row => row[0] === item);
    if (index === -1) return res.status(404).json({ success: false, error: 'Item not found' });

    const rowIndex = index + 1;
    const existing = data[index];
    existing[9] = 'TRUE'; // Mark as confirmed

    const updatedRow = existing;
    const range = `Sheet1!A${rowIndex + 1}:J${rowIndex + 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [updatedRow] },
    });

    const emailSubject = `New Sale – Ref ID: ${ref}`;
    const emailBody = `Product: ${name}\nPrice: ${price}`;
    await sendEmail(process.env.EMAIL_USER, emailSubject, emailBody);

    res.json({ success: true, message: 'Order confirmed and email sent.' });
  } catch (err) {
    console.error('Confirm order error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to confirm order' });
  }
});
// ✅ Route: Static Page Management
app.post('/api/static-pages', async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'static!A:B',
    });

    const rows = sheet.data.values || [];
    const index = rows.findIndex(row => row[0] === name);
    const updatedRows = [...rows];

    if (index !== -1) {
      updatedRows[index][1] = content;
    } else {
      updatedRows.push([name, content]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'static!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: updatedRows },
    });

    res.json({ success: true, message: 'Page saved' });
  } catch (err) {
    console.error('Static page save error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save page' });
  }
});
// ✅ Route: Update Admin Password (Safe Mapping)
app.post('/api/update-password', async (req, res) => {
  const { currentEmail, currentPassword, newEmail, newPassword } = req.body;

  if (!currentEmail || !currentPassword || !newEmail || !newPassword) {
    return res.status(400).json({ success: false, error: 'All fields required' });
  }

  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A:B',
    });
    const values = sheet.data.values;
    const rowMap = Object.fromEntries(values.map((row, i) => [row[0], i]));

    const currentEmailRow = values[rowMap['adminEmail']];
    const currentPassRow = values[rowMap['adminPassword']];

    if (
      !currentEmailRow || !currentPassRow ||
      currentEmailRow[1] !== currentEmail ||
      currentPassRow[1] !== currentPassword
    ) {
      return res.status(403).json({ success: false, error: 'Invalid current credentials' });
    }

    values[rowMap['adminEmail']][1] = newEmail;
    values[rowMap['adminPassword']][1] = newPassword;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.PRODUCTS_SHEET_ID,
      range: 'settings!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.json({ success: true, message: 'Admin credentials updated' });
  } catch (err) {
    console.error('Password update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update credentials' });
  }
});
// ✅ Start the server (required by Render)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
