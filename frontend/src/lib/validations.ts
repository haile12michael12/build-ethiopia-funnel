import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(120),
  bio: z.string().max(500).optional(),
  locale: z.enum(["en", "am"]).optional(),
  currency: z.enum(["USD", "ETB"]).optional(),
  country: z.string().max(64).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(72),
});

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20).default(1),
  license: z.string().max(40).optional(),
});

export const checkoutSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  country: z.string().max(64).optional(),
  phone: z.string().max(32).optional(),
  coupon: z.string().max(40).optional(),
  provider: z.enum([
    "test_card",
    "manual",
    "stripe",
    "paypal",
    "chapa",
    "telebirr",
    "cbebirr",
    "mpesa",
    "awashbirr",
    "ebirr",
    "santimpay",
    "bank_et",
  ]),
  bump: z.boolean().optional(),
  currency: z.enum(["USD", "ETB"]).optional(),
  notes: z.string().max(500).optional(),
  funnelSlug: z.string().max(160).optional(),
  sessionId: z.string().max(80).optional(),
  crossSellIds: z.array(z.number().int().positive()).max(10).optional(),
  createAccount: z.boolean().optional(),
});

export const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(180).optional(),
  body: z.string().min(12).max(2000),
});

export const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  source: z.string().max(80).optional(),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percent", "fixed"]),
  amount: z.number().int().positive(),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

export const productSchema = z.object({
  title: z.string().min(3).max(220),
  slug: z.string().min(3).max(180).optional(),
  shortDescription: z.string().min(8).max(400),
  description: z.string().min(20),
  type: z.string().min(3),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).optional(),
  categoryId: z.number().int().positive().optional(),
  thumbnailUrl: z.string().optional(),
});

export const supportSchema = z.object({
  subject: z.string().min(4).max(180),
  message: z.string().min(10).max(4000),
});

export const searchSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  type: z.string().max(40).optional(),
  sort: z.string().max(40).optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  rating: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional(),
});
