type CurrencyCode = "NGN" | "USD";
type ShippingMethod = "standard" | "express";
type ShippingZone = "nigeria" | "africa" | "europe" | "north-america" | "south-america" | "asia-middle-east" | "oceania" | "rest-world";

const countryZones: Record<ShippingZone, string[]> = {
  nigeria: ["NG"],
  africa: ["GH", "KE", "ZA", "EG", "MA", "TZ", "UG", "RW", "SN", "CI", "CM"],
  europe: ["GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "SE", "NO", "DK", "FI", "PL", "CH", "AT"],
  "north-america": ["US", "CA", "MX"],
  "south-america": ["BR", "AR", "CL", "CO", "PE"],
  "asia-middle-east": ["AE", "SA", "QA", "TR", "IN", "PK", "CN", "JP", "KR", "SG", "MY", "ID", "PH", "TH", "VN"],
  oceania: ["AU", "NZ"],
  "rest-world": [],
};

const shippingPrices: Record<ShippingZone, Record<ShippingMethod, Record<CurrencyCode, number>>> = {
  nigeria: {
    standard: { NGN: 500000, USD: 400 },
    express: { NGN: 900000, USD: 700 },
  },
  africa: {
    standard: { NGN: 3500000, USD: 2200 },
    express: { NGN: 5500000, USD: 3500 },
  },
  europe: {
    standard: { NGN: 4500000, USD: 2800 },
    express: { NGN: 7000000, USD: 4400 },
  },
  "north-america": {
    standard: { NGN: 5000000, USD: 3200 },
    express: { NGN: 8000000, USD: 5000 },
  },
  "south-america": {
    standard: { NGN: 6000000, USD: 3800 },
    express: { NGN: 9000000, USD: 5600 },
  },
  "asia-middle-east": {
    standard: { NGN: 5000000, USD: 3200 },
    express: { NGN: 8000000, USD: 5000 },
  },
  oceania: {
    standard: { NGN: 6500000, USD: 4000 },
    express: { NGN: 9500000, USD: 6000 },
  },
  "rest-world": {
    standard: { NGN: 7000000, USD: 4500 },
    express: { NGN: 10500000, USD: 6500 },
  },
};

function getShippingZone(countryCode: string): ShippingZone {
  const normalizedCountryCode = countryCode.toUpperCase();
  const matchingZone = Object.entries(countryZones).find(([, countryCodes]) =>
    countryCodes.includes(normalizedCountryCode)
  );

  return (matchingZone?.[0] as ShippingZone | undefined) ?? "rest-world";
}

export function getShippingAmount(
  countryCode: string,
  shippingMethod: string,
  currency: string,
) {
  if (shippingMethod !== "standard" && shippingMethod !== "express") {
    throw new Error("Unsupported shipping method");
  }

  if (currency !== "NGN" && currency !== "USD") {
    throw new Error("Unsupported currency");
  }

  return shippingPrices[getShippingZone(countryCode)][shippingMethod][currency];
}
