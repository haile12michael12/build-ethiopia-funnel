import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, currency = "USD") {
  const value = cents / 100;
  if (currency === "ETB") {
    return `ETB ${value.toLocaleString("en-ET", { maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function convertCents(usdCents: number, currency: string, etbRate = 57) {
  if (currency === "ETB") return Math.round((usdCents / 100) * etbRate) * 100;
  return usdCents;
}

/**
 * Resolves the amount to charge/display for an offer (order bump, upsell, downsell).
 * If a fixed ETB override is configured and the active currency is ETB, that exact
 * amount is used instead of a floating FX conversion — useful for round local prices
 * like "ETB 5,000" that shouldn't drift with the exchange rate setting.
 */
export function resolveOfferCents(
  usdCents: number,
  etbOverrideCents: number | null | undefined,
  currency: string,
  etbRate: number,
) {
  if (currency === "ETB" && typeof etbOverrideCents === "number") return etbOverrideCents;
  return convertCents(usdCents, currency, etbRate);
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function orderNumber() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `DF-${n}`;
}

export function licenseKey() {
  const chunk = () => Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DF-${chunk()}-${chunk()}-${chunk()}`;
}

export function stars(rating: number) {
  const value = Math.max(0, Math.min(5, rating / 10));
  return value;
}

export function ratingDisplay(ratingAvg: number) {
  return (ratingAvg / 10).toFixed(1);
}

export function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function excerpt(text: string, length = 160) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}…`;
}
