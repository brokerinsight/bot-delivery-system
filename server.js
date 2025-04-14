require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { google } = require("googleapis");
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1eUZ0pcxFDiCqa3ZS1kZ2XJEz-XGJrGoSVwTThNDipNQ";
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "1wZyaAL_kQYMxRm2PzH0ChEimwoBPattx";
const WATI_API_KEY = process.env.WATI_API_KEY;
const WATI_PHONE = process.env.WATI_PHONE || "0710160851"; // Editable via admin

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/json" }));

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

// Google API Authentication
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
);
const sheets = google.sheets({ version: "v4", auth: client });
const drive = google.drive({ version: "v3", auth: client });

// Initialize Google Sheets
async function initializeSheets() {
    try {
        const sheetNames = ["Products", "Pending Orders", "Confirmed Orders"];
        const existingSheets = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const currentSheets = existingSheets.data.sheets.map(s => s.properties.title);

        for (const sheet of sheetNames) {
            if (!currentSheets.includes(sheet)) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    resource: { requests: [{ addSheet: { properties: { title: sheet } } }] }
                });
                console.log(`✅ Created sheet: ${sheet}`);
            }
        }

        // Set headers
        const headers = {
            "Products": ["Item", "Name", "Price", "File ID"],
            "Pending Orders": ["Timestamp", "Item", "Name", "Price", "Email", "Phone", "MPESA Code", "Status"],
            "Confirmed Orders": ["Timestamp", "Item", "Name", "Price", "Email", "Phone", "MPESA Code", "Status", "File ID"]
        };

        for (const [sheet, cols] of Object.entries(headers)) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheet}!A1:${String.fromCharCode(65 + cols.length - 1)}1`,
                valueInputOption: "RAW",
                resource: { values: [cols] }
            });
        }
        console.log("✅ Sheets initialized with headers.");
    } catch (error) {
        console.error("❌ Error initializing sheets:", error);
    }
}

// Fetch USD to KES rate
async function getUSDtoKESRate() {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        return data.rates.KES || 130; // Fallback rate
    } catch (error) {
        console.error("❌ Error fetching exchange rate:", error);
        return 130; // Fallback rate
    }
}

// Send WhatsApp Notification
async function sendWhatsAppNotification(phone, message) {
    if (!WATI_API_KEY) {
        console.warn("❌ WATI_API_KEY missing, skipping WhatsApp notification.");
        return;
    }
    try {
        const form = new FormData();
        form.append("phone", phone);
        form.append("message", message);

        const response = await fetch("https://api.wati.io/api/v1/sendTemplateMessage", {
            method: "POST",
            headers: { Authorization: `Bearer ${WATI_API_KEY}` },
            body: form
        });
        const data = await response.json();
        if (data.result) {
            console.log(`✅ WhatsApp notification sent to ${phone}`);
        } else {
            console.error("❌ Failed to send WhatsApp notification:", data);
        }
    } catch (error) {
        console.error("❌ Error sending WhatsApp notification:", error);
    }
}

// Get Item Details
async function getItemDetails(itemNumber) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Products!A:D"
        });
        const row = response.data.values.find(row => row[0] == itemNumber);
        if (!row) throw new Error("Item not found");
        return { item: row[0], name: row[1], price: parseFloat(row[2]), fileId: row[3] };
    } catch (error) {
        console.error("❌ Error getting item details:", error);
        throw error;
    }
}

// Create Invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, name, price, email, phone, mpesaCode } = req.body;
        if (!item || !name || !price || !email || !phone || !mpesaCode) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const itemDetails = await getItemDetails(item);
        if (price !== itemDetails.price || name !== itemDetails.name) {
            return res.status(400).json({ error: "Invalid product details" });
        }

        const timestamp = new Date().toISOString();
        const row = [timestamp, item, name, price, email, phone, mpesaCode, "pending"];
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Pending Orders!A:A",
            valueInputOption: "RAW",
            resource: { values: [row] }
        });

        // Send WhatsApp notification
        await sendWhatsAppNotification(
            WATI_PHONE,
            `New Order: ${name} (Item ${item}, $${price})\nEmail: ${email}\nPhone: ${phone}\nMPESA Code: ${mpesaCode}\nPlease confirm in admin panel.`
        );

        res.json({ success: true, message: "Invoice created, awaiting confirmation" });
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Pending Invoices
app.get("/pending-invoices", async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Pending Orders!A:H"
        });
        const rows = response.data.values || [];
        const headers = rows.shift() || [];
        const invoices = rows.map(row => {
            let invoice = {};
            headers.forEach((header, i) => { invoice[header.toLowerCase()] = row[i]; });
            return invoice;
        });
        res.json({ success: true, invoices });
    } catch (error) {
        console.error("❌ Error fetching pending invoices:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update Invoice Status
app.post("/update-invoice", async (req, res) => {
    try {
        const { timestamp, status } = req.body;
        if (!timestamp || !["paid", "not paid", "tampered"].includes(status)) {
            return res.status(400).json({ error: "Invalid timestamp or status" });
        }

        const pendingResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Pending Orders!A:H"
        });
        const rows = pendingResponse.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === timestamp);
        if (rowIndex === -1) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        const row = rows[rowIndex];
        row[7] = status; // Update Status

        if (status === "paid") {
            const itemDetails = await getItemDetails(row[1]); // Item
            const confirmedRow = [...row, itemDetails.fileId];
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "Confirmed Orders!A:A",
                valueInputOption: "RAW",
                resource: { values: [confirmedRow] }
            });
        }

        // Update or delete pending order
        if (status === "paid") {
            rows.splice(rowIndex, 1); // Remove from pending
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "Pending Orders!A1:H",
                valueInputOption: "RAW",
                resource: { values: rows.length ? rows : [[]] }
            });
        } else {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Pending Orders!A${rowIndex + 1}:H${rowIndex + 1}`,
                valueInputOption: "RAW",
                resource: { values: [row] }
            });
        }

        res.json({ success: true, message: `Invoice marked as ${status}` });
    } catch (error) {
        console.error("❌ Error updating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Deliver File
app.post("/deliver-file", async (req, res) => {
    try {
        const { item, price } = req.body;
        const itemDetails = await getItemDetails(item);
        if (price !== itemDetails.price) {
            return res.status(400).json({ error: "Invalid price" });
        }
        const downloadLink = `https://drive.google.com/uc?export=download&id=${itemDetails.fileId}`;
        res.json({ success: true, downloadLink });
    } catch (error) {
        console.error("❌ Error delivering file:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Upload File to Google Drive
app.post("/upload-file", async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;
        if (!fileName || !fileContent) {
            return res.status(400).json({ error: "File name and content required" });
        }

        const fileMetadata = {
            name: fileName,
            parents: [DRIVE_FOLDER_ID]
        };
        const file = Buffer.from(fileContent, "base64");
        const media = {
            mimeType: "application/octet-stream",
            body: file
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: "id"
        });
        res.json({ success: true, fileId: response.data.id });
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// File Download Route
app.get("/download/:fileId", async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const fileMetadata = await drive.files.get({ fileId, fields: "name, mimeType" });
        res.setHeader("Content-Disposition", `attachment; filename="${fileMetadata.data.name}"`);
        res.setHeader("Content-Type", fileMetadata.data.mimeType || "application/octet-stream");

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
        file.data.pipe(res);
    } catch (error) {
        console.error("❌ Error downloading file:", error);
        res.status(500).send("Error downloading file");
    }
});

// Start Server
app.listen(PORT, async () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    await initializeSheets();
});
