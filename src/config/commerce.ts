import type { CurrencyCode, CurrencyOption } from "../types/market";

export const merchantCountry = "Nigeria";
export const merchantCountryCode = "NG";
export const baseCurrency: CurrencyCode = "NGN";

export const supportedCurrencies: CurrencyOption[] = [
  { code: "NGN", label: "NGN · Nigerian Naira", locale: "en-NG" },
  { code: "USD", label: "USD · US Dollar", locale: "en-US" },
];

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return supportedCurrencies.some((currency) => currency.code === value);
}
