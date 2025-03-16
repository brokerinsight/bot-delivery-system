require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = "1_ze9la_uzzaK4nWhTuGsm7LMQM4pVjEVu3wB_6njuyw";
const SHEET_NAME = "Sheet1";
const GUMROAD_STORE_URL = "https://kaylie254.gumroad.com/";

app.use(cors());
app.use(express.json()); // Middleware to parse JSON

const validLinks = new Map();

// Load API Keys from .env
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_KEY = process.env.NOWPAYMENTS_IPN_KEY || "zBIRLfDRmjDCPjPFZR4FyONLAEtibfnI";

if (!NOWPAYMENTS_API_KEY) {
    console.error("❌ ERROR: NOWPAYMENTS_API_KEY is missing in .env file.");
    process.exit(1);
}

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);

const drive = google.drive({ version: "v3", auth: client });

// ✅ **New Route: Handle USDT Invoice Creation (Secures API Key)**
app.post("/create-usdt-invoice", async (req, res) => {
    try {
        const { priceAmount, botName, itemNumber } = req.body;

        if (!priceAmount || !botName || !itemNumber) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": NOWPAYMENTS_API_KEY, // ✅ Secure API Key Usage
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: priceAmount,
                price_currency: "usd",
                pay_currency: "usdt",
                order_id: "BOT-" + Math.floor((Math.random() * 1000000000) + 1),
                order_description: `Item ${itemNumber}: ${botName}`,
                success_url: `https://bot-delivery-system.onrender.com/generate-link?item=${itemNumber}`
            })
        });

        const data = await response.json();

        if (!data.invoice_url) {
            return res.status(400).json({ error: "Failed to create USDT invoice", details: data });
        }

        res.json({ success: true, invoice_url: data.invoice_url });
    } catch (error) {
        console.error("❌ Error creating USDT invoice:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ **NOWPayments Webhook - Handles Payment Notifications**
app.post("/nowpayments-webhook", async (req, res) => {
    try {
        const data = req.body;
        const receivedHmac = req.headers["x-nowpayments-sig"];

        if (!receivedHmac) {
            console.error("❌ Missing HMAC signature. Unauthorized request.");
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Validate HMAC Signature
        const calculatedHmac = crypto
            .createHmac("sha512", NOWPAYMENTS_IPN_KEY)
            .update(JSON.stringify(data))
            .digest("hex");

        if (calculatedHmac !== receivedHmac) {
            console.error("❌ Invalid HMAC signature. Possible fraud attempt.");
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Check if payment is successful
        if (data.payment_status === "confirmed" || data.payment_status === "finished") {
            console.log("✅ Payment confirmed:", data);

            const itemNumber = data.order_description.match(/Item (\d+)/)?.[1];
            if (!itemNumber) {
                console.error("❌ Error: Could not extract item number.");
                return res.status(400).json({ error: "Invalid order description format" });
            }

            // Generate the download link
            const generateLinkResponse = await fetch(
                `https://bot-delivery-system.onrender.com/generate-link?item=${itemNumber}`
            );
            const generateLinkData = await generateLinkResponse.json();

            if (generateLinkData.success) {
                console.log("🎉 Bot Download Link:", generateLinkData.downloadLink);
            } else {
                console.error("❌ Error generating download link:", generateLinkData);
            }
        }

        res.sendStatus(200); // Acknowledge NOWPayments webhook
    } catch (error) {
        console.error("❌ Error processing NOWPayments webhook:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Route to generate a one-time bot download link**
app.get("/generate-link", async (req, res) => {
    try {
        const itemNumber = req.query.item;
        if (!itemNumber) {
            return res.status(400).json({ error: "Item number is required" });
        }

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "No data found in Google Sheet" });
        }

        const row = rows.find(r => r[0] == itemNumber);
        if (!row) {
            return res.status(404).json({ error: "File ID not found for this item" });
        }

        const fileId = row[1];
        const token = generateToken();
        validLinks.set(token, fileId);

        res.json({ success: true, downloadLink: `https://bot-delivery-system.onrender.com/download/${token}` });
    } catch (error) {
        console.error("❌ Error generating download link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Route to handle one-time download links**
app.get("/download/:token", async (req, res) => {
    const token = req.params.token;

    if (!validLinks.has(token)) {
        return res.redirect(GUMROAD_STORE_URL);
    }

    const fileId = validLinks.get(token);
    validLinks.delete(token); // Invalidate the link after first use

    try {
        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const originalFilename = fileMetadata.data.name || `bot-${fileId}.xml`;

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        res.setHeader("Content-Disposition", `attachment; filename="${originalFilename}"`);
        res.setHeader("Content-Type", "application/xml");

        file.data.pipe(res);
    } catch (error) {
        console.error("❌ Error fetching file from Drive:", error);
        return res.redirect(GUMROAD_STORE_URL);
    }
});

// ✅ **Start the server**
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
