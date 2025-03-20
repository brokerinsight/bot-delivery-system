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
app.use(express.raw({ type: "application/json" })); // ✅ Store raw body for accurate signature verification

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

// ✅ Store item data temporarily (auto-delete after 30 min)
const invoiceStore = new Map();

// ✅ Route to create NOWPayments invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = JSON.parse(req.body.toString()); // ✅ Parse raw JSON body
        if (!item || !price) return res.status(400).json({ error: "Item and price are required" });

        const orderId = `bot-${Date.now()}`; // ✅ Generate unique order ID
        invoiceStore.set(orderId, { item, timestamp: Date.now() }); // ✅ Store item data

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
                order_id: orderId, // ✅ Use generated order_id
                success_url: `${process.env.SUCCESS_URL}?order_id=${orderId}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            console.log(`✅ Invoice Created: ${data.invoice_url}`);
            res.json({ success: true, paymentUrl: data.invoice_url });

            // ✅ Delete stored item after 30 minutes if order is not completed
            setTimeout(() => {
                if (invoiceStore.has(orderId)) {
                    console.log(`🗑️ Deleting expired order: ${orderId}`);
                    invoiceStore.delete(orderId);
                }
            }, 30 * 60 * 1000); // 30 minutes
        } else {
            console.error("❌ NOWPayments Invoice Error:", data);
            res.status(400).json({ error: "Failed to create invoice", details: data });
        }
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ NOWPayments Webhook Handler (Fix Signature & Retrieve Correct Item)
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const rawPayload = req.body.toString(); // ✅ Use raw body for signature verification
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(rawPayload).digest("hex");

        console.log("🔍 FULL PAYLOAD RECEIVED FROM NOWPAYMENTS:", rawPayload);
        console.log("✅ Expected Signature:", expectedSig);
        console.log("❌ Received Signature:", receivedSig);

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature! Possible modified request.");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { payment_status, order_id } = JSON.parse(rawPayload);
        const storedData = invoiceStore.get(order_id);

        if (!storedData) {
            console.error(`⚠️ No matching item found for order_id: ${order_id}`);
            return res.status(500).json({ error: "Invalid item reference" });
        }

        if (payment_status === "finished") {
            console.log(`✅ Crypto Payment Successful for order: ${order_id}`);

            const item = storedData.item;
            invoiceStore.delete(order_id); // ✅ Remove stored item after successful payment

            return res.json({ 
                success: true, 
                redirectUrl: `https://bot-delivery-system.onrender.com/nowpayments-delivery?item=${item}`
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

// ✅ Route for NowPayments Bot Delivery (Separate from Paystack)
app.get("/nowpayments-delivery", async (req, res) => {
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

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
