"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ShoppingBag, User, X, Moon, Sun } from "lucide-react";
import { BRAND, NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Campaign = { enabled: boolean; message: string; endsAt: string; coupon?: string };

export function AnnouncementBar({ campaign }: { campaign: Campaign | null }) {
  const [left, setLeft] = useState("");
  const [hidden, setHidden] = useState(false);
  const end = campaign?.endsAt ? new Date(campaign.endsAt).getTime() : 0;
  const enabled = Boolean(campaign?.enabled && end > Date.now());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setLeft("");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, end]);

  if (!enabled || hidden || !left) return null;
  return (
    <div className="relative z-[60] bg-ink text-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center text-sm">
        <span>🔥 {campaign?.message}</span>
        <span className="rounded-full bg-copper px-2 py-0.5 font-mono text-xs">{left}</span>
        {campaign?.coupon && <span className="hidden sm:inline">Code {campaign.coupon}</span>}
        <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setHidden(true)} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Header({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ title: string; href: string; kind: string }[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [dark, setDark] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => setCartCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.items ?? []))
        .catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("df-theme", next ? "dark" : "light");
    setDark(next);
  }

  const hideChrome = ["/checkout", "/upsell", "/downsell", "/pay", "/f/"].some((p) => pathname.startsWith(p));
  if (hideChrome) return null;

  return (
    <header className={cn("sticky top-0 z-50 transition", sticky ? "bg-[color:var(--bg)]/90 shadow-sm backdrop-blur-md" : "bg-transparent")}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-ink text-cream">Df</span>
          <span className="hidden sm:inline">{BRAND.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cn("text-sm text-muted hover:text-[color:var(--fg)]", pathname.startsWith(item.href) && "text-[color:var(--fg)]")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost !px-3 !py-2" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button className="btn-ghost !px-3 !py-2" onClick={toggleTheme} aria-label="Theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/cart" className="btn-ghost relative !px-3 !py-2">
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1 text-[10px] text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href={user ? (user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard") : "/login"} className="btn-ghost !px-3 !py-2">
            <User className="h-4 w-4" />
          </Link>
          <Link href="/products" className="btn-primary hidden !py-2 text-sm md:inline-flex">
            Explore Products
          </Link>
          <button className="btn-ghost !px-3 !py-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] bg-ink/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-80 bg-[color:var(--bg)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex justify-between">
              <strong>{BRAND.name}</strong>
              <button onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="grid gap-3">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-lg">{item.label}</Link>
              ))}
              <Link href="/pricing">Pricing</Link>
              <Link href="/login">Log in</Link>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[80] bg-ink/50 p-4" onClick={() => setSearchOpen(false)}>
          <div className="mx-auto mt-24 max-w-xl rounded-3xl bg-[color:var(--bg-elev)] p-4" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  router.push(`/products?q=${encodeURIComponent(q)}`);
                  setSearchOpen(false);
                }
              }}
              placeholder="Search templates, prompts, kits…"
              className="input"
            />
            <div className="mt-3 max-h-80 overflow-auto">
              {results.map((r) => (
                <Link key={r.href} href={r.href} className="block rounded-xl px-3 py-2 hover:bg-paper-2" onClick={() => setSearchOpen(false)}>
                  <span className="text-xs uppercase tracking-wide text-muted">{r.kind}</span>
                  <div>{r.title}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (["/checkout", "/upsell", "/downsell", "/pay", "/f/"].some((p) => pathname.startsWith(p))) return null;
  return (
    <footer className="mt-24 border-t hairline">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4">
        <div>
          <p className="font-display text-3xl">{BRAND.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Premium digital products for people who ship. Templates, prompts, kits and courses — without the theme-forest clutter.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Catalogue</p>
          <div className="mt-3 grid gap-2 text-sm text-muted">
            <Link href="/products">All products</Link>
            <Link href="/prompts">AI prompts</Link>
            <Link href="/courses">Courses</Link>
            <Link href="/bundles">Bundles</Link>
            <Link href="/freebies">Free resources</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <div className="mt-3 grid gap-2 text-sm text-muted">
            <Link href="/about">About</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/affiliates">Affiliates</Link>
            <Link href="/dashboard/support">Support</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Trust</p>
          <div className="mt-3 grid gap-2 text-sm text-muted">
            <p>Instant download</p>
            <p>Secure checkout</p>
            <p>14-day quality guarantee</p>
            <p>USD & ETB ready</p>
          </div>
        </div>
      </div>
      <div className="border-t hairline px-4 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BRAND.name}. Built for makers.
      </div>
    </footer>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname.startsWith("/pay") || pathname.startsWith("/f/")) return null;
  const items = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Shop" },
    { href: "/cart", label: "Cart" },
    { href: "/dashboard", label: "Account" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t hairline bg-[color:var(--bg)]/95 px-2 py-2 backdrop-blur md:hidden">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cn("rounded-xl py-2 text-center text-xs", pathname === i.href && "bg-paper-2")}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function SocialProof() {
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/social-proof")
      .then((r) => r.json())
      .then((d) => {
        if (d.message) setNote(d.message);
      })
      .catch(() => {});
  }, []);
  if (!note) return null;
  return (
    <div className="pointer-events-none fixed bottom-20 left-4 z-40 hidden max-w-xs rounded-2xl bg-ink px-4 py-3 text-sm text-cream shadow-xl md:block">
      {note}
    </div>
  );
}

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("animate-[fade_0.6s_ease]", className)}>{children}</div>;
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y hairline rounded-3xl border hairline bg-[color:var(--bg-elev)]">
      {items.map((item, i) => (
        <button key={item.q} className="block w-full px-5 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{item.q}</span>
            <span className="text-muted">{open === i ? "–" : "+"}</span>
          </div>
          {open === i && <p className="mt-2 text-sm text-muted">{item.a}</p>}
        </button>
      ))}
    </div>
  );
}
