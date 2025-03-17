const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const NOWPAYMENTS_API_KEY = 'your_nowpayments_api_key'; // Replace with your API key
const IPN_SECRET = 'your_ipn_secret'; // Set this in NOWPayments settings

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccount.json'));
const drive = google.drive({ version: 'v3', auth: new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/drive']
)});

const links = {};

// Generate a NOWPayments USDT payment link
app.post('/create-usdt-payment', async (req, res) => {
    const { price, item, email } = req.body;
    if (!price || !item || !email) {
        return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    try {
        const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: price,
            price_currency: 'usd',
            pay_currency: 'usdt',
            order_id: item,
            order_description: `Payment for Bot ${item}`,
            ipn_callback_url: 'https://bot-delivery-system.onrender.com/ipn-handler',
            success_url: `https://bot-delivery-system.onrender.com/confirm-payment?item=${item}`
        }, {
            headers: { 'x-api-key': NOWPAYMENTS_API_KEY }
        });

        res.json({ success: true, paymentUrl: response.data.invoice_url });
    } catch (error) {
        console.error("NOWPayments error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Error creating payment" });
    }
});

// Handle NOWPayments IPN (Instant Payment Notification)
app.post('/ipn-handler', async (req, res) => {
    const data = req.body;

    if (data.ipn_secret !== IPN_SECRET) {
        return res.status(403).json({ success: false, message: "Invalid IPN secret" });
    }

    if (data.payment_status === 'finished') {
        const item = data.order_id;
        const fileId = "YOUR_GOOGLE_DRIVE_FILE_ID"; // Fetch from Google Sheets if needed
        const expirationTime = Date.now() + 5 * 60 * 1000;
        links[item] = { fileId, expirationTime };

        console.log(`✅ Payment confirmed for item ${item}`);
    }

    res.status(200).send("OK");
});

// Confirm payment and redirect to download
app.get('/confirm-payment', async (req, res) => {
    const item = req.query.item;
    if (!item || !links[item]) {
        return res.redirect('https://kaylie254.gumroad.com/');
    }
    
    res.redirect(`https://bot-delivery-system.onrender.com/download/${item}`);
});

// Generate one-time download link
app.get('/generate-link', async (req, res) => {
    const item = req.query.item;
    if (!item) return res.status(400).json({ success: false, message: "Missing item parameter" });

    try {
        const fileId = "YOUR_GOOGLE_DRIVE_FILE_ID";
        const response = await drive.files.get({ fileId, fields: 'name' });
        const fileName = response.data.name;
        
        const expirationTime = Date.now() + 5 * 60 * 1000;
        links[item] = { fileId, expirationTime };

        res.json({ success: true, downloadLink: `https://bot-delivery-system.onrender.com/download/${item}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating link" });
    }
});

// Download route
app.get('/download/:item', async (req, res) => {
    const item = req.params.item;
    const linkData = links[item];

    if (!linkData || Date.now() > linkData.expirationTime) {
        return res.redirect('https://kaylie254.gumroad.com/');
    }

    try {
        const fileId = linkData.fileId;
        const file = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

        res.setHeader('Content-Disposition', `attachment; filename="${fileId}.xml"`);
        file.data.pipe(res);
    } catch (error) {
        res.redirect('https://kaylie254.gumroad.com/');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
