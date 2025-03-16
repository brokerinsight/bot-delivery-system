require("dotenv").config(); // Load environment variables
const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = "1_ze9la_uzzaK4nWhTuGsm7LMQM4pVjEVu3wB_6njuyw"; // Google Sheets ID
const SHEET_NAME = "Sheet1"; // Change if needed
const GUMROAD_STORE_URL = "https://kaylie254.gumroad.com/";

// Temporary storage for one-time-use links
const validLinks = new Map();

// Load Google API credentials from JSON file
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "google-credentials.json";
if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error("Error: Google credentials file is missing.");
    process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);

const sheets = google.sheets({ version: "v4", auth: client });

// Generate a secure token
function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

// Route to fetch file ID and generate a one-time link
app.get("/generate-link", async (req, res) => {
    try {
        const itemNumber = req.query.item;
        if (!itemNumber) {
            return res.status(400).json({ error: "Item number is required" });
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`, // Fetch Item Number & File ID
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "No data found in Google Sheet" });
        }

        // Find the row matching the requested item number
        const row = rows.find(r => r[0] == itemNumber);
        if (!row) {
            return res.status(404).json({ error: "File ID not found for this item" });
        }

        const fileId = row[1];
        const token = generateToken();
        const downloadLink = `/download/${token}`;

        // Store the link for one-time use
        validLinks.set(token, `https://drive.google.com/uc?export=download&id=${fileId}`);

        res.json({ success: true, downloadLink: `http://localhost:${PORT}${downloadLink}` });
    } catch (error) {
        console.error("Error generating download link:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to handle one-time download links
app.get("/download/:token", (req, res) => {
    const token = req.params.token;
    if (validLinks.has(token)) {
        const fileUrl = validLinks.get(token);
        validLinks.delete(token); // Invalidate the link after first use
        return res.redirect(fileUrl);
    }
    return res.redirect(GUMROAD_STORE_URL);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
