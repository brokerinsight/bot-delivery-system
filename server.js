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
const SUCCESS_URL = process.env.SUCCESS_URL;

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/json" })); // ✅ Use raw body for IPN validation

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

if (!SPREADSHEET_ID) {
    console.error("❌ ERROR: SPREADSHEET_ID environment variable is missing.");
    process.exit(1);
}

// ✅ Authenticate with Google Sheets and Drive
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });

// ✅ Helper function to fetch item details
async function getItemDetails(itemNumber) {
    const sheets = google.sheets({ version: "v4", auth: client });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:C`, // Columns A (item), B (fileId), C (price in USD)
    });

    const row = response.data.values.find(row => row[0] == itemNumber);
    if (!row) {
        throw new Error("Item not found");
    }
    return { fileId: row[1], price: parseFloat(row[2]) }; // Return fileId and price
}

// ✅ Create NOWPayments Invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = req.body;

        if (!item || !price) {
            return res.status(400).json({ error: "Item and price are required" });
        }

        // Validate price from Google Sheets
        const itemDetails = await getItemDetails(item);
        if (price !== itemDetails.price) {
            return res.status(400).json({ error: "Invalid price. Please contact support." });
        }

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: price,
                price_currency: "USD",
                order_id: `bot-${item}`,
                success_url: `${SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            res.json({ success: true, paymentUrl: data.invoice_url });
        } else {
            res.status(400).json({ error: "Failed to create invoice", details: data });
        }
    } catch (error) {
        console.error("❌ Error creating invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Webhook Handler for NOWPayments
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const payload = req.body.toString();

        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(payload).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { payment_status, order_id, price_amount } = JSON.parse(payload);
        const itemNumber = order_id.replace("bot-", "");

        if (payment_status === "finished") {
            console.log(`✅ Payment successful for ${order_id} (${price_amount} USD)`);

            const linkResponse = await fetch(`https://bot-delivery-system.onrender.com/generate-link?item=${itemNumber}`);
            const linkData = await linkResponse.json();

            if (linkData.success && linkData.downloadLink) {
                res.json({ success: true, downloadLink: linkData.downloadLink });
            } else {
                res.status(500).json({ error: "Failed to generate download link" });
            }
        } else {
            res.status(400).json({ success: false, error: "Payment not completed." });
        }
    } catch (error) {
        console.error("❌ Error in webhook handler:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Deliver Bot for Paystack or NOWPayments
app.post("/deliver-bot", async (req, res) => {
    try {
        const { item, price, payment_method } = req.body;

        if (!item || !price || !payment_method) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        // Validate item and price against Google Sheets
        const itemDetails = await getItemDetails(item);
        if (price !== itemDetails.price) {
            return res.status(400).json({ error: "You tampered with the price. Contact support." });
        }

        // Generate download link
        const downloadLink = `https://bot-delivery-system.onrender.com/download/${itemDetails.fileId}`;
        res.json({ success: true, downloadLink });
    } catch (error) {
        console.error("❌ Error delivering bot:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Generate Bot Download Link
app.get("/generate-link", async (req, res) => {
    try {
        const item = req.query.item;
        if (!item) {
            return res.status(400).json({ error: "Item is required" });
        }

        const itemDetails = await getItemDetails(item);
        res.json({ success: true, downloadLink: `https://bot-delivery-system.onrender.com/download/${itemDetails.fileId}` });
    } catch (error) {
        console.error("❌ Error generating link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ File Download Route
app.get("/download/:fileId", async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        file.data.pipe(res);
    } catch (error) {
        console.error("❌ Error downloading file:", error);
        res.redirect(GUMROAD_STORE_URL);
    }
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
