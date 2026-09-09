export const BRAND = {
  name: "DigitalForge",
  tagline: "Create, launch & grow faster.",
  domain: "digitalforge.dev",
  supportEmail: "hello@digitalforge.dev",
  guarantee: "14-day quality guarantee on digital products",
};

export const NAV = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/bundles", label: "Bundles" },
  { href: "/courses", label: "Courses" },
  { href: "/prompts", label: "Prompts" },
  { href: "/freebies", label: "Free Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/products", label: "My Products" },
  { href: "/dashboard/downloads", label: "Downloads" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/wishlist", label: "Wishlist" },
  { href: "/dashboard/subscriptions", label: "Subscriptions" },
  { href: "/dashboard/courses", label: "Courses" },
  { href: "/dashboard/certificates", label: "Certificates" },
  { href: "/dashboard/affiliate", label: "Affiliate" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/security", label: "Security" },
  { href: "/dashboard/support", label: "Support" },
];

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/bundles", label: "Bundles" },
  { href: "/admin/upsells", label: "Bumps & Upsells" },
  { href: "/admin/checkout", label: "Checkout" },
  { href: "/admin/funnels", label: "Funnels" },
  { href: "/admin/quizzes", label: "Quizzes" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/email", label: "Email" },
  { href: "/admin/personalization", label: "Personalization" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/settings", label: "Settings" },
];

export const PRODUCT_TYPES = [
  { id: "digital_download", label: "Digital download" },
  { id: "course", label: "Course" },
  { id: "bundle", label: "Bundle" },
  { id: "subscription", label: "Subscription" },
  { id: "prompt", label: "AI prompt" },
  { id: "freebie", label: "Free resource" },
];

export const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "bestsellers", label: "Bestsellers" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
  { id: "discount", label: "Biggest discount" },
];

export const DEFAULT_LICENSES = [
  {
    id: "personal",
    name: "Personal",
    priceCents: 0,
    description: "One personal project. No client work.",
  },
  {
    id: "commercial",
    name: "Commercial",
    priceCents: 2000,
    description: "Unlimited client projects for you or your studio.",
  },
  {
    id: "extended",
    name: "Extended",
    priceCents: 8000,
    description: "SaaS, redistribution inside a paid product, or white-label.",
  },
];
