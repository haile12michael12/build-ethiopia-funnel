import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    role: varchar("role", { length: 32 }).notNull().default("customer"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    locale: varchar("locale", { length: 8 }).notNull().default("en"),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    emailVerified: boolean("email_verified").notNull().default(false),
    affiliateCode: varchar("affiliate_code", { length: 64 }),
    commissionRate: integer("commission_rate").notNull().default(20),
    country: varchar("country", { length: 64 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_affiliate_code_idx").on(t.affiliateCode),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 64 }).notNull().default("Box"),
    imageUrl: text("image_url"),
    productCount: integer("product_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    type: varchar("type", { length: 32 }).notNull().default("digital_download"),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    categoryId: integer("category_id").references(() => categories.id),
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),
    ratingAvg: integer("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    salesCount: integer("sales_count").notNull().default(0),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    licenseOptions: jsonb("license_options").$type<LicenseOption[]>().default([]),
    included: jsonb("included").$type<string[]>().default([]),
    features: jsonb("features").$type<string[]>().default([]),
    faq: jsonb("faq").$type<FaqItem[]>().default([]),
    whoItsFor: text("who_its_for"),
    requirements: text("requirements"),
    whatYouGet: text("what_you_get"),
    updates: text("updates"),
    seoTitle: varchar("seo_title", { length: 220 }),
    seoDescription: text("seo_description"),
    version: varchar("version", { length: 32 }).default("1.0.0"),
    downloadLimit: integer("download_limit").notNull().default(5),
    downloadExpiryDays: integer("download_expiry_days").notNull().default(365),
    fileKey: varchar("file_key", { length: 120 }),
    fileName: varchar("file_name", { length: 180 }),
    creatorId: integer("creator_id").references(() => users.id),
    upsellProductId: integer("upsell_product_id"),
    downsellProductId: integer("downsell_product_id"),
    bumpProductId: integer("bump_product_id"),
    subscriptionInterval: varchar("subscription_interval", { length: 16 }),
    promptMeta: jsonb("prompt_meta").$type<PromptMeta | null>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_type_idx").on(t.type),
  ],
);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 220 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productFiles = pgTable("product_files", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  fileKey: varchar("file_key", { length: 180 }).notNull(),
  fileName: varchar("file_name", { length: 180 }).notNull(),
  version: varchar("version", { length: 32 }).default("1.0.0"),
  sizeLabel: varchar("size_label", { length: 32 }),
  ...timestamps,
});

export const productTags = pgTable(
  "product_tags",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("product_tags_unique").on(t.productId, t.tagId)],
);

export const bundleItems = pgTable("bundle_items", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

export const relatedProducts = pgTable("related_products", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  relatedId: integer("related_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 80 }),
  ...timestamps,
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  license: varchar("license", { length: 40 }).default("personal"),
});

export const wishlists = pgTable(
  "wishlists",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("wishlists_unique").on(t.userId, t.productId)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    type: varchar("type", { length: 24 }).notNull().default("percent"),
    amount: integer("amount").notNull(),
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    productId: integer("product_id").references(() => products.id),
    categoryId: integer("category_id").references(() => categories.id),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)],
);

