import type { FunnelBranch, FunnelSectionBlock, FunnelStepConfig } from "@/db/schema";

export const STEP_TYPES = [
  { id: "landing", label: "Landing page" },
  { id: "lead", label: "Lead form" },
  { id: "quiz", label: "Quiz" },
  { id: "webinar", label: "Webinar" },
  { id: "booking", label: "Booking" },
  { id: "signup", label: "Sign up" },
  { id: "offer", label: "Offer" },
  { id: "checkout", label: "Checkout" },
  { id: "upsell", label: "Upsell" },
  { id: "downsell", label: "Downsell" },
  { id: "thankyou", label: "Thank you" },
] as const;

export type StepType = (typeof STEP_TYPES)[number]["id"];

export const FUNNEL_TYPES = [
  { id: "landing", label: "Landing page", description: "A single high-converting page with one goal." },
  { id: "lead", label: "Lead funnel", description: "Capture an email in exchange for a lead magnet." },
  { id: "sales", label: "Sales funnel", description: "Landing → checkout → upsell → downsell → thank you." },
  { id: "webinar", label: "Webinar funnel", description: "Registration → confirmation → live/replay → offer." },
  { id: "quiz", label: "Quiz funnel", description: "Question → question → personalized offer." },
  { id: "product", label: "Product funnel", description: "Showcase one product straight to checkout." },
  { id: "booking", label: "Booking funnel", description: "Capture a call or appointment request." },
  { id: "course", label: "Course funnel", description: "Sell a course and hand off to the learning dashboard." },
  { id: "saas_signup", label: "SaaS signup funnel", description: "Register → onboarding → activation." },
] as const;

export type FunnelType = (typeof FUNNEL_TYPES)[number]["id"];

export type BuilderStep = {
  key: string;
  name: string;
  type: StepType;
  variantKey: string;
  variantGroup?: string | null;
  variantWeight: number;
  sortOrder: number;
  path: string;
  config: FunnelStepConfig;
  branches: FunnelBranch[];
};

export type FunnelTemplate = {
  key: string;
  name: string;
  description: string;
  funnelType: FunnelType;
  steps: Omit<BuilderStep, "path">[];
};

function sid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function block(type: string, content: Record<string, unknown>): FunnelSectionBlock {
  return { id: sid(type), type, content };
}

const hero = (title: string, body: string, cta: string): FunnelSectionBlock =>
  block("hero", { eyebrow: "DigitalForge", title, body, cta });

const benefits = (items: string[]): FunnelSectionBlock => block("benefits", { title: "Why this works", items });

const guarantee = (): FunnelSectionBlock =>
  block("guarantee", { title: "14-day quality guarantee", body: "If the files are corrupted or not as described, we replace or refund." });

const faq = (): FunnelSectionBlock =>
  block("faq", {
    items: [
      { q: "When do I get the files?", a: "Immediately after payment, in Dashboard → Downloads." },
      { q: "Can I pay in ETB?", a: "Yes — Telebirr, CBE Birr, Chapa and bank transfer." },
    ],
  });

export const SECTION_LIBRARY: { name: string; category: string; block: FunnelSectionBlock }[] = [
  { name: "Hero", category: "hero", block: hero("Headline here", "Supporting copy.", "Continue") },
  { name: "Benefits", category: "benefits", block: benefits(["Clear offer", "Instant delivery", "Real licenses"]) },
  { name: "Testimonials", category: "testimonials", block: block("testimonials", { items: [{ name: "Helena R.", quote: "Conversion is up." }] }) },
  { name: "FAQ", category: "faq", block: faq() },
  { name: "Guarantee", category: "guarantee", block: guarantee() },
  { name: "Lead form", category: "form", block: block("form", { cta: "Get the pack" }) },
  { name: "Quiz", category: "quiz", block: block("quiz", { question: "What are you shipping?" }) },
  { name: "Offer card", category: "offer", block: block("offer", { headline: "Your offer" }) },
  { name: "CTA", category: "cta", block: block("cta", { label: "Continue", href: "" }) },
  { name: "Webinar details", category: "webinar", block: block("webinar", { title: "Live training", body: "Join the live session." }) },
  { name: "Booking form", category: "booking", block: block("booking", { title: "Book a call" }) },
];

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    key: "classic",
    name: "Classic opt-in",
    description: "Landing → Lead form → Offer → Checkout → Upsell → Thank-you",
    funnelType: "lead",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [
            hero("Premium digital products built to ship this week.", "Templates, prompts and kits — without the theme-forest clutter.", "Get the free pack"),
            benefits(["Instant download", "Commercial licenses", "ETB checkout"]),
            guarantee(),
          ],
          ctaLabel: "Get the free pack",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "lead" }],
      },
      {
        key: "lead",
        name: "Lead form",
        type: "lead",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { sections: [block("form", { title: "Send the free prompt pack", cta: "Get my free pack" })], ctaLabel: "Continue" },
        branches: [{ id: "b2", isDefault: true, targetKey: "offer" }],
      },
      {
        key: "offer",
        name: "Offer",
        type: "offer",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: {
          productSlug: "1000-ai-business-prompts",
          coupon: "LAUNCH50",
          headline: "The complete AI prompt library",
          sections: [block("offer", { headline: "Upgrade to 1,000 prompts" })],
        },
        branches: [{ id: "b3", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: {},
        branches: [{ id: "b4", isDefault: true, targetKey: "upsell" }],
      },
      {
        key: "upsell",
        name: "Upsell",
        type: "upsell",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 4,
        config: { productSlug: "ultimate-creator-bundle", headline: "Complete your toolkit" },
        branches: [{ id: "b5", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 5,
        config: { headline: "You're in. Downloads are ready." },
        branches: [],
      },
    ],
  },
  {
    key: "quiz",
    name: "Quiz → personalized offer",
    description: "Ad → Landing → Quiz → Personalized offer → Checkout → Upsell → Thank you",
    funnelType: "quiz",
    steps: [
      {
        key: "landing",
        name: "Landing (ad)",
        type: "landing",
        variantKey: "A",
        variantGroup: "landing",
        variantWeight: 50,
        sortOrder: 0,
        config: {
          sections: [
            hero("Not sure which kit to buy? Take the 20-second quiz.", "We'll point you at one offer — prompts, freelance docs, or a SaaS starter.", "Start the quiz"),
            benefits(["One recommendation", "No fake scarcity", "Pay in ETB if you want"]),
          ],
          ctaLabel: "Start the quiz",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "quiz" }],
      },
      {
        key: "landing",
        name: "Landing B",
        type: "landing",
        variantKey: "B",
        variantGroup: "landing",
        variantWeight: 50,
        sortOrder: 0,
        config: {
          sections: [
            hero("Answer three questions. Get one offer.", "Built for founders, freelancers and developers who would rather ship than browse 40 SKUs.", "Find my kit"),
            faq(),
          ],
          ctaLabel: "Find my kit",
        },
        branches: [{ id: "b1b", isDefault: true, targetKey: "quiz" }],
      },
      {
        key: "quiz",
        name: "Quiz",
        type: "quiz",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: {
          quiz: {
            question: "What are you trying to ship?",
            field: "role",
            options: [
              { id: "developer", label: "A SaaS / codebase", hint: "Next.js or Laravel starter" },
              { id: "freelancer", label: "Client work this month", hint: "Proposals, SOWs, templates" },
              { id: "founder", label: "An offer and a landing page", hint: "Landing pack + prompts" },
            ],
          },
        },
        branches: [
          { id: "bd", field: "role", equals: "developer", targetKey: "offer-dev" },
          { id: "bf", field: "role", equals: "freelancer", targetKey: "offer-freelance" },
          { id: "bo", isDefault: true, targetKey: "offer-founder" },
        ],
      },
      {
        key: "offer-dev",
        name: "Offer · developer",
        type: "offer",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: {
          productSlug: "nextjs-saas-starter-kit",
          headline: "Skip the first six weeks of SaaS plumbing.",
          sections: [block("offer", { headline: "Next.js SaaS Starter Kit" }), guarantee()],
        },
        branches: [{ id: "b2", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "offer-freelance",
        name: "Offer · freelancer",
        type: "offer",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: {
          productSlug: "freelance-starter-toolkit",
          headline: "Look like a firm. Price like one.",
          sections: [block("offer", { headline: "Freelance Starter Toolkit" }), guarantee()],
        },
        branches: [{ id: "b3", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "offer-founder",
        name: "Offer · founder",
        type: "offer",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 4,
        config: {
          productSlug: "ultimate-landing-page-pack",
          headline: "Ship the page that takes payment.",
          coupon: "LAUNCH50",
          sections: [block("offer", { headline: "Ultimate Landing Page Pack" }), guarantee()],
        },
        branches: [{ id: "b4", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 5,
        config: {},
        branches: [{ id: "b5", isDefault: true, targetKey: "upsell" }],
      },
      {
        key: "upsell",
        name: "Upsell",
        type: "upsell",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 6,
        config: { productSlug: "ultimate-creator-bundle", headline: "Wait — complete the studio kit." },
        branches: [{ id: "b6", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 7,
        config: { headline: "Order confirmed. Your downloads are ready." },
        branches: [],
      },
    ],
  },
  {
    key: "direct",
    name: "Direct checkout",
    description: "Landing → Checkout → Upsell → Thank you",
    funnelType: "product",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          productSlug: "ultimate-creator-bundle",
          sections: [hero("The Ultimate Creator Bundle.", "$497 catalogue value, $49 today.", "Buy the bundle")],
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: {},
        branches: [{ id: "b2", isDefault: true, targetKey: "upsell" }],
      },
      {
        key: "upsell",
        name: "Upsell",
        type: "upsell",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { productSlug: "ship-faster-course", headline: "Add the 14-day course" },
        branches: [{ id: "b3", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: { headline: "You're in." },
        branches: [],
      },
    ],
  },
  {
    key: "landing_page",
    name: "Landing page",
    description: "A single high-converting page — one goal, one CTA.",
    funnelType: "landing",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [
            hero("Your headline goes here.", "One clear promise, one call to action.", "Get started"),
            benefits(["Benefit one", "Benefit two", "Benefit three"]),
            guarantee(),
          ],
          ctaLabel: "Get started",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { headline: "Thanks for stopping by." },
        branches: [],
      },
    ],
  },
  {
    key: "lead_magnet",
    name: "Lead funnel",
    description: "Landing → Lead form → Thank you. The simplest capture funnel.",
    funnelType: "lead",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [hero("Get the free resource.", "Enter your email — no card required.", "Get it free")],
          ctaLabel: "Get it free",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "lead" }],
      },
      {
        key: "lead",
        name: "Lead form",
        type: "lead",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { sections: [block("form", { title: "Where should we send it?", cta: "Send it to me" })] },
        branches: [{ id: "b2", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { headline: "Check your inbox." },
        branches: [],
      },
    ],
  },
  {
    key: "sales_flow",
    name: "Sales funnel",
    description: "Landing → Checkout → Upsell → Downsell → Thank you.",
    funnelType: "sales",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          productSlug: "ultimate-landing-page-pack",
          sections: [hero("Everything you need to launch the offer.", "One package, instant delivery.", "Buy now"), guarantee()],
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: {},
        branches: [{ id: "b2", isDefault: true, targetKey: "upsell" }],
      },
      {
        key: "upsell",
        name: "Upsell",
        type: "upsell",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { productSlug: "ultimate-creator-bundle", headline: "Complete your toolkit" },
        branches: [{ id: "b3", isDefault: true, targetKey: "downsell" }],
      },
      {
        key: "downsell",
        name: "Downsell",
        type: "downsell",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: { productSlug: "starter-pack", headline: "Not ready for the full bundle?" },
        branches: [{ id: "b4", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 4,
        config: { headline: "Order confirmed." },
        branches: [],
      },
    ],
  },
  {
    key: "webinar_flow",
    name: "Webinar funnel",
    description: "Registration → Confirmation → Live/replay → Offer → Checkout → Thank you.",
    funnelType: "webinar",
    steps: [
      {
        key: "landing",
        name: "Registration",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [
            hero("Free training: ship a funnel in 60 minutes.", "Live walkthrough, then Q&A.", "Save my seat"),
            benefits(["Live workbook", "Recording if you can't make it", "Q&A at the end"]),
          ],
          ctaLabel: "Save my seat",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "register" }],
      },
      {
        key: "register",
        name: "Registration form",
        type: "lead",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { sections: [block("form", { title: "Reserve your seat", cta: "Confirm my spot" })] },
        branches: [{ id: "b2", isDefault: true, targetKey: "confirmation" }],
      },
      {
        key: "confirmation",
        name: "Confirmation",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { headline: "You're registered. Add it to your calendar." },
        branches: [{ id: "b3", isDefault: true, targetKey: "webinar" }],
      },
      {
        key: "webinar",
        name: "Webinar room",
        type: "webinar",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: {
          headline: "Live training",
          body: "The session starts here. Replace with your live embed or replay link.",
          videoUrl: "",
        },
        branches: [{ id: "b4", isDefault: true, targetKey: "offer" }],
      },
      {
        key: "offer",
        name: "Offer",
        type: "offer",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 4,
        config: { productSlug: "ship-faster-course", headline: "Special training price — today only" },
        branches: [{ id: "b5", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 5,
        config: {},
        branches: [{ id: "b6", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 6,
        config: { headline: "You're enrolled." },
        branches: [],
      },
    ],
  },
  {
    key: "booking_flow",
    name: "Booking funnel",
    description: "Landing → Booking request → Confirmation.",
    funnelType: "booking",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [hero("Book a 20-minute strategy call.", "Tell us a bit about the project first.", "Request a time")],
          ctaLabel: "Request a time",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "booking" }],
      },
      {
        key: "booking",
        name: "Booking request",
        type: "booking",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { headline: "When works for you?" },
        branches: [{ id: "b2", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Confirmation",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { headline: "Request received — we'll confirm by email." },
        branches: [],
      },
    ],
  },
  {
    key: "course_flow",
    name: "Course funnel",
    description: "Landing → Checkout → Thank you with course access.",
    funnelType: "course",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          productSlug: "ship-faster-course",
          sections: [hero("Ship digital products in 14 days.", "A compact course, not a content dump.", "Enroll now"), guarantee()],
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "checkout" }],
      },
      {
        key: "checkout",
        name: "Checkout",
        type: "checkout",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: {},
        branches: [{ id: "b2", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { headline: "You're enrolled — lessons are in your dashboard." },
        branches: [],
      },
    ],
  },
  {
    key: "saas_signup_flow",
    name: "SaaS signup funnel",
    description: "Landing → Sign up → Onboarding → Thank you / dashboard.",
    funnelType: "saas_signup",
    steps: [
      {
        key: "landing",
        name: "Landing",
        type: "landing",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 0,
        config: {
          sections: [
            hero("Start building today.", "Free to start. Upgrade whenever you're ready.", "Create free account"),
            benefits(["No card required", "Cancel anytime", "Live in minutes"]),
          ],
          ctaLabel: "Create free account",
        },
        branches: [{ id: "b1", isDefault: true, targetKey: "signup" }],
      },
      {
        key: "signup",
        name: "Sign up",
        type: "signup",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 1,
        config: { headline: "Create your account" },
        branches: [{ id: "b2", isDefault: true, targetKey: "onboarding" }],
      },
      {
        key: "onboarding",
        name: "Onboarding",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 2,
        config: { headline: "Welcome — let's set up your workspace." },
        branches: [{ id: "b3", isDefault: true, targetKey: "thanks" }],
      },
      {
        key: "thanks",
        name: "Thank you",
        type: "thankyou",
        variantKey: "A",
        variantWeight: 100,
        sortOrder: 3,
        config: { headline: "You're all set. Head to your dashboard." },
        branches: [],
      },
    ],
  },
];

export function resolveNext(steps: BuilderStep[], currentKey: string, answers: Record<string, string>) {
  const current = steps.find((s) => s.key === currentKey);
  if (!current) return null;
  const hit = current.branches.find((b) => !b.isDefault && b.field && answers[b.field] === b.equals);
  const fallback = current.branches.find((b) => b.isDefault) || current.branches[0];
  const target = (hit || fallback)?.targetKey;
  if (target) return target;
  const linear = steps
    .filter((s) => s.variantKey === "A" || !s.variantGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = linear.findIndex((s) => s.key === currentKey);
  return linear[idx + 1]?.key ?? null;
}

export function pickVariant<T extends { variantKey: string; variantWeight: number }>(variants: T[], seed: string) {
  if (variants.length <= 1) return variants[0];
  const total = variants.reduce((s, v) => s + (v.variantWeight || 100), 0) || 1;
  let n = Math.abs(hashString(seed)) % total;
  for (const v of variants) {
    n -= v.variantWeight || 100;
    if (n < 0) return v;
  }
  return variants[0];
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function groupVariants(steps: BuilderStep[]) {
  const groups = new Map<string, BuilderStep[]>();
  for (const step of steps) {
    const g = step.variantGroup || `${step.key}:${step.variantKey}`;
    const list = groups.get(g) || [];
    list.push(step);
    groups.set(g, list);
  }
  return groups;
}

export function domainTxtRecordName(domain: string) {
  return `_digitalforge-verify.${domain}`;
}

export function domainTxtRecordValue(token: string) {
  return `df-verify=${token}`;
}

