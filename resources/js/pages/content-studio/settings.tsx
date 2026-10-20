import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Props {
    settings: { brand_name: string; brand_voice: string; brand_guidelines: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Content Studio', href: route('content-studio.index') },
    { title: 'Brand settings', href: route('content-studio.settings') },
];

export default function ContentStudioSettings({ settings }: Props) {
    const form = useForm(settings);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('content-studio.settings.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Content Studio brand settings" />
            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
                <header>
                    <h1 className="text-2xl font-bold">Brand settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">These reusable settings guide future AI drafts. Avoid adding confidential or personal data.</p>
                </header>
                <form onSubmit={submit} className="grid gap-5 rounded-xl border border-border bg-card p-5">
                    <label className="grid gap-2">Agency name
                        <Input value={form.data.brand_name ?? ''} onChange={(event) => form.setData('brand_name', event.target.value)} maxLength={160} />
                    </label>
                    <label className="grid gap-2">Brand voice
                        <Input value={form.data.brand_voice ?? ''} onChange={(event) => form.setData('brand_voice', event.target.value)} placeholder="e.g. clear, practical, warm" maxLength={500} />
                    </label>
                    <label className="grid gap-2">Reusable brand guidelines
                        <textarea className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.data.brand_guidelines ?? ''} onChange={(event) => form.setData('brand_guidelines', event.target.value)} maxLength={3000} />
                    </label>
                    {Object.entries(form.errors).map(([key, error]) => <p key={key} role="alert" className="text-sm text-destructive">{error}</p>)}
                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>Save brand settings</Button>
                        <Button asChild variant="outline"><Link href={route('content-studio.index')}>Cancel</Link></Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
