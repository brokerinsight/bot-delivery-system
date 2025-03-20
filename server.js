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

// In-memory store for mapping order_id to item (NOWPayments)
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

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: parseFloat(price), // ✅ Ensure price is a number
                price_currency: "USD",          // ✅ Always use USD
                order_id: `bot-${item}`,
                success_url: `${process.env.SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url && data.order_id) {
            console.log(`✅ Invoice Created: ${data.invoice_url}`);
            
            // ✅ Store item with order_id for NOWPayments
            itemStore[data.order_id] = item;
            console.log(`✅ Stored item: ${item} for order_id: ${data.order_id}`);

            // Auto-clear stored item after 30 minutes
            setTimeout(() => {
                delete itemStore[data.order_id];
                console.log(`🗑️ Cleared item for order_id: ${data.order_id}`);
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

// ✅ NOWPayments Webhook Handler (Corrected)
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const rawPayload = req.body.toString();

        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(rawPayload).digest("hex");
        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature!");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const data = JSON.parse(rawPayload);
        const { payment_status, order_id } = data;

        if (payment_status === "finished") {
            console.log(`✅ Payment Successful for order_id: ${order_id}`);

            const item = itemStore[order_id];
            if (!item) {
                console.warn(`⚠️ Item not found for order_id: ${order_id}`);
                return res.status(404).json({ error: "Item not found" });
            }

            res.json({ success: true, message: "Payment processed successfully" });
        } else {
            console.warn(`⚠️ Payment not completed for order_id: ${order_id}`);
            res.status(200).json({ success: false, message: "Payment not completed" });
        }
    } catch (error) {
        console.error("❌ Error in webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
