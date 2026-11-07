import { createContext } from "react";
import type { CartItem } from "../types/cart";
import type { Category } from "../types/category";
import type { CurrencyCode } from "../types/market";
import type { Product } from "../types/product";

export interface StoreContextValue {
  products: Product[];
  categories: Category[];
  isCatalogLoading: boolean;
  catalogError: string;
  accountCommerceError: string;
  isAccountCommerceSyncing: boolean;
  refreshCatalog: () => Promise<void>;
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  currency: CurrencyCode;
  wishlistProductIds: string[];
  addToCart: (productId: string, variantId: string) => boolean;
  clearCart: () => void;
  updateCartItem: (productId: string, variantId: string, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  setCurrency: (currency: CurrencyCode) => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

export const StoreContext = createContext<StoreContextValue | undefined>(undefined);
