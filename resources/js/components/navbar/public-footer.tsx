import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUp, CalendarCheck2, ChevronRight, Github, Globe, Linkedin, Mail, MapPin, Sparkles, Twitter } from 'lucide-react';
import type { ReactNode } from 'react';

interface FooterLinkProps {
    href: string;
    children: ReactNode;
}

/** Footer link with a sliding chevron reveal on hover/focus. */
function FooterLink({ href, children }: FooterLinkProps) {
    return (
        <li>
            <Link
                href={href}
                className="group inline-flex items-center gap-0.5 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-foreground focus-visible:translate-x-0.5 focus-visible:text-foreground focus-visible:outline-none"
            >
                <ChevronRight className="-ml-4 h-3.5 w-3.5 text-primary opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:opacity-100 group-focus-visible:ml-0 group-focus-visible:opacity-100" />
                {children}
            </Link>
        </li>
    );
}

function FooterHeading({ children }: { children: ReactNode }) {
    return (
        <h4 className="mb-4 flex items-center gap-2.5 text-xs font-semibold tracking-[0.18em] text-foreground uppercase">
            <span aria-hidden className="h-px w-5 bg-gradient-to-r from-primary to-transparent" />
            {children}
        </h4>
    );
}

/**
 * Advanced public footer: layered gradients and pattern texture, a gradient-ring
 * call-to-action band, animated link columns, social icons, and a back-to-top
 * control. Locale-aware (English / Amharic).
 */
