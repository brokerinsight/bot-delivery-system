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
app.use(express.raw({ type: "application/json" }));

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
                price_amount: parseFloat(price),
                price_currency: "USD",
                order_id: `bot-${item}`,
                success_url: `${process.env.SUCCESS_URL}?item=${item}`,
                cancel_url: GUMROAD_STORE_URL,
                item: item // ✅ Ensure item is included in the payload
            })
        });

        const data = await response.json();
        if (data.invoice_url) {
            res.json({ success: true, paymentUrl: data.invoice_url });
        } else {
            res.status(400).json({ error: "Failed to create invoice", details: data });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/webhook", async (req, res) => {
    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_KEY;
        const receivedSig = req.headers["x-nowpayments-sig"];
        const payload = req.body.toString();
        const expectedSig = crypto.createHmac("sha256", ipnSecret).update(payload).digest("hex");

        if (receivedSig !== expectedSig) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const data = JSON.parse(payload);
        const { payment_status, price_amount, order_id, item } = data; // ✅ Ensure item is extracted
        const itemNumber = order_id.replace("bot-", "");

        if (payment_status === "finished") {
            const generateLinkResponse = await fetch(`${process.env.SUCCESS_URL}/generate-link?item=${itemNumber}`);
            const linkData = await generateLinkResponse.json();

            if (linkData.success && linkData.downloadLink) {
                return res.json({ success: true, downloadLink: linkData.downloadLink });
            } else {
                return res.status(500).json({ error: "Bot link generation failed" });
            }
        } else {
            return res.json({ success: false });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/success", async (req, res) => {
    try {
        const itemNumber = req.query.item;
        if (!itemNumber) {
            return res.redirect(GUMROAD_STORE_URL);
        }

        const sheets = google.sheets({ version: "v4", auth: client });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        const row = response.data.values.find(r => r[0] == itemNumber);
        if (!row) {
            return res.redirect(GUMROAD_STORE_URL);
        }

        const fileId = row[1];
        res.setHeader("Content-Disposition", `attachment; filename="bot-${itemNumber}.xml"`);
        res.setHeader("Content-Type", "application/xml");
        
        const file = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
        file.data.pipe(res);
    } catch (error) {
        return res.redirect(GUMROAD_STORE_URL);
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
