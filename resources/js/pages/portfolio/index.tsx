import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type SharedData } from '@/types';
import { type CategoriesMap, type PaginatedData, type Project } from '@/types/project';
import { Head, Link, router, usePage } from '@inertiajs/react';
import gsap from 'gsap';
import { ArrowRight, Code2, ExternalLink, FolderKanban, Github, Search, Sparkles, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PortfolioIndexProps {
    projects: PaginatedData<Project>;
    featured: Project[];
    categories: CategoriesMap;
    filters: {
        search: string;
        category: string;
        tech: string;
    };
}

export default function PortfolioIndex({ projects, featured, categories, filters }: PortfolioIndexProps) {
    const { auth } = usePage<SharedData>().props;
    const [locale, setLocale] = useState<'en' | 'am'>('en');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.portfolio-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
        }, containerRef);

        return () => ctx.revert();
    }, [projects.data]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter(searchTerm, selectedCategory);
    };

    const applyFilter = (search: string, cat: string) => {
        router.get(
            route('portfolio.index'),
            {
                search: search || undefined,
                category: cat !== 'all' ? cat : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleCategoryClick = (cat: string) => {
        setSelectedCategory(cat);
        applyFilter(searchTerm, cat);
    };

    const getTitle = (p: Project) => {
        if (locale === 'am' && p.title_am) return p.title_am;
        return p.title_en;
    };

    const getSummary = (p: Project) => {
        if (locale === 'am' && p.summary_am) return p.summary_am;
        return p.summary_en || '';
    };

    const getCategoryName = (catKey: string) => {
        const cat = categories[catKey];
        if (!cat) return catKey;
        return locale === 'am' ? cat.am : cat.en;
    };

    return (
        <div ref={containerRef} className="flex min-h-screen flex-col justify-between bg-background text-foreground">
            <Head>
                <title>{locale === 'am' ? 'የሶፍትዌር ፕሮጀክቶች እና ፖርትፎሊዮ' : 'Agency Projects & Software Portfolio'}</title>
                <meta
                    name="description"
                    content={
                        locale === 'am'
                            ? 'በአርቴፊሻል ኢንተለጀንስ፣ SaaS፣ ላራቬል እና React የተሰሩ ምርጥ የሶፍትዌር ውጤቶች'
                            : 'Explore enterprise SaaS, AI automation, Laravel, React, and custom web applications built for growth.'
                    }
                />
            </Head>

            {/* Public Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="text-xl font-bold tracking-tight text-foreground hover:opacity-90">
                            OpenFunnels
                        </Link>
                        <nav className="hidden items-center space-x-4 text-sm font-medium md:flex">
                            <Link href={route('portfolio.index')} className="font-semibold text-primary">
                                {locale === 'am' ? 'ፖርትፎሊዮ' : 'Portfolio'}
                            </Link>
                            <Link href="/business-growth-audit" className="text-muted-foreground transition-colors hover:text-foreground">
                                {locale === 'am' ? 'የንግድ ኦዲት' : 'Growth Audit'}
                            </Link>
                            <Link href="/demo" className="text-muted-foreground transition-colors hover:text-foreground">
                                {locale === 'am' ? 'የሙከራ ገጽ' : 'Live Demo'}
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Language Switcher */}
                        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                            <button
                                type="button"
                                onClick={() => setLocale('en')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocale('am')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    locale === 'am' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                አማርኛ
                            </button>
                        </div>

                        {auth.user ? (
                            <Button asChild size="sm">
                                <Link href={route('dashboard')}>{locale === 'am' ? 'ዳሽቦርድ' : 'Dashboard'}</Link>
                            </Button>
                        ) : (
                            <Button asChild size="sm">
                                <Link href={route('login')}>{locale === 'am' ? 'ግባ' : 'Sign In'}</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {/* Hero Showcase Section */}
                <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 sm:py-24">
                    <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{locale === 'am' ? 'የቴክኖሎጂ እና የሶፍትዌር ስራዎች ማሳያ' : 'Engineered for Performance & Scalability'}</span>
                        </div>

                        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            {locale === 'am'
                                ? 'የፈጠራ ሶፍትዌሮች፣ አርቴፊሻል ኢንተለጀንስ እና ዲጂታል ስርዓቶች'
                                : 'Showcase of Intelligent AI Apps, SaaS Platforms & Web Systems'}
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                            {locale === 'am'
                                ? 'ድርጅታችን የገነባቸው ዘመናዊ የላራቬል፣ React፣ AI እና የደመና መተግበሪያዎች ዝርዝር።'
                                : 'Explore our agency-grade portfolio spanning machine learning automation, full-stack Laravel apps, high-converting platforms, and mission-critical APIs.'}
                        </p>

                        {/* Search & Filter Bar */}
                        <div className="mx-auto mt-10 max-w-2xl">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder={locale === 'am' ? 'በስም ወይም በቴክኖሎጂ ይፈልጉ...' : 'Search by title, technology, or topic...'}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-11 border-border bg-card pl-10 text-foreground"
                                    />
                                </div>
                                <Button type="submit" className="h-11 px-6">
                                    {locale === 'am' ? 'ፈልግ' : 'Search'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Categories Tabs Filter */}
                <section className="border-b border-border/40 bg-card/30">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-2">
                            <button
                                type="button"
                                onClick={() => handleCategoryClick('all')}
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                    selectedCategory === 'all'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {locale === 'am' ? 'ሁሉም' : 'All Projects'}
                            </button>
                            {Object.entries(categories).map(([key, cat]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleCategoryClick(key)}
                                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                        selectedCategory === key
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {locale === 'am' ? cat.am : cat.en}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
                    {/* Featured Projects Highlight Section */}
                    {featured.length > 0 && selectedCategory === 'all' && !searchTerm && (
                        <div>
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 fill-current text-yellow-400" />
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        {locale === 'am' ? 'ተለይተው የቀረቡ ስራዎች' : 'Featured Case Studies'}
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {featured.map((p) => (
                                    <div
                                        key={p.id}
                                        className="portfolio-card group flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-primary/30 bg-card transition-all duration-300 hover:border-primary hover:shadow-xl hover:shadow-primary/5"
                                    >
                                        <div>
                                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                                {p.cover_image ? (
                                                    <img
                                                        src={p.cover_image}
                                                        alt={getTitle(p)}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                                                        <Code2 className="h-10 w-10" />
                                                    </div>
                                                )}

                                                <div className="absolute top-3 left-3">
                                                    <Badge className="bg-yellow-500 font-semibold text-black shadow-sm">
                                                        <Star className="mr-1 h-3 w-3 fill-current" />
                                                        {locale === 'am' ? 'ተመራጭ' : 'Featured'}
                                                    </Badge>
                                                </div>

                                                <div className="absolute top-3 right-3">
                                                    <Badge variant="outline" className="bg-background/80 text-xs font-medium backdrop-blur-sm">
                                                        {getCategoryName(p.category)}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                <h3 className="line-clamp-1 text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                                                    <Link href={route('portfolio.show', p.slug)}>{getTitle(p)}</Link>
                                                </h3>
                                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{getSummary(p)}</p>

                                                {p.technologies && p.technologies.length > 0 && (
                                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                                        {p.technologies.map((t, i) => (
                                                            <span
                                                                key={i}
                                                                className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-border/60 p-5 pt-4">
                                            <div className="flex items-center justify-between">
                                                <Link
                                                    href={route('portfolio.show', p.slug)}
                                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                                                >
                                                    <span>{locale === 'am' ? 'ዝርዝር ይመልከቱ' : 'View Case Study'}</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>

                                                <div className="flex items-center gap-2">
                                                    {p.demo_url && (
                                                        <a
                                                            href={p.demo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="Live Demo"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {p.repo_url && (
                                                        <a
                                                            href={p.repo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="Source Code"
                                                        >
                                                            <Github className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Projects Grid */}
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {selectedCategory === 'all'
                                    ? locale === 'am'
                                        ? 'ሁሉም ፕሮጀክቶች'
                                        : 'All Published Work'
                                    : getCategoryName(selectedCategory)}
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                {projects.total} {locale === 'am' ? 'ፕሮጀክቶች' : 'projects'}
                            </span>
                        </div>

                        {projects.data.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {projects.data.map((p) => (
                                    <div
                                        key={p.id}
                                        className="portfolio-card group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
                                    >
                                        <div>
                                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                                {p.cover_image ? (
                                                    <img
                                                        src={p.cover_image}
                                                        alt={getTitle(p)}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                                                        <FolderKanban className="h-10 w-10 stroke-1" />
                                                    </div>
                                                )}

                                                <div className="absolute top-3 right-3">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-border/60 bg-background/80 text-xs font-medium backdrop-blur-sm"
                                                    >
                                                        {getCategoryName(p.category)}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                <h3 className="line-clamp-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                                                    <Link href={route('portfolio.show', p.slug)}>{getTitle(p)}</Link>
                                                </h3>
                                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{getSummary(p)}</p>

                                                {p.technologies && p.technologies.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {p.technologies.slice(0, 3).map((t, i) => (
                                                            <span
                                                                key={i}
                                                                className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                        {p.technologies.length > 3 && (
                                                            <span className="rounded-md bg-secondary/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                                                                +{p.technologies.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-border/60 p-4">
                                            <div className="flex items-center justify-between">
                                                <Link
                                                    href={route('portfolio.show', p.slug)}
                                                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                                >
                                                    <span>{locale === 'am' ? 'ይመልከቱ' : 'Explore'}</span>
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>

                                                <div className="flex items-center gap-2">
                                                    {p.demo_url && (
                                                        <a
                                                            href={p.demo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="Live Demo"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {p.repo_url && (
                                                        <a
                                                            href={p.repo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="GitHub Repo"
                                                        >
                                                            <Github className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                                <FolderKanban className="h-12 w-12 text-muted-foreground/40" />
                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                    {locale === 'am' ? 'ምንም የታተሙ ፕሮጀክቶች አልተገኙም' : 'No published projects found'}
                                </h3>
                                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                    {searchTerm || selectedCategory !== 'all'
                                        ? locale === 'am'
                                            ? 'እባክዎ የፍለጋ ቃላትን ወይም ምድቦችን ይቀይሩ።'
                                            : 'Try adjusting your search criteria or choosing a different category.'
                                        : locale === 'am'
                                          ? 'በቅርቡ አዳዲስ ፕሮጀክቶች ይታተማሉ።'
                                          : 'Check back soon for upcoming agency releases and case studies.'}
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        {projects.links && projects.links.length > 3 && (
                            <div className="mt-10 flex items-center justify-center gap-1.5">
                                {projects.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        asChild={!!link.url}
                                        className="h-8 min-w-[32px] px-2 text-xs"
                                    >
                                        {link.url ? (
                                            <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Agency Call-to-Action */}
                <section className="border-t border-border/80 bg-card py-16">
                    <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            {locale === 'am' ? 'ለድርጅትዎ ብጁ ሶፍትዌር ወይም AI ሲስተም ይፈልጋሉ?' : 'Ready to build high-impact software or automated systems?'}
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
                            {locale === 'am'
                                ? 'የንግድዎን እድገት ለማፋጠን እና ስራዎችን በራስ-ሰር ለማስኬድ ዛሬውኑ ያማክሩን።'
                                : 'Partner with our software team to design, build, and deploy custom web platforms, AI tools, or scalable funnels tailored to your exact workflows.'}
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Button asChild size="lg">
                                <Link href="/business-growth-audit">{locale === 'am' ? 'ነፃ የንግድ ኦዲት ያግኙ' : 'Request Free Growth Audit'}</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/demo">{locale === 'am' ? 'የቀጥታ ማሳያ ይመልከቱ' : 'Explore Platform Demo'}</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} OpenFunnels. All rights reserved.</p>
            </footer>
        </div>
    );
}
