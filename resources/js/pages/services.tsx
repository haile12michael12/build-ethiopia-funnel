import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Bot,
    CheckCircle2,
    Code2,
    Database,
    Layers,
    Rocket,
    Server,
    Sparkles,
    Workflow,
    Zap,
} from 'lucide-react';

export default function Services() {
    return (
        <PublicLayout>
            <Head title="Software & AI Services - Hailab" />

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Agency Services & Capabilities</span>
                    </div>

                    <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                        Custom Software, AI Automation & Scalable Web Platforms
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                        We build robust digital products from architectural design to deployment. Partner with our senior engineering team to ship your next high-impact solution.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild size="lg">
                            <Link href={route('business-audit.show')}>Request Growth Audit</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href={route('portfolio.index')}>Browse Portfolio</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Services Sections */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-24">
                {/* 1. Web Development */}
                <section id="web-dev" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-500">
                            <Code2 className="h-5 w-5" />
                            <span>Web & Full-Stack Development</span>
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">
                            High-Performance Web Applications & Portals
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We architect robust, maintainable web applications using Laravel, React, and Next.js. Whether you need a customer portal, multi-vendor directory, or internal tooling, we deliver scalable code with zero compromises on security or performance.
                        </p>
                        <ul className="space-y-2.5 pt-2">
                            {[
                                'Laravel 13 backends with Eloquent, queues, and REST/GraphQL APIs',
                                'React 19 & Next.js single-page applications with SSR/SSG',
                                'Relational schemas on PostgreSQL & SQLite optimized for sub-50ms queries',
                                'Secure authentication, role-based authorization, and audit logs',
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-4">
                            <Button asChild variant="outline">
                                <Link href="/portfolio?category=laravel" className="gap-2">
                                    <span>View Web Development Work</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">Core Tech Stack</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Laravel', 'Inertia.js', 'React', 'TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'].map((tech) => (
                                    <Badge key={tech} variant="secondary" className="px-3 py-1 text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mt-6">
                                <p className="text-xs text-muted-foreground italic">
                                    "Our engineers treat clean architecture, unit testing, and maintainability as non-negotiable fundamentals."
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. AI Applications */}
                <section id="ai-apps" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-8 shadow-xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">Intelligent Workflows</h3>
                            <div className="flex flex-wrap gap-2">
                                {['OpenAI GPT-4o', 'LangChain', 'FastAPI', 'RAG / Vector DBs', 'pgvector', 'Python', 'Redis', 'WebSockets'].map((tech) => (
                                    <Badge key={tech} variant="secondary" className="px-3 py-1 text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mt-6">
                                <p className="text-xs text-muted-foreground italic">
                                    "We deploy agentic AI that takes real actions via secure backend tools rather than basic toy chat interfaces."
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2 space-y-4">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-purple-500">
                            <Bot className="h-5 w-5" />
                            <span>Artificial Intelligence</span>
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">
                            Autonomous AI Agents & Intelligent Systems
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Integrate state-of-the-art Large Language Models into your production stack. We build AI assistants that understand your corporate knowledge, automate client intake, and execute backend business actions safely.
                        </p>
                        <ul className="space-y-2.5 pt-2">
                            {[
                                'Retrieval-Augmented Generation (RAG) over private documents and databases',
                                'Autonomous customer support agents with human-in-the-loop escalation',
                                'AI-driven data extraction, classification, and summarization',
                                'Strict prompt injection guardrails and privacy isolation',
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-4">
                            <Button asChild variant="outline">
                                <Link href="/portfolio?category=ai_automation" className="gap-2">
                                    <span>View AI Portfolio</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* 3. Business Automation */}
                <section id="automation" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-500">
                            <Workflow className="h-5 w-5" />
                            <span>Workflow & CRM Automation</span>
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">
                            Streamlined Sales Pipelines & Lead Funnels
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Eliminate manual data entry and broken lead routing. We design custom funnel pipelines and CRM automations that capture visitors, score potential buyers, trigger notifications, and sync across systems in real time.
                        </p>
                        <ul className="space-y-2.5 pt-2">
                            {[
                                'Custom CRM pipelines with Kanban boards and activity histories',
                                'Multi-channel notifications (Email, SMS, Webhooks, Telegram)',
                                'Automated lead scoring, attribution tracking, and qualification',
                                'Webhook receivers and transactional outbox event delivery',
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-4">
                            <Button asChild variant="outline">
                                <Link href="/portfolio?category=crm" className="gap-2">
                                    <span>View Automation Work</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">Pipelines & Connectors</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Automation Studio', 'CRM Lite', 'Webhooks', 'Queue Workers', 'Event Outbox', 'SMS/Email', 'Telebirr', 'Chapa'].map((tech) => (
                                    <Badge key={tech} variant="secondary" className="px-3 py-1 text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. SaaS Development */}
                <section id="saas" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-8 shadow-xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">SaaS Infrastructure</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Multi-Tenancy', 'Stripe Subscriptions', 'Usage Metering', 'Analytics Dashboards', 'Redis Caching', 'Custom Domains'].map((tech) => (
                                    <Badge key={tech} variant="secondary" className="px-3 py-1 text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2 space-y-4">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-green-500">
                            <Layers className="h-5 w-5" />
                            <span>Software-as-a-Service</span>
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">
                            Turnkey SaaS Applications & Subscription Platforms
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Take your SaaS concept from prototype to market with scalable multi-tenant architecture, automated subscription billing, real-time analytics, and custom domain mapping.
                        </p>
                        <ul className="space-y-2.5 pt-2">
                            {[
                                'Multi-tenant database isolation and data isolation policies',
                                'Subscription billing with Stripe and localized payment gateways',
                                'Interactive reporting dashboards with high-resolution metrics',
                                'Automated onboarding, trial expirations, and email triggers',
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-4">
                            <Button asChild variant="outline">
                                <Link href="/portfolio?category=saas" className="gap-2">
                                    <span>View SaaS Case Studies</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Bottom Call to Action */}
            <section className="border-t border-border bg-card py-16">
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                        Ready to start your next software initiative?
                    </h2>
                    <p className="mt-4 text-muted-foreground text-base max-w-xl mx-auto">
                        Get a comprehensive technical assessment of your current infrastructure and a structured roadmap.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href={route('business-audit.show')}>Get Free Growth Audit</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href={route('contact')}>Contact Us</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
