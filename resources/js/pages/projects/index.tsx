import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CategoriesMap, type PaginatedData, type Project, type ProjectStats } from '@/types/project';
import { Head, Link, router } from '@inertiajs/react';
import gsap from 'gsap';
import { Archive, CheckCircle2, Clock, Edit3, ExternalLink, Eye, EyeOff, FolderKanban, Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Projects',
        href: '/admin/projects',
    },
];

interface ProjectsIndexProps {
    projects: PaginatedData<Project>;
    filters: {
        search: string;
        category: string;
        status: string;
    };
    categories: CategoriesMap;
    stats: ProjectStats;
}

export default function ProjectsIndex({ projects, filters, categories, stats }: ProjectsIndexProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.project-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
        }, gridRef);

        return () => ctx.revert();
    }, [projects.data]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(searchTerm, selectedCategory, selectedStatus);
    };

    const applyFilters = (search: string, category: string, status: string) => {
        router.get(
            route('projects.index'),
            {
                search: search || undefined,
                category: category !== 'all' ? category : undefined,
                status: status !== 'all' ? status : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        applyFilters(searchTerm, cat, selectedStatus);
    };

    const handleStatusChange = (st: string) => {
        setSelectedStatus(st);
        applyFilters(searchTerm, selectedCategory, st);
    };

    const confirmDelete = () => {
        if (!deletingProject) return;
        setIsDeleting(true);
        router.delete(route('projects.destroy', deletingProject.id), {
            onSuccess: () => setDeletingProject(null),
            onFinish: () => setIsDeleting(false),
        });
    };

    const togglePublish = (project: Project) => {
        if (project.is_published) {
            router.post(route('projects.unpublish', project.id), {}, { preserveScroll: true });
        } else {
            router.post(route('projects.publish', project.id), {}, { preserveScroll: true });
        }
    };

    const archiveProject = (project: Project) => {
        router.post(route('projects.archive', project.id), {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects & Portfolio Management" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header with Title and Create Action */}
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects & Portfolio</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage software solutions, showcase bilingual case studies, and organize agency portfolio pieces.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="sm">
                            <a href={route('portfolio.index')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                                <ExternalLink className="h-4 w-4" />
                                <span>Public Portfolio</span>
                            </a>
                        </Button>
                        <Button asChild size="sm">
                            <Link href={route('projects.create')} className="flex items-center gap-1.5">
                                <Plus className="h-4 w-4" />
                                <span>New Project</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total Projects</p>
                                <p className="mt-1 text-2xl font-bold text-foreground">{stats.total_projects}</p>
                            </div>
                            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                                <FolderKanban className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Published</p>
                                <p className="mt-1 text-2xl font-bold text-green-500">{stats.published_projects}</p>
                            </div>
                            <div className="rounded-lg bg-green-500/10 p-2.5 text-green-500">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Drafts</p>
                                <p className="mt-1 text-2xl font-bold text-amber-500">{stats.draft_projects}</p>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Featured</p>
                                <p className="mt-1 text-2xl font-bold text-yellow-400">{stats.featured_projects}</p>
                            </div>
                            <div className="rounded-lg bg-yellow-400/10 p-2.5 text-yellow-400">
                                <Star className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                    <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by title, summary, or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm">
                            Search
                        </Button>
                    </form>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Category filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <option value="all">All Categories</option>
                            {Object.entries(categories).map(([key, cat]) => (
                                <option key={key} value={key}>
                                    {cat.en}
                                </option>
                            ))}
                        </select>

                        {/* Status filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>

                        {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('all');
                                    setSelectedStatus('all');
                                    applyFilters('', 'all', 'all');
                                }}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Projects Grid */}
                <div ref={gridRef} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.data.map((project) => {
                        const categoryName = categories[project.category]?.en || project.category;

                        return (
                            <div
                                key={project.id}
                                className="project-card group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
                            >
                                <div>
                                    {/* Cover image thumbnail */}
                                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                        {project.cover_image ? (
                                            <img
                                                src={project.cover_image}
                                                alt={project.title_en}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                                                <FolderKanban className="h-10 w-10 stroke-1" />
                                            </div>
                                        )}

                                        {/* Status & Featured badges */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                            {project.status === 'published' ? (
                                                <Badge className="bg-green-500/90 text-white hover:bg-green-600">Published</Badge>
                                            ) : project.status === 'archived' ? (
                                                <Badge variant="secondary">Archived</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/90 text-white hover:bg-amber-600">Draft</Badge>
                                            )}

                                            {project.is_featured && (
                                                <Badge className="bg-yellow-500/90 text-black hover:bg-yellow-600">
                                                    <Star className="mr-1 h-3 w-3 fill-current" />
                                                    Featured
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            <Badge variant="outline" className="border-border/60 bg-background/80 text-xs backdrop-blur-sm">
                                                {categoryName}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5">
                                        <div className="mb-2">
                                            <h3 className="line-clamp-1 text-lg font-semibold text-foreground group-hover:text-primary">
                                                {project.title_en}
                                            </h3>
                                            {project.title_am && (
                                                <p className="font-amharic line-clamp-1 text-xs text-muted-foreground">{project.title_am}</p>
                                            )}
                                        </div>

                                        <p className="line-clamp-2 text-sm text-muted-foreground">{project.summary_en || 'No summary provided.'}</p>

                                        {/* Tech Stack tags */}
                                        {project.technologies && project.technologies.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {project.technologies.slice(0, 4).map((tech, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                                {project.technologies.length > 4 && (
                                                    <span className="rounded-md bg-secondary/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        +{project.technologies.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer & Action Buttons */}
                                <div className="border-t border-border/60 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Button asChild variant="outline" size="sm" className="h-8 px-2.5">
                                                <Link href={route('projects.edit', project.id)}>
                                                    <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                                    Edit
                                                </Link>
                                            </Button>

                                            <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="Preview project">
                                                <Link href={route('projects.preview', project.id)}>
                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Link>
                                            </Button>

                                            {project.is_published && (
                                                <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="View live on portfolio">
                                                    <a href={route('portfolio.show', project.slug)} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => togglePublish(project)}
                                                title={project.is_published ? 'Move to draft' : 'Publish project'}
                                            >
                                                {project.is_published ? (
                                                    <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                                                ) : (
                                                    <Sparkles className="h-3.5 w-3.5 text-green-500" />
                                                )}
                                            </Button>

                                            {project.status !== 'archived' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => archiveProject(project)}
                                                    title="Archive project"
                                                >
                                                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setDeletingProject(project)}
                                                title="Delete project"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {projects.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                        <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">No projects found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                                ? 'Try adjusting your search query or filters.'
                                : 'Get started by creating your agency’s first project showcase.'}
                        </p>
                        <div className="mt-6">
                            <Button asChild>
                                <Link href={route('projects.create')}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Create Project
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {projects.links && projects.links.length > 3 && (
                    <div className="flex items-center justify-center gap-1.5 pt-4">
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingProject?.title_en}"</span>? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeletingProject(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
