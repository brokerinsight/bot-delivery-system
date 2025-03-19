const crypto = require("crypto");

// Replace this with your actual NOWPAYMENTS_IPN_KEY from Render
const ipnSecret = "3H4JnswN0OOFc5LVskwb2+ZP1XpCkcMS";

// Simulated webhook payload
const payload = JSON.stringify({
    payment_status: "finished",
    price_amount: 12.98,
    order_id: "bot-1"
});

// Generate the correct signature
const signature = crypto.createHmac("sha256", ipnSecret).update(payload).digest("hex");

console.log("Generated Signature:", signature);
