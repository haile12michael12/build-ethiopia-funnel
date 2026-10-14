import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { type CategoriesMap, type Project } from '@/types/project';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Calendar, Code2, ExternalLink, Eye, FolderKanban, Github, Star, Video, X } from 'lucide-react';
import { useState } from 'react';

interface PortfolioShowProps {
    project: Project;
    relatedProjects: Project[];
    categories: CategoriesMap;
    previewMode?: boolean;
}

export default function PortfolioShow({ project, relatedProjects, categories, previewMode = false }: PortfolioShowProps) {
    const { auth } = usePage<SharedData>().props;
    const [locale, setLocale] = useState<'en' | 'am'>('en');
    const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);

    const getTitle = (p: Project) => {
        if (locale === 'am' && p.title_am) return p.title_am;
        return p.title_en;
    };

    const getSummary = (p: Project) => {
        if (locale === 'am' && p.summary_am) return p.summary_am;
        return p.summary_en || '';
    };

    const getDescription = (p: Project) => {
        if (locale === 'am' && p.description_am) return p.description_am;
        return p.description_en || p.summary_en || '';
    };

    const getCategoryName = (catKey: string) => {
        const cat = categories[catKey];
        if (!cat) return catKey;
        return locale === 'am' ? cat.am : cat.en;
    };

    const formattedDate = project.published_at
        ? new Date(project.published_at).toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    const allScreenshots = [...(project.cover_image ? [project.cover_image] : []), ...(project.gallery || [])];

    return (
        <div className="flex min-h-screen flex-col justify-between bg-background text-foreground">
            <Head>
                <title>{`${getTitle(project)} - ${locale === 'am' ? 'ፖርትፎሊዮ' : 'Portfolio'}`}</title>
                <meta name="description" content={getSummary(project)} />
            </Head>

            {/* Preview Mode Banner */}
            {previewMode && (
                <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-500 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>
                            <strong>Admin Preview Mode:</strong> This project is currently <strong>{project.status.toUpperCase()}</strong>. It is not
                            publicly visible to visitors.
                        </span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-7 border-amber-500/50 text-xs hover:bg-amber-500/20">
                        <Link href={route('projects.edit', project.id)}>Return to Editor</Link>
                    </Button>
                </div>
            )}

            {/* Public Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-lg">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="text-xl font-bold tracking-tight text-foreground hover:opacity-90">
                            OpenFunnels
                        </Link>
                        <nav className="hidden items-center space-x-4 text-sm font-medium md:flex">
                            <Link href={route('portfolio.index')} className="font-semibold text-primary">
                                {locale === 'am' ? '← ወደ ፖርትፎሊዮ ተመለስ' : '← Back to Portfolio'}
                            </Link>
                            <Link href="/business-growth-audit" className="text-muted-foreground transition-colors hover:text-foreground">
                                {locale === 'am' ? 'የንግድ ኦዲት' : 'Growth Audit'}
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
            <main className="flex-1 py-12">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {/* Navigation Back Link */}
                    <div className="mb-6">
                        <Link
                            href={route('portfolio.index')}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>{locale === 'am' ? 'ወደ ፖርትፎሊዮ ዝርዝር ተመለስ' : 'Back to all projects'}</span>
                        </Link>
                    </div>

                    {/* Project Header Info */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
                                {getCategoryName(project.category)}
                            </Badge>
                            {project.is_featured && (
                                <Badge className="bg-yellow-500 px-2.5 py-0.5 text-xs font-semibold text-black">
                                    <Star className="mr-1 h-3 w-3 fill-current" />
                                    {locale === 'am' ? 'ተለይቶ የቀረበ' : 'Featured Project'}
                                </Badge>
                            )}
                            {formattedDate && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formattedDate}
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">{getTitle(project)}</h1>

                        {getSummary(project) && <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{getSummary(project)}</p>}

                        {/* Quick Action Links Bar */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            {project.demo_url && (
                                <Button asChild size="sm" className="gap-2">
                                    <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        <span>{locale === 'am' ? 'የቀጥታ ማሳያ (Live Demo)' : 'Visit Live Demo'}</span>
                                    </a>
                                </Button>
                            )}

                            {project.repo_url && (
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                    <a href={project.repo_url} target="_blank" rel="noopener noreferrer">
                                        <Github className="h-4 w-4" />
                                        <span>{locale === 'am' ? 'ምንጭ ኮድ (GitHub)' : 'View GitHub Repo'}</span>
                                    </a>
                                </Button>
                            )}

                            {project.video_url && (
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                    <a href={project.video_url} target="_blank" rel="noopener noreferrer">
                                        <Video className="h-4 w-4" />
                                        <span>{locale === 'am' ? 'ቪዲዮ ይመልከቱ' : 'Watch Video Demo'}</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Primary Hero Image / Cover */}
                    {project.cover_image && (
                        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-muted shadow-2xl">
                            <img
                                src={project.cover_image}
                                alt={getTitle(project)}
                                className="h-auto max-h-[500px] w-full cursor-pointer object-cover"
                                onClick={() => setActiveScreenshot(project.cover_image || null)}
                            />
                        </div>
                    )}

                    {/* Technologies & Tech Stack Bar */}
                    {project.technologies && project.technologies.length > 0 && (
                        <div className="mt-8 rounded-xl border border-border bg-card p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    {locale === 'am' ? 'የተጠቀሙባቸው ቴክኖሎጂዎች' : 'Technologies & Architecture Stack'}
                                </h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {project.technologies.map((tech, idx) => (
                                    <span
                                        key={idx}
                                        className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Content / Case Study */}
                    <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
                        <h2 className="mb-6 border-b border-border/60 pb-3 text-xl font-bold text-foreground">
                            {locale === 'am' ? 'የፕሮጀክቱ ዝርዝር መግለጫ እና አፈፃፀም' : 'Project Overview & Technical Execution'}
                        </h2>

                        <div className="prose dark:prose-invert max-w-none text-base leading-relaxed whitespace-pre-line text-muted-foreground">
                            {getDescription(project)}
                        </div>
                    </div>

                    {/* Screenshot Gallery Section */}
                    {project.gallery && project.gallery.length > 0 && (
                        <div className="mt-12 space-y-4">
                            <h2 className="text-xl font-bold text-foreground">
                                {locale === 'am' ? 'የፕሮጀክት ምስሎች ማሳያ (Gallery)' : 'Project Screenshots & Interface Views'}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                                {project.gallery.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setActiveScreenshot(img)}
                                        className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-transform hover:scale-[1.02]"
                                    >
                                        <img
                                            src={img}
                                            alt={`Project screenshot ${idx + 1}`}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                            <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                                                {locale === 'am' ? 'አጉላ' : 'Enlarge'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Call to Action Box */}
                    <div className="mt-16 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-8 text-center sm:p-12">
                        <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                            {locale === 'am' ? 'ተመሳሳይ ወይም ብጁ ሶፍትዌር ለድርጅትዎ ማሰራት ይፈልጋሉ?' : 'Need a custom solution similar to this?'}
                        </h3>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                            {locale === 'am'
                                ? 'ድርጅታችን የላቀ ጥራት ያለው የሶፍትዌር ግንባታ እና የቴክኖሎጂ ማማከር አገልግሎት ይሰጣል።'
                                : 'Our engineering team specializes in scalable web systems, AI automations, and enterprise platforms tailored to your business needs.'}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <Button asChild size="lg">
                                <Link href="/business-growth-audit">{locale === 'am' ? 'ነፃ ኦዲት ይጠይቁ' : 'Request Growth Audit'}</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/demo">{locale === 'am' ? 'የቀጥታ ማሳያ' : 'Explore Platform Demo'}</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Related Projects Section */}
                    {relatedProjects.length > 0 && (
                        <div className="mt-16 space-y-6">
                            <h2 className="text-2xl font-bold text-foreground">
                                {locale === 'am' ? 'ተዛማጅ ፕሮጀክቶች' : 'Related Projects in this Category'}
                            </h2>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                {relatedProjects.map((rel) => (
                                    <div
                                        key={rel.id}
                                        className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/50"
                                    >
                                        <div>
                                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                                {rel.cover_image ? (
                                                    <img
                                                        src={rel.cover_image}
                                                        alt={getTitle(rel)}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                                                        <FolderKanban className="h-8 w-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h4 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                                                    {getTitle(rel)}
                                                </h4>
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{getSummary(rel)}</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-border/60 p-3">
                                            <Link
                                                href={route('portfolio.show', rel.slug)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                            >
                                                <span>{locale === 'am' ? 'ይመልከቱ' : 'View Project'}</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Lightbox / Image Enlarge Modal */}
            {activeScreenshot && (
                <div
                    onClick={() => setActiveScreenshot(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
                >
                    <button
                        type="button"
                        onClick={() => setActiveScreenshot(null)}
                        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={activeScreenshot}
                        alt="Enlarged screenshot"
                        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} OpenFunnels. All rights reserved.</p>
            </footer>
        </div>
    );
}
