import type { PriceBook } from "./market";

export type ShippingRegion =
  | "nigeria"
  | "africa"
  | "europe"
  | "north-america"
  | "south-america"
  | "asia-middle-east"
  | "oceania"
  | "rest-world";

export interface CountryOption {
  code: string;
  name: string;
  region: ShippingRegion;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  estimatedDelivery: string;
  prices: PriceBook;
}
