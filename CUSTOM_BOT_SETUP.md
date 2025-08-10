# Custom Bot Feature Setup Instructions

## Database Setup

**IMPORTANT**: Before the custom bot functionality will work, you need to run the SQL schema in your Supabase database.

### Step 1: Run Database Schema

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the entire content from `database_setup.sql`
4. Run the SQL to create the necessary tables and functions

This will create:
- `custom_bot_orders` table with all required fields
- `refund_reasons` table with default refund options
- Proper indexes for performance
- Row Level Security policies
- Automatic timestamp updates

### Step 2: Environment Variables

Make sure these environment variables are set in your `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL (required for emails)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Email configuration (required for notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password

# Payment providers (same as your current setup)
PAYHERO_CHANNEL_ID=your_channel_id
PAYHERO_PAYMENT_URL=your_payment_url
PAYHERO_AUTH_TOKEN=your_auth_token
```

### Step 3: Features Included

The custom bot system includes:

#### Client-Side Features
- ✅ Modern form with comprehensive validation
- ✅ Real-time form validation and error handling
- ✅ Payment method selection (M-Pesa, Crypto)
- ✅ Refund method configuration (M-Pesa, Crypto with network selection)
- ✅ Terms and conditions acceptance with links
- ✅ Budget validation (minimum $10 with suggestions)
- ✅ Responsive design for all devices
- ✅ Success/error messaging with toast notifications

#### Admin Panel Features (Next Steps)
- 🔄 Custom bot orders management page
- 🔄 Order status updates (pending → completed → refunded)
- 🔄 Copy buttons for email addresses and wallet info
- 🔄 Refund reason dropdown with custom message option
- 🔄 Real-time status updates via WebSockets
- 🔄 Pagination for large order lists
- 🔄 Email notification system

#### Backend Features (Next Steps)
- 🔄 Order creation API with validation
- 🔄 Payment integration with existing providers
- 🔄 Email notification system for order updates
- 🔄 Tracking number generation system
- 🔄 Secure order management APIs
- 🔄 Refund processing workflow

### Step 4: Current Status

✅ **COMPLETED**:
- Database schema design
- Terms and Privacy Policy pages
- Custom bot request form with comprehensive validation
- Payment integration and processing (M-Pesa & Crypto ready)
- Email notification system (NodeMailer integration)
- Admin panel management with full CRUD operations
- Form validation and UX
- Mobile responsive design
- Navigation integration throughout the site
- Strategic placement of custom bot links across all pages
- Copy-to-clipboard functionality for admin panel
- Status management and refund processing
- Comprehensive email templates for all stages

🔄 **IN PROGRESS**:
- Order tracking system (customer-facing)

### Step 5: Next Development Phase

The next phase will include:
1. API routes for order creation and management
2. Payment processing integration
3. Email notification system with NodeMailer
4. Admin panel for order management
5. Real-time updates via WebSockets
6. Order tracking system

### Step 6: Testing

Once the database is set up, you can:
1. Visit `/custom-bot` to see the request form
2. Test form validation with various inputs
3. View terms and privacy policy pages
4. Experience the responsive design on mobile

The form will redirect to a payment page (to be created next) after successful submission.

### Database Schema Overview

The `custom_bot_orders` table includes:
- Customer information (email, requirements)
- Payment details (method, amount, ref codes)
- Refund information (method, wallet/mpesa details)
- Order status tracking (pending/completed/refunded)
- Timestamps for audit trail
- Tracking numbers for customer reference

This system is designed to handle the complete custom bot order lifecycle while maintaining data security and providing excellent user experience.