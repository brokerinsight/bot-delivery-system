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
app.use(express.raw({ type: "application/json" })); // ✅ Use raw body for IPN verification

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

if (!SPREADSHEET_ID) {
    console.error("❌ ERROR: SPREADSHEET_ID environment variable is missing.");
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

// ✅ Route to create NOWPayments invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = JSON.parse(req.body.toString());
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
                order_id: `${item}`, // Set order_id to the item for initial mapping
                success_url: `${process.env.SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            const invoiceId = new URL(data.invoice_url).searchParams.get("iid"); // Extract `iid` from URL
            console.log(`✅ Extracted invoice_id (iid): ${invoiceId}`);

            // ✅ Store item with the invoice_id (iid)
            itemStore[invoiceId] = item;
            console.log(`✅ Stored item: ${item} for invoice_id: ${invoiceId}`);

            // Auto-clear stored item after 30 minutes
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

// ✅ NOWPayments Webhook Handler
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const rawPayload = req.body.toString();

        // Parse and re-serialize payload for signature generation
        const validPayload = JSON.stringify(JSON.parse(rawPayload)); // Re-serialize for comparison
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(validPayload).digest("hex");

        console.log("🔍 FULL PAYLOAD RECEIVED:");
        console.log(validPayload);
        console.log("✅ Expected Signature:", expectedSig);
        console.log("✅ Received Signature:", receivedSig);

        // Check for exact match between expected and received signature
        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature! Payload might have been tampered with.");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { payment_status, order_id } = JSON.parse(rawPayload);

        if (payment_status === "finished") {
            console.log(`✅ Payment Successful for order_id: ${order_id}`);

            const item = itemStore[order_id];
            if (!item) {
                console.warn(`⚠️ Item not found for order_id: ${order_id}`);
                return res.status(404).json({ error: "Item not found" });
            }

            console.log(`✅ Found item: ${item} for order_id: ${order_id}`);

            // Generate the bot download link
            const sheets = google.sheets({ version: "v4", auth: client });
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A:B`,
            });

            const row = response.data.values.find(r => r[0] == item);
            if (!row) {
                console.warn(`⚠️ File ID not found for item: ${item}`);
                return res.status(404).json({ error: "File ID not found for this item" });
            }

            const fileId = row[1];
            console.log(`✅ Retrieved File ID: ${fileId} for item: ${item}`);

            // Stream the file instantly without redirecting to Google Drive
            const fileMetadata = await drive.files.get({ fileId, fields: "name" });
            const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

            const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            res.setHeader("Content-Type", "application/xml");

            file.data.pipe(res);
            console.log(`✅ Bot file streamed successfully: ${fileName}`);
        } else {
            console.warn(`⚠️ Payment not completed: ${payment_status}`);
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error in webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
