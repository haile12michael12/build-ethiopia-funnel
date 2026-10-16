import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bot,
    Briefcase,
    ChevronDown,
    Code2,
    Command,
    ExternalLink,
    FileText,
    Globe,
    Languages,
    Layers,
    Menu,
    Newspaper,
    Search,
    Sparkles,
    Workflow,
    X,
    Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface PublicNavbarProps {
    className?: string;
}

export function PublicNavbar({ className = '' }: PublicNavbarProps) {
    const { auth, locale: serverLocale, translations } = usePage<SharedData>().props;
    const currentUrl = usePage().url;

    // Translation helper with English fallback
    const t = (key: string, fallback: string): string => {
        if (!translations?.navigation) return fallback;
        const keys = key.split('.');
        let current: any = translations.navigation;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return fallback;
            }
        }
        return typeof current === 'string' ? current : fallback;
    };

    const currentLocale = (serverLocale as 'en' | 'am') || 'en';

    // State for interactive navigation
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<'services' | 'resources' | null>(null);
    const [mobileServicesExpanded, setMobileServicesExpanded] = useState(false);
    const [mobileResourcesExpanded, setMobileResourcesExpanded] = useState(false);

    const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Keyboard shortcut (Cmd+K / Ctrl+K) for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Switch language
    const handleLocaleSwitch = (newLocale: 'en' | 'am') => {
        if (newLocale === currentLocale) return;
        router.post(
            route('locale.update', { locale: newLocale }),
            {},
            { preserveScroll: true }
        );
    };

    // Handle search submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q) {
            setSearchOpen(false);
            setMobileOpen(false);
            router.get(route('portfolio.index'), { search: q });
        }
    };

    // Dropdown hover handlers with slight delay to prevent flickering
    const handleMouseEnter = (menu: 'services' | 'resources') => {
        if (dropdownTimeoutRef.current) {
            clearTimeout(dropdownTimeoutRef.current);
            dropdownTimeoutRef.current = null;
        }
        setActiveDropdown(menu);
    };

    const handleMouseLeave = () => {
        dropdownTimeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
        }, 150);
    };

    // Route active checks
    const isHomeActive = currentUrl === '/';
    const isPortfolioActive = currentUrl.startsWith('/portfolio') || currentUrl.startsWith('/case-studies');
    const isServicesActive = currentUrl.startsWith('/services');
    const isAboutActive = currentUrl.startsWith('/about');
    const isContactActive = currentUrl.startsWith('/contact');
    const isBlogActive = currentUrl.startsWith('/blog');

    return (
        <>
            <header
                className={`sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-colors ${className}`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-6">
                        <Link
                            href={route('home')}
                            className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm shadow-sm">
                                OF
                            </span>
                            <span className="hidden sm:inline-block">Hailab</span>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <nav
                            className="hidden lg:flex items-center space-x-1"
                            aria-label="Main Navigation"
                        >
                            {/* Home */}
                            <Link
                                href={route('home')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isHomeActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                            >
                                {t('home', 'Home')}
                            </Link>

                            {/* Portfolio / Work */}
                            <Link
                                href={route('portfolio.index')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isPortfolioActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                            >
                                {t('portfolio', 'Work & Portfolio')}
                            </Link>

                            {/* Services Mega Menu Dropdown */}
                            <div
                                className="relative"
                                onMouseEnter={() => handleMouseEnter('services')}
                                onMouseLeave={handleMouseLeave}
                            >
                                <button
                                    type="button"
                                    aria-expanded={activeDropdown === 'services'}
                                    aria-haspopup="true"
                                    aria-controls="services-mega-menu"
                                    onClick={() =>
                                        setActiveDropdown(activeDropdown === 'services' ? null : 'services')
                                    }
                                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isServicesActive || activeDropdown === 'services'
                                            ? 'text-primary font-semibold'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                                >
                                    <span>{t('services', 'Services')}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            activeDropdown === 'services' ? 'rotate-180 text-primary' : ''
                                        }`}
                                    />
                                </button>

                                {/* Services Mega Menu Dropdown Content */}
                                {activeDropdown === 'services' && (
                                    <div
                                        id="services-mega-menu"
                                        className="absolute left-1/2 -translate-x-1/4 top-full mt-1 w-[680px] rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
                                    >
                                        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">
                                                    {t('services', 'Engineering & Solutions')}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('services_tagline', 'Scalable software and AI automation engineered for growth.')}
                                                </p>
                                            </div>
                                            <Link
                                                href={route('services')}
                                                onClick={() => setActiveDropdown(null)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                            >
                                                <span>View All Services</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Web Development */}
                                            <Link
                                                href="/services#web-dev"
                                                onClick={() => setActiveDropdown(null)}
                                                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                                            >
                                                <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                    <Code2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {t('categories.web_dev', 'Web Development')}
                                                    </h4>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {t('categories.web_dev_desc', 'High-performance Laravel, React, and Next.js applications and portals.')}
                                                    </p>
                                                </div>
                                            </Link>

                                            {/* AI Applications */}
                                            <Link
                                                href="/services#ai-apps"
                                                onClick={() => setActiveDropdown(null)}
                                                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                                            >
                                                <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                    <Bot className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {t('categories.ai_apps', 'AI Applications')}
                                                    </h4>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {t('categories.ai_apps_desc', 'Intelligent LLM workflows, conversational bots, and RAG architectures.')}
                                                    </p>
                                                </div>
                                            </Link>

                                            {/* Business Automation */}
                                            <Link
                                                href="/services#automation"
                                                onClick={() => setActiveDropdown(null)}
                                                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                                            >
                                                <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                    <Workflow className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {t('categories.automation', 'Business Automation')}
                                                    </h4>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {t('categories.automation_desc', 'Custom CRM systems, lead routing pipelines, and webhook orchestrations.')}
                                                    </p>
                                                </div>
                                            </Link>

                                            {/* SaaS Development */}
                                            <Link
                                                href="/services#saas"
                                                onClick={() => setActiveDropdown(null)}
                                                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                                            >
                                                <div className="rounded-lg bg-green-500/10 p-2.5 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                                    <Layers className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {t('categories.saas', 'SaaS Development')}
                                                    </h4>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {t('categories.saas_desc', 'Multi-tenant subscription architectures, dashboards, and payment flows.')}
                                                    </p>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Bottom Callout banner */}
                                        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                <span className="text-xs font-medium text-foreground">
                                                    Need a technical evaluation of your stack?
                                                </span>
                                            </div>
                                            <Link
                                                href={route('business-audit.show')}
                                                onClick={() => setActiveDropdown(null)}
                                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                <span>Free Growth Audit</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Resources Dropdown (Blog & Case Studies) */}
                            <div
                                className="relative"
                                onMouseEnter={() => handleMouseEnter('resources')}
                                onMouseLeave={handleMouseLeave}
                            >
                                <button
                                    type="button"
                                    aria-expanded={activeDropdown === 'resources'}
                                    aria-haspopup="true"
                                    aria-controls="resources-dropdown-menu"
                                    onClick={() =>
                                        setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')
                                    }
                                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isBlogActive || activeDropdown === 'resources'
                                            ? 'text-primary font-semibold'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                                >
                                    <span>{t('resources', 'Resources')}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            activeDropdown === 'resources' ? 'rotate-180 text-primary' : ''
                                        }`}
                                    />
                                </button>

                                {activeDropdown === 'resources' && (
                                    <div
                                        id="resources-dropdown-menu"
                                        className="absolute left-0 top-full mt-1 w-72 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 space-y-1"
                                    >
                                        {/* Case Studies */}
                                        <Link
                                            href={route('portfolio.index')}
                                            onClick={() => setActiveDropdown(null)}
                                            className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/60"
                                        >
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    {t('case_studies', 'Case Studies')}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('case_studies_desc', 'Real-world software architectures and results.')}
                                                </p>
                                            </div>
                                        </Link>

                                        {/* Blog */}
                                        <Link
                                            href={route('blog.index')}
                                            onClick={() => setActiveDropdown(null)}
                                            className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/60"
                                        >
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <Newspaper className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    {t('blog', 'Blog & Insights')}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('blog_desc', 'Engineering deep dives and SaaS tutorials.')}
                                                </p>
                                            </div>
                                        </Link>

                                        {/* Live Platform Demo */}
                                        <Link
                                            href={route('demo')}
                                            onClick={() => setActiveDropdown(null)}
                                            className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/60"
                                        >
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Interactive Demo
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Test the live funnel builder sandbox.
                                                </p>
                                            </div>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* About Us */}
                            <Link
                                href={route('about')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isAboutActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                            >
                                {t('about', 'About Us')}
                            </Link>

                            {/* Contact */}
                            <Link
                                href={route('contact')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isContactActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                            >
                                {t('contact', 'Contact')}
                            </Link>
                        </nav>
                    </div>

                    {/* Right Action Controls */}
                    <div className="flex items-center gap-3">
                        {/* Search Trigger Button */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search portfolio projects"
                            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                        >
                            <Search className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline-block">Search projects...</span>
                            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                <Command className="h-2.5 w-2.5" />K
                            </kbd>
                        </button>

                        {/* Language Switcher */}
                        <div
                            className="flex items-center rounded-lg border border-border bg-card p-0.5"
                            role="group"
                            aria-label="Language selector"
                        >
                            <button
                                type="button"
                                onClick={() => handleLocaleSwitch('en')}
                                className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                                    currentLocale === 'en'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                aria-pressed={currentLocale === 'en'}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLocaleSwitch('am')}
                                className={`rounded px-2 py-1 text-xs font-semibold transition-colors font-amharic ${
                                    currentLocale === 'am'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                aria-pressed={currentLocale === 'am'}
                            >
                                አማርኛ
                            </button>
                        </div>

                        {/* Auth / CTA Buttons */}
                        <div className="hidden sm:flex items-center gap-2">
                            {auth.user ? (
                                <Button asChild size="sm" variant="outline">
                                    <Link href={route('dashboard')}>
                                        {t('dashboard', 'Dashboard')}
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={route('login')}>
                                            {t('sign_in', 'Sign In')}
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={route('client-acquisition.show')}>
                                            {t('start_project', 'Start a Project')}
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href={route('business-audit.show')}>
                                            {t('growth_audit', 'Free Growth Audit')}
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile Drawer Trigger */}
                        <div className="lg:hidden">
                            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        aria-label="Open mobile navigation"
                                    >
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>

                                <SheetContent
                                    side="right"
                                    className="w-full sm:max-w-md p-6 overflow-y-auto flex flex-col justify-between"
                                >
                                    <div className="space-y-6">
                                        <SheetHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                                            <SheetTitle className="text-lg font-bold flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                                                    OF
                                                </span>
                                                <span>Hailab</span>
                                            </SheetTitle>
                                        </SheetHeader>

                                        {/* Mobile Search Form */}
                                        <form onSubmit={handleSearchSubmit} className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder={t('search_placeholder', 'Search projects, technologies...')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 bg-card"
                                            />
                                        </form>

                                        {/* Mobile Nav Links */}
                                        <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
                                            <Link
                                                href={route('home')}
                                                onClick={() => setMobileOpen(false)}
                                                className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                                                    isHomeActive
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {t('home', 'Home')}
                                            </Link>

                                            <Link
                                                href={route('portfolio.index')}
                                                onClick={() => setMobileOpen(false)}
                                                className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                                                    isPortfolioActive
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {t('portfolio', 'Work & Portfolio')}
                                            </Link>

                                            {/* Mobile Services Accordion */}
                                            <div className="rounded-lg border border-border/60 bg-card/40">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileServicesExpanded(!mobileServicesExpanded)}
                                                    className="flex w-full items-center justify-between px-3 py-2.5 text-base font-medium text-foreground"
                                                >
                                                    <span>{t('services', 'Services')}</span>
                                                    <ChevronDown
                                                        className={`h-4 w-4 transition-transform duration-200 ${
                                                            mobileServicesExpanded ? 'rotate-180 text-primary' : ''
                                                        }`}
                                                    />
                                                </button>
                                                {mobileServicesExpanded && (
                                                    <div className="border-t border-border/60 px-3 py-2 space-y-2 text-sm bg-muted/20">
                                                        <Link
                                                            href="/services#web-dev"
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Code2 className="h-4 w-4 text-blue-500" />
                                                            <span>{t('categories.web_dev', 'Web Development')}</span>
                                                        </Link>
                                                        <Link
                                                            href="/services#ai-apps"
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Bot className="h-4 w-4 text-purple-500" />
                                                            <span>{t('categories.ai_apps', 'AI Applications')}</span>
                                                        </Link>
                                                        <Link
                                                            href="/services#automation"
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Workflow className="h-4 w-4 text-amber-500" />
                                                            <span>{t('categories.automation', 'Business Automation')}</span>
                                                        </Link>
                                                        <Link
                                                            href="/services#saas"
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Layers className="h-4 w-4 text-green-500" />
                                                            <span>{t('categories.saas', 'SaaS Development')}</span>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile Resources Accordion */}
                                            <div className="rounded-lg border border-border/60 bg-card/40">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileResourcesExpanded(!mobileResourcesExpanded)}
                                                    className="flex w-full items-center justify-between px-3 py-2.5 text-base font-medium text-foreground"
                                                >
                                                    <span>{t('resources', 'Resources')}</span>
                                                    <ChevronDown
                                                        className={`h-4 w-4 transition-transform duration-200 ${
                                                            mobileResourcesExpanded ? 'rotate-180 text-primary' : ''
                                                        }`}
                                                    />
                                                </button>
                                                {mobileResourcesExpanded && (
                                                    <div className="border-t border-border/60 px-3 py-2 space-y-2 text-sm bg-muted/20">
                                                        <Link
                                                            href={route('portfolio.index')}
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Briefcase className="h-4 w-4 text-primary" />
                                                            <span>{t('case_studies', 'Case Studies')}</span>
                                                        </Link>
                                                        <Link
                                                            href={route('blog.index')}
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Newspaper className="h-4 w-4 text-primary" />
                                                            <span>{t('blog', 'Blog & Insights')}</span>
                                                        </Link>
                                                        <Link
                                                            href={route('demo')}
                                                            onClick={() => setMobileOpen(false)}
                                                            className="flex items-center gap-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Zap className="h-4 w-4 text-primary" />
                                                            <span>Platform Demo</span>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>

                                            <Link
                                                href={route('about')}
                                                onClick={() => setMobileOpen(false)}
                                                className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                                                    isAboutActive
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {t('about', 'About Us')}
                                            </Link>

                                            <Link
                                                href={route('contact')}
                                                onClick={() => setMobileOpen(false)}
                                                className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                                                    isContactActive
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {t('contact', 'Contact')}
                                            </Link>
                                        </nav>
                                    </div>

                                    {/* Mobile Bottom Actions */}
                                    <div className="border-t border-border pt-4 space-y-3">
                                        <Button asChild className="w-full">
                                            <Link href={route('client-acquisition.show')} onClick={() => setMobileOpen(false)}>
                                                {t('start_project', 'Start a Project')}
                                            </Link>
                                        </Button>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Languages className="h-4 w-4" />
                                                <span>Language:</span>
                                            </span>
                                            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLocaleSwitch('en')}
                                                    className={`rounded px-2.5 py-1 text-xs font-semibold ${
                                                        currentLocale === 'en'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    English
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLocaleSwitch('am')}
                                                    className={`rounded px-2.5 py-1 text-xs font-semibold font-amharic ${
                                                        currentLocale === 'am'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    አማርኛ
                                                </button>
                                            </div>
                                        </div>

                                        {auth.user ? (
                                            <Button asChild className="w-full">
                                                <Link href={route('dashboard')} onClick={() => setMobileOpen(false)}>
                                                    {t('dashboard', 'Dashboard')}
                                                </Link>
                                            </Button>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button asChild variant="outline" className="w-full">
                                                    <Link href={route('login')} onClick={() => setMobileOpen(false)}>
                                                        {t('sign_in', 'Sign In')}
                                                    </Link>
                                                </Button>
                                                <Button asChild className="w-full">
                                                    <Link
                                                        href={route('business-audit.show')}
                                                        onClick={() => setMobileOpen(false)}
                                                    >
                                                        {t('growth_audit', 'Free Audit')}
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            {/* Accessible Search Dialog (Cmd+K / Ctrl+K) */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-card border-border">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Search Projects and Capabilities</DialogTitle>
                        <DialogDescription>
                            Type a keyword or select a category to search the agency portfolio.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSearchSubmit} className="border-b border-border/80">
                        <div className="relative flex items-center px-4">
                            <Search className="h-5 w-5 text-muted-foreground" />
                            <Input
                                autoFocus
                                type="text"
                                placeholder={t('search_placeholder', 'Search projects, technologies, case studies...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-3 placeholder:text-muted-foreground/70"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Popular Categories:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'AI Automation', cat: 'ai_automation' },
                                { label: 'SaaS Platforms', cat: 'saas' },
                                { label: 'Laravel Apps', cat: 'laravel' },
                                { label: 'React & Next.js', cat: 'react_nextjs' },
                                { label: 'E-Commerce', cat: 'ecommerce' },
                                { label: 'CRM & Workflows', cat: 'crm' },
                            ].map((preset) => (
                                <button
                                    key={preset.cat}
                                    type="button"
                                    onClick={() => {
                                        setSearchOpen(false);
                                        router.get(route('portfolio.index'), { category: preset.cat });
                                    }}
                                    className="rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:bg-primary/10 transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Press <kbd className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">Enter</kbd> to search</span>
                        <span>Press <kbd className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">Esc</kbd> to close</span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
