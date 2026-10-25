import { BusinessInformationFields } from '@/components/audit/BusinessInformationFields';
import { EtbBudgetSelector } from '@/components/audit/EtbBudgetSelector';
import { ProjectTimelineSelector } from '@/components/audit/ProjectTimelineSelector';
import { ServiceInterestSelector } from '@/components/audit/ServiceInterestSelector';
import { WebsiteStatusField } from '@/components/audit/WebsiteStatusField';
import { siteSessionId } from '@/lib/site-session';
import { type BusinessAuditOptions } from '@/types/business-audit';
import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, ChartNoAxesCombined } from 'lucide-react';
import { type FormEvent, useEffect, useRef } from 'react';

interface BusinessGrowthProps {
    options: BusinessAuditOptions;
}

export default function BusinessGrowth({ options }: BusinessGrowthProps) {
    const startedRecorded = useRef(false);

    const form = useForm({
        name: '',
        business_name: '',
        email: '',
        phone: '',
        website: '',
        website_status: '',
        market: 'ethiopia',
        country: '',
        service_interests: [] as string[],
        budget: '',
        timeline: '',
        session_id: '',
    });

    useEffect(() => {
        form.setData('session_id', siteSessionId());
        if (startedRecorded.current) return;
        startedRecorded.current = true;

        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        fetch('/site-events', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            body: JSON.stringify({ event: 'audit_started', session_id: siteSessionId(), topic: 'audit' }),
        }).catch(() => {
            // Analytics are best-effort.
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const budgetOptions = form.data.market === 'international' ? options.international_budgets : options.budgets;

    const setMarket = (market: string) => {
        form.setData((current) => ({ ...current, market, budget: '' }));
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, session_id: siteSessionId() }));
        form.post(route('business-audit.store'));
    };

    return (
        <>
            <Head title="Free Business Growth Audit" />
            <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6">
                <div className="mx-auto max-w-3xl">
                    <header className="mb-8 text-center">
                        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ChartNoAxesCombined className="h-6 w-6" />
                        </div>
                        <p className="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">Free business audit</p>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your next growth opportunity</h1>
                        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                            Tell us a little about your business and goals. We’ll create a practical starting-point report for you.
                        </p>
                    </header>

                    <form onSubmit={submit} className="space-y-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold">About you and your business</h2>
                            <BusinessInformationFields
                                name={form.data.name}
                                businessName={form.data.business_name}
                                email={form.data.email}
                                phone={form.data.phone}
                                website={form.data.website}
                                errors={form.errors}
                                onChange={(field, value) => form.setData(field, value)}
                            />
                        </section>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold">Where is your business or target market?</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {options.markets.map((market) => (
                                    <label
                                        key={market.value}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                            form.data.market === market.value
                                                ? 'border-primary bg-primary/5 font-semibold'
                                                : 'border-border hover:border-primary/40'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="market"
                                            value={market.value}
                                            checked={form.data.market === market.value}
                                            onChange={() => setMarket(market.value)}
                                            className="accent-primary"
                                        />
                                        {market.label}
                                    </label>
                                ))}
                            </div>
                            <label className="block space-y-2 text-sm font-semibold">
                                Country (optional)
                                <input
                                    type="text"
                                    maxLength={120}
                                    value={form.data.country}
                                    onChange={(event) => form.setData('country', event.target.value)}
                                    placeholder="e.g. Ethiopia, Kenya, United States"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                                />
                            </label>
                            {form.errors.country && <span className="block text-xs text-destructive">{form.errors.country}</span>}
                        </fieldset>

                        <WebsiteStatusField
                            value={form.data.website_status}
                            options={options.website_statuses}
                            error={form.errors.website_status}
                            onChange={(value) => form.setData('website_status', value)}
                        />

                        <ServiceInterestSelector
                            value={form.data.service_interests}
                            options={options.services}
                            error={form.errors.service_interests}
                            onChange={(value) => form.setData('service_interests', value)}
                        />

                        <div className="grid gap-5 sm:grid-cols-2">
                            <EtbBudgetSelector
                                value={form.data.budget}
                                options={budgetOptions}
                                error={form.errors.budget}
                                onChange={(value) => form.setData('budget', value)}
                            />
                            <ProjectTimelineSelector
                                value={form.data.timeline}
                                options={options.timelines}
                                error={form.errors.timeline}
                                onChange={(value) => form.setData('timeline', value)}
                            />
                        </div>

                        {form.hasErrors && <p role="alert" className="text-sm text-destructive">Please review the highlighted fields and try again.</p>}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {form.processing ? 'Preparing your audit…' : 'Get my free audit'}
                            {!form.processing && <ArrowRight className="h-4 w-4" />}
                        </button>
                        <p className="text-xs text-muted-foreground">Your information is used to prepare this audit and follow up about your request.</p>
                    </form>
                </div>
            </main>
        </>
    );
}
