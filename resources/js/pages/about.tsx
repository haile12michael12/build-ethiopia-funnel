import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Code2, Layers3, Sparkles } from 'lucide-react';

const approach = [
    {
        title: 'Understand the need',
        description: 'Clarify the business goal, users, constraints, and what a useful result should do.',
        icon: Layers3,
    },
    {
        title: 'Build the right solution',
        description: 'Develop software, AI integrations, or workflow automation that fits the agreed requirements.',
        icon: Code2,
    },
    {
        title: 'Review and hand over',
        description: 'Test the work, explain how it operates, and agree on any next steps.',
        icon: Sparkles,
    },
];

export default function About() {
    return (
        <PublicLayout>
            <Head title="About Hailab" />
            <main>
                <section className="border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 sm:py-24">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <p className="text-sm font-semibold tracking-wide text-primary">About Hailab</p>
                        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                            Software and automation built around your business needs
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Hailab is a single-owner software business offering web application development, AI integrations, workflow automation, and
                            digital products for clients in Ethiopia and internationally.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="approach-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold text-primary">Working approach</p>
                        <h2 id="approach-heading" className="mt-2 text-3xl font-bold text-foreground">
                            Clear steps from requirements to handoff
                        </h2>
                    </div>
                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        {approach.map(({ title, description, icon: Icon }) => (
                            <article key={title} className="rounded-2xl border border-border bg-card p-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="text-2xl font-bold text-foreground">Explore the work</h2>
                        <p className="mt-2 text-muted-foreground">
                            Browse published projects and digital products, or send a project inquiry to discuss a specific requirement.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href={route('portfolio.index')} className="rounded-md border border-border px-4 py-2 font-medium hover:bg-muted">
                                Portfolio
                            </Link>
                            <Link
                                href={route('client-acquisition.show')}
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
                            >
                                Start a project inquiry <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