export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id")
    .notNull()
    .references(() => coupons.id),
  userId: integer("user_id").references(() => users.id),
  orderId: integer("order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: integer("user_id").references(() => users.id),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    country: varchar("country", { length: 64 }),
    phone: varchar("phone", { length: 32 }),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    couponCode: varchar("coupon_code", { length: 40 }),
    paymentProvider: varchar("payment_provider", { length: 32 }),
    paymentReference: varchar("payment_reference", { length: 120 }),
    bumpAccepted: boolean("bump_accepted").notNull().default(false),
    upsellAccepted: boolean("upsell_accepted").notNull().default(false),
    downsellAccepted: boolean("downsell_accepted").notNull().default(false),
    affiliateCode: varchar("affiliate_code", { length: 64 }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_email_idx").on(t.email),
    index("orders_user_idx").on(t.userId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  title: varchar("title", { length: 220 }).notNull(),
  license: varchar("license", { length: 40 }),
  quantity: integer("quantity").notNull().default(1),
  unitCents: integer("unit_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  reference: varchar("reference", { length: 120 }),
  rawPayload: jsonb("raw_payload"),
  ...timestamps,
});

export const licenses = pgTable(
  "licenses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    orderId: integer("order_id").references(() => orders.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    licenseKey: varchar("license_key", { length: 64 }).notNull(),
    licenseType: varchar("license_type", { length: 40 }).default("personal"),
    ...timestamps,
  },
  (t) => [uniqueIndex("licenses_key_idx").on(t.licenseKey)],
);

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  token: varchar("token", { length: 80 }).notNull(),
  fileName: varchar("file_name", { length: 180 }).notNull(),
  downloadsUsed: integer("downloads_used").notNull().default(0),
  downloadLimit: integer("download_limit").notNull().default(5),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastDownloadedAt: timestamp("last_downloaded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 180 }),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  verified: boolean("verified").notNull().default(false),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  ...timestamps,
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  durationLabel: varchar("duration_label", { length: 40 }),
  level: varchar("level", { length: 24 }).default("beginner"),
  lessonCount: integer("lesson_count").notNull().default(0),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  content: text("content").notNull(),
  videoUrl: text("video_url"),
  durationMin: integer("duration_min").notNull().default(8),
  sortOrder: integer("sort_order").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  resources: jsonb("resources").$type<{ label: string; url: string }[]>().default([]),
});

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("lesson_progress_unique").on(t.userId, t.lessonId)],
);

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  questions: jsonb("questions").$type<QuizQuestion[]>().default([]),
});

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id),
  code: varchar("code", { length: 40 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  plan: varchar("plan", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  interval: varchar("interval", { length: 16 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  ...timestamps,
});

export const funnels = pgTable(
  "funnels",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    funnelType: varchar("funnel_type", { length: 24 }).notNull().default("sales"),
    templateKey: varchar("template_key", { length: 40 }),
    description: text("description"),
    published: boolean("published").notNull().default(true),
    version: integer("version").notNull().default(1),
    // Custom domain
    customDomain: varchar("custom_domain", { length: 255 }),
    domainStatus: varchar("domain_status", { length: 16 }).notNull().default("unverified"),
    domainVerificationToken: varchar("domain_verification_token", { length: 64 }),
    // SEO
    seoTitle: varchar("seo_title", { length: 220 }),
    seoDescription: text("seo_description"),
    seoImage: text("seo_image"),
    noindex: boolean("noindex").notNull().default(false),
    // Custom code (owner-authored, injected only on this funnel's public pages)
    customCss: text("custom_css"),
    customJs: text("custom_js"),
    ...timestamps,
  },
  (t) => [uniqueIndex("funnels_slug_idx").on(t.slug), uniqueIndex("funnels_domain_idx").on(t.customDomain)],
);

export const funnelSteps = pgTable("funnel_steps", {
  id: serial("id").primaryKey(),
  funnelId: integer("funnel_id")
    .notNull()
    .references(() => funnels.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  path: varchar("path", { length: 180 }).notNull(),
  stepKey: varchar("step_key", { length: 80 }).notNull().default("step"),
  variantGroup: varchar("variant_group", { length: 80 }),
  variantKey: varchar("variant_key", { length: 8 }).notNull().default("A"),
  variantWeight: integer("variant_weight").notNull().default(100),
  sortOrder: integer("sort_order").notNull().default(0),
  config: jsonb("config").$type<FunnelStepConfig>().default({}),
  branches: jsonb("branches").$type<FunnelBranch[]>().default([]),
});

export const funnelSections = pgTable("funnel_sections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  ...timestamps,
});

export const funnelVisits = pgTable(
  "funnel_visits",
  {
    id: serial("id").primaryKey(),
    funnelId: integer("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 80 }).notNull(),
    stepKey: varchar("step_key", { length: 80 }).notNull(),
    variantKey: varchar("variant_key", { length: 8 }).notNull().default("A"),
    event: varchar("event", { length: 24 }).notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("funnel_visits_funnel_idx").on(t.funnelId)],
);

export const funnelVersions = pgTable(
  "funnel_versions",
  {
    id: serial("id").primaryKey(),
    funnelId: integer("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    label: varchar("label", { length: 160 }),
    snapshot: jsonb("snapshot").$type<FunnelSnapshot>().notNull(),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("funnel_versions_funnel_idx").on(t.funnelId)],
);

export const funnelBookings = pgTable(
  "funnel_bookings",
  {
    id: serial("id").primaryKey(),
    funnelId: integer("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    stepKey: varchar("step_key", { length: 80 }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    preferredAt: varchar("preferred_at", { length: 120 }),
    notes: text("notes"),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("funnel_bookings_funnel_idx").on(t.funnelId)],
);

export const landingPages = pgTable(
  "landing_pages",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    sections: jsonb("sections").$type<LandingSection[]>().default([]),
    published: boolean("published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("landing_pages_slug_idx").on(t.slug)],
);

export const orderBumps = pgTable("order_bumps", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  bumpProductId: integer("bump_product_id")
    .notNull()
    .references(() => products.id),
  headline: varchar("headline", { length: 220 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  priceEtbCents: integer("price_etb_cents"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const upsells = pgTable("upsells", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  offerProductId: integer("offer_product_id")
    .notNull()
    .references(() => products.id),
  headline: varchar("headline", { length: 220 }).notNull(),
  body: text("body"),
  priceCents: integer("price_cents"),
  priceEtbCents: integer("price_etb_cents"),
  discountPercent: integer("discount_percent").notNull().default(40),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const crossSells = pgTable("cross_sells", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  crossSellProductId: integer("cross_sell_product_id")
    .notNull()
    .references(() => products.id),
  headline: varchar("headline", { length: 220 }).notNull(),
  priceCents: integer("price_cents"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const abandonedCheckouts = pgTable(
  "abandoned_checkouts",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 48 }).notNull(),
    sessionId: varchar("session_id", { length: 80 }).notNull(),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 120 }),
    phone: varchar("phone", { length: 32 }),
    cartSnapshot: jsonb("cart_snapshot").$type<{ productId: number; quantity: number; license?: string }[]>().default([]),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    funnelSlug: varchar("funnel_slug", { length: 160 }),
    step: varchar("step", { length: 24 }).notNull().default("contact"),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    recoveryEmailSentAt: timestamp("recovery_email_sent_at", { withTimezone: true }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    recoveredOrderId: integer("recovered_order_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("abandoned_checkouts_token_idx").on(t.token),
    index("abandoned_checkouts_session_idx").on(t.sessionId),
    index("abandoned_checkouts_status_idx").on(t.status),
  ],
);

export const downsells = pgTable("downsells", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  offerProductId: integer("offer_product_id")
    .notNull()
    .references(() => products.id),
  headline: varchar("headline", { length: 220 }).notNull(),
  body: text("body"),
  priceCents: integer("price_cents").notNull(),
  priceEtbCents: integer("price_etb_cents"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const emailSubscribers = pgTable(
  "email_subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }),
    source: varchar("source", { length: 80 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    unsubscribed: boolean("unsubscribed").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("email_subscribers_email_idx").on(t.email)],
);

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 220 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  sentCount: integer("sent_count").notNull().default(0),
  ...timestamps,
});

export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  triggerEvent: varchar("trigger_event", { length: 80 }).notNull(),
  steps: jsonb("steps").$type<EmailSequenceStep[]>().default([]),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const emailEvents = pgTable("email_events", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").references(() => emailSubscribers.id),
  event: varchar("event", { length: 80 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (t) => [uniqueIndex("blog_categories_slug_idx").on(t.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    coverUrl: text("cover_url"),
    authorId: integer("author_id").references(() => users.id),
    categoryId: integer("category_id").references(() => blogCategories.id),
    tags: jsonb("tags").$type<string[]>().default([]),
    seoTitle: varchar("seo_title", { length: 220 }),
    seoDescription: text("seo_description"),
    status: varchar("status", { length: 24 }).notNull().default("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("blog_posts_slug_idx").on(t.slug)],
);

export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  code: varchar("code", { length: 64 }).notNull(),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  revenueCents: integer("revenue_cents").notNull().default(0),
  commissionCents: integer("commission_cents").notNull().default(0),
  pendingCents: integer("pending_cents").notNull().default(0),
  paidCents: integer("paid_cents").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("active"),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  path: varchar("path", { length: 220 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const affiliateConversions = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  commissionCents: integer("commission_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id")
    .notNull()
    .references(() => affiliates.id),
  orderId: integer("order_id").references(() => orders.id),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    path: varchar("path", { length: 220 }),
    userId: integer("user_id"),
    productId: integer("product_id"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("analytics_name_idx").on(t.name),
    index("analytics_created_idx").on(t.createdAt),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 80 }).notNull(),
    value: jsonb("value").$type<unknown>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("settings_key_idx").on(t.key)],
);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  ...timestamps,
});

export const personalizationCampaigns = pgTable(
  "personalization_campaigns",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    segment: varchar("segment", { length: 40 }).notNull(),
    source: varchar("source", { length: 80 }),
    eyebrow: varchar("eyebrow", { length: 120 }),
    headline: text("headline").notNull(),
    headlineEm: varchar("headline_em", { length: 180 }),
    subheadline: text("subheadline").notNull(),
    primaryCta: varchar("primary_cta", { length: 80 }).notNull(),
    primaryHref: varchar("primary_href", { length: 180 }).notNull(),
    secondaryCta: varchar("secondary_cta", { length: 80 }),
    secondaryHref: varchar("secondary_href", { length: 180 }),
    offer: text("offer"),
    coupon: varchar("coupon", { length: 40 }),
    testimonials: jsonb("testimonials").$type<{ name: string; quote: string; role: string }[]>().default([]),
    productSlugs: jsonb("product_slugs").$type<string[]>().default([]),
    published: boolean("published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("personalization_campaigns_slug_idx").on(t.slug)],
);

export const quizFunnels = pgTable(
  "quiz_funnels",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    questions: jsonb("questions").$type<QuizFunnelQuestion[]>().default([]),
    hotThreshold: integer("hot_threshold").notNull().default(70),
    warmThreshold: integer("warm_threshold").notNull().default(40),
    crmWebhookUrl: text("crm_webhook_url"),
    ...timestamps,
  },
  (t) => [uniqueIndex("quiz_funnels_slug_idx").on(t.slug)],
);

export const quizLeads = pgTable(
  "quiz_leads",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizFunnels.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }),
    email: varchar("email", { length: 255 }),
    answers: jsonb("answers").$type<Record<string, string[]>>().default({}),
    scoreByTag: jsonb("score_by_tag").$type<Record<string, number>>().default({}),
    totalScore: integer("total_score").notNull().default(0),
    topTag: varchar("top_tag", { length: 40 }),
    qualification: varchar("qualification", { length: 16 }).notNull().default("cold"),
    aiSummary: text("ai_summary"),
    recommendedProductSlug: varchar("recommended_product_slug", { length: 180 }),
    crmSynced: boolean("crm_synced").notNull().default(false),
    crmSyncedAt: timestamp("crm_synced_at", { withTimezone: true }),
    crmResponse: text("crm_response"),
    ...timestamps,
  },
  (t) => [uniqueIndex("quiz_leads_session_idx").on(t.quizId, t.sessionId), index("quiz_leads_quiz_idx").on(t.quizId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 80 }).notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    content: text("content").notNull(),
    segment: varchar("segment", { length: 40 }),
    path: varchar("path", { length: 180 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("chat_messages_session_idx").on(t.sessionId)],
);

export type LicenseOption = {
  id: string;
  name: string;
  priceCents: number;
  description: string;
};

export type FaqItem = { q: string; a: string };

export type PromptMeta = {
  model: string;
  difficulty: string;
  useCase: string;
  preview: string;
};

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
};

export type LandingSection = {
  type: string;
  title?: string;
  body?: string;
  items?: string[];
};

export type FunnelSectionBlock = {
  id: string;
  type: string;
  content: Record<string, unknown>;
};

export type FunnelBranch = {
  id: string;
  field?: string;
  equals?: string;
  targetKey: string;
  isDefault?: boolean;
};

export type FunnelStepConfig = {
  sections?: FunnelSectionBlock[];
  productSlug?: string;
  coupon?: string;
  quiz?: {
    question: string;
    field: string;
    options: { id: string; label: string; hint?: string }[];
  };
  ctaLabel?: string;
  headline?: string;
  body?: string;
  videoUrl?: string;
  formFields?: string[];
};

export type FunnelSnapshotStep = {
  key: string;
  name: string;
  type: string;
  variantKey: string;
  variantGroup?: string | null;
  variantWeight: number;
  sortOrder: number;
  config: FunnelStepConfig;
  branches: FunnelBranch[];
};

export type FunnelSnapshot = {
  funnel: {
    name: string;
    funnelType: string;
    status: string;
    published: boolean;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    noindex?: boolean;
    customCss?: string | null;
    customJs?: string | null;
    customDomain?: string | null;
  };
  steps: FunnelSnapshotStep[];
};

export type EmailSequenceStep = {
  delayHours: number;
  subject: string;
  body: string;
};

export type QuizFunnelOption = {
  id: string;
  label: string;
  points: number;
  tag: string;
};

export type QuizFunnelQuestion = {
  id: string;
  prompt: string;
  helpText?: string;
  type: "single" | "multi";
  options: QuizFunnelOption[];
  showIf?: { questionId: string; equals: string };
};

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type QuizFunnel = typeof quizFunnels.$inferSelect;
export type QuizLead = typeof quizLeads.$inferSelect;
export type AbandonedCheckout = typeof abandonedCheckouts.$inferSelect;
export type CrossSell = typeof crossSells.$inferSelect;
export type OrderBump = typeof orderBumps.$inferSelect;
export type Upsell = typeof upsells.$inferSelect;
export type Downsell = typeof downsells.$inferSelect;
export type Funnel = typeof funnels.$inferSelect;
export type FunnelStep = typeof funnelSteps.$inferSelect;
export type FunnelVersion = typeof funnelVersions.$inferSelect;
export type FunnelBooking = typeof funnelBookings.$inferSelect;
