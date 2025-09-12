# Bot Delivery System

A comprehensive web application designed for selling and delivering digital bot products. It features a backend API for managing products, users, and orders, with integrations for M-PESA and cryptocurrency payments.

## Features

*   **Product Management:** CRUD operations for bot products, including details, pricing, and file uploads.
*   **Category Management:** Organize products into categories.
*   **Static Page Management:** Create and manage static content pages (e.g., About Us, FAQ).
*   **Settings Configuration:** Admin panel for various application settings (e.g., contact email, payment gateway details, site logo).
*   **User Authentication:** Secure admin login to manage the store.
*   **Order Processing:** Track customer orders and payment statuses.
*   **Payment Integrations:**
    *   **M-PESA (Manual):** Manual confirmation of M-PESA payments via reference code.
    *   **M-PESA (PayHero STK Push):** Automated M-PESA payment initiation and confirmation via PayHero.
    *   **Cryptocurrency (NOWPayments):** Integration with NOWPayments for accepting various cryptocurrencies.
*   **Secure File Downloads:** Deliver purchased bot files to customers after payment confirmation.
*   **Email Notifications:** Automated email notifications for new orders.
*   **Caching:** Utilizes Upstash Redis for caching frequently accessed data to improve performance with automatic failover and no connection drops.
*   **Sitemap Generation:** Dynamically generates `sitemap.xml` for SEO.
*   **Rate Limiting:** Basic rate limiting on sensitive endpoints.

## Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** Supabase (PostgreSQL backend)
*   **Caching:** Upstash Redis (HTTP-based Redis service)
*   **Frontend:** Serves static files from the `public/` directory (likely built with a modern JavaScript framework like React, Vue, or Angular, which then consumes the backend API).

## Key Dependencies

*   `@supabase/supabase-js`: For interacting with the Supabase database and storage.
*   `express`: Web framework for Node.js.
*   `@upstash/redis`: Upstash Redis client for Node.js.
*   `express-session`: Session management.
*   `nodemailer`: For sending emails.
*   `bcrypt`: For password hashing.
*   `multer`: For handling file uploads.
*   `dotenv`: For managing environment variables.
*   `cors`: For enabling Cross-Origin Resource Sharing.
*   `marked`: For Markdown to HTML conversion (likely for static pages).
*   `sanitize-html`: For sanitizing HTML content.
*   `node-fetch`: For making HTTP requests from the server (e.g., to payment gateways).
*   `uuid`: For generating unique IDs.

## Environment Variables

This application requires a `.env` file in the root directory with the following variables:

*   `SUPABASE_URL`: Your Supabase project URL.
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
*   `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL (e.g., https://your-instance.upstash.io).
*   `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis REST token for authentication.
*   `SESSION_SECRET`: A secret string for signing session ID cookies.
*   `EMAIL_USER`: Gmail username for sending notification emails.
*   `EMAIL_PASS`: Gmail app password for sending notification emails.
*   `PAYHERO_CHANNEL_ID`: PayHero Channel ID for M-PESA STK Push.
*   `PAYHERO_PAYMENT_URL`: PayHero Payment URL (if different from default).
*   `PAYHERO_AUTH_TOKEN`: PayHero Authorization Token.
*   `NOWPAYMENTS_API_KEY`: NOWPayments API Key for cryptocurrency payments.
*   `NOWPAYMENTS_IPN_KEY`: NOWPayments IPN Secret Key for verifying callbacks.
*   `PORT`: (Optional) Port the server will run on (defaults to 10000).
*   `ADMIN_EMAIL`: (Set during initial setup via admin panel) Default admin email.
*   `ADMIN_PASSWORD`: (Set during initial setup via admin panel) Hashed admin password.


**Example `.env` structure:**

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

VALKEY_HOST=your_valkey_host
VALKEY_PORT=your_valkey_port
VALKEY_USERNAME=your_valkey_username # Optional, depends on your Valkey setup
VALKEY_PASSWORD=your_valkey_password # Optional, depends on your Valkey setup

SESSION_SECRET=a_very_strong_and_long_secret_key

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

PAYHERO_CHANNEL_ID=your_payhero_channel_id
PAYHERO_AUTH_TOKEN=your_payhero_auth_token
# PAYHERO_PAYMENT_URL=https://... (if not default)

NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_KEY=your_nowpayments_ipn_secret

# PORT=3000
```

## Setup and Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create and configure `.env` file:**
    *   Copy `.env.example` (if provided) to `.env` or create a new `.env` file.
    *   Fill in the required environment variables as listed above.
    *   **Important:** You will need to set up Supabase, Upstash Redis, PayHero, and NOWPayments accounts to get the necessary API keys and credentials.

4.  **Database Setup (Supabase):**
    *   Ensure your Supabase instance has the required tables:
        *   `products` (for bot details, files, pricing)
        *   `categories` (for product categories)
        *   `settings` (for application-wide settings)
        *   `static_pages` (for custom content pages)
        *   `orders` (for customer purchases and payment details)
    *   The `server.js` file includes a `selfCheck()` function that attempts to interact with these tables. Initial schema setup might be required manually in your Supabase dashboard.

5.  **Run the server:**
    ```bash
    npm start
    ```
    The server will typically run on the port specified in your `.env` file or default to port 10000.

## API Endpoints

The backend provides several API endpoints, primarily under the `/api/` path. These include:

*   `/api/data`: Fetches initial data for the frontend (products, categories, settings).
*   `/api/save-data`: Saves updated data from the admin panel.
*   `/api/add-bot`, `/api/delete-bot`: Manage bot products.
*   `/api/login`, `/api/logout`, `/api/check-session`: Admin authentication.
*   `/api/submit-ref`: For manual M-PESA reference code submission.
*   `/api/orders`, `/api/order-status/...`, `/api/update-order-status`: Manage and check order statuses.
*   `/api/initiate-server-stk-push`, `/api/payhero-callback`: For PayHero M-PESA STK push integration.
*   `/api/nowpayments/currencies`, `/api/nowpayments/create-payment`, `/api/nowpayments/payment-status/...`, `/api/nowpayments/ipn`: For NOWPayments cryptocurrency integration.
*   `/api/page/:slug`: Fetches content for static pages.
*   `/download/:fileId`: Securely delivers purchased files.

## File Structure

*   `server.js`: The main Express application file, containing all backend logic, API routes, and service integrations.
*   `package.json`: Lists project dependencies and scripts.
*   `Procfile`: Suggests deployment on platforms like Heroku/DigitalOcean Apps.
*   `public/`: Contains static assets for the frontend application (HTML, CSS, JavaScript, images).
    *   `index.html`: The main entry point for the client-side application.
    *   `virus.html`: An admin panel interface.
*   `README.md`: This file.

## Admin Panel

The application includes an admin panel accessible via `virus.html` (once logged in). This panel allows for:
*   Managing products (adding, editing, deleting bots).
*   Managing categories.
*   Managing static content pages.
*   Configuring application settings (e.g., support email, logo, payment details, admin credentials).
*   Viewing and managing orders.

---

This README provides a general overview. Refer to the code in `server.js` for detailed implementation of features and API endpoints.
