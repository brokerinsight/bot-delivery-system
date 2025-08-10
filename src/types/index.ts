export interface Product {
  item: string;
  file_id: string;
  price: number;
  name: string;
  description: string | null;
  image: string | null;
  category: string;
  embed: string | null;
  is_new: boolean;
  is_archived: boolean;
  original_file_name: string | null;
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