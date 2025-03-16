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

// Load API Key from .env
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
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

// Generate a secure token
function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

// ✅ **Webhook to handle NOWPayments callback**
app.post("/nowpayments-webhook", async (req, res) => {
    try {
        const data = req.body;

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
