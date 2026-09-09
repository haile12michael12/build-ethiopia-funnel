import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { AnnouncementBar, Footer, Header, MobileNav, SocialProof } from "@/components/site-chrome";
import { Providers } from "@/components/providers";
import { PageView } from "@/components/page-view";
import { IntentTracker } from "@/components/intent-tracker";
import { AiChatbot } from "@/components/ai-chatbot";
import { ensureSeeded } from "@/lib/bootstrap";
import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/data";
import { BRAND } from "@/lib/constants";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${BRAND.name} — Premium digital products`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "Premium websites, landing pages, AI prompts, templates, courses and source code designed to help you create, launch and grow faster.",
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — Premium digital products`,
    description: BRAND.tagline,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let campaign: { enabled: boolean; message: string; endsAt: string; coupon?: string } | null = null;
  try {
    await ensureSeeded();
    campaign = await getSetting("campaign", null);
  } catch {
    campaign = null;
  }
  const session = await getSession();

  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased dark:bg-ink dark:text-cream">
        <Providers>
          <PageView />
          <IntentTracker />
          <AnnouncementBar campaign={campaign} />
          <Header user={session ? { name: session.name, role: session.role } : null} />
          <main className="pb-16 md:pb-0">{children}</main>
          <Footer />
          <MobileNav />
          <SocialProof />
          <AiChatbot />
        </Providers>
      </body>
    </html>
  );
}
