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

// Store order_id mapped to item
const itemStore = {};

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/json" }));

if (!process.env.GOOGLE_CREDENTIALS) {
    console.error("❌ ERROR: GOOGLE_CREDENTIALS environment variable is missing.");
    process.exit(1);
}

if (!SPREADSHEET_ID) {
    console.error("❌ ERROR: SPREADSHEET_ID environment variable is missing.");
    process.exit(1);
}

// ✅ Authenticate with Google Drive
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth: client });

// ✅ NOWPayments Invoice Creation Route
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = req.body;
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
                order_id: `${item}`,
                success_url: `${SUCCESS_URL}?item=${item}&NW_id=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            const invoiceId = new URL(data.invoice_url).searchParams.get("iid");
            itemStore[invoiceId] = item;

            console.log(`✅ Stored item: ${item} for invoice_id: ${invoiceId}`);

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
        const rawPayload = req.body.toString();
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(rawPayload).digest("hex");
        const receivedSig = req.headers["x-nowpayments-sig"];

        console.log("🔍 FULL PAYLOAD RECEIVED:", rawPayload);
        console.log("✅ Expected Signature:", expectedSig);
        console.log("✅ Received Signature:", receivedSig);

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature!");
            return res.status(403).json({ error: "Unauthorized" });
        }

        const parsedPayload = JSON.parse(rawPayload);
        const { payment_status, order_id } = parsedPayload;

        if (payment_status === "finished") {
            console.log(`✅ Payment Successful for order_id: ${order_id}`);
            const item = order_id;
            itemStore[order_id] = item;

            console.log(`✅ Stored item: ${item} for order_id: ${order_id}`);
            res.json({ success: true, message: "Webhook processed successfully" });
        } else {
            console.warn(`⚠️ Payment not completed for order_id: ${order_id}`);
            res.json({ success: false });
        }
    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Success Page Download Route
app.post("/deliver-bot", async (req, res) => {
    try {
        const { item, NW_id } = req.body;
        if (!item || !NW_id) {
            console.warn(`⚠️ Missing parameters. Received: item=${item}, NW_id=${NW_id}`);
            return res.status(400).json({ error: "Both 'item' and 'NW_id' are required." });
        }

        console.log(`📢 Processing bot delivery for item: ${item}, NW_id: ${NW_id}`);

        if (!itemStore[NW_id]) {
            console.warn(`⚠️ Invalid NW_id: ${NW_id}.`);
            return res.status(403).json({ error: "Invalid NW_id. Authorization failed." });
        }

        if (itemStore[NW_id] !== item) {
            console.warn(`⚠️ Item mismatch. Expected item=${itemStore[NW_id]}, but received item=${item}.`);
            return res.status(403).json({ error: "Item and NW_id mismatch." });
        }

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        const row = response.data.values.find(r => r[0] == item);
        if (!row) {
            console.warn(`⚠️ No file found for item: ${item}`);
            return res.status(404).json({ error: "File not found for this item." });
        }

        const fileId = row[1];
        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

        console.log(`✅ Retrieved File Name: ${fileName}`);

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/xml");
        file.data.pipe(res);

        console.log(`✅ Bot file delivered for item: ${item}`);
    } catch (error) {
        console.error("❌ Error in deliver-bot route:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Paystack Bot Download Route
app.get("/download/:fileId", async (req, res) => {
    const fileId = req.params.fileId;

    try {
        console.log(`📢 Download request received for File ID: ${fileId}`);

        const fileMetadata = await drive.files.get({ fileId, fields: "name" });
        const fileName = fileMetadata.data.name || `bot-${fileId}.xml`;

        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/xml");
        file.data.pipe(res);
    } catch (error) {
        console.error("❌ Error fetching file:", error);
        res.redirect(GUMROAD_STORE_URL);
    }
});

// ✅ Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
