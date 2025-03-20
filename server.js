require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Sheet1";
const GUMROAD_STORE_URL = process.env.CANCEL_URL;

// In-memory store for mapping order_id to item
const itemStore = {};

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/json" }));

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

if (!SPREADSHEET_ID) {
    console.error("❌ ERROR: SPREADSHEET_ID environment variable is missing.");
    process.exit(1);
}

// ✅ Authenticate with Google Drive
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });

// ✅ Route to create NOWPayments invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = req.body;
        if (!item || !price) {
            return res.status(400).json({ error: "Item and price are required" });
        }

        console.log(`📢 Creating invoice for item: ${item}, price: ${price} USD`);

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: parseFloat(price),
                price_currency: "USD",
                order_id: `${item}`,
                success_url: `${process.env.SUCCESS_URL}?item=${item}`, // Include item in the query
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            const invoiceId = new URL(data.invoice_url).searchParams.get("iid");
            itemStore[invoiceId] = item;

            console.log(`✅ Stored item: ${item} for invoice_id: ${invoiceId}`);

            setTimeout(() => {
                delete itemStore[invoiceId];
                console.log(`🗑️ Cleared item for invoice_id: ${invoiceId}`);
            }, 30 * 60 * 1000);

            res.json({ success: true, paymentUrl: data.invoice_url });
        } else {
            console.error("❌ NOWPayments Invoice Error:", data);
            res.status(400).json({ error: "Failed to create invoice", details: data });
        }
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Route to instantly handle the `SUCCESS_URL` and trigger bot download
app.get("/success", async (req, res) => {
    const item = req.query.item;
    if (!item) {
        console.warn("⚠️ Item parameter is missing in success URL.");
        return res.status(400).send("Missing item parameter.");
    }

    try {
        console.log(`📢 Success page triggered for item: ${item}`);

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        const row = response.data.values.find(r => r[0] == item);
        if (!row) {
            console.warn(`⚠️ File ID not found for item: ${item}`);
            return res.status(404).send("File not found.");
        }

        const fileId = row[1];
        console.log(`✅ Retrieved File ID: ${fileId} for item: ${item}`);

        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        // Redirect the buyer to success page with auto-download
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/xml");
        file.data.pipe(res);

        console.log(`✅ Bot download triggered for item: ${item}`);
    } catch (error) {
        console.error("❌ Error handling success URL:", error);
        res.status(500).send("Error handling success URL.");
    }
});

// ✅ Route to instantly deliver the bot file (for manual download)
app.get("/download/:fileId", async (req, res) => {
    const fileId = req.params.fileId;

    try {
        console.log(`📢 Download request received for File ID: ${fileId}`);

        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

        console.log(`✅ Retrieved File Name: ${fileName}`);

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/xml");
        file.data.pipe(res);

        console.log(`✅ Bot file streamed successfully: ${fileName}`);
    } catch (error) {
        console.error("❌ Error fetching file:", error);
        res.status(500).send("Error fetching file.");
    }
});

// ✅ Start the server and bind to the specified port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
