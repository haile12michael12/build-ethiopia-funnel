import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';

export default function Contact() {
    return (
        <PublicLayout>
            <Head title="Contact · Hailab" />
            <section className="border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16">
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    <Badge className="mb-6 gap-2 bg-primary/10 text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Get in touch
                    </Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Let’s talk about your project</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                        Share what you are building, the services you need, and your preferred timeline. You can send an inquiry without creating an
                        account.
                    </p>
                </div>
            </section>

            <main className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
                <section>
                    <h2 className="text-2xl font-bold text-foreground">Project and service inquiries</h2>
                    <p className="mt-3 leading-7 text-muted-foreground">
                        The inquiry form collects your contact details and project requirements so they can be reviewed through the business’s
                        existing contact system.
                    </p>
                    <p className="mt-3 leading-7 text-muted-foreground">
                        For a general question or support with a digital product, you can use the same form and describe what you need help with.
                    </p>
                </section>

                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-foreground">Tell me about your project</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Include the services you are interested in, a project description, and optional budget and timing details.
                    </p>
                    <Button asChild className="mt-6 w-full">
                        <Link href={route('client-acquisition.show')} className="gap-2">
                            Start an inquiry
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </section>
            </main>
        </PublicLayout>
    );
}
