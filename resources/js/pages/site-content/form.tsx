import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type SiteContent, type SiteContentType } from '@/types/site-content';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { type FormEvent } from 'react';

interface ContentFormProps {
    type: SiteContentType;
    label: string;
    entry: SiteContent | null;
}

type FormValues = {
    title_en: string;
    title_am: string;
    slug: string;
    summary_en: string;
    summary_am: string;
    body_en: string;
    body_am: string;
    image: string;
    image_file: File | null;
    category: string;
    highlights_en: string[];
    highlights_am: string[];
    person_name_en: string;
    person_name_am: string;
    person_role_en: string;
    person_role_am: string;
    company_en: string;
    company_am: string;
    status: 'draft' | 'published' | 'archived';
    published_at: string;
    sort_order: number;
    seo_title_en: string;
    seo_title_am: string;
    seo_description_en: string;
    seo_description_am: string;
};

type TextFormKey =
    | 'title_en'
    | 'title_am'
    | 'slug'
    | 'summary_en'
    | 'summary_am'
    | 'body_en'
    | 'body_am'
    | 'category'
    | 'person_name_en'
    | 'person_name_am'
    | 'person_role_en'
    | 'person_role_am'
    | 'company_en'
    | 'company_am'
    | 'seo_title_en'
    | 'seo_title_am'
    | 'seo_description_en'
    | 'seo_description_am';

function Field({ id, label, value, onChange, error, multiline = false, required = false }: {
    id: TextFormKey | 'sort_order';
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    error?: string;
    multiline?: boolean;
    required?: boolean;
}) {
    const common = {
        id,
        value,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
        required,
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
            {multiline ? <textarea {...common} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /> : <Input {...common} />}
            <InputError message={error} />
        </div>
    );
}

export default function SiteContentForm({ type, label, entry }: ContentFormProps) {
    const editing = entry !== null;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: label, href: route('site-content.index', type) },
        { title: editing ? 'Edit item' : 'Create item', href: '#' },
    ];
    const { data, setData, post, transform, processing, errors } = useForm<FormValues>({
        title_en: entry?.title_en ?? '',
        title_am: entry?.title_am ?? '',
        slug: entry?.slug ?? '',
        summary_en: entry?.summary_en ?? '',
        summary_am: entry?.summary_am ?? '',
        body_en: entry?.body_en ?? '',
        body_am: entry?.body_am ?? '',
        image: entry?.image ?? '',
        image_file: null,
        category: entry?.category ?? '',
        highlights_en: entry?.highlights_en ?? [],
        highlights_am: entry?.highlights_am ?? [],
        person_name_en: entry?.person_name_en ?? '',
        person_name_am: entry?.person_name_am ?? '',
        person_role_en: entry?.person_role_en ?? '',
        person_role_am: entry?.person_role_am ?? '',
        company_en: entry?.company_en ?? '',
        company_am: entry?.company_am ?? '',
        status: entry?.status ?? 'draft',
        published_at: entry?.published_at ? entry.published_at.slice(0, 16) : '',
        sort_order: entry?.sort_order ?? 0,
        seo_title_en: entry?.seo_title_en ?? '',
        seo_title_am: entry?.seo_title_am ?? '',
        seo_description_en: entry?.seo_description_en ?? '',
        seo_description_am: entry?.seo_description_am ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { forceFormData: true, preserveScroll: true };
        if (entry) {
            transform((values) => ({ ...values, _method: 'put' }));
            post(route('site-content.update', { type, entry: entry.id }), options);
        } else {
            post(route('site-content.store', type), options);
        }
    };

    const field = (id: TextFormKey, label: string, multiline = false, required = false) => (
        <Field id={id} label={label} value={data[id]} onChange={(value) => setData(id, value)} error={errors[id]} multiline={multiline} required={required} />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${editing ? 'Edit' : 'Create'} ${label}`} />
            <form onSubmit={submit} className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button asChild size="icon" variant="ghost"><Link href={route('site-content.index', type)}><ArrowLeft className="h-5 w-5" /></Link></Button>
                        <div>
                            <h1 className="text-2xl font-bold">{editing ? 'Edit' : 'Create'} {label.slice(0, -1)}</h1>
                            <p className="text-sm text-muted-foreground">Add English and Amharic content, then set publishing and SEO options.</p>
                        </div>
                    </div>
                    <Button type="submit" disabled={processing}><Save className="mr-2 h-4 w-4" />{processing ? 'Saving...' : 'Save'}</Button>
                </div>

                <section className="grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
                    <h2 className="text-lg font-semibold md:col-span-2">Content</h2>
                    {field('title_en', 'Title (English)', false, true)}
                    {field('title_am', 'Title (Amharic)')}
                    {field('slug', 'URL slug')}
                    {(type === 'blog' || type === 'service') && field('category', type === 'blog' ? 'Category' : 'Service category')}
                    {field('summary_en', 'Summary (English)', true)}
                    {field('summary_am', 'Summary (Amharic)', true)}
                    {field('body_en', type === 'testimonial' ? 'Testimonial (English)' : 'Body (English)', true, true)}
                    {field('body_am', type === 'testimonial' ? 'Testimonial (Amharic)' : 'Body (Amharic)', true)}
                    {(type === 'service' || type === 'blog' || type === 'testimonial') && (
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="image_file">Image</Label>
                            <Input id="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setData('image_file', event.target.files?.[0] ?? null)} />
                            {data.image && <img src={data.image} alt="" className="h-28 rounded-md object-cover" />}
                            <InputError message={errors.image_file} />
                        </div>
                    )}
                    {type === 'service' && (
                        <>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="highlights_en">Service highlights (English, one per line)</Label>
                                <textarea id="highlights_en" value={data.highlights_en.join('\n')} onChange={(event) => setData('highlights_en', event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                <InputError message={errors.highlights_en} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="highlights_am">Service highlights (Amharic, one per line)</Label>
                                <textarea id="highlights_am" value={data.highlights_am.join('\n')} onChange={(event) => setData('highlights_am', event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                <InputError message={errors.highlights_am} />
                            </div>
                        </>
                    )}
                    {type === 'testimonial' && (
                        <>
                            {field('person_name_en', 'Customer name (English)', false, true)}
                            {field('person_name_am', 'Customer name (Amharic)')}
                            {field('person_role_en', 'Role (English)')}
                            {field('person_role_am', 'Role (Amharic)')}
                            {field('company_en', 'Company (English)')}
                            {field('company_am', 'Company (Amharic)')}
                        </>
                    )}
                </section>

                <section className="grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
                    <h2 className="text-lg font-semibold md:col-span-2">Publishing</h2>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select id="status" value={data.status} onChange={(event) => setData('status', event.target.value as FormValues['status'])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                        </select>
                    </div>
                    <Field id="sort_order" label="Display order" value={data.sort_order} onChange={(value) => setData('sort_order', Number(value))} error={errors.sort_order} />
                    <div className="space-y-2">
                        <Label htmlFor="published_at">Publish date</Label>
                        <Input id="published_at" type="datetime-local" value={data.published_at} onChange={(event) => setData('published_at', event.target.value)} />
                        <InputError message={errors.published_at} />
                    </div>
                </section>

                <section className="grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
                    <h2 className="text-lg font-semibold md:col-span-2">SEO metadata</h2>
                    {field('seo_title_en', 'SEO title (English)')}
                    {field('seo_title_am', 'SEO title (Amharic)')}
                    {field('seo_description_en', 'SEO description (English)', true)}
                    {field('seo_description_am', 'SEO description (Amharic)', true)}
                </section>
            </form>
        </AppLayout>
    );
}
