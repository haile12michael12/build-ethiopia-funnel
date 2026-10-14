import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import {
    Award,
    CheckCircle2,
    Code2,
    Globe2,
    HeartHandshake,
    Rocket,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';

export default function About() {
    return (
        <PublicLayout>
            <Head title="About Our Engineering Agency - Hailab" />

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>About Hailab</span>
                    </div>

                    <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                        We Engineer High-Impact Software For Growing Enterprises
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                        Based in Addis Ababa and delivering globally, we bridge cutting-edge artificial intelligence with rock-solid Laravel & React engineering to solve complex business bottlenecks.
                    </p>
                </div>
            </section>

            {/* Core Values */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                            <Code2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Architectural Excellence</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            We don't cut corners on software foundations. We write strictly typed, test-backed, and security-hardened code designed to scale gracefully under real traffic.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Security & Reliability</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            From data encryption and role-based policies to webhook idempotency and SSRF defenses, our production deployments meet strict enterprise standards.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                            <Globe2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Bilingual & Local Context</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            We build native solutions that embrace local ecosystems (such as Amharic localization and Ethiopian payment gateways) while upholding international engineering standards.
                        </p>
                    </div>
                </div>

                {/* Team / Mission Section */}
                <div className="mt-20 rounded-2xl border border-border bg-card p-8 sm:p-12">
                    <div className="max-w-3xl space-y-6">
                        <Badge variant="outline">Our Mission</Badge>
                        <h2 className="text-3xl font-bold text-foreground">
                            Democratizing intelligent software and conversion engineering
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Hailab began with a singular focus: to equip creators, startups, and growing enterprises with world-class funnel building, customer relationship pipelines, and automated intelligence without the bloated costs and constraints of proprietary platforms.
                        </p>
                        <div className="pt-2">
                            <Button asChild>
                                <Link href={route('portfolio.index')}>Explore Our Work</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
