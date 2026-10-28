import { EthioBizConcierge } from '@/components/concierge/EthioBizConcierge';
import { PublicNavbar } from '@/components/navbar/public-navbar';
import { PublicTopbar } from '@/components/navbar/public-topbar';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';

interface PublicLayoutProps {
    children: ReactNode;
    className?: string;
}

export function PublicLayout({ children, className = '' }: PublicLayoutProps) {
    const { locale: serverLocale, concierge, appointments } = usePage<SharedData>().props;
    const isAmharic = serverLocale === 'am';

    return (
        <div className={`flex min-h-screen flex-col justify-between bg-background text-foreground ${className}`}>
            <PublicTopbar />
            <PublicNavbar />

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="border-t border-border bg-card/60 py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        <div className="space-y-3 md:col-span-1">
                            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
                                    HL
                                </span>
                                <span>Hailab</span>
                            </Link>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {isAmharic
                                    ? 'ለአለም አቀፍ እና ለአገር ውስጥ ንግዶች የተገነቡ ዘመናዊ የላራቬል፣ React እና AI ሶፍትዌር ስርዓቶች።'
                                    : 'Engineering high-impact AI automation, SaaS platforms, and conversion funnels for ambitious companies.'}
                            </p>
                        </div>

                        <div>
                            <h4 className="mb-3 text-xs font-semibold tracking-wider text-foreground uppercase">
                                {isAmharic ? 'አገልግሎቶች' : 'Solutions'}
                            </h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href="/services#web-dev" className="transition-colors hover:text-foreground">
                                        Web Development
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#ai-apps" className="transition-colors hover:text-foreground">
                                        AI Applications
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#automation" className="transition-colors hover:text-foreground">
                                        Business Automation
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#saas" className="transition-colors hover:text-foreground">
                                        SaaS Platforms
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="mb-3 text-xs font-semibold tracking-wider text-foreground uppercase">
                                {isAmharic ? 'ጠቃሚ ማገናኛዎች' : 'Resources'}
                            </h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href={route('portfolio.index')} className="transition-colors hover:text-foreground">
                                        Portfolio & Case Studies
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('blog.index')} className="transition-colors hover:text-foreground">
                                        Engineering Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('business-audit.show')} className="transition-colors hover:text-foreground">
                                        Free Growth Audit
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('developer-audit.index')} className="transition-colors hover:text-foreground">
                                        Developer Code Audit
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('developer-tools.index')} className="transition-colors hover:text-foreground">
                                        Developer Playground
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('demo')} className="transition-colors hover:text-foreground">
                                        Platform Sandbox
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="mb-3 text-xs font-semibold tracking-wider text-foreground uppercase">{isAmharic ? 'ድርጅት' : 'Company'}</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href={route('about')} className="transition-colors hover:text-foreground">
                                        About Agency
                                    </Link>
                                </li>
                                {appointments?.booking_enabled && (
                                    <li>
                                        <Link href={route('appointments.show')} className="transition-colors hover:text-foreground">
                                            Book a demo
                                        </Link>
                                    </li>
                                )}
                                <li>
                                    <Link href={route('contact')} className="transition-colors hover:text-foreground">
                                        Get in Touch
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('login')} className="transition-colors hover:text-foreground">
                                        Client Sign In
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
                        <p>&copy; {new Date().getFullYear()} Hailab. All rights reserved.</p>
                        <p className="flex items-center gap-4">
                            <span>Addis Ababa, Ethiopia</span>
                            <span>•</span>
                            <span>Global Remote Delivery</span>
                        </p>
                    </div>
                </div>
            </footer>

            {concierge?.enabled ? <EthioBizConcierge /> : null}
        </div>
    );
}

export default PublicLayout;
