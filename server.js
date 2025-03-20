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
app.use(express.raw({ type: "application/json" })); // ✅ Use raw body for signature verification

if (!process.env.GOOGLE_CREDENTIALS || !SPREADSHEET_ID || !process.env.NOWPAYMENTS_IPN_KEY) {
    console.error("❌ ERROR: Missing required environment variables.");
    process.exit(1);
}

// ✅ Load Google Credentials
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });

// 🟢 TEMP STORAGE for order-item mapping
const orderItemMap = new Map(); // { "order_id": "item" }

// ✅ Route to create NOWPayments invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = JSON.parse(req.body.toString()); // ✅ Parse raw JSON body
        if (!item || !price) {
            return res.status(400).json({ error: "Item and price are required" });
        }

        // ✅ Generate unique order ID
        const orderId = `bot-${Date.now()}`;

        // ✅ Store item in temporary storage
        orderItemMap.set(orderId, item);

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
                order_id: orderId,  // ✅ Store unique order ID
                success_url: `${process.env.SUCCESS_URL}?order_id=${orderId}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            console.log(`✅ Invoice Created: ${data.invoice_url}`);
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

// ✅ NOWPayments Webhook Handler (Fix: Using exact payload for signature)
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];

        const payload = req.body.toString(); // ✅ Use raw body exactly as received
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(payload).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature");
            console.log("Received Signature:", receivedSig);
            console.log("Expected Signature:", expectedSig);
            console.log("Payload:", payload);
            return res.status(403).json({ error: "Unauthorized" });
        }

        const data = JSON.parse(payload); // ✅ Parse JSON
        const { payment_status, order_id } = data;

        // ✅ Retrieve the correct item from temporary storage
        const item = orderItemMap.get(order_id);
        if (!item) {
            console.error(`⚠️ Item not found for order_id: ${order_id}`);
            return res.status(500).json({ error: "Invalid item reference" });
        }

        if (payment_status === "finished") {
            console.log(`✅ Crypto Payment Successful for order ${order_id}`);

            // ✅ Remove item from storage after use
            orderItemMap.delete(order_id);

            return res.json({
                success: true,
                redirectUrl: `https://bot-delivery-system.onrender.com/success?item=${item}`
            });
        } else {
            console.warn(`⚠️ Payment not completed: ${payment_status}`);
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error in webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Route that triggers automatic bot download
app.get("/success", async (req, res) => {
    const item = req.query.item;
    if (!item) return res.status(400).send("Invalid request");

    const linkResponse = await fetch(`https://bot-delivery-system.onrender.com/generate-link?item=${item}`);
    const linkData = await linkResponse.json();

    if (linkData.success && linkData.downloadLink) {
        return res.redirect(linkData.downloadLink);
    } else {
        return res.status(500).send("Error generating bot download link");
    }
});

// ✅ Route to generate a one-time bot download link
app.get("/generate-link", async (req, res) => {
    try {
        const item = req.query.item;
        if (!item) return res.status(400).json({ error: "Item number is required" });

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        if (!response.data.values || response.data.values.length === 0) {
            return res.status(404).json({ error: "No data found in Google Sheet" });
        }

        const row = response.data.values.find(r => r[0] == item);
        if (!row) return res.status(404).json({ error: "File ID not found for this item" });

        const fileId = row[1];
        res.json({ success: true, downloadLink: `https://bot-delivery-system.onrender.com/download/${fileId}` });
    } catch (error) {
        console.error("❌ Error generating download link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Route to instantly deliver the bot file (with correct filename)
app.get("/download/:fileId", async (req, res) => {
    const fileId = req.params.fileId;

    try {
        // Get the original file name from Google Drive
        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const originalFilename = fileMetadata.data.name || `bot-${fileId}.xml`;

        // Fetch and stream the file
        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        res.setHeader("Content-Disposition", `attachment; filename="${originalFilename}"`);
        res.setHeader("Content-Type", "application/xml");

        file.data.pipe(res);
    } catch (error) {
        console.error("❌ Error fetching file from Drive:", error);
        return res.redirect(GUMROAD_STORE_URL);
    }
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
