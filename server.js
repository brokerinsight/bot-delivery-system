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
app.use(express.json()); // ✅ Ensure correct parsing of JSON payloads

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

if (!SPREADSHEET_ID) {
    console.error("❌ ERROR: SPREADSHEET_ID environment variable is missing.");
    process.exit(1);
}

// ✅ Load Google Credentials directly from environment variable
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });

// ✅ Create Invoice for NowPayments
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = req.body;
        if (!item || !price) {
            return res.status(400).json({ error: "Item and price are required" });
        }

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: price,
                price_currency: "usd",
                order_id: item,
                success_url: `${process.env.SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (!data || !data.invoice_url) {
            throw new Error("Failed to create NowPayments invoice");
        }

        console.log(`✅ NowPayments Invoice Created: ${data.invoice_url}`);
        return res.json({ success: true, invoiceUrl: data.invoice_url });
    } catch (error) {
        console.error("❌ Error creating NowPayments invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Paystack Webhook Handler (Fix: Ensure item number is included)
app.post("/paystack-webhook", async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const receivedSig = req.headers["x-paystack-signature"];
        const expectedSig = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid Paystack Signature");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { event, data } = req.body;
        if (event === "charge.success") {
            const itemNumber = data.metadata?.item || "";
            const amountPaid = data.amount / 100; // Convert from kobo to actual currency

            console.log(`✅ Payment successful: ${amountPaid} KES for item ${itemNumber}`);
            return processDownload(res, itemNumber, "Paystack");
        } else {
            console.warn(`⚠️ Payment event ignored: ${event}`);
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error in Paystack webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ NowPayments Webhook Handler (Refined Payload Handling & Signature Check)
app.post("/nowpayments-webhook", async (req, res) => {
    try {
        const secret = process.env.NOWPAYMENTS_IPN_SECRET;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const sortedPayload = JSON.stringify(req.body, Object.keys(req.body).sort()); // Sort keys for consistency
        const expectedSig = crypto.createHmac("sha256", secret).update(sortedPayload).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid NowPayments Signature");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { payment_status, order_id, purchase_units } = req.body;
        if (payment_status === "finished") {
            const itemNumber = purchase_units?.[0]?.invoice_id || order_id || "";
            console.log(`✅ NowPayments payment successful for item ${itemNumber}`);
            return processDownload(res, itemNumber, "NowPayments");
        } else {
            console.warn(`⚠️ Payment status ignored: ${payment_status}`);
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error in NowPayments webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Unified function to generate a one-time bot download link
async function processDownload(res, itemNumber, source) {
    try {
        if (!itemNumber) {
            return res.status(400).json({ error: "Item number is required" });
        }

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        if (!response.data.values || response.data.values.length === 0) {
            return res.status(404).json({ error: "No data found in Google Sheet" });
        }

        const row = response.data.values.find(r => r[0] == itemNumber);
        if (!row) {
            return res.status(404).json({ error: "File ID not found for this item" });
        }

        const fileId = row[1];
        const downloadLink = `https://bot-delivery-system.onrender.com/download/${fileId}`;
        console.log(`✅ [${source}] Bot delivery link created: ${downloadLink}`);
        return res.json({ success: true, downloadLink });
    } catch (error) {
        console.error("❌ Error generating download link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
