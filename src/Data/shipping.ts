import type { CountryOption, ShippingOption, ShippingRegion } from "../types/checkout";

export const shippingCountries: CountryOption[] = [
  { code: "NG", name: "Nigeria", region: "nigeria" },
  { code: "GH", name: "Ghana", region: "africa" },
  { code: "KE", name: "Kenya", region: "africa" },
  { code: "ZA", name: "South Africa", region: "africa" },
  { code: "EG", name: "Egypt", region: "africa" },
  { code: "MA", name: "Morocco", region: "africa" },
  { code: "TZ", name: "Tanzania", region: "africa" },
  { code: "UG", name: "Uganda", region: "africa" },
  { code: "RW", name: "Rwanda", region: "africa" },
  { code: "SN", name: "Senegal", region: "africa" },
  { code: "CI", name: "Côte d’Ivoire", region: "africa" },
  { code: "CM", name: "Cameroon", region: "africa" },
  { code: "GB", name: "United Kingdom", region: "europe" },
  { code: "IE", name: "Ireland", region: "europe" },
  { code: "FR", name: "France", region: "europe" },
  { code: "DE", name: "Germany", region: "europe" },
  { code: "ES", name: "Spain", region: "europe" },
  { code: "IT", name: "Italy", region: "europe" },
  { code: "NL", name: "Netherlands", region: "europe" },
  { code: "BE", name: "Belgium", region: "europe" },
  { code: "PT", name: "Portugal", region: "europe" },
  { code: "SE", name: "Sweden", region: "europe" },
  { code: "NO", name: "Norway", region: "europe" },
  { code: "DK", name: "Denmark", region: "europe" },
  { code: "FI", name: "Finland", region: "europe" },
  { code: "PL", name: "Poland", region: "europe" },
  { code: "CH", name: "Switzerland", region: "europe" },
  { code: "AT", name: "Austria", region: "europe" },
  { code: "US", name: "United States", region: "north-america" },
  { code: "CA", name: "Canada", region: "north-america" },
  { code: "MX", name: "Mexico", region: "north-america" },
  { code: "BR", name: "Brazil", region: "south-america" },
  { code: "AR", name: "Argentina", region: "south-america" },
  { code: "CL", name: "Chile", region: "south-america" },
  { code: "CO", name: "Colombia", region: "south-america" },
  { code: "PE", name: "Peru", region: "south-america" },
  { code: "AE", name: "United Arab Emirates", region: "asia-middle-east" },
  { code: "SA", name: "Saudi Arabia", region: "asia-middle-east" },
  { code: "QA", name: "Qatar", region: "asia-middle-east" },
  { code: "TR", name: "Türkiye", region: "asia-middle-east" },
  { code: "IN", name: "India", region: "asia-middle-east" },
  { code: "PK", name: "Pakistan", region: "asia-middle-east" },
  { code: "CN", name: "China", region: "asia-middle-east" },
  { code: "JP", name: "Japan", region: "asia-middle-east" },
  { code: "KR", name: "South Korea", region: "asia-middle-east" },
  { code: "SG", name: "Singapore", region: "asia-middle-east" },
  { code: "MY", name: "Malaysia", region: "asia-middle-east" },
  { code: "ID", name: "Indonesia", region: "asia-middle-east" },
  { code: "PH", name: "Philippines", region: "asia-middle-east" },
  { code: "TH", name: "Thailand", region: "asia-middle-east" },
  { code: "VN", name: "Vietnam", region: "asia-middle-east" },
  { code: "AU", name: "Australia", region: "oceania" },
  { code: "NZ", name: "New Zealand", region: "oceania" },
  { code: "ZZ", name: "Other country", region: "rest-world" },
];

const shippingOptionsByRegion: Record<ShippingRegion, ShippingOption[]> = {
  nigeria: [
    {
      id: "standard",
      name: "Standard delivery",
      description: "Tracked delivery across Nigeria",
      estimatedDelivery: "2–5 business days",
      prices: { NGN: 500000, USD: 400 },
    },
    {
      id: "express",
      name: "Express delivery",
      description: "Priority delivery in supported cities",
      estimatedDelivery: "1–2 business days",
      prices: { NGN: 900000, USD: 700 },
    },
  ],
  africa: createInternationalOptions("Africa", "4–9 business days", { NGN: 3500000, USD: 2200 }, { NGN: 5500000, USD: 3500 }),
  europe: createInternationalOptions("Europe", "5–10 business days", { NGN: 4500000, USD: 2800 }, { NGN: 7000000, USD: 4400 }),
  "north-america": createInternationalOptions("North America", "6–12 business days", { NGN: 5000000, USD: 3200 }, { NGN: 8000000, USD: 5000 }),
  "south-america": createInternationalOptions("South America", "8–15 business days", { NGN: 6000000, USD: 3800 }, { NGN: 9000000, USD: 5600 }),
  "asia-middle-east": createInternationalOptions("Asia and the Middle East", "6–12 business days", { NGN: 5000000, USD: 3200 }, { NGN: 8000000, USD: 5000 }),
  oceania: createInternationalOptions("Oceania", "8–15 business days", { NGN: 6500000, USD: 4000 }, { NGN: 9500000, USD: 6000 }),
  "rest-world": createInternationalOptions("your country", "8–18 business days", { NGN: 7000000, USD: 4500 }, { NGN: 10500000, USD: 6500 }),
};

function createInternationalOptions(
  destination: string,
  standardDelivery: string,
  standardPrices: ShippingOption["prices"],
  expressPrices: ShippingOption["prices"],
): ShippingOption[] {
  return [
    {
      id: "standard",
      name: "International tracked",
      description: `Tracked delivery from Nigeria to ${destination}`,
      estimatedDelivery: standardDelivery,
      prices: standardPrices,
    },
    {
      id: "express",
      name: "International express",
      description: `Priority courier delivery to ${destination}`,
      estimatedDelivery: "3–7 business days",
      prices: expressPrices,
    },
  ];
}

export function getShippingOptions(countryCode: string) {
  const country = shippingCountries.find((candidate) => candidate.code === countryCode);
  return shippingOptionsByRegion[country?.region ?? "rest-world"];
}
