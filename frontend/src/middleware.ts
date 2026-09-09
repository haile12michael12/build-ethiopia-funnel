import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "digitalforge-dev-secret-change-in-production",
);

async function sessionRole(req: NextRequest) {
  const token = req.cookies.get("df_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return String(payload.role || "");
  } catch {
    return null;
  }
}

function appHost() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).host.split(":")[0].toLowerCase();
  } catch {
    return "";
  }
}

/**
 * If a request arrives on a connected, verified custom domain (funnels.customDomain),
 * rewrite it to that funnel's step. This is a safe no-op unless NEXT_PUBLIC_SITE_URL is
 * configured and the incoming Host header differs from it — so local/preview traffic is
 * completely unaffected.
 */
async function tryCustomDomainRewrite(req: NextRequest) {
  const known = appHost();
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  if (!known || !host || host === known || host === "localhost" || host === "127.0.0.1") return null;
  if (req.nextUrl.pathname.startsWith("/api") || req.nextUrl.pathname.startsWith("/_next")) return null;

  try {
    const resolveUrl = new URL("/api/domains/resolve", req.nextUrl.origin);
    resolveUrl.searchParams.set("host", host);
    const res = await fetch(resolveUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as { slug?: string; firstStepKey?: string | null; stepKeys?: string[] };
    if (!data.slug) return null;
    const requested = req.nextUrl.pathname.replace(/^\/+/, "");
    const step = requested && data.stepKeys?.includes(requested) ? requested : data.firstStepKey;
    if (!step) return null;
    const url = req.nextUrl.clone();
    url.pathname = `/f/${data.slug}/${step}`;
    return NextResponse.rewrite(url);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const domainRewrite = await tryCustomDomainRewrite(req);
  if (domainRewrite) return domainRewrite;

  const res = NextResponse.next();
  const src = req.nextUrl.searchParams.get("utm_source");
  const campaign = req.nextUrl.searchParams.get("utm_campaign");
  const medium = req.nextUrl.searchParams.get("utm_medium");
  const segment = req.nextUrl.searchParams.get("segment") || req.nextUrl.searchParams.get("for");
  if (src || campaign || segment) {
    res.cookies.set(
      "df_intent",
      JSON.stringify({
        segment: segment || undefined,
        source: src || undefined,
        campaign: campaign || undefined,
        medium: medium || undefined,
        landing: campaign || undefined,
      }),
      { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" },
    );
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    const role = await sessionRole(req);
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && role !== "admin" && role !== "super_admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }
  return res;
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml|icon$).*)"],
};
