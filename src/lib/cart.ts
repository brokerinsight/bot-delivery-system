import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItem: (productId: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product.item === product.item);
          
          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.product.item === product.item
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          } else {
            return {
              items: [...state.items, { product, quantity }],
            };
          }
        });
      },
      
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.product.item !== productId),
        }));
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.product.item === productId
              ? { ...item, quantity }
              : item
          ),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      },
      
      getItem: (productId: string) => {
        return get().items.find(item => item.product.item === productId);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => {
        // Check if we're on the client side
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);

// Cart utilities
export const formatPrice = (price: number, currency = 'KES') => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export const calculateDiscount = (originalPrice: number, discountPercentage: number) => {
  return originalPrice * (discountPercentage / 100);
};

export const calculateTax = (price: number, taxRate = 0.16) => {
  return price * taxRate;
};

export const validateCartItem = (item: CartItem): boolean => {
  return !!(
    item.product &&
    item.product.item &&
    item.product.name &&
    item.product.price > 0 &&
    item.quantity > 0
  );
};

export const sanitizeCart = (items: CartItem[]): CartItem[] => {
  return items.filter(validateCartItem);
};