export interface Product {
  item: string;
  fileId?: string;
  file_id?: string;
  price: number;
  name: string;
  description: string;
  image: string;
  category: string;
  embed?: string;
  isNew?: boolean;
  is_new?: boolean;
  isArchived?: boolean;
  is_archived?: boolean;
  originalFileName?: string;
  original_file_name?: string;
  created_at: string;
}

export interface Category {
  name: string;
}

export interface Order {
  id: number;
  item: string;
  ref_code: string;
  amount: number;
  timestamp: string;
  status: string;
  downloaded: boolean;
  payer_phone_number: string | null;
  payment_method: string;
  email: string | null;
  currency_paid: string | null;
  nowpayments_payment_id: string | null;
  amount_paid_crypto: number | null;
  mpesa_receipt_number: string | null;
  notes: string | null;
}

export interface CustomBotOrder {
  id: number;
  tracking_number: string;
  client_email: string;
  bot_description: string;
  bot_features: string;
  budget_amount: number;
  payment_method: string;
  refund_method: string;
  refund_crypto_wallet?: string | null;
  refund_crypto_network?: string | null;
  refund_mpesa_number?: string | null;
  refund_mpesa_name?: string | null;
  status: 'pending' | 'completed' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed';
  ref_code: string;
  payment_id?: string | null;
  mpesa_receipt_number?: string | null;
  refund_reason?: string | null;
  custom_refund_message?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  refunded_at?: string | null;
}

export interface CustomBotOrderRequest {
  client_email: string;
  bot_description: string;
  bot_features: string;
  budget_amount: number;
  payment_method: string;
  refund_method: string;
  refund_crypto_wallet?: string;
  refund_crypto_network?: string;
  refund_mpesa_number?: string;
  refund_mpesa_name?: string;
  terms_accepted: boolean;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  key: string;
  value: string;
}

export interface StaticPage {
  title: string;
  slug: string;
  content: string;
}

export interface Email {
  id: number;
  email: string;
  subject: string;
  body: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DownloadToken {
  token: string;
  orderIds: number[];
  expiresAt: Date;
  used: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface StoreSettings {
  storeName: string;
  storeDescription: string;
  supportEmail: string;
  copyrightText: string;
  socials: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  mpesaTillNumber: string;
  adminEmail: string;
  adminPassword: string;
  activePaymentOptions: {
    mpesa_manual: boolean;
    mpesa_payhero: boolean;
    crypto_nowpayments: boolean;
  };
}

export interface SearchParams {
  query?: string;
  category?: string;
  page?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationInfo;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface OrderStatusUpdate {
  orderId: number;
  status: string;
  refCode: string;
}

export interface ProductUpdate {
  action: 'create' | 'update' | 'delete';
  product: Product;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  glassmorphism: boolean;
  animations: boolean;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
export type UserRole = 'admin' | 'customer';

export interface PaymentRequest {
  productId: string;
  amount: number;
  currency: string;
  email?: string;
  phoneNumber?: string;
  paymentMethod: string;
}

export interface PaymentResponse {
  success: boolean;
  refCode?: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
}

export interface DownloadRequest {
  token: string;
}

export interface DownloadResponse {
  success: boolean;
  files?: Array<{
    filename: string;
    downloadUrl: string;
  }>;
  error?: string;
}