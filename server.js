require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const crypto = require("crypto");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Sheet1";
const GUMROAD_STORE_URL = "https://kaylie254.gumroad.com/";

app.use(cors());
app.use(express.json());

const validLinks = new Map();

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_KEY = process.env.NOWPAYMENTS_IPN_KEY;

if (!NOWPAYMENTS_API_KEY) {
    console.error("❌ ERROR: NOWPAYMENTS_API_KEY is missing.");
    process.exit(1);
}

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS is missing.");
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

// ✅ **Route to Check Server Status**
app.get("/health-check", (req, res) => {
    res.json({ success: true, message: "Server is online." });
});

// ✅ **Route to Create Crypto Invoice (Dynamically Supports All Cryptos)**
app.post("/create-crypto-invoice", async (req, res) => {
    try {
        const { priceAmount, botName, itemNumber } = req.body;

        if (!priceAmount || !botName || !itemNumber) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: priceAmount,
                price_currency: "usd",
                pay_currency: "",
                order_id: "BOT-" + Math.floor(Math.random() * 1000000000 + 1),
                order_description: `Item ${itemNumber}: ${botName}`,
                success_url: `https://bot-delivery-system.onrender.com/generate-link?item=${itemNumber}`
            })
        });

        const data = await response.json();

        if (!data.invoice_url) {
            return res.status(400).json({ error: "Failed to create invoice", details: data });
        }

        res.json({ success: true, invoice_url: data.invoice_url });
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ **NOWPayments Webhook**
app.post("/nowpayments-webhook", async (req, res) => {
    try {
        const data = req.body;
        const receivedHmac = req.headers["x-nowpayments-sig"];

        if (!receivedHmac) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const calculatedHmac = crypto.createHmac("sha512", NOWPAYMENTS_IPN_KEY).update(JSON.stringify(data)).digest("hex");

        if (calculatedHmac !== receivedHmac) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (data.payment_status === "confirmed" || data.payment_status === "finished") {
            const itemNumber = data.order_description.match(/Item (\d+)/)?.[1];
            if (!itemNumber) {
                return res.status(400).json({ error: "Invalid order description format" });
            }

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

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on https://bot-delivery-system.onrender.com`);
});
