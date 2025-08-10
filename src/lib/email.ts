import nodemailer from 'nodemailer';
import { CustomBotOrder } from '@/types';

// Email configuration - matches existing server.js setup
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(emailConfig);

// Verify connection configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email server is ready to take our messages');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

// Base email template
const getEmailTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 32px;
        }
        .logo {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            width: 64px;
            height: 64px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 16px;
        }
        .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
        }
        .content {
            margin-bottom: 32px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 16px 0;
        }
        .info-box {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .success-box {
            background: #ecfdf5;
            border: 1px solid #d1fae5;
            color: #065f46;
        }
        .warning-box {
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
        }
        .footer {
            text-align: center;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .social-links {
            margin: 16px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #3b82f6;
            text-decoration: none;
        }
        h2 {
            color: #1e293b;
            font-size: 20px;
            margin-top: 32px;
            margin-bottom: 16px;
        }
        .order-details {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
        }
        .order-details dt {
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
        }
        .order-details dd {
            margin-bottom: 12px;
            color: #6b7280;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">DB</div>
            <h1 class="title">Deriv Bot Store</h1>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <p><strong>Deriv Bot Store</strong></p>
            <p>Your trusted source for premium trading bots and automated strategies.</p>
            <div class="social-links">
                <a href="https://twitter.com/derivbotstore">Twitter</a> |
                <a href="https://t.me/derivbotstore">Telegram</a> |
                <a href="mailto:support@derivbotstore.com">Support</a>
            </div>
            <p style="font-size: 12px; color: #9ca3af;">
                This email was sent regarding your custom bot order. If you didn't request this, please ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
`;

// Send order confirmation email to customer
export async function sendOrderConfirmationEmail(order: CustomBotOrder) {
  const content = `
    <h2>🎉 Order Confirmed!</h2>
    <p>Thank you for your custom bot order! We've received your request and payment is being processed.</p>
    
    <div class="success-box">
        <h3>What happens next?</h3>
        <ol>
            <li><strong>Payment Processing:</strong> We're confirming your payment</li>
            <li><strong>Order Review:</strong> Our team will review your requirements (1-2 hours)</li>
            <li><strong>Development:</strong> We'll start building your custom bot</li>
            <li><strong>Delivery:</strong> You'll receive your bot within 24 hours</li>
        </ol>
    </div>

    <div class="order-details">
        <h3>Order Details</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Order ID:</dt>
            <dd>${order.ref_code}</dd>
            <dt>Budget:</dt>
            <dd>$${order.budget_amount}</dd>
            <dt>Payment Method:</dt>
            <dd>${order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</dd>
            <dt>Email:</dt>
            <dd>${order.client_email}</dd>
        </dl>
    </div>

    <div class="info-box">
        <h3>Your Requirements</h3>
        <p><strong>Bot Description:</strong></p>
        <p>${order.bot_description}</p>
        <p><strong>Features:</strong></p>
        <p>${order.bot_features}</p>
    </div>

    <p>You can track your order status using the tracking number provided above. If you have any questions, please don't hesitate to contact our support team.</p>

    <a href="mailto:support@derivbotstore.com" class="btn">Contact Support</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject: `Order Confirmed - Tracking #${order.tracking_number}`,
    html: getEmailTemplate(content, 'Order Confirmed'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${order.client_email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, error: error };
  }
}

// Send payment confirmation email to customer
export async function sendPaymentConfirmationEmail(order: CustomBotOrder) {
  const content = `
    <h2>💳 Payment Confirmed!</h2>
    <p>Great news! Your payment has been successfully processed and we're now starting work on your custom bot.</p>
    
    <div class="success-box">
        <h3>Development Started</h3>
        <p>Our expert developers are now reviewing your requirements and will begin building your custom trading bot. You can expect:</p>
        <ul>
            <li>✅ Initial review and confirmation within 2 hours</li>
            <li>🛠️ Active development over the next 12-18 hours</li>
            <li>📧 Delivery to your email within 24 hours</li>
            <li>📋 Complete setup instructions included</li>
        </ul>
    </div>

    <div class="order-details">
        <h3>Payment Details</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Amount Paid:</dt>
            <dd>$${order.budget_amount}</dd>
            <dt>Payment Method:</dt>
            <dd>${order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</dd>
            ${order.mpesa_receipt_number ? `<dt>M-Pesa Receipt:</dt><dd>${order.mpesa_receipt_number}</dd>` : ''}
            ${order.payment_id ? `<dt>Payment ID:</dt><dd>${order.payment_id}</dd>` : ''}
        </dl>
    </div>

    <div class="info-box">
        <h3>What You'll Receive</h3>
        <ul>
            <li>Custom XML bot file for Deriv platform</li>
            <li>Detailed setup and installation guide</li>
            <li>Configuration instructions</li>
            <li>Testing recommendations</li>
            <li>7 days of support for technical issues</li>
        </ul>
    </div>

    <p>We'll send you another email as soon as your custom bot is ready for download. Thank you for choosing Deriv Bot Store!</p>

    <a href="mailto:support@derivbotstore.com" class="btn">Contact Support</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject: `Payment Confirmed - Development Started #${order.tracking_number}`,
    html: getEmailTemplate(content, 'Payment Confirmed'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment confirmation email sent to ${order.client_email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { success: false, error: error };
  }
}

// Send bot delivery email to customer
export async function sendBotDeliveryEmail(order: CustomBotOrder, botFileUrl?: string) {
  const content = `
    <h2>🎉 Your Custom Bot is Ready!</h2>
    <p>Excellent news! Your custom trading bot has been completed and is ready for download.</p>
    
    <div class="success-box">
        <h3>Download Your Bot</h3>
        <p>Your custom bot has been built according to your specifications and thoroughly tested. Click the button below to download your files:</p>
        ${botFileUrl ? `<a href="${botFileUrl}" class="btn">Download Your Bot</a>` : ''}
    </div>

    <div class="order-details">
        <h3>Order Completed</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Completion Date:</dt>
            <dd>${order.completed_at ? new Date(order.completed_at).toLocaleString() : new Date().toLocaleString()}</dd>
            <dt>Development Time:</dt>
            <dd>${order.completed_at && order.created_at ? 
              Math.round((new Date(order.completed_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)) 
              : '< 24'} hours</dd>
        </dl>
    </div>

    <div class="info-box">
        <h3>📋 Setup Instructions</h3>
        <ol>
            <li><strong>Download the XML file</strong> using the button above</li>
            <li><strong>Open Deriv Bot</strong> in your browser</li>
            <li><strong>Click "Import"</strong> and select your downloaded file</li>
            <li><strong>Review the strategy</strong> and adjust any parameters as needed</li>
            <li><strong>Test on demo account</strong> before live trading</li>
            <li><strong>Start trading</strong> when you're comfortable with the bot</li>
        </ol>
    </div>

    <div class="warning-box">
        <h3>⚠️ Important Trading Notes</h3>
        <ul>
            <li>Always test your bot on a demo account first</li>
            <li>Start with small amounts when going live</li>
            <li>Monitor your bot's performance regularly</li>
            <li>Trading involves risk - never trade more than you can afford to lose</li>
        </ul>
    </div>

    <div class="info-box">
        <h3>🛠️ Support & Warranty</h3>
        <p>Your custom bot comes with:</p>
        <ul>
            <li>7 days of technical support</li>
            <li>Free fixes for any technical issues</li>
            <li>Setup assistance if needed</li>
        </ul>
        <p>If you experience any issues or need help setting up your bot, please contact our support team immediately.</p>
    </div>

    <p>Thank you for choosing Deriv Bot Store! We hope your custom bot brings you trading success.</p>

    <a href="mailto:support@derivbotstore.com" class="btn">Get Setup Help</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject: `🎉 Bot Ready! Download Your Custom Bot #${order.tracking_number}`,
    html: getEmailTemplate(content, 'Bot Ready for Download'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Bot delivery email sent to ${order.client_email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending bot delivery email:', error);
    return { success: false, error: error };
  }
}

// Send refund notification email to customer
export async function sendRefundNotificationEmail(order: CustomBotOrder) {
  const content = `
    <h2>💰 Refund Processed</h2>
    <p>We've processed a refund for your custom bot order. The refund has been sent to your specified ${order.refund_method} details.</p>
    
    <div class="warning-box">
        <h3>Refund Details</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Refund Amount:</dt>
            <dd>$${order.budget_amount}</dd>
            <dt>Refund Method:</dt>
            <dd>${order.refund_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</dd>
            <dt>Processed Date:</dt>
            <dd>${order.refunded_at ? new Date(order.refunded_at).toLocaleString() : new Date().toLocaleString()}</dd>
            ${order.refund_reason ? `<dt>Reason:</dt><dd>${order.refund_reason}</dd>` : ''}
        </dl>
    </div>

    ${order.refund_method === 'mpesa' ? `
    <div class="info-box">
        <h3>M-Pesa Refund</h3>
        <p>Your refund has been sent to: <strong>${order.refund_mpesa_number}</strong></p>
        <p>Name: <strong>${order.refund_mpesa_name}</strong></p>
        <p>Please allow 1-2 hours for the refund to reflect in your M-Pesa account.</p>
    </div>
    ` : `
    <div class="info-box">
        <h3>Cryptocurrency Refund</h3>
        <p>Your refund has been sent to: <strong>${order.refund_crypto_wallet}</strong></p>
        <p>Network: <strong>${order.refund_crypto_network}</strong></p>
        <p>Please allow 10-60 minutes for the transaction to confirm on the blockchain.</p>
    </div>
    `}

    ${order.custom_refund_message ? `
    <div class="info-box">
        <h3>Additional Information</h3>
        <p>${order.custom_refund_message}</p>
    </div>
    ` : ''}

    <p>We apologize that we couldn't fulfill your custom bot requirements. If you have any questions about this refund or would like to discuss alternative solutions, please contact our support team.</p>

    <a href="mailto:support@derivbotstore.com" class="btn">Contact Support</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: order.client_email,
    subject: `Refund Processed - Order #${order.tracking_number}`,
    html: getEmailTemplate(content, 'Refund Processed'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Refund notification email sent to ${order.client_email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending refund notification email:', error);
    return { success: false, error: error };
  }
}

// Send new order notification email to admin
export async function sendAdminNewOrderNotification(order: CustomBotOrder) {
  const adminEmail = process.env.EMAIL_USER; // Admin notifications go to the same email
  
  if (!adminEmail) {
    console.warn('No admin email configured for notifications');
    return { success: false, error: 'No admin email configured' };
  }

  const content = `
    <h2>🔔 New Custom Bot Order</h2>
    <p>A new custom bot order has been received and is pending payment confirmation.</p>
    
    <div class="info-box">
        <h3>Order Information</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Order ID:</dt>
            <dd>${order.ref_code}</dd>
            <dt>Customer Email:</dt>
            <dd>${order.client_email}</dd>
            <dt>Budget:</dt>
            <dd>$${order.budget_amount}</dd>
            <dt>Payment Method:</dt>
            <dd>${order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</dd>
            <dt>Created:</dt>
            <dd>${new Date(order.created_at).toLocaleString()}</dd>
        </dl>
    </div>

    <div class="order-details">
        <h3>Requirements</h3>
        <p><strong>Bot Description:</strong></p>
        <p>${order.bot_description}</p>
        <p><strong>Features:</strong></p>
        <p>${order.bot_features}</p>
    </div>

    <div class="info-box">
        <h3>Refund Information</h3>
        <p><strong>Method:</strong> ${order.refund_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</p>
        ${order.refund_method === 'mpesa' ? `
        <p><strong>M-Pesa Number:</strong> ${order.refund_mpesa_number}</p>
        <p><strong>M-Pesa Name:</strong> ${order.refund_mpesa_name}</p>
        ` : `
        <p><strong>Crypto Network:</strong> ${order.refund_crypto_network}</p>
        <p><strong>Wallet Address:</strong> ${order.refund_crypto_wallet}</p>
        `}
    </div>

    <p>Please review the order and begin development once payment is confirmed.</p>

    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/custom-bots" class="btn">View in Admin Panel</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: `🔔 New Custom Bot Order - ${order.tracking_number}`,
    html: getEmailTemplate(content, 'New Custom Bot Order'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin notification email sent for order ${order.tracking_number}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error: error };
  }
}

// Send payment confirmation notification to admin
export async function sendAdminPaymentNotification(order: CustomBotOrder) {
  const adminEmail = process.env.EMAIL_USER; // Admin notifications go to the same email
  
  if (!adminEmail) {
    console.warn('No admin email configured for notifications');
    return { success: false, error: 'No admin email configured' };
  }

  const content = `
    <h2>💳 Payment Confirmed</h2>
    <p>Payment has been confirmed for custom bot order <strong>${order.tracking_number}</strong>. Development can now begin.</p>
    
    <div class="success-box">
        <h3>Ready for Development</h3>
        <p>This order is now ready for development. Please begin work as soon as possible to meet the 24-hour delivery promise.</p>
    </div>

    <div class="order-details">
        <h3>Order Summary</h3>
        <dl>
            <dt>Tracking Number:</dt>
            <dd>${order.tracking_number}</dd>
            <dt>Customer:</dt>
            <dd>${order.client_email}</dd>
            <dt>Amount Paid:</dt>
            <dd>$${order.budget_amount}</dd>
            <dt>Payment Method:</dt>
            <dd>${order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cryptocurrency'}</dd>
            ${order.mpesa_receipt_number ? `<dt>M-Pesa Receipt:</dt><dd>${order.mpesa_receipt_number}</dd>` : ''}
            ${order.payment_id ? `<dt>Payment ID:</dt><dd>${order.payment_id}</dd>` : ''}
        </dl>
    </div>

    <div class="info-box">
        <h3>Requirements Reminder</h3>
        <p><strong>Bot Description:</strong></p>
        <p>${order.bot_description}</p>
        <p><strong>Features:</strong></p>
        <p>${order.bot_features}</p>
    </div>

    <p>Remember to mark the order as completed in the admin panel once the bot is ready and delivered.</p>

    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/custom-bots" class="btn">Manage Order</a>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: `💳 Payment Confirmed - Start Development ${order.tracking_number}`,
    html: getEmailTemplate(content, 'Payment Confirmed'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin payment notification sent for order ${order.tracking_number}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending admin payment notification:', error);
    return { success: false, error: error };
  }
}

// Simple admin notification function - matches existing server.js pattern exactly
export async function sendCustomBotOrderNotification(trackingNumber: string, refCode: string, amount: number, email: string) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Custom Bot Order - $${parseFloat(amount.toString()).toFixed(2)}`,
      text: `Custom Bot Tracking/Order Ref: ${trackingNumber}\nRef Code: ${refCode}\nAmount: $${parseFloat(amount.toString()).toFixed(2)}\nCustomer Email: ${email}`
    });
    console.log(`[${new Date().toISOString()}] Custom bot order notification email sent successfully for ref code ${refCode}`);
    return { success: true };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send custom bot order notification email:`, error.message);
    return { success: false, error: error };
  }
}