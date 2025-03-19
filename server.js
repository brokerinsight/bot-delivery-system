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

app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));

// Ensure required environment variables are set
if (!process.env.GOOGLE_CREDENTIALS || !SPREADSHEET_ID || !process.env.NOWPAYMENTS_IPN_KEY) {
    console.error("❌ ERROR: Missing required environment variables.");
    process.exit(1);
}

// Load Google Credentials
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });
const pendingTransactions = new Map();

// Create NOWPayments Invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = req.body;
        if (!item || !price) return res.status(400).json({ error: "Item and price are required" });

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
                order_id: `bot-${Date.now()}`,
                success_url: `https://bot-delivery-system.onrender.com/success?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            console.log(`✅ Invoice Created: ${data.invoice_url}`);
            pendingTransactions.set(data.invoice_id, item);
            return res.json({ success: true, paymentUrl: data.invoice_url });
        } else {
            console.error("❌ NOWPayments Invoice Error:", data);
            return res.status(400).json({ error: "Failed to create invoice", details: data });
        }
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// NOWPayments Webhook
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const rawPayload = req.rawBody;
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(rawPayload).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature!");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const receivedData = JSON.parse(rawPayload);
        console.log("🔹 Webhook Data:", JSON.stringify(receivedData, null, 2));
        const { payment_status, invoice_id } = receivedData;
        const item = pendingTransactions.get(invoice_id);

        if (!item) {
            console.error("❌ No item found for invoice:", invoice_id);
            return res.status(400).json({ error: "Invalid invoice ID" });
        }

        if (payment_status === "finished") {
            console.log(`✅ Payment Successful for item ${item}`);
            const generateLinkResponse = await fetch(`https://bot-delivery-system.onrender.com/generate-link?item=${item}`);
            const linkData = await generateLinkResponse.json();

            if (linkData.success && linkData.downloadLink) {
                console.log(`✅ Bot delivery link created: ${linkData.downloadLink}`);
                return res.json({ success: true, downloadLink: linkData.downloadLink });
            } else {
                console.warn("⚠️ Failed to generate bot link:", linkData);
                return res.status(500).json({ error: "Bot link generation failed" });
            }
        } else {
            console.warn(`⚠️ Payment not completed: ${payment_status}`);
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error in webhook handler:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Generate a one-time bot download link
app.get("/generate-link", async (req, res) => {
    try {
        const item = req.query.item;
        console.log(`🔍 Received item: ${item}`);
        if (!item) return res.status(400).json({ error: "Item number is required" });

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        if (!response.data.values || response.data.values.length === 0) {
            console.error("❌ No data found in Google Sheets!");
            return res.status(404).json({ error: "No data found" });
        }

        console.log("✅ Google Sheets Data:", response.data.values);
        const row = response.data.values.find(r => r[0] == item);
        if (!row || !row[1]) {
            console.error(`❌ No file found for item: ${item}`);
            return res.status(404).json({ error: "File ID not found" });
        }

        return res.json({ success: true, downloadLink: `https://bot-delivery-system.onrender.com/download/${row[1]}` });
    } catch (error) {
        console.error("❌ Error generating download link:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
