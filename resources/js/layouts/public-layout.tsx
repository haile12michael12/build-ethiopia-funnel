import { PublicNavbar } from '@/components/navbar/public-navbar';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import React, { ReactNode } from 'react';

interface PublicLayoutProps {
    children: ReactNode;
    className?: string;
}

export function PublicLayout({ children, className = '' }: PublicLayoutProps) {
    const { locale: serverLocale } = usePage<SharedData>().props;
    const isAmharic = serverLocale === 'am';

    return (
        <div className={`min-h-screen bg-background text-foreground flex flex-col justify-between ${className}`}>
            {/* Advanced Responsive Navbar */}
            <PublicNavbar />

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="border-t border-border bg-card/60 py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-3 md:col-span-1">
                            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-xs">
                                    OF
                                </span>
                                <span>OpenFunnels</span>
                            </Link>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {isAmharic
                                    ? 'ለአለም አቀፍ እና ለአገር ውስጥ ንግዶች የተገነቡ ዘመናዊ የላራቬል፣ React እና AI ሶፍትዌር ስርዓቶች።'
                                    : 'Engineering high-impact AI automation, SaaS platforms, and conversion funnels for ambitious companies.'}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                                {isAmharic ? 'አገልግሎቶች' : 'Solutions'}
                            </h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href="/services#web-dev" className="hover:text-foreground transition-colors">
                                        Web Development
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#ai-apps" className="hover:text-foreground transition-colors">
                                        AI Applications
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#automation" className="hover:text-foreground transition-colors">
                                        Business Automation
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/services#saas" className="hover:text-foreground transition-colors">
                                        SaaS Platforms
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                                {isAmharic ? 'ጠቃሚ ማገናኛዎች' : 'Resources'}
                            </h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href={route('portfolio.index')} className="hover:text-foreground transition-colors">
                                        Portfolio & Case Studies
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('blog.index')} className="hover:text-foreground transition-colors">
                                        Engineering Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('business-audit.show')} className="hover:text-foreground transition-colors">
                                        Free Growth Audit
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('demo')} className="hover:text-foreground transition-colors">
                                        Platform Sandbox
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                                {isAmharic ? 'ድርጅት' : 'Company'}
                            </h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <Link href={route('about')} className="hover:text-foreground transition-colors">
                                        About Agency
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('contact')} className="hover:text-foreground transition-colors">
                                        Get in Touch
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('login')} className="hover:text-foreground transition-colors">
                                        Client Sign In
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
                        <p>&copy; {new Date().getFullYear()} OpenFunnels Agency. All rights reserved.</p>
                        <p className="flex items-center gap-4">
                            <span>Addis Ababa, Ethiopia</span>
                            <span>•</span>
                            <span>Global Remote Delivery</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default PublicLayout;

