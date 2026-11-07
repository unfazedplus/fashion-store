import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { categories as fallbackCategories } from "../Data/categories";
import { products as fallbackProducts } from "../Data/products";
import { baseCurrency, isSupportedCurrency } from "../config/commerce";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";
import { loadAccountCommerce, saveAccountCommerce, type AccountCommerceData } from "../services/account-commerce";
import { getStorefrontCatalog } from "../services/catalog";
import type { CartItem } from "../types/cart";
import type { Category } from "../types/category";
import type { CurrencyCode } from "../types/market";
import type { Product } from "../types/product";
import { StoreContext, type StoreContextValue } from "./store-context";

const CART_STORAGE_KEY = "unfazed-cart-v1";
const CURRENCY_STORAGE_KEY = "unfazed-currency-v1";
const WISHLIST_STORAGE_KEY = "unfazed-wishlist-v1";
const COMMERCE_OWNER_STORAGE_KEY = "unfazed-commerce-owner-v1";

interface StoreState {
  cartItems: CartItem[];
  currency: CurrencyCode;
  wishlistProductIds: string[];
}

interface CatalogState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  errorMessage: string;
}

type StoreAction =
  | { type: "add-cart-item"; productId: string; variantId: string; maximumQuantity: number }
  | { type: "update-cart-item"; productId: string; variantId: string; quantity: number; maximumQuantity: number }
  | { type: "remove-cart-item"; productId: string; variantId: string }
  | { type: "reconcile-cart"; cartItems: CartItem[] }
  | { type: "replace-commerce"; cartItems: CartItem[]; wishlistProductIds: string[]; currency: CurrencyCode }
  | { type: "clear-cart" }
  | { type: "set-currency"; currency: CurrencyCode }
  | { type: "toggle-wishlist"; productId: string };

function readStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function createInitialState(): StoreState {
  const storedCurrency = typeof window === "undefined"
    ? baseCurrency
    : window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  const hasAccountOwner = typeof window !== "undefined" && Boolean(
    window.localStorage.getItem(COMMERCE_OWNER_STORAGE_KEY),
  );

  return {
    cartItems: (hasAccountOwner ? [] : readStoredArray<CartItem>(CART_STORAGE_KEY)).filter(
      (item) =>
        typeof item.productId === "string" &&
        typeof item.variantId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    ),
    currency: isSupportedCurrency(storedCurrency) ? storedCurrency : baseCurrency,
    wishlistProductIds: (hasAccountOwner ? [] : readStoredArray<string>(WISHLIST_STORAGE_KEY)).filter(
      (productId) => typeof productId === "string",
    ),
  };
}

function createInitialCatalogState(): CatalogState {
  if (!isSupabaseConfigured) {
    return {
      products: fallbackProducts,
      categories: fallbackCategories,
      isLoading: false,
      errorMessage: "",
    };
  }

  return {
    products: [],
    categories: [],
    isLoading: true,
    errorMessage: "",
  };
}

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "add-cart-item": {
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.productId && item.variantId === action.variantId,
      );

      if (existingItem) {
        return {
          ...state,
          cartItems: state.cartItems.map((item) =>
            item.productId === action.productId && item.variantId === action.variantId
              ? { ...item, quantity: Math.min(item.quantity + 1, action.maximumQuantity) }
              : item,
          ),
        };
      }

      return {
        ...state,
        cartItems: [
          ...state.cartItems,
          { productId: action.productId, variantId: action.variantId, quantity: 1 },
        ],
      };
    }
    case "update-cart-item":
      if (action.quantity <= 0) {
        return {
          ...state,
          cartItems: state.cartItems.filter(
            (item) => item.productId !== action.productId || item.variantId !== action.variantId,
          ),
        };
      }

      return {
        ...state,
        cartItems: state.cartItems.map((item) =>
          item.productId === action.productId && item.variantId === action.variantId
            ? { ...item, quantity: Math.min(action.quantity, action.maximumQuantity) }
            : item,
        ),
      };
    case "remove-cart-item":
      return {
        ...state,
        cartItems: state.cartItems.filter(
          (item) => item.productId !== action.productId || item.variantId !== action.variantId,
        ),
      };
    case "reconcile-cart":
      return {
        ...state,
        cartItems: action.cartItems,
      };
    case "replace-commerce":
      return {
        cartItems: action.cartItems,
        wishlistProductIds: action.wishlistProductIds,
        currency: action.currency,
      };
    case "clear-cart":
      return {
        ...state,
        cartItems: [],
      };
    case "set-currency":
      return {
        ...state,
        currency: action.currency,
      };
    case "toggle-wishlist":
      return {
        ...state,
        wishlistProductIds: state.wishlistProductIds.includes(action.productId)
          ? state.wishlistProductIds.filter((productId) => productId !== action.productId)
          : [...state.wishlistProductIds, action.productId],
      };
    default:
      return state;
  }
}

