-- Custom Bot Orders Table
-- Run this in your Supabase SQL editor to create the custom_bot_orders table

CREATE TABLE IF NOT EXISTS public.custom_bot_orders (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  client_email TEXT NOT NULL,
  bot_description TEXT NOT NULL,
  bot_features TEXT NOT NULL,
  budget_amount REAL NOT NULL CHECK (budget_amount >= 10),
  payment_method TEXT NOT NULL,
  refund_method TEXT NOT NULL CHECK (refund_method IN ('crypto', 'mpesa')),
  refund_crypto_wallet TEXT,
  refund_crypto_network TEXT,
  refund_mpesa_number TEXT,
  refund_mpesa_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  ref_code TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  mpesa_receipt_number TEXT,
  refund_reason TEXT,
  custom_refund_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Add check constraints for refund methods
ALTER TABLE public.custom_bot_orders 
ADD CONSTRAINT check_crypto_refund 
CHECK (
  (refund_method = 'crypto' AND refund_crypto_wallet IS NOT NULL AND refund_crypto_network IS NOT NULL) 
  OR 
  (refund_method = 'mpesa' AND refund_mpesa_number IS NOT NULL AND refund_mpesa_name IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_bot_orders_tracking_number ON public.custom_bot_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_custom_bot_orders_client_email ON public.custom_bot_orders(client_email);
CREATE INDEX IF NOT EXISTS idx_custom_bot_orders_status ON public.custom_bot_orders(status);
CREATE INDEX IF NOT EXISTS idx_custom_bot_orders_payment_status ON public.custom_bot_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_custom_bot_orders_created_at ON public.custom_bot_orders(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_custom_bot_orders_updated_at 
  BEFORE UPDATE ON public.custom_bot_orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.custom_bot_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations for authenticated users" ON public.custom_bot_orders
  FOR ALL TO authenticated
  USING (true);

-- Sample refund reasons for dropdown (optional - can be stored in a separate table or hardcoded)
-- You can create a separate table if you want to make refund reasons configurable
CREATE TABLE IF NOT EXISTS public.refund_reasons (
  id SERIAL PRIMARY KEY,
  reason TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default refund reasons
INSERT INTO public.refund_reasons (reason) VALUES
  ('Bot requirements too complex'),
  ('Insufficient budget provided'),
  ('Technical limitations'),
  ('Customer request'),
  ('Payment processing failed'),
  ('Duplicate order'),
  ('Policy violation'),
  ('Other')
ON CONFLICT (reason) DO NOTHING;

-- Create download_tokens table for multi-item cart downloads
CREATE TABLE IF NOT EXISTS public.download_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  order_ids INTEGER[] NOT NULL,
  files JSONB NOT NULL,
  customer_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for download_tokens
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON public.download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_customer_email ON public.download_tokens(customer_email);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at ON public.download_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_download_tokens_used ON public.download_tokens(used);

-- Create trigger for download_tokens updated_at
CREATE TRIGGER update_download_tokens_updated_at 
  BEFORE UPDATE ON public.download_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for download_tokens
ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for download_tokens
CREATE POLICY "Allow all operations for authenticated users" ON public.download_tokens
  FOR ALL TO authenticated
  USING (true);

-- Grant necessary permissions (adjust as needed)
GRANT ALL ON public.custom_bot_orders TO authenticated;
GRANT ALL ON public.refund_reasons TO authenticated;
GRANT ALL ON public.download_tokens TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Environment Variables Setup Instructions
-- Add these to your .env.local file:

-- Email Configuration (NodeMailer - matches existing server.js setup)
-- EMAIL_USER=your-email@gmail.com
-- EMAIL_PASS=your-app-password

-- Redis Configuration (Upstash Redis for caching and rate limiting)
-- UPSTASH_REDIS_REST_URL=https://your-redis-endpoint.upstash.io
-- UPSTASH_REDIS_REST_TOKEN=your-redis-token

-- Payment Integration (if using existing providers)
-- PAYHERO_CHANNEL_ID=your-channel-id
-- PAYHERO_PAYMENT_URL=https://backend.payhero.co.ke/api/v2/payments
-- PAYHERO_AUTH_TOKEN=your-auth-token
-- NOWPAYMENTS_API_KEY=your-nowpayments-api-key

-- Site Configuration
-- NEXT_PUBLIC_SITE_URL=https://yoursite.com