export const CHAT_FACTS = [
  "DigitalForge sells digital downloads: templates, AI prompts, source-code kits, courses and bundles.",
  "Delivery is instant after a paid order via Dashboard → Downloads. Links expire and have a download limit.",
  "Licenses: Personal (own projects), Commercial (client work), Extended (SaaS / resale inside a paid product).",
  "Quality guarantee: 14 days if a file is corrupted or materially not as described. We replace or refund.",
  "Ethiopian payments: ETB via Chapa, Telebirr, CBE Birr, M-Pesa Ethiopia, Awash Birr, SantimPay, and local bank transfer.",
  "Coupons that exist: WELCOME20 (20% first-order style), LAUNCH50 (campaign), CREATOR30 (30%).",
  "The free lead magnet is 100+ AI business prompts at /lead-magnet. No card required.",
  "The Ultimate Creator Bundle is a discounted stack of templates, prompts and ebooks.",
  "Courses include lessons, progress tracking and a certificate when every lesson is complete.",
  "We do not invent sales counts, fake reviews, or fake countdown timers.",
];

export const OBJECTIONS: { keys: string[]; answer: string }[] = [
  {
    keys: ["expensive", "price", "cost", "cheap", "afford"],
    answer:
      "Prices are one-time licenses, not another SaaS bill. If budget is tight, start with the free prompt pack or the $19 starter pack. WELCOME20 applies on a first paid order. The Creator Bundle is the highest value if you would buy more than two items.",
  },
  {
    keys: ["refund", "money back", "guarantee"],
    answer:
      "If a file is corrupted or not as described, we replace it or refund within 14 days. Digital goods that were downloaded as described are not “try then return,” which we state on checkout.",
  },
  {
    keys: ["ethiopia", "telebirr", "etb", "chapa", "cbe", "birr"],
    answer:
      "Yes — checkout can bill in ETB. Choose Telebirr, CBE Birr, Chapa, SantimPay or an Ethiopian bank transfer. Use CREATOR30 if you want the studio discount.",
  },
  {
    keys: ["license", "client", "commercial", "resale", "saas"],
    answer:
      "Personal is for your own projects. Commercial covers client work. Extended is for shipping the work inside a paid product or SaaS. You pick the license on the product page before checkout.",
  },
  {
    keys: ["download", "access", "file", "receive", "instant"],
    answer:
      "After payment clears, open Dashboard → Downloads. Each file has a secure token, a use limit, and an expiry. Guest checkouts still get the thank-you page links for that order.",
  },
  {
    keys: ["template dump", "quality", "theme forest", "generic"],
    answer:
      "These are studio files: named layers, copy decks, and licenses — not a theme-forest dump. Read the “what’s included” list on each product; if it does not match, the 14-day quality guarantee applies.",
  },
  {
    keys: ["time", "how long", "weekend", "setup"],
    answer:
      "Landing templates are meant to ship in a weekend. Source-code kits assume you can rename a Next.js or Laravel app in an afternoon. The course is paced at 14 days.",
  },
  {
    keys: ["free", "trial", "lead"],
    answer:
      "The free AI prompt pack is at /lead-magnet — email only, no card. Paid products do not have a software-style free trial because they are downloads.",
  },
  {
    keys: ["bundle", "upsell", "bump"],
    answer:
      "The Ultimate Creator Bundle is the honest stack if you would buy several items. Checkout may offer a $9 section pack as an optional bump, then an upsell. You can decline both.",
  },
  {
    keys: ["ai", "chatgpt", "prompt", "claude"],
    answer:
      "The 1,000 AI Business Prompts library is organised by job-to-be-done and works in ChatGPT, Claude and Gemini. Start free with 100+ prompts, then upgrade if it fits.",
  },
];

export function retrieveAnswer(question: string) {
  const q = question.toLowerCase();
  const hit = OBJECTIONS.find((o) => o.keys.some((k) => q.includes(k)));
  if (hit) return hit.answer;
  if (/(hello|hi |hey|help)/.test(q)) {
    return "Ask about licenses, Ethiopian payments, downloads, refunds or which kit to start with. I stay inside what DigitalForge actually sells.";
  }
  return `I can help with licenses, ETB / Telebirr checkout, downloads, refunds and which product fits. ${CHAT_FACTS[0]} If you say what you are trying to ship (freelance, SaaS, prompts), I will point to a specific SKU.`;
}
