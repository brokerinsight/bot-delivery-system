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
app.use(express.raw({ type: "application/json" })); // ✅ FIX: Use raw body for IPN verification

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

// ✅ Route to create NOWPayments invoice
app.post("/create-invoice", async (req, res) => {
    try {
        const { item, price } = JSON.parse(req.body.toString()); // ✅ Parse raw JSON body
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
                price_amount: parseFloat(price),  // ✅ Ensure price is a number
                price_currency: "USD",            // ✅ Always use USD
                order_id: `bot-${item}`,
                success_url: `${process.env.SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
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

// ✅ NOWPayments Webhook Handler (Fix: Using raw request body)
app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];

        const payload = req.body.toString(); // ✅ Use raw body
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(payload).digest("hex");

        if (receivedSig !== expectedSig) {
            console.warn("❌ Invalid IPN Signature");
            console.log("Received Signature:", receivedSig);
            console.log("Expected Signature:", expectedSig);
            console.log("Payload:", payload);
            return res.status(403).json({ error: "Unauthorized" });
        }

        const data = JSON.parse(payload); // ✅ Now parse JSON
        const { payment_status, price_amount, order_id } = data;
        const itemNumber = order_id.replace("bot-", ""); // Extract item number

        if (payment_status === "finished") {
            console.log(`✅ Crypto Payment Successful: ${price_amount} USD for ${order_id}`);

            // Generate the bot download link
            const generateLinkResponse = await fetch(`https://bot-delivery-system.onrender.com/generate-link?item=${itemNumber}`);
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
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Route to generate a one-time bot download link
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

        if (!response.data.values || response.data.values.length === 0) {
            return res.status(404).json({ error: "No data found in Google Sheet" });
        }

        const row = response.data.values.find(r => r[0] == itemNumber);
        if (!row) {
            return res.status(404).json({ error: "File ID not found for this item" });
        }

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
