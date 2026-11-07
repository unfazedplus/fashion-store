export type CurrencyCode = "NGN" | "USD";

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  locale: string;
}

export type PriceBook = Record<CurrencyCode, number>;
