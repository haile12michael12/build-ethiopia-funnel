import { getOrigin } from "@/lib/utils";
import { normalizeEthiopianPhone, isValidEthiopianPhone } from "@/lib/phone";

export type PaymentIntent = {
  orderNumber: string;
  amountCents: number;
  currency: string;
  email: string;
  name?: string;
  phone?: string;
};

export type PaymentResult = {
  ok: boolean;
  reference: string;
  status: "paid" | "pending" | "failed";
  redirectUrl?: string;
  message?: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  description: string;
  region: "et" | "intl";
  currencies: string[];
  needsPhone?: boolean;
  sandbox?: boolean;
};

export interface PaymentAdapter {
  id: string;
  label: string;
  description: string;
  currencies: string[];
  region: "et" | "intl";
  needsPhone?: boolean;
  available(): boolean;
  charge(intent: PaymentIntent): Promise<PaymentResult>;
}

export const ETHIOPIAN_BANKS = [
  { bank: "Commercial Bank of Ethiopia", accountName: "DigitalForge PLC", accountNumber: "1000123456789" },
  { bank: "Awash Bank", accountName: "DigitalForge PLC", accountNumber: "0132012345678" },
  { bank: "Bank of Abyssinia", accountName: "DigitalForge PLC", accountNumber: "1670123456789" },
  { bank: "Cooperative Bank of Oromia", accountName: "DigitalForge PLC", accountNumber: "1000001234567" },
];

export function sandboxPaymentsEnabled() {
  if (process.env.PAYMENTS_SANDBOX === "true") return true;
  if (process.env.PAYMENTS_SANDBOX === "false") return false;
  return !process.env.CHAPA_SECRET_KEY;
}

function ref(prefix: string, orderNumber: string) {
  return `${prefix}-${orderNumber}`;
}

function splitName(name?: string) {
  const parts = (name || "Digital Forge").trim().split(/\s+/);
  return { first: parts[0] || "Customer", last: parts.slice(1).join(" ") || "Buyer" };
}

export { normalizeEthiopianPhone, isValidEthiopianPhone };

function majorAmount(amountCents: number) {
  return Math.max(1, Math.round(amountCents / 100));
}

function sandboxRedirect(orderNumber: string, method: string) {
  const origin = getOrigin();
  return `${origin}/pay/ethiopia?order=${encodeURIComponent(orderNumber)}&method=${encodeURIComponent(method)}`;
}

async function initializeChapa(intent: PaymentIntent): Promise<PaymentResult> {
  const key = process.env.CHAPA_SECRET_KEY;
  const { first, last } = splitName(intent.name);
  const txRef = intent.orderNumber;
  const origin = getOrigin();
  if (!key) {
    return {
      ok: true,
      status: "pending",
      reference: ref("CHAPA", txRef),
      redirectUrl: sandboxRedirect(txRef, "chapa"),
      message: "Sandbox Chapa checkout — no live secret key configured.",
    };
  }

  const amount = String(majorAmount(intent.amountCents));
  const currency = intent.currency === "USD" ? "USD" : "ETB";
  const res = await fetch("https://api.chapa.co/v1/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      email: intent.email,
      first_name: first,
      last_name: last,
      phone_number: normalizeEthiopianPhone(intent.phone) || undefined,
      tx_ref: txRef,
      callback_url: `${origin}/api/payments/chapa/webhook`,
      return_url: `${origin}/checkout/return?order=${encodeURIComponent(txRef)}`,
      customization: {
        title: "DigitalForge",
        description: `Order ${txRef}`,
      },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { checkout_url?: string };
  };
  if (!res.ok || !data.data?.checkout_url) {
    return {
      ok: false,
      status: "failed",
      reference: ref("CHAPA", txRef),
      message: data.message || "Chapa could not start checkout.",
    };
  }
  return {
    ok: true,
    status: "pending",
    reference: ref("CHAPA", txRef),
    redirectUrl: data.data.checkout_url,
    message: "Redirecting to Chapa.",
  };
}