function mergeAccountCommerce(
  localState: StoreState,
  accountData: AccountCommerceData,
  products: Product[],
): StoreState {
  const variantDetails = new Map<string, { productId: string; stock: number }>();
  for (const product of products) {
    for (const variant of product.variants) {
      variantDetails.set(variant.id, { productId: product.id, stock: variant.stock });
    }
  }

  const quantities = new Map<string, number>();
  for (const item of accountData.cartItems) {
    quantities.set(item.variantId, Math.max(quantities.get(item.variantId) ?? 0, item.quantity));
  }
  for (const item of localState.cartItems) {
    quantities.set(item.variantId, Math.max(quantities.get(item.variantId) ?? 0, item.quantity));
  }

  const cartItems = Array.from(quantities.entries()).flatMap(([variantId, quantity]) => {
    const variant = variantDetails.get(variantId);
    if (!variant || variant.stock <= 0 || quantity <= 0) {
      return [];
    }

    return [{
      productId: variant.productId,
      variantId,
      quantity: Math.min(quantity, variant.stock),
    }];
  });
  const validProductIds = new Set(products.map((product) => product.id));
  const wishlistProductIds = Array.from(new Set([
    ...accountData.wishlistProductIds,
    ...localState.wishlistProductIds,
  ])).filter((productId) => validProductIds.has(productId));

  return {
    cartItems,
    wishlistProductIds,
    currency: accountData.currency ?? localState.currency,
  };
}

interface StoreProviderProps {
  children: ReactNode;
}

