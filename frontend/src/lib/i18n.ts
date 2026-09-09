export const dictionaries = {
  en: {
    explore: "Explore Products",
    free: "Get Free Resources",
    cart: "Cart",
    login: "Log in",
    register: "Create account",
    search: "Search templates, prompts, kits…",
    checkout: "Complete purchase",
    guarantee: "14-day quality guarantee",
    instant: "Instant download",
    secure: "Secure checkout",
    language: "EN",
  },
  am: {
    explore: "ምርቶችን ያስሱ",
    free: "ነጻ ሀብቶችን ያግኙ",
    cart: "ጋሪ",
    login: "ግባ",
    register: "መለያ ፍጠር",
    search: "አብነቶች፣ ፕሮምፕቶች፣ ኪቶችን ይፈልጉ…",
    checkout: "ግዢን ያጠናቁ",
    guarantee: "የ14 ቀን የጥራት ዋስትና",
    instant: "ወዲያውኑ ያውርዱ",
    secure: "ደህንነቱ የተጠበቀ ክፍያ",
    language: "አማ",
  },
} as const;

export type Locale = keyof typeof dictionaries;

export function t(locale: Locale | string | undefined, key: keyof (typeof dictionaries)["en"]) {
  const loc: Locale = locale === "am" ? "am" : "en";
  return dictionaries[loc][key];
}
