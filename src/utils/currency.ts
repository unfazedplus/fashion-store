import { supportedCurrencies } from "../config/commerce";
import type { CurrencyCode } from "../types/market";

export function formatCurrency(amountInMinorUnits: number, currency: CurrencyCode) {
  const currencyOption = supportedCurrencies.find((option) => option.code === currency);
  const currencyFormatter = new Intl.NumberFormat(currencyOption?.locale ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  });

  return currencyFormatter.format(amountInMinorUnits / 100);
}