async function chargeChapaDirect(type: string, intent: PaymentIntent): Promise<PaymentResult> {
  const key = process.env.CHAPA_SECRET_KEY;
  const phone = normalizeEthiopianPhone(intent.phone);
  if (!isValidEthiopianPhone(phone)) {
    return {
      ok: false,
      status: "failed",
      reference: ref(type.toUpperCase(), intent.orderNumber),
      message: "Enter a valid Ethiopian mobile number (09… or +2519…).",
    };
  }
  if (!key) {
    return {
      ok: true,
      status: "pending",
      reference: ref(type.toUpperCase(), intent.orderNumber),
      redirectUrl: sandboxRedirect(intent.orderNumber, type),
      message: "Sandbox mobile-money checkout.",
    };
  }
  const origin = getOrigin();
  const res = await fetch(`https://api.chapa.co/v1/charges?type=${encodeURIComponent(type)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(majorAmount(intent.amountCents)),
      currency: "ETB",
      mobile: phone,
      tx_ref: intent.orderNumber,
      email: intent.email,
      first_name: splitName(intent.name).first,
      last_name: splitName(intent.name).last,
      callback_url: `${origin}/api/payments/chapa/webhook`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
  if (!res.ok) {
    return {
      ok: false,
      status: "failed",
      reference: ref(type.toUpperCase(), intent.orderNumber),
      message: data.message || `Could not start ${type} payment.`,
    };
  }
  return {
    ok: true,
    status: "pending",
    reference: ref(type.toUpperCase(), intent.orderNumber),
    redirectUrl: `${origin}/pay/waiting?order=${encodeURIComponent(intent.orderNumber)}&method=${encodeURIComponent(type)}`,
    message: "Approve the prompt on your phone.",
  };
}

export async function verifyChapaTransaction(txRef: string) {
  const key = process.env.CHAPA_SECRET_KEY;
  if (!key) {
    return { ok: false, status: "pending", raw: { sandbox: true } };
  }
  const res = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const raw = (await res.json().catch(() => ({}))) as {
    status?: string;
    data?: { status?: string; tx_ref?: string };
  };
  const paidStatus = String(raw.data?.status || "").toLowerCase();
  const paid = raw.status === "success" && ["success", "successful", "paid"].includes(paidStatus);
  return { ok: paid, status: raw.data?.status || raw.status || "unknown", raw };
}

async function initializeSantimPay(intent: PaymentIntent): Promise<PaymentResult> {
  const merchant = process.env.SANTIMPAY_MERCHANT_ID;
  const token = process.env.SANTIMPAY_PRIVATE_KEY || process.env.SANTIMPAY_TOKEN;
  const origin = getOrigin();
  if (!merchant || !token) {
    return {
      ok: true,
      status: "pending",
      reference: ref("SANTIM", intent.orderNumber),
      redirectUrl: sandboxRedirect(intent.orderNumber, "santimpay"),
      message: "Sandbox SantimPay checkout.",
    };
  }
  const base = process.env.SANTIMPAY_BASE_URL || "https://services.santimpay.com/api/v1/gateway/initiate-payment";
  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: intent.orderNumber,
      amount: majorAmount(intent.amountCents),
      paymentReason: `DigitalForge ${intent.orderNumber}`,
      successRedirectUrl: `${origin}/checkout/return?order=${encodeURIComponent(intent.orderNumber)}`,
      failureRedirectUrl: `${origin}/checkout?error=santimpay`,
      notifyUrl: `${origin}/api/payments/santimpay/webhook`,
      cancelRedirectUrl: `${origin}/cart`,
      merchantId: merchant,
      phoneNumber: normalizeEthiopianPhone(intent.phone) || undefined,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; checkoutUrl?: string; message?: string };
  const url = data.url || data.checkoutUrl;
  if (!res.ok || !url) {
    return {
      ok: false,
      status: "failed",
      reference: ref("SANTIM", intent.orderNumber),
      message: data.message || "SantimPay could not start checkout.",
    };
  }
  return { ok: true, status: "pending", reference: ref("SANTIM", intent.orderNumber), redirectUrl: url };
}

export const testCardAdapter: PaymentAdapter = {
  id: "test_card",
  label: "Test card",
  description: "Instant demo checkout. No real charge.",
  currencies: ["USD", "ETB"],
  region: "intl",
  available: () => true,
  async charge(intent) {
    return { ok: true, status: "paid", reference: ref("TEST", intent.orderNumber) };
  },
};

export const manualAdapter: PaymentAdapter = {
  id: "manual",
  label: "International bank transfer",
  description: "Pay via SWIFT / bank transfer. We verify and release files.",
  currencies: ["USD", "ETB"],
  region: "intl",
  available: () => true,
  async charge(intent) {
    const demo = process.env.PAYMENTS_MANUAL_FULFILL === "true";
    return {
      ok: true,
      status: demo ? "paid" : "pending",
      reference: ref("MAN", intent.orderNumber),
      redirectUrl: demo ? undefined : `${getOrigin()}/pay/bank?order=${encodeURIComponent(intent.orderNumber)}`,
      message: demo ? "Demo mode: manual payment auto-fulfilled." : "Awaiting transfer verification.",
    };
  },
};

export const stripeAdapter: PaymentAdapter = {
  id: "stripe",
  label: "Stripe",
  description: "Cards, Apple Pay, Google Pay.",
  currencies: ["USD"],
  region: "intl",
  available: () => Boolean(process.env.STRIPE_SECRET_KEY),
  async charge(intent) {
    if (!this.available()) {
      return { ok: false, status: "failed", reference: ref("STRIPE", intent.orderNumber), message: "Stripe is not configured." };
    }
    return { ok: true, status: "paid", reference: ref("STRIPE", intent.orderNumber) };
  },
};

export const paypalAdapter: PaymentAdapter = {
  id: "paypal",
  label: "PayPal",
  description: "PayPal balance and cards.",
  currencies: ["USD"],
  region: "intl",
  available: () => Boolean(process.env.PAYPAL_CLIENT_ID),
  async charge(intent) {
    if (!this.available()) {
      return { ok: false, status: "failed", reference: ref("PP", intent.orderNumber), message: "PayPal is not configured." };
    }
    return { ok: true, status: "paid", reference: ref("PP", intent.orderNumber) };
  },
};

export const chapaAdapter: PaymentAdapter = {
  id: "chapa",
  label: "Chapa",
  description: "Telebirr, CBE Birr, cards and Ethiopian banks in one checkout.",
  currencies: ["ETB", "USD"],
  region: "et",
  available: () => Boolean(process.env.CHAPA_SECRET_KEY) || sandboxPaymentsEnabled(),
  async charge(intent) {
    return initializeChapa(intent);
  },
};

function directAdapter(id: string, label: string, description: string): PaymentAdapter {
  return {
    id,
    label,
    description,
    currencies: ["ETB"],
    region: "et",
    needsPhone: true,
    available: () => Boolean(process.env.CHAPA_SECRET_KEY) || sandboxPaymentsEnabled(),
    async charge(intent) {
      return chargeChapaDirect(id, intent);
    },
  };
}

export const telebirrAdapter = directAdapter("telebirr", "Telebirr", "Pay from your Telebirr wallet. A prompt is sent to your phone.");
export const cbebirrAdapter = directAdapter("cbebirr", "CBE Birr", "Pay with Commercial Bank of Ethiopia CBE Birr.");
export const mpesaAdapter = directAdapter("mpesa", "M-Pesa Ethiopia", "Pay with Safaricom M-Pesa Ethiopia.");
export const awashbirrAdapter = directAdapter("awashbirr", "Awash Birr", "Pay with Awash Bank mobile money.");
export const ebirrAdapter = directAdapter("ebirr", "Coopay / eBirr", "Pay with Cooperative Bank of Oromia eBirr.");

export const santimpayAdapter: PaymentAdapter = {
  id: "santimpay",
  label: "SantimPay",
  description: "Ethiopian aggregator for Telebirr, CBE Birr and cards.",
  currencies: ["ETB"],
  region: "et",
  available: () =>
    Boolean(process.env.SANTIMPAY_MERCHANT_ID && (process.env.SANTIMPAY_PRIVATE_KEY || process.env.SANTIMPAY_TOKEN)) ||
    sandboxPaymentsEnabled(),
  async charge(intent) {
    return initializeSantimPay(intent);
  },
};

export const bankEtAdapter: PaymentAdapter = {
  id: "bank_et",
  label: "Ethiopian bank transfer",
  description: "Pay to CBE, Awash, Abyssinia or Coop. We match your reference and release files.",
  currencies: ["ETB"],
  region: "et",
  available: () => true,
  async charge(intent) {
    return {
      ok: true,
      status: "pending",
      reference: ref("CBE", intent.orderNumber),
      redirectUrl: `${getOrigin()}/pay/bank?order=${encodeURIComponent(intent.orderNumber)}`,
      message: "Transfer to a DigitalForge Ethiopian account, then we verify.",
    };
  },
};

export const adapters: PaymentAdapter[] = [
  chapaAdapter,
  telebirrAdapter,
  cbebirrAdapter,
  mpesaAdapter,
  awashbirrAdapter,
  ebirrAdapter,
  santimpayAdapter,
  bankEtAdapter,
  testCardAdapter,
  manualAdapter,
  stripeAdapter,
  paypalAdapter,
];

export function getAdapter(id: string) {
  return adapters.find((a) => a.id === id) ?? chapaAdapter;
}

export function listAvailableAdapters(currency = "USD") {
  return adapters.filter((a) => a.available() && a.currencies.includes(currency));
}

export function checkoutMethods(currency: string): PaymentMethod[] {
  return adapters
    .filter((a) => a.available() && (currency === "ETB" ? a.currencies.includes("ETB") || a.region === "et" : a.currencies.includes(currency)))
    .map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      region: a.region,
      currencies: a.currencies,
      needsPhone: a.needsPhone,
      sandbox: sandboxPaymentsEnabled() && a.region === "et" && !process.env.CHAPA_SECRET_KEY,
    }));
}

export function isEthiopianMethod(id: string) {
  return getAdapter(id).region === "et";
}
