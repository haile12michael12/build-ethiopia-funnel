import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';

interface Service {
    id: number;
    title_en: string;
    summary_en: string | null;
    slug: string;
}

interface Project {
    id: number;
    title_en: string;
    summary_en: string | null;
    slug: string;
    cover_image: string | null;
}

interface Product {
    id: number;
    slug: string;
    name: string;
    description: string;
    amount_minor: number | null;
    currency: string;
    image: string | null;
}

interface Testimonial {
    id: number;
    title_en: string;
    summary_en: string | null;
    person_name_en: string | null;
    person_role_en: string | null;
    company_en: string | null;
}

interface WelcomeProps {
    services: Service[];
    projects: Project[];
    products: Product[];
    testimonials: Testimonial[];
}

function productPrice(product: Product): string {
    if (product.amount_minor === null) return 'Price available soon';
    if (product.amount_minor === 0) return 'Free';

    return `${product.currency} ${(product.amount_minor / 100).toFixed(2)}`;
}

export default function Welcome({ services, projects, products, testimonials }: WelcomeProps) {
    return (
        <PublicLayout>
            <Head title="Hailab · Software, AI and Automation">
                <meta
                    name="description"
                    content="Software development, AI integrations, and workflow automation for businesses in Ethiopia and internationally."
                />
            </Head>
            <main>
                <section className="border-b border-border/60 bg-gradient-to-br from-background via-background to-primary/10">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8 lg:py-28">
                        <div>
                            <p className="text-sm font-semibold tracking-wide text-primary">Software · AI · Automation</p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                                Build useful digital products for your business.
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                                Hailab develops web applications, integrates practical AI, and automates business workflows for clients in Ethiopia
                                and internationally.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={route('client-acquisition.show')}
                                    className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                    Start a project inquiry
                                </Link>
                                <Link
                                    href={route('portfolio.index')}
                                    className="rounded-md border border-border bg-card px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
                                >
                                    Explore portfolio
                                </Link>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-xl sm:p-8">
                            <p className="text-sm font-semibold text-primary">What I build</p>
                            <ul className="mt-5 space-y-4">
                                <li className="border-l-2 border-primary pl-4">
                                    <h2 className="font-semibold text-foreground">Software development</h2>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Web applications and digital platforms shaped around real business requirements.
                                    </p>
                                </li>
                                <li className="border-l-2 border-primary pl-4">
                                    <h2 className="font-semibold text-foreground">AI and automation</h2>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        AI integrations and workflow automation designed to support everyday operations.
                                    </p>
                                </li>
                                <li className="border-l-2 border-primary pl-4">
                                    <h2 className="font-semibold text-foreground">Digital products</h2>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Downloadable tools and resources available through the customer storefront.
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {services.length > 0 && (
                    <section aria-labelledby="services-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-primary">Services</p>
                                <h2 id="services-heading" className="mt-2 text-3xl font-bold text-foreground">
                                    Practical help from idea to delivery
                                </h2>
                            </div>
                            <Link href={route('services')} className="font-semibold text-foreground underline underline-offset-4">
                                View all services
                            </Link>
                        </div>
                        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {services.map((service) => (
                                <article key={service.id} className="rounded-xl border border-border bg-card p-5">
                                    <h3 className="text-lg font-semibold text-foreground">{service.title_en}</h3>
                                    {service.summary_en && <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.summary_en}</p>}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {projects.length > 0 && (
                    <section aria-labelledby="portfolio-heading" className="border-y border-border/60 bg-card/40">
                        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-primary">Selected work</p>
                                    <h2 id="portfolio-heading" className="mt-2 text-3xl font-bold text-foreground">
                                        Portfolio and case studies
                                    </h2>
                                </div>
                                <Link href={route('portfolio.index')} className="font-semibold text-foreground underline underline-offset-4">
                                    Browse the portfolio
                                </Link>
                            </div>
                            <div className="mt-8 grid gap-6 md:grid-cols-3">
                                {projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={route('portfolio.show', project.slug)}
                                        className="overflow-hidden rounded-xl border border-border bg-card transition-transform hover:-translate-y-1"
                                    >
                                        {project.cover_image && (
                                            <img src={project.cover_image} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-lg font-semibold text-foreground">{project.title_en}</h3>
                                            {project.summary_en && (
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.summary_en}</p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section aria-labelledby="products-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-primary">Storefront</p>
                            <h2 id="products-heading" className="mt-2 text-3xl font-bold text-foreground">
                                Digital products
                            </h2>
                            <p className="mt-2 max-w-2xl text-muted-foreground">
                                Browse available products and securely access purchases through your account.
                            </p>
                        </div>
                        <Link href={route('marketplace.index')} className="font-semibold text-foreground underline underline-offset-4">
                            View all products
                        </Link>
                    </div>
                    {products.length > 0 ? (
                        <div className="mt-8 grid gap-5 md:grid-cols-3">
                            {products.map((product) => (
                                <article key={product.id} className="overflow-hidden rounded-xl border border-border bg-card">
                                    {product.image && <img src={product.image} alt="" className="aspect-video w-full object-cover" loading="lazy" />}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold text-foreground">{product.name}</h3>
                                            <span className="text-sm font-semibold whitespace-nowrap text-primary">{productPrice(product)}</span>
                                        </div>
                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{product.description}</p>
                                        <Link
                                            href={route('marketplace.show', product.slug)}
                                            className="mt-4 inline-block text-sm font-semibold text-foreground underline underline-offset-4"
                                        >
                                            Product details
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                            Digital products will appear here when they are published.
                        </p>
                    )}
                </section>

                {testimonials.length > 0 && (
                    <section aria-labelledby="testimonials-heading" className="border-y border-border/60 bg-card/40">
                        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                            <h2 id="testimonials-heading" className="text-3xl font-bold text-foreground">
                                Client feedback
                            </h2>
                            <div className="mt-8 grid gap-5 md:grid-cols-3">
                                {testimonials.slice(0, 3).map((item) => (
                                    <figure key={item.id} className="rounded-xl border border-border bg-card p-5">
                                        <blockquote className="leading-7 text-muted-foreground">{item.summary_en || item.title_en}</blockquote>
                                        {(item.person_name_en || item.company_en) && (
                                            <figcaption className="mt-4 text-sm font-semibold text-foreground">
                                                {item.person_name_en}
                                                {item.person_role_en ? ` · ${item.person_role_en}` : ''}
                                                {item.company_en ? ` · ${item.company_en}` : ''}
                                            </figcaption>
                                        )}
                                    </figure>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10">
                        <h2 className="text-3xl font-bold">Have a project in mind?</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/80">
                            Share your goals, service interests, and preferred timeline through the project inquiry form.
                        </p>
                        <Link
                            href={route('client-acquisition.show')}
                            className="mt-6 inline-flex rounded-md bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-background/90"
                        >
                            Contact Hailab
                        </Link>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