function StoreProvider({ children }: StoreProviderProps) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const [state, dispatch] = useReducer(storeReducer, undefined, createInitialState);
  const [catalogState, setCatalogState] = useState<CatalogState>(createInitialCatalogState);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [accountCommerceError, setAccountCommerceError] = useState("");
  const stateRef = useRef(state);
  const activeUserIdRef = useRef<string | null>(null);
  const accountSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const queueAccountCommerceSave = useCallback((
    accountUserId: string,
    currency: CurrencyCode,
    cartItems: CartItem[],
    wishlistProductIds: string[],
  ) => {
    const savePromise = accountSaveQueueRef.current.then(async () => {
      if (activeUserIdRef.current !== accountUserId) {
        return;
      }

      await saveAccountCommerce(accountUserId, currency, cartItems, wishlistProductIds);
    });

    accountSaveQueueRef.current = savePromise.catch(() => undefined);
    return savePromise;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const previousUserId = activeUserIdRef.current;
    const storedOwnerId = window.localStorage.getItem(COMMERCE_OWNER_STORAGE_KEY);
    const isLeavingAccount = !userId && Boolean(previousUserId || storedOwnerId);
    const isSwitchingAccounts = Boolean(userId && previousUserId && previousUserId !== userId);
    const hasMismatchedStoredOwner = Boolean(userId && storedOwnerId && storedOwnerId !== userId);

    if (isLeavingAccount || isSwitchingAccounts || hasMismatchedStoredOwner) {
      const clearedState = {
        ...stateRef.current,
        cartItems: [],
        wishlistProductIds: [],
      };

      stateRef.current = clearedState;
      window.localStorage.setItem(CART_STORAGE_KEY, "[]");
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, "[]");
      window.localStorage.removeItem(COMMERCE_OWNER_STORAGE_KEY);
      dispatch({ type: "replace-commerce", ...clearedState });
    }

    if (previousUserId !== userId) {
      setSyncedUserId(null);
      setAccountCommerceError("");
    }

    activeUserIdRef.current = userId;
  }, [isAuthLoading, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isActive = true;

    getStorefrontCatalog()
      .then((catalog) => {
        if (isActive) {
          setCatalogState({
            products: catalog.products,
            categories: catalog.categories,
            isLoading: false,
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setCatalogState({
            products: [],
            categories: [],
            isLoading: false,
            errorMessage: error instanceof Error ? error.message : "Unable to load the catalogue.",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      isAuthLoading ||
      !userId ||
      syncedUserId === userId ||
      catalogState.isLoading ||
      catalogState.errorMessage
    ) {
      return;
    }

    let isActive = true;

    Promise.resolve().then(async () => {
      const storedOwnerId = window.localStorage.getItem(COMMERCE_OWNER_STORAGE_KEY);

      try {
        const accountData = await loadAccountCommerce(userId);
        if (!isActive || activeUserIdRef.current !== userId) {
          return;
        }

        const canMergeLocalData = !storedOwnerId || storedOwnerId === userId;
        const localState = canMergeLocalData
          ? stateRef.current
          : { ...stateRef.current, cartItems: [], wishlistProductIds: [] };
        const stateToSave = mergeAccountCommerce(localState, accountData, catalogState.products);

        await queueAccountCommerceSave(
          userId,
          stateToSave.currency,
          stateToSave.cartItems,
          stateToSave.wishlistProductIds,
        );

        if (!isActive || activeUserIdRef.current !== userId) {
          return;
        }

        const latestLocalState = canMergeLocalData
          ? stateRef.current
          : { ...stateRef.current, cartItems: [], wishlistProductIds: [] };
        const mergedState = mergeAccountCommerce(
          latestLocalState,
          accountData,
          catalogState.products,
        );

        stateRef.current = mergedState;
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mergedState.cartItems));
        window.localStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify(mergedState.wishlistProductIds),
        );
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, mergedState.currency);
        window.localStorage.setItem(COMMERCE_OWNER_STORAGE_KEY, userId);
        dispatch({ type: "replace-commerce", ...mergedState });
        setSyncedUserId(userId);
        setAccountCommerceError("");
      } catch (error) {
        if (isActive && activeUserIdRef.current === userId) {
          setAccountCommerceError(
            error instanceof Error ? error.message : "Unable to sync your saved shopping data.",
          );
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    catalogState.errorMessage,
    catalogState.isLoading,
    catalogState.products,
    isAuthLoading,
    queueAccountCommerceSave,
    syncedUserId,
    userId,
  ]);

  useEffect(() => {
    if (catalogState.isLoading || catalogState.errorMessage) {
      return;
    }

    const reconciledItems = state.cartItems.flatMap((item) => {
      const product = catalogState.products.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);

      if (!variant || variant.stock <= 0) {
        return [];
      }

      return [{ ...item, quantity: Math.min(item.quantity, variant.stock) }];
    });
    const cartChanged = reconciledItems.length !== state.cartItems.length || reconciledItems.some(
      (item, index) => item.quantity !== state.cartItems[index]?.quantity,
    );

    if (cartChanged) {
      dispatch({ type: "reconcile-cart", cartItems: reconciledItems });
    }
  }, [catalogState.errorMessage, catalogState.isLoading, catalogState.products, state.cartItems]);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cartItems));
  }, [state.cartItems]);

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(state.wishlistProductIds));
  }, [state.wishlistProductIds]);

  useEffect(() => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, state.currency);
  }, [state.currency]);

  useEffect(() => {
    if (!userId || syncedUserId !== userId) {
      return;
    }

    window.localStorage.setItem(COMMERCE_OWNER_STORAGE_KEY, userId);
    const timeoutId = window.setTimeout(() => {
      queueAccountCommerceSave(
        userId,
        state.currency,
        state.cartItems,
        state.wishlistProductIds,
      )
        .then(() => {
          if (activeUserIdRef.current === userId) {
            setAccountCommerceError("");
          }
        })
        .catch((error: unknown) => {
          if (activeUserIdRef.current === userId) {
            setAccountCommerceError(
              error instanceof Error ? error.message : "Unable to sync your saved shopping data.",
            );
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    queueAccountCommerceSave,
    state.cartItems,
    state.currency,
    state.wishlistProductIds,
    syncedUserId,
    userId,
  ]);

  const refreshCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    setCatalogState((currentState) => ({ ...currentState, isLoading: true, errorMessage: "" }));

    try {
      const catalog = await getStorefrontCatalog();
      setCatalogState({
        products: catalog.products,
        categories: catalog.categories,
        isLoading: false,
        errorMessage: "",
      });
    } catch (error) {
      setCatalogState((currentState) => ({
        ...currentState,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Unable to load the catalogue.",
      }));
    }
  }, []);

  const addToCart = useCallback((productId: string, variantId: string) => {
    const product = catalogState.products.find((item) => item.id === productId && item.status === "active");
    const variant = product?.variants.find((item) => item.id === variantId);

    if (!product || !variant || variant.stock <= 0) {
      return false;
    }

    dispatch({ type: "add-cart-item", productId, variantId, maximumQuantity: variant.stock });
    return true;
  }, [catalogState.products]);

  const updateCartItem = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      const product = catalogState.products.find((item) => item.id === productId);
      const variant = product?.variants.find((item) => item.id === variantId);

      if (!variant) {
        return;
      }

      dispatch({
        type: "update-cart-item",
        productId,
        variantId,
        quantity,
        maximumQuantity: variant.stock,
      });
    },
    [catalogState.products],
  );

  const removeFromCart = useCallback((productId: string, variantId: string) => {
    dispatch({ type: "remove-cart-item", productId, variantId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "clear-cart" });
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    dispatch({ type: "set-currency", currency });
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    dispatch({ type: "toggle-wishlist", productId });
  }, []);

  const value = useMemo<StoreContextValue>(() => {
    const cartItems = catalogState.isLoading
      ? state.cartItems
      : state.cartItems.filter((item) => {
          const product = catalogState.products.find((candidate) => candidate.id === item.productId);
          return product?.variants.some((variant) => variant.id === item.variantId);
        });
    const wishlistProductIds = catalogState.isLoading
      ? state.wishlistProductIds
      : state.wishlistProductIds.filter((productId) =>
          catalogState.products.some((product) => product.id === productId),
        );
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartSubtotal = cartItems.reduce((total, item) => {
      const product = catalogState.products.find((candidate) => candidate.id === item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      return total + (variant?.prices[state.currency] ?? 0) * item.quantity;
    }, 0);

    return {
      products: catalogState.products,
      categories: catalogState.categories,
      isCatalogLoading: catalogState.isLoading,
      catalogError: catalogState.errorMessage,
      accountCommerceError,
      isAccountCommerceSyncing: userId
        ? syncedUserId !== userId && !accountCommerceError
        : false,
      refreshCatalog,
      cartItems,
      cartCount,
      cartSubtotal,
      currency: state.currency,
      wishlistProductIds,
      addToCart,
      clearCart,
      updateCartItem,
      removeFromCart,
      setCurrency,
      toggleWishlist,
      isWishlisted: (productId: string) => wishlistProductIds.includes(productId),
    };
  }, [accountCommerceError, addToCart, catalogState, clearCart, refreshCatalog, removeFromCart, setCurrency, state, syncedUserId, toggleWishlist, updateCartItem, userId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export default StoreProvider;
