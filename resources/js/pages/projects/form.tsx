import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CategoriesMap, type Project } from '@/types/project';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    FileText,
    FolderKanban,
    Globe,
    Image as ImageIcon,
    Languages,
    Link as LinkIcon,
    Plus,
    Save,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import { useState } from 'react';

interface ProjectFormProps {
    project: Project | null;
    categories: CategoriesMap;
}

export default function ProjectForm({ project, categories }: ProjectFormProps) {
    const isEdit = !!project;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Projects',
            href: '/admin/projects',
        },
        {
            title: isEdit ? `Edit: ${project.title_en}` : 'New Project',
            href: isEdit ? `/admin/projects/${project.id}/edit` : '/admin/projects/create',
        },
    ];

    const { data, setData, errors, processing } = useForm({
        title_en: project?.title_en || '',
        title_am: project?.title_am || '',
        slug: project?.slug || '',
        summary_en: project?.summary_en || '',
        summary_am: project?.summary_am || '',
        description_en: project?.description_en || '',
        description_am: project?.description_am || '',
        category: project?.category || 'custom_software',
        cover_image: project?.cover_image || '',
        cover_image_file: null as File | null,
        gallery: (project?.gallery as string[]) || [],
        gallery_files: [] as File[],
        technologies: (project?.technologies as string[]) || [],
        demo_url: project?.demo_url || '',
        repo_url: project?.repo_url || '',
        video_url: project?.video_url || '',
        status: (project?.status as 'draft' | 'published' | 'archived') || 'draft',
        is_published: project?.is_published || false,
        is_featured: project?.is_featured || false,
        sort_order: project?.sort_order ?? 0,
        published_at: project?.published_at ? project.published_at.slice(0, 16) : '',
        seo_title_en: project?.seo_title_en || '',
        seo_title_am: project?.seo_title_am || '',
        seo_description_en: project?.seo_description_en || '',
        seo_description_am: project?.seo_description_am || '',
    });

    const [newTech, setNewTech] = useState('');
    const [coverPreview, setCoverPreview] = useState<string | null>(project?.cover_image || null);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>((project?.gallery as string[]) || []);

    // Calculate Amharic translation completeness
    const calculateCompleteness = () => {
        let score = 0;
        if (data.title_am.trim()) score += 33.33;
        if (data.summary_am.trim()) score += 33.33;
        if (data.description_am.trim()) score += 33.34;
        return Math.min(100, Math.round(score));
    };

    const completeness = calculateCompleteness();

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('cover_image_file', file);
            const objectUrl = URL.createObjectURL(file);
            setCoverPreview(objectUrl);
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setData('gallery_files', [...data.gallery_files, ...files]);
            const newPreviews = files.map((f) => URL.createObjectURL(f));
            setGalleryPreviews([...galleryPreviews, ...newPreviews]);
        }
    };

    const removeExistingGalleryImage = (indexToRemove: number) => {
        const updated = data.gallery.filter((_, idx) => idx !== indexToRemove);
        setData('gallery', updated);
        setGalleryPreviews(updated);
    };

    const addTechnology = () => {
        const trimmed = newTech.trim();
        if (trimmed && !data.technologies.includes(trimmed)) {
            setData('technologies', [...data.technologies, trimmed]);
            setNewTech('');
        }
    };

    const removeTechnology = (techToRemove: string) => {
        setData(
            'technologies',
            data.technologies.filter((t) => t !== techToRemove),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && project) {
            router.post(
                route('projects.update', project.id),
                {
                    ...data,
                    _method: 'PUT',
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                },
            );
        } else {
            router.post(route('projects.store'), data, {
                forceFormData: true,
                preserveScroll: true,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? `Edit: ${project.title_en}` : 'Create New Project'} />

            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={route('projects.index')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {isEdit ? `Edit: ${project.title_en}` : 'Create New Project'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Showcase your agency’s solutions with bilingual details, screenshots, and live demo links.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEdit && project && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={route('projects.preview', project.id)} className="flex items-center gap-1.5">
                                    <Globe className="h-4 w-4" />
                                    <span>Preview</span>
                                </Link>
                            </Button>
                        )}
                        <Button type="button" onClick={handleSubmit} disabled={processing} size="sm" className="flex items-center gap-1.5">
                            <Save className="h-4 w-4" />
                            <span>{processing ? 'Saving...' : isEdit ? 'Update Project' : 'Save Project'}</span>
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-16">
                    {/* 1. Basic Information */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <FolderKanban className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">1. Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title_en">
                                    Project Title (English) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title_en"
                                    type="text"
                                    placeholder="e.g. AI-Powered CRM & Automation Engine"
                                    value={data.title_en}
                                    onChange={(e) => setData('title_en', e.target.value)}
                                    required
                                />
                                <InputError message={errors.title_en} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">
                                    Public Slug <span className="text-xs text-muted-foreground">(Optional - auto-generated from title)</span>
                                </Label>
                                <Input
                                    id="slug"
                                    type="text"
                                    placeholder="e.g. ai-crm-automation-engine"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                />
                                <InputError message={errors.slug} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">
                                    Category <span className="text-destructive">*</span>
                                </Label>
                                <select
                                    id="category"
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    required
                                >
                                    {Object.entries(categories).map(([key, cat]) => (
                                        <option key={key} value={key}>
                                            {cat.en} — {cat.am}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.category} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Display Order (Sort Order)</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    min="0"
                                    value={data.sort_order}
                                    onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">Lower numbers appear first in the portfolio.</p>
                                <InputError message={errors.sort_order} />
                            </div>
                        </div>
                    </div>

                    {/* 2. English Content */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">2. English Content</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="summary_en">English Summary</Label>
                                <textarea
                                    id="summary_en"
                                    rows={2}
                                    placeholder="Brief 1-2 sentence overview shown in cards and teasers..."
                                    value={data.summary_en}
                                    onChange={(e) => setData('summary_en', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.summary_en} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description_en">Detailed English Description</Label>
                                <textarea
                                    id="description_en"
                                    rows={6}
                                    placeholder="Provide in-depth architectural details, key problem solved, agency execution, and impact..."
                                    value={data.description_en}
                                    onChange={(e) => setData('description_en', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.description_en} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Amharic Content & Completeness Indicator */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex flex-col items-start justify-between gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                                <Languages className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">3. Amharic Content (የአማርኛ ይዘት)</h2>
                            </div>

                            {/* Completeness Badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Amharic Completeness:</span>
                                <Badge
                                    variant={completeness === 100 ? 'default' : 'secondary'}
                                    className={completeness === 100 ? 'bg-green-600' : ''}
                                >
                                    {completeness}%
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title_am">Amharic Title (የፕሮጀክት ርዕስ)</Label>
                                <Input
                                    id="title_am"
                                    type="text"
                                    placeholder="ለምሳሌ፡ የአርቴፊሻል ኢንተለጀንስ የደንበኞች አያያዝ እና አውቶሜሽን ሲስተም"
                                    value={data.title_am}
                                    onChange={(e) => setData('title_am', e.target.value)}
                                    className="font-amharic"
                                />
                                <InputError message={errors.title_am} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="summary_am">Amharic Summary (አጭር ማጠቃለያ)</Label>
                                <textarea
                                    id="summary_am"
                                    rows={2}
                                    placeholder="ለካርዶች እና ለማጠቃለያ የሚሆን አጭር መግለጫ..."
                                    value={data.summary_am}
                                    onChange={(e) => setData('summary_am', e.target.value)}
                                    className="font-amharic w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.summary_am} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description_am">Amharic Description (ዝርዝር መግለጫ)</Label>
                                <textarea
                                    id="description_am"
                                    rows={6}
                                    placeholder="ስለ ፕሮጀክቱ ዝርዝር አሰራር፣ የተፈቱ ችግሮች እና የተገኙ ውጤቶች..."
                                    value={data.description_am}
                                    onChange={(e) => setData('description_am', e.target.value)}
                                    className="font-amharic w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.description_am} />
                            </div>
                        </div>
                    </div>

                    {/* 4. Images and Gallery */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">4. Images & Screenshot Gallery</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Cover Image */}
                            <div>
                                <Label className="mb-2 block">Cover Image (Featured Thumbnail)</Label>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    {coverPreview ? (
                                        <div className="relative aspect-video w-48 overflow-hidden rounded-lg border border-border">
                                            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCoverPreview(null);
                                                    setData('cover_image', '');
                                                    setData('cover_image_file', null);
                                                }}
                                                className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex aspect-video w-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground">
                                            <ImageIcon className="h-8 w-8" />
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer">
                                                <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                                                    <Upload className="mr-1.5 h-4 w-4" />
                                                    Upload Cover Image
                                                </span>
                                                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                                            </label>
                                            <span className="text-xs text-muted-foreground">Max 5MB (PNG, JPG, WebP)</span>
                                        </div>
                                        <div>
                                            <Input
                                                type="text"
                                                placeholder="Or enter image URL directly..."
                                                value={data.cover_image}
                                                onChange={(e) => {
                                                    setData('cover_image', e.target.value);
                                                    setCoverPreview(e.target.value);
                                                }}
                                            />
                                        </div>
                                        <InputError message={errors.cover_image} />
                                        <InputError message={errors.cover_image_file} />
                                    </div>
                                </div>
                            </div>

                            {/* Screenshot Gallery */}
                            <div>
                                <Label className="mb-2 block">Screenshot Gallery</Label>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-3">
                                        {galleryPreviews.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video w-32 overflow-hidden rounded-lg border border-border">
                                                <img src={url} alt={`Screenshot ${idx + 1}`} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingGalleryImage(idx)}
                                                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}

                                        <label className="flex aspect-video w-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary hover:bg-muted/40">
                                            <Plus className="h-5 w-5" />
                                            <span className="mt-1 text-xs">Add Images</span>
                                            <input type="file" multiple accept="image/*" onChange={handleGalleryChange} className="hidden" />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Upload product screenshots, dashboard views, or workflow diagrams.
                                    </p>
                                    <InputError message={errors.gallery} />
                                    <InputError message={errors.gallery_files} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Technologies and Tools */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">5. Technologies & Tools</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex max-w-md flex-1 items-center gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Add technology (e.g. Next.js, OpenAI, PostgreSQL, Docker)..."
                                        value={newTech}
                                        onChange={(e) => setNewTech(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addTechnology();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="secondary" onClick={addTechnology}>
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Preset chips for fast selection */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="mr-1 text-xs text-muted-foreground">Quick Add:</span>
                                {[
                                    'Laravel',
                                    'React',
                                    'Next.js',
                                    'TypeScript',
                                    'Tailwind CSS',
                                    'OpenAI',
                                    'Python',
                                    'Inertia.js',
                                    'PostgreSQL',
                                    'Docker',
                                    'Stripe',
                                ].map((preset) => (
                                    <button
                                        type="button"
                                        key={preset}
                                        onClick={() => {
                                            if (!data.technologies.includes(preset)) {
                                                setData('technologies', [...data.technologies, preset]);
                                            }
                                        }}
                                        className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    >
                                        + {preset}
                                    </button>
                                ))}
                            </div>

                            {/* Active tags */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {data.technologies.map((tech) => (
                                    <span
                                        key={tech}
                                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                    >
                                        {tech}
                                        <button type="button" onClick={() => removeTechnology(tech)} className="hover:text-primary/70">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <InputError message={errors.technologies} />
                        </div>
                    </div>

                    {/* 6. Demo & Repository Links */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">6. Demo & Repository Links</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="demo_url">Live Demo URL</Label>
                                <Input
                                    id="demo_url"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={data.demo_url}
                                    onChange={(e) => setData('demo_url', e.target.value)}
                                />
                                <InputError message={errors.demo_url} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="repo_url">GitHub Repository URL</Label>
                                <Input
                                    id="repo_url"
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={data.repo_url}
                                    onChange={(e) => setData('repo_url', e.target.value)}
                                />
                                <InputError message={errors.repo_url} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="video_url">Video / Walkthrough URL</Label>
                                <Input
                                    id="video_url"
                                    type="url"
                                    placeholder="https://youtube.com/... or loom.com"
                                    value={data.video_url}
                                    onChange={(e) => setData('video_url', e.target.value)}
                                />
                                <InputError message={errors.video_url} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 border-b border-border/60 pb-3">
                            <h2 className="text-lg font-semibold text-foreground">SEO Metadata</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Search titles and descriptions for both languages.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="seo_title_en">SEO Title (English)</Label>
                                <Input id="seo_title_en" value={data.seo_title_en} onChange={(e) => setData('seo_title_en', e.target.value)} />
                                <InputError message={errors.seo_title_en} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="seo_title_am">SEO Title (Amharic)</Label>
                                <Input id="seo_title_am" value={data.seo_title_am} onChange={(e) => setData('seo_title_am', e.target.value)} />
                                <InputError message={errors.seo_title_am} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="seo_description_en">SEO Description (English)</Label>
                                <textarea id="seo_description_en" value={data.seo_description_en} onChange={(e) => setData('seo_description_en', e.target.value)} maxLength={300} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                <InputError message={errors.seo_description_en} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="seo_description_am">SEO Description (Amharic)</Label>
                                <textarea id="seo_description_am" value={data.seo_description_am} onChange={(e) => setData('seo_description_am', e.target.value)} maxLength={300} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                <InputError message={errors.seo_description_am} />
                            </div>
                        </div>
                    </div>

                    {/* 7. Publishing & Featured Settings */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                            <Clock className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">7. Publishing & Visibility Settings</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="status">Publishing Status</Label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) => {
                                        const val = e.target.value as 'draft' | 'published' | 'archived';
                                        setData('status', val);
                                        setData('is_published', val === 'published');
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <option value="draft">Draft (Private)</option>
                                    <option value="published">Published (Public)</option>
                                    <option value="archived">Archived</option>
                                </select>
                                <InputError message={errors.status} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="published_at">Publication Date & Time</Label>
                                <Input
                                    id="published_at"
                                    type="datetime-local"
                                    value={data.published_at}
                                    onChange={(e) => setData('published_at', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">If published, will show on portfolio at this time.</p>
                                <InputError message={errors.published_at} />
                            </div>

                            <div className="flex items-center space-x-3 pt-6">
                                <input
                                    id="is_featured"
                                    type="checkbox"
                                    checked={data.is_featured}
                                    onChange={(e) => setData('is_featured', e.target.checked)}
                                    className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                                />
                                <div>
                                    <Label htmlFor="is_featured" className="cursor-pointer font-medium">
                                        Mark as Featured Project
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Highlights this project at the top of the portfolio.</p>
                                </div>
                                <InputError message={errors.is_featured} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Save Action */}
                    <div className="flex items-center justify-end gap-3">
                        <Button asChild variant="outline">
                            <Link href={route('projects.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="min-w-[130px]">
                            {processing ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