export function PublicFooter() {
    const { locale: serverLocale, bookingCtaUrl, appointments } = usePage<SharedData>().props;
    const isAmharic = serverLocale === 'am';
    const year = new Date().getFullYear();

    const socials = [
        { label: 'GitHub', href: 'https://github.com/haile12michael12', icon: Github },
        { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: Linkedin },
        { label: 'Twitter / X', href: 'https://x.com', icon: Twitter },
        { label: 'Email', href: route('contact'), icon: Mail },
    ];

    return (
        <footer className="relative overflow-hidden border-t border-transparent bg-card">
            {/* Gradient hairline + ambient glows + pattern texture */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20" />
                <div className="absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-400/10" />
                <div className="absolute bottom-0 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/10 dark:stroke-neutral-100/10" />
            {/* Fade the pattern out so it never competes with the content */}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-card/70 via-card/80 to-card/95" />

            <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
                {/* CTA band */}
                <div className="mb-12 rounded-2xl bg-gradient-to-r from-primary/50 via-emerald-500/30 to-primary/50 p-[1px] shadow-lg shadow-primary/5">
                    <div className="flex flex-col items-start justify-between gap-5 rounded-[calc(1rem-1px)] bg-background/90 px-6 py-7 backdrop-blur-xl sm:flex-row sm:items-center sm:px-8">
                        <div>
                            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
                                <Sparkles className="h-3.5 w-3.5" />
                                {isAmharic ? 'ዝግጁ ነዎት?' : 'Ready when you are'}
                            </p>
                            <h3 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {isAmharic ? 'ቀጣዩን ታላቅ ፕሮዳክትዎን አንድምንገነባው።' : "Let's build your next big product together."}
                            </h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {isAmharic
                                    ? 'ፕሮዳክትዎን ከኃላፊነት እስከ ግብዣ — ከስትራቴጂ እስከ ማግበር እንሸፍናለን።'
                                    : 'From strategy to launch — pick a time that works for you and we handle the rest.'}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2.5">
                            {bookingCtaUrl && (
                                <Link
                                    href={bookingCtaUrl}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                >
                                    <CalendarCheck2 className="h-4 w-4" />
                                    {isAmharic ? 'ጥሪ ይያዙ' : 'Book a Call'}
                                </Link>
                            )}
                            <Link
                                href={route('client-acquisition.show')}
                                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                                {isAmharic ? 'ፕሮጀክት ይጀምሩ' : 'Start a Project'}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Link grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-12">
                    <div className="col-span-2 md:col-span-4">
                        <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Hailab home">
                            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-emerald-600 text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6">
                                HL
                                <span className="absolute inset-0 rounded-xl ring-1 ring-white/20 ring-inset" />
                            </span>
                            <span className="flex flex-col">
                                <span className="text-lg leading-tight font-bold tracking-tight text-foreground">Hailab</span>
                                <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                                    {isAmharic ? 'ሶፍትዌር ስቱዲዮ' : 'Software Studio'}
                                </span>
                            </span>
                        </Link>
                        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                            {isAmharic
                                ? 'ለአለም አቀፍ እና ለአገር ውስጥ ንግዶች የተገነቡ ዘመናዊ የላራቬል፣ React እና AI ሶፍትዌር ስርዓቶች።'
                                : 'Engineering high-impact AI automation, SaaS platforms, and conversion funnels for ambitious companies.'}
                        </p>
                        <ul className="mt-5 flex items-center gap-2">
                            {socials.map(({ label, href, icon: Icon }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                        aria-label={label}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground hover:shadow-md hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <nav className="md:col-span-2" aria-label={isAmharic ? 'አገልግሎቶች' : 'Solutions'}>
                        <FooterHeading>{isAmharic ? 'አገልግሎቶች' : 'Solutions'}</FooterHeading>
                        <ul className="space-y-2.5">
                            <FooterLink href="/services#web-dev">Web Development</FooterLink>
                            <FooterLink href="/services#ai-apps">AI Applications</FooterLink>
                            <FooterLink href="/services#automation">Business Automation</FooterLink>
                            <FooterLink href="/services#saas">SaaS Platforms</FooterLink>
                        </ul>
                    </nav>

                    <nav className="md:col-span-3" aria-label={isAmharic ? 'ጠቃሚ ማገናኛዎች' : 'Resources'}>
                        <FooterHeading>{isAmharic ? 'ጠቃሚ ማገናኛዎች' : 'Resources'}</FooterHeading>
                        <ul className="space-y-2.5">
                            <FooterLink href={route('portfolio.index')}>Portfolio & Case Studies</FooterLink>
                            <FooterLink href={route('blog.index')}>Engineering Blog</FooterLink>
                            <FooterLink href={route('business-audit.show')}>Free Growth Audit</FooterLink>
                            <FooterLink href={route('developer-audit.index')}>Developer Code Audit</FooterLink>
                            <FooterLink href={route('developer-tools.index')}>Developer Playground</FooterLink>
                            <FooterLink href={route('demo')}>Platform Sandbox</FooterLink>
                        </ul>
                    </nav>

                    <nav className="md:col-span-3" aria-label={isAmharic ? 'ድርጅት' : 'Company'}>
                        <FooterHeading>{isAmharic ? 'ድርጅት' : 'Company'}</FooterHeading>
                        <ul className="space-y-2.5">
                            <FooterLink href={route('about')}>{isAmharic ? 'ስለ እኛ' : 'About Agency'}</FooterLink>
                            {appointments?.booking_enabled && <FooterLink href={route('appointments.show')}>Book a demo</FooterLink>}
                            {bookingCtaUrl && <FooterLink href={bookingCtaUrl}>{isAmharic ? 'ጥሪ ይያዙ' : 'Book a Call'}</FooterLink>}
                            <FooterLink href={route('contact')}>{isAmharic ? 'ያግኙን' : 'Get in Touch'}</FooterLink>
                            <FooterLink href={route('login')}>{isAmharic ? 'የደንበኝነት መግቢያ' : 'Client Sign In'}</FooterLink>
                        </ul>
                    </nav>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 text-sm text-muted-foreground sm:flex-row">
                    <p>
                        &copy; {year} Hailab. {isAmharic ? 'መብቱ በህግ የተጠበቀ ነው።' : 'All rights reserved.'}
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary/70" /> Addis Ababa, Ethiopia
                        </span>
                        <span aria-hidden className="h-3 w-px bg-border" />
                        <span className="inline-flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-emerald-600/80 dark:text-emerald-400/80" />
                            {isAmharic ? 'በዓለም ላይ ቀራፊ አቅርቦት' : 'Global Remote Delivery'}
                        </span>
                        <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            aria-label={isAmharic ? 'ወደ ላይ ተመለስ' : 'Back to top'}
                            className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:text-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
