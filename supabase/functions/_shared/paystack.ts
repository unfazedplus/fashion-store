const PAYSTACK_API_URL = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: {
    email: string;
  };
}

export interface PaystackInitialization {
  authorization_url: string;
  access_code: string;
  reference: string;
}

async function paystackRequest<T>(path: string, secretKey: string, init?: RequestInit) {
  const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json() as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Paystack request failed");
  }

  return payload.data;
}

export function initializePaystackTransaction(
  secretKey: string,
  payload: {
    email: string;
    amount: number;
    currency: "NGN" | "USD";
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  },
) {
  return paystackRequest<PaystackInitialization>("/transaction/initialize", secretKey, {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      callback_url: payload.callbackUrl,
      metadata: payload.metadata,
    }),
  });
}

export function verifyPaystackTransaction(secretKey: string, reference: string) {
  return paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    secretKey,
  );
}

export async function createPaystackSignature(secretKey: string, body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function signaturesMatch(firstSignature: string, secondSignature: string) {
  if (firstSignature.length !== secondSignature.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < firstSignature.length; index += 1) {
    difference |= firstSignature.charCodeAt(index) ^ secondSignature.charCodeAt(index);
  }

  return difference === 0;
}
