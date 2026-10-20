import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import type {
    AiAdvice,
    AuditHistoryItem,
    CopilotAudit,
    CopilotMetrics,
    CopilotPageProps,
    ProjectRequestSegment,
    Recommendation,
    RecommendationCategory,
} from '@/types/copilot';
import { Head, Link, usePage } from '@inertiajs/react';
import gsap from 'gsap';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    BookOpen,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Eye,
    FileText,
    Lightbulb,
    Loader2,
    MousePointerClick,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    XCircle,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function CopilotPage({ funnel, latestAudit, auditHistory, recommendationHistory: initialRecommendationHistory }: CopilotPageProps) {
    const { translations } = usePage<SharedData>().props;
    const t = useMemo(() => translations?.copilot ?? ({} as Record<string, string>), [translations?.copilot]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Funnels', href: '/funnels' },
        { title: funnel.name, href: `/funnel-editor/${funnel.id}` },
        { title: t.title ?? 'Copilot', href: `/funnels/${funnel.id}/copilot` },
    ];

    const [currentAudit, setCurrentAudit] = useState<CopilotAudit | null>(latestAudit);
    const [recommendationHistory, setRecommendationHistory] = useState(initialRecommendationHistory);
    const [isRunning, setIsRunning] = useState(false);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionNotice, setActionNotice] = useState<string | null>(null);
    const [draftExperimentUrl, setDraftExperimentUrl] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [market, setMarket] = useState('');
    const [service, setService] = useState('');
    const [campaign, setCampaign] = useState('');
    const [landingPage, setLandingPage] = useState('');
    const [includeAi, setIncludeAi] = useState(false);
    const [question, setQuestion] = useState('');
    const [questionAnswer, setQuestionAnswer] = useState<{ answer: string; limitation: string | null; evidence_keys: string[] } | null>(null);
    const [isAsking, setIsAsking] = useState(false);
    const [expandedRec, setExpandedRec] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'ai' | 'experiments' | 'history'>('overview');
    const cardsRef = useRef<HTMLDivElement>(null);
    const activeFilters = useMemo(
        () => ({
            ...(market ? { market } : {}),
            ...(service.trim() ? { service: service.trim() } : {}),
            ...(campaign.trim() ? { campaign: campaign.trim() } : {}),
            ...(landingPage.trim() ? { landing_page: landingPage.trim() } : {}),
        }),
        [market, service, campaign, landingPage],
    );

    useEffect(() => setRecommendationHistory(initialRecommendationHistory), [initialRecommendationHistory]);

    useEffect(() => {
        if (cardsRef.current) {
            const ctx = gsap.context(() => {
                gsap.fromTo('.copilot-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
            }, cardsRef.current);
            return () => ctx.revert();
        }
    }, []);

    const runAudit = useCallback(async () => {
        setIsRunning(true);
        setError(null);
        try {
            const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const res = await fetch(`/funnels/${funnel.id}/copilot/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ date_from: dateFrom, date_to: dateTo, include_ai: includeAi, ...activeFilters }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? t.error_generic ?? 'Something went wrong.');
                if (data.audit) setCurrentAudit(data.audit);
            } else {
                setCurrentAudit(data.audit);
                setActiveTab('overview');
            }
        } catch {
            setError(t.error_generic ?? 'Something went wrong.');
        } finally {
            setIsRunning(false);
        }
    }, [funnel.id, dateFrom, dateTo, includeAi, activeFilters, t]);

    const askQuestion = useCallback(async () => {
        setIsAsking(true);
        setError(null);
        setQuestionAnswer(null);
        try {
            const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(route('copilot.question', { funnel: funnel.id }), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ question, date_from: dateFrom, date_to: dateTo, ...activeFilters }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message ?? t.error_generic ?? 'Something went wrong.');
            setQuestionAnswer(data);
        } catch (questionError) {
            setError(questionError instanceof Error ? questionError.message : (t.error_generic ?? 'Something went wrong.'));
        } finally {
            setIsAsking(false);
        }
    }, [funnel.id, question, dateFrom, dateTo, activeFilters, t]);

    const loadAudit = useCallback(
        async (auditId: number) => {
            try {
                const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
                const res = await fetch(`/funnels/${funnel.id}/copilot/audit/${auditId}`, {
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
                    credentials: 'same-origin',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message ?? t.error_generic ?? 'Something went wrong.');
                setCurrentAudit(data.audit);
                setActiveTab('overview');
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : (t.error_generic ?? 'Something went wrong.'));
            }
        },
        [funnel.id, t],
    );

    const actOnRecommendation = useCallback(
        async (
            recommendation: Recommendation,
            action: 'accept' | 'dismiss' | 'experiment' | 'review',
            proposedCopy?: string,
            review?: { status: string; note?: string; outcome?: string },
        ) => {
            if (!recommendation.id) return;

            setActionBusyId(recommendation.id);
            setError(null);
            setActionNotice(null);
            setDraftExperimentUrl(null);
            try {
                const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
                const response = await fetch(route(`copilot.recommendations.${action}`, { funnel: funnel.id, recommendation: recommendation.id }), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        ...(['experiment', 'review'].includes(action) ? { 'Content-Type': 'application/json' } : {}),
                    },
                    credentials: 'same-origin',
                    ...(['experiment', 'review'].includes(action)
                        ? {
                              body: JSON.stringify(
                                  action === 'review'
                                      ? review
                                      : {
                                            target: recommendation.category === 'cta_optimization' ? 'cta' : 'headline',
                                            proposed_copy: proposedCopy,
                                        },
                              ),
                          }
                        : {}),
                });
                const data: {
                    message?: string;
                    recommendation?: Recommendation;
                    variant?: { editor_url: string; name: string };
                } = await response.json();
                if (!response.ok) throw new Error(data.message ?? t.error_generic ?? 'Something went wrong.');

                if (data.recommendation) {
                    const updatedRecommendation = data.recommendation;
                    setRecommendationHistory((items) => items.map((item) => (item.id === updatedRecommendation.id ? updatedRecommendation : item)));
                    setCurrentAudit((audit) =>
                        audit
                            ? {
                                  ...audit,
                                  recommendations:
                                      audit.recommendations?.map((item) => (item.id === updatedRecommendation.id ? updatedRecommendation : item)) ??
                                      null,
                              }
                            : audit,
                    );
                    setActionNotice(
                        action === 'review'
                            ? `Recommendation marked ${review?.status ?? 'reviewed'}.`
                            : action === 'accept'
                              ? (t.recommendation_accepted_notice ?? 'Recommendation accepted.')
                              : (t.recommendation_dismissed_notice ?? 'Recommendation dismissed.'),
                    );
                }
                if (data.variant) {
                    setDraftExperimentUrl(data.variant.editor_url);
                    setActionNotice(
                        t.experiment_draft_created ?? 'Inactive draft variant created. Review it in the funnel editor before activation.',
                    );
                }
            } catch (actionError) {
                setError(actionError instanceof Error ? actionError.message : (t.error_generic ?? 'Something went wrong.'));
            } finally {
                setActionBusyId(null);
            }
        },
        [funnel.id, t],
    );

    const reviewRecommendation = useCallback(
        (recommendation: Recommendation, status: 'accepted' | 'rejected' | 'applied' | 'completed' | 'dismissed') => {
            if (!recommendation.id) return;

            const note = window.prompt(
                status === 'applied' ? 'Describe the change that has actually been applied (required):' : 'Add an internal review note (optional):',
            );
            if (note === null || (status === 'applied' && !note.trim())) return;

            let outcome: string | undefined;
            if (status === 'completed') {
                outcome = window.prompt('Record the measured outcome (required):') ?? undefined;
                if (!outcome?.trim()) return;
            }

            void actOnRecommendation(recommendation, 'review', undefined, { status, note, outcome });
        },
        [actOnRecommendation],
    );

    const metrics = currentAudit?.metrics ?? null;
    const recommendations = currentAudit?.recommendations ?? [];
    const aiAdvice = currentAudit?.ai_advice ?? null;

    const tabs = [
        { key: 'overview' as const, label: t.metrics ?? 'Metrics', icon: BarChart3 },
        { key: 'recommendations' as const, label: t.recommendations ?? 'Recommendations', icon: Lightbulb, count: recommendations.length },
        { key: 'ai' as const, label: t.ai_advice ?? 'AI Advisor', icon: Brain, disabled: !aiAdvice && !currentAudit?.ai_error },
        { key: 'experiments' as const, label: t.experiments ?? 'Experiments', icon: Target },
        { key: 'history' as const, label: t.audit_history ?? 'History', icon: Clock, count: auditHistory.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t.title ?? 'Copilot'} — ${funnel.name}`} />

            <div ref={cardsRef} className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="copilot-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <Link href="/funnels" className="text-muted-foreground transition hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <h1 className="text-2xl font-bold">{t.title ?? 'Funnel Copilot'}</h1>
                            <Sparkles className="h-5 w-5 text-orange-400" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {funnel.name} — {t.subtitle ?? 'AI-powered optimization & analytics'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex gap-2">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">{t.date_from ?? 'From'}</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">{t.date_to ?? 'To'}</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    checked={includeAi}
                                    onChange={(e) => setIncludeAi(e.target.checked)}
                                    className="accent-orange-500"
                                />
                                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                                {t.include_ai ?? 'AI advice'}
                            </label>
                            <button
                                onClick={runAudit}
                                disabled={isRunning}
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
                            >
                                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                {isRunning ? (t.running ?? 'Analyzing...') : (t.run_audit ?? 'Run Audit')}
                            </button>
                            <Link
                                href={route('funnels.experiments.index', { funnel: funnel.id })}
                                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                            >
                                {t.manage_experiments ?? 'Experiments'}
                            </Link>
                        </div>
                    </div>
                </div>

                <section className="copilot-card space-y-4 rounded-xl border border-border p-4">
                    <div>
                        <h2 className="font-semibold">{t.filters ?? 'Analytics filters'}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t.filter_limitations ??
                                'Campaign and landing-page filters narrow tracked events. Market and service filters narrow persisted inquiries only; anonymous events are not segmented by these choices.'}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs text-muted-foreground">
                            {t.market ?? 'Market'}
                            <select
                                value={market}
                                onChange={(event) => setMarket(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                                <option value="">{t.all_markets ?? 'All markets'}</option>
                                <option value="ethiopia">{t.market_ethiopia ?? 'Ethiopia'}</option>
                                <option value="international">{t.market_international ?? 'International'}</option>
                            </select>
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t.service ?? 'Service key'}
                            <input
                                value={service}
                                onChange={(event) => setService(event.target.value)}
                                maxLength={40}
                                placeholder="e.g. web_app"
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t.campaign ?? 'Campaign'}
                            <input
                                value={campaign}
                                onChange={(event) => setCampaign(event.target.value)}
                                maxLength={100}
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t.landing_page ?? 'Landing page'}
                            <input
                                value={landingPage}
                                onChange={(event) => setLandingPage(event.target.value)}
                                maxLength={2048}
                                placeholder="/services"
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                        </label>
                    </div>
                </section>

                {error && (
                    <div className="copilot-card flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}
                {actionNotice && (
                    <div className="copilot-card rounded-lg border border-green-800 bg-green-950/30 px-4 py-3 text-sm text-green-300" role="status">
                        {actionNotice}{' '}
                        {draftExperimentUrl && (
                            <Link href={draftExperimentUrl} className="font-medium underline underline-offset-2">
                                {t.review_draft ?? 'Review draft'}
                            </Link>
                        )}
                    </div>
                )}

                <section className="copilot-card space-y-3 rounded-xl border border-border p-4">
                    <div>
                        <h2 className="font-semibold">{t.ask_copilot ?? 'Ask about this funnel'}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t.ask_copilot_description ??
                                'Answers use aggregate metrics for the selected period and filters. No prospect records or form answers are sent.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    if (question.trim().length >= 3 && !isAsking) void askQuestion();
                                }
                            }}
                            maxLength={1000}
                            placeholder={t.ask_copilot_placeholder ?? 'Which campaigns generated more inquiries?'}
                            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                            onClick={() => void askQuestion()}
                            disabled={isAsking || question.trim().length < 3}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                            {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                            {isAsking ? (t.running ?? 'Analyzing...') : (t.ask ?? 'Ask')}
                        </button>
                    </div>
                    {questionAnswer && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm" role="status">
                            <p>{questionAnswer.answer}</p>
                            {questionAnswer.limitation && <p className="mt-2 text-xs text-muted-foreground">{questionAnswer.limitation}</p>}
                            {questionAnswer.evidence_keys.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {t.evidence ?? 'Evidence'}: {questionAnswer.evidence_keys.join(', ')}
                                </p>
                            )}
                        </div>
                    )}
                </section>

                {/* Tabs */}
                <div className="copilot-card flex gap-1 overflow-x-auto rounded-lg border border-border p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => !tab.disabled && setActiveTab(tab.key)}
                                disabled={tab.disabled}
                                aria-pressed={activeTab === tab.key}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                                    activeTab === tab.key
                                        ? 'bg-orange-500/20 text-orange-400'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                } ${tab.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{tab.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* No audit state */}
                {!currentAudit && (
                    <div className="copilot-card flex flex-col items-center justify-center rounded-xl border border-border py-16 text-center">
                        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="max-w-md text-sm text-muted-foreground">
                            {t.no_audits ?? 'No audits yet. Run your first audit to get optimization recommendations.'}
                        </p>
                    </div>
                )}

                {/* Overview / Metrics Tab */}
                {currentAudit && activeTab === 'overview' && <MetricsSection metrics={metrics} t={t} />}

                {/* Recommendations Tab */}
                {currentAudit && activeTab === 'recommendations' && (
                    <RecommendationsSection
                        recommendations={recommendations}
                        history={recommendationHistory}
                        expandedRec={expandedRec}
                        setExpandedRec={setExpandedRec}
                        actionBusyId={actionBusyId}
                        onAction={actOnRecommendation}
                        onReview={reviewRecommendation}
                        t={t}
                    />
                )}

                {/* AI Advisor Tab */}
                {currentAudit && activeTab === 'ai' && aiAdvice && <AiAdviceSection advice={aiAdvice} t={t} />}
                {currentAudit && activeTab === 'ai' && !aiAdvice && (
                    <div className="copilot-card flex flex-col items-center justify-center rounded-xl border border-border py-12 text-center">
                        <Sparkles className="mb-4 h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {currentAudit.ai_error ?? t.ai_unavailable ?? 'AI advisor is not configured.'}
                        </p>
                    </div>
                )}

                {/* Experiments Tab */}
                {currentAudit && activeTab === 'experiments' && <ExperimentsSection funnel={funnel} metrics={metrics} t={t} />}

                {/* History Tab */}
                {activeTab === 'history' && <HistorySection history={auditHistory} currentId={currentAudit?.id ?? null} onLoad={loadAudit} t={t} />}
            </div>
        </AppLayout>
    );
}

/* ── Metrics Section ── */
function MetricsSection({ metrics, t }: { metrics: CopilotMetrics | null; t: Record<string, string> }) {
    if (!metrics) return null;

    const kpis = [
        { label: t.views ?? 'Views', value: metrics.views, icon: Eye, color: 'text-blue-400' },
        { label: t.unique_sessions ?? 'Unique Sessions', value: metrics.unique_sessions, icon: Users, color: 'text-indigo-400' },
        { label: t.cta_clicks ?? 'CTA Clicks', value: metrics.cta_clicks, icon: MousePointerClick, color: 'text-purple-400' },
        { label: t.form_starts ?? 'Form Starts', value: metrics.form_starts, icon: FileText, color: 'text-cyan-400' },
        {
            label: t.validation_errors ?? 'Form validation errors',
            value: metrics.form_validation_errors ?? 0,
            icon: AlertTriangle,
            color: 'text-yellow-400',
        },
        { label: t.conversions ?? 'Conversions', value: metrics.conversions, icon: Target, color: 'text-green-400' },
    ];

    const rates = [
        { label: t.conversion_rate ?? 'Conversion Rate', value: `${metrics.conversion_rate}%`, highlight: true },
        { label: t.cta_click_rate ?? 'CTA Click Rate', value: `${metrics.cta_click_rate}%` },
        { label: t.form_completion_rate ?? 'Form Completion', value: `${metrics.form_completion_rate}%` },
    ];

    const dqKey = `data_quality_${metrics.data_quality}` as keyof typeof t;
    const dqLabel = t[dqKey] ?? metrics.data_quality;
    const dqColor =
        metrics.data_quality === 'good'
            ? 'text-green-400 border-green-800 bg-green-950/30'
            : metrics.data_quality === 'partial'
              ? 'text-yellow-400 border-yellow-800 bg-yellow-950/30'
              : 'text-red-400 border-red-800 bg-red-950/30';

    const maxViews = Math.max(1, ...metrics.daily.map((d) => d.views));
    const metricPeriodDefinition = (
        t.metric_period_definition ??
        `Period: ${metrics.date_from}–${metrics.date_to}. Views, starts and conversions are event counts; unique sessions are hashed first-party browser sessions, not unique people.`
    )
        .replace(':from', metrics.date_from)
        .replace(':to', metrics.date_to);
    const projectRequestBreakdowns: Array<{
        key: string;
        title: string;
        rows: ProjectRequestSegment[];
        label: (row: ProjectRequestSegment) => string;
    }> = [
        {
            key: 'markets',
            title: t.project_requests_by_market ?? 'By market',
            rows: metrics.project_requests_by_market ?? [],
            label: (row) => (row.market === 'ethiopia' ? (t.market_ethiopia ?? 'Ethiopia') : (t.market_international ?? 'International')),
        },
        {
            key: 'services',
            title: t.project_requests_by_service ?? 'By service',
            rows: metrics.project_requests_by_service ?? [],
            label: (row) => row.service?.replace(/_/g, ' ') ?? 'Unknown',
        },
    ];

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                {metricPeriodDefinition}{' '}
                {t.conversion_definition ??
                    'Conversion rate = confirmed persisted submissions / view events; form completion = confirmed persisted submissions / form-start events.'}
            </p>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={kpi.label} className="copilot-card rounded-xl border border-border p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${kpi.color}`} />
                                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{kpi.value.toLocaleString()}</p>
                        </div>
                    );
                })}
            </div>

            {/* Rates */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {rates.map((rate) => (
                    <div key={rate.label} className="copilot-card rounded-xl border border-border p-4">
                        <p className="mb-1 text-xs text-muted-foreground">{rate.label}</p>
                        <p className={`text-3xl font-bold ${rate.highlight ? 'text-orange-400' : ''}`}>{rate.value}</p>
                    </div>
                ))}
            </div>

            <section className="copilot-card rounded-xl border border-border p-4">
                <h3 className="font-medium">{t.crm_outcomes ?? 'Persisted CRM outcomes'}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    {t.crm_outcomes_definition ?? 'Inquiries are saved submissions; qualification uses each lead’s current CRM status.'}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                        [t.persisted_inquiries ?? 'Persisted inquiries', metrics.inquiries ?? 0],
                        [t.distinct_leads ?? 'Distinct leads', metrics.distinct_leads ?? 0],
                        [t.currently_qualified_leads ?? 'Currently qualified', metrics.currently_qualified_leads ?? 0],
                        [`${t.qualified_lead_rate ?? 'Current qualified-lead rate'}`, `${metrics.qualified_lead_rate ?? 0}%`],
                        [t.overdue_follow_up_tasks ?? 'Overdue follow-ups now', metrics.overdue_follow_up_tasks ?? 0],
                    ].map(([label, value]) => (
                        <div key={String(label)}>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="mt-1 text-xl font-semibold">{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Data Quality */}
            <div className={`copilot-card rounded-lg border px-4 py-3 text-sm ${dqColor}`}>
                <span className="font-medium">{t.data_quality ?? 'Data Quality'}:</span> {dqLabel}
            </div>

            {(metrics.data_warnings?.length ?? 0) > 0 && (
                <div className="copilot-card rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-200">
                    <p className="mb-2 font-medium">{t.data_limitations ?? 'Data limitations'}</p>
                    <ul className="list-inside list-disc space-y-1">
                        {metrics.data_warnings?.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {(metrics.traffic_sources?.length ?? 0) > 0 ||
            (metrics.traffic_campaigns?.length ?? 0) > 0 ||
            (metrics.landing_pages?.length ?? 0) > 0 ||
            (metrics.devices?.length ?? 0) > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {[
                        { key: 'traffic_sources', title: t.traffic_sources ?? 'Traffic sources', rows: metrics.traffic_sources ?? [] },
                        { key: 'traffic_campaigns', title: t.traffic_campaigns ?? 'Campaigns', rows: metrics.traffic_campaigns ?? [] },
                        { key: 'landing_pages', title: t.landing_pages ?? 'Landing pages', rows: metrics.landing_pages ?? [] },
                        { key: 'devices', title: t.devices ?? 'Devices', rows: metrics.devices ?? [] },
                    ]
                        .filter(({ rows }) => rows.length > 0)
                        .map(({ key, title, rows }) => (
                            <section key={key} className="copilot-card rounded-xl border border-border p-4">
                                <h3 className="mb-3 font-medium">{title}</h3>
                                {rows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t.metrics_unavailable ?? 'No data recorded for this breakdown.'}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {rows.map((row) => (
                                            <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                                                <span className="truncate">{row.label}</span>
                                                <span className="shrink-0 text-muted-foreground">
                                                    {row.views} {t.views ?? 'views'} · {row.conversions} {t.conversions ?? 'conversions'} ·{' '}
                                                    {row.conversion_rate}%
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                </div>
            ) : (
                <p className="px-1 text-xs text-muted-foreground">
                    {t.metrics_unavailable ?? 'Source, campaign, landing-page and device breakdowns are unavailable for this period.'}
                </p>
            )}

            {(metrics.form_steps?.length ?? 0) > 0 && (
                <section className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 font-medium">{t.form_step_dropoffs ?? 'Form-step progression'}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800 text-muted-foreground">
                                    <th className="pr-4 pb-2 font-medium">{t.form ?? 'Form'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.step ?? 'Step'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.sessions ?? 'Sessions'}</th>
                                    <th className="pb-2 font-medium">{t.drop_offs ?? 'Drop-offs before next step'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.form_steps?.map((step) => (
                                    <tr key={`${step.form_id}:${step.step}`} className="border-b border-neutral-800/50">
                                        <td className="py-2 pr-4">{step.form_id}</td>
                                        <td className="py-2 pr-4">{step.step}</td>
                                        <td className="py-2 pr-4">{step.sessions}</td>
                                        <td className="py-2">{step.drop_offs ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {(metrics.project_request_submissions ?? 0) > 0 && (
                <section className="copilot-card rounded-xl border border-border p-4">
                    <div className="mb-3">
                        <h3 className="font-medium">{t.project_requests ?? 'Client project requests'}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {t.project_request_limitations ??
                                'Submission counts are not unique visitors. Qualified counts reflect each lead’s current CRM status and may change over time; market and service conversion rates are unavailable because visits are not segmented by these choices.'}
                        </p>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                        {t.project_request_submissions ?? 'Recorded submissions'}: {metrics.project_request_submissions}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {projectRequestBreakdowns.map(({ key, title, rows, label }) => (
                            <div key={key}>
                                <h4 className="mb-2 text-sm font-medium">{title}</h4>
                                {rows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t.metrics_unavailable ?? 'No data recorded for this breakdown.'}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {rows.map((row) => (
                                            <li
                                                key={row.market ?? row.service ?? 'unknown'}
                                                className="flex items-center justify-between gap-3 text-sm"
                                            >
                                                <span className="truncate capitalize">{label(row)}</span>
                                                <span className="shrink-0 text-muted-foreground">
                                                    {row.submissions} {t.submissions ?? 'submissions'} · {row.qualified_submissions}{' '}
                                                    {t.qualified ?? 'qualified'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Daily Chart */}
            {metrics.daily.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-4 text-sm font-medium">{t.daily_performance ?? 'Daily Performance'}</h3>
                    <div className="flex items-end gap-1" style={{ height: 120 }}>
                        {metrics.daily.map((day) => (
                            <div
                                key={day.date}
                                className="flex flex-1 flex-col items-center gap-1"
                                title={`${day.date}: ${day.views} views, ${day.conversions} conversions`}
                            >
                                <div className="flex w-full gap-px" style={{ height: 100 }}>
                                    <div
                                        className="flex-1 rounded-t bg-blue-500/60"
                                        style={{ height: `${(day.views / maxViews) * 100}%`, marginTop: 'auto' }}
                                    />
                                    <div
                                        className="flex-1 rounded-t bg-green-500/60"
                                        style={{ height: `${maxViews > 0 ? (day.conversions / maxViews) * 100 : 0}%`, marginTop: 'auto' }}
                                    />
                                </div>
                                <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                                    {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded bg-blue-500/60" /> {t.views ?? 'Views'}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded bg-green-500/60" /> {t.conversions ?? 'Conversions'}
                        </span>
                    </div>
                </div>
            )}

            {/* Variant breakdown */}
            {metrics.variants && metrics.variants.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-medium">{t.experiments ?? 'Experiment Variants'}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800 text-muted-foreground">
                                    <th className="pr-4 pb-2 font-medium">{t.variant ?? 'Variant'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.views ?? 'Views'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.conversions ?? 'Conversions'}</th>
                                    <th className="pb-2 font-medium">{t.conversion_rate ?? 'Rate'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.control && (
                                    <tr className="border-b border-neutral-800/50">
                                        <td className="py-2 pr-4 font-medium">{t.control ?? 'Control'}</td>
                                        <td className="py-2 pr-4">{metrics.control.views}</td>
                                        <td className="py-2 pr-4">{metrics.control.conversions}</td>
                                        <td className="py-2">{metrics.control.conversion_rate}%</td>
                                    </tr>
                                )}
                                {metrics.variants.map((v) => (
                                    <tr key={v.id} className="border-b border-neutral-800/50">
                                        <td className="py-2 pr-4">{v.name}</td>
                                        <td className="py-2 pr-4">{v.views}</td>
                                        <td className="py-2 pr-4">{v.conversions}</td>
                                        <td className="py-2">
                                            {v.conversion_rate}%
                                            {!v.sample_sufficient && <span className="ml-1 text-xs text-muted-foreground">⚠</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Recommendations Section ── */
function RecommendationsSection({
    recommendations,
    history,
    expandedRec,
    setExpandedRec,
    actionBusyId,
    onAction,
    onReview,
    t,
}: {
    recommendations: Recommendation[];
    history: Recommendation[];
    expandedRec: string | null;
    setExpandedRec: (k: string | null) => void;
    actionBusyId: number | null;
    onAction: (
        recommendation: Recommendation,
        action: 'accept' | 'dismiss' | 'experiment' | 'review',
        proposedCopy?: string,
        review?: { status: string; note?: string; outcome?: string },
    ) => void;
    onReview: (recommendation: Recommendation, status: 'accepted' | 'rejected' | 'applied' | 'completed' | 'dismissed') => void;
    t: Record<string, string>;
}) {
    const [experimentCopy, setExperimentCopy] = useState<Record<number, string>>({});
    const categoryKey = (cat: RecommendationCategory) => `category_${cat}` as keyof typeof t;
    const priorityColor = (p: number) =>
        p >= 80 ? 'bg-red-500/20 text-red-400' : p >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400';
    const confidenceBadge = (c: string) => (c === 'high' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-neutral-400');

    return (
        <div className="space-y-3">
            {recommendations.length === 0 ? (
                <div className="copilot-card flex flex-col items-center justify-center rounded-xl border border-border py-12 text-center">
                    <CheckCircle2 className="mb-4 h-10 w-10 text-green-400" />
                    <p className="text-sm text-muted-foreground">{t.no_recommendations ?? 'No issues found. Your funnel looks well-structured.'}</p>
                </div>
            ) : (
                recommendations.map((rec) => {
                    const isOpen = expandedRec === rec.key;
                    const recommendationId = rec.id;
                    const isBusy = recommendationId !== undefined && actionBusyId === recommendationId;
                    return (
                        <div key={rec.id ?? rec.key} className="copilot-card overflow-hidden rounded-xl border border-border">
                            <button
                                onClick={() => setExpandedRec(isOpen ? null : rec.key)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-neutral-800/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
                            >
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(rec.priority)}`}>
                                    {t.priority ?? 'Priority'} {rec.priority}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{rec.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{t[categoryKey(rec.category)] ?? rec.category}</p>
                                </div>
                                <span className={`text-xs ${confidenceBadge(rec.confidence)}`}>
                                    {rec.confidence_score ?? rec.confidence} {rec.confidence_score !== undefined ? '/100' : ''}
                                </span>
                                {rec.status && rec.status !== 'pending' && (
                                    <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs">
                                        {t[`recommendation_${rec.status}`] ?? rec.status}
                                    </span>
                                )}
                                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            </button>
                            {isOpen && (
                                <div className="space-y-3 border-t border-neutral-800 px-4 pt-3 pb-4 text-sm">
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="rounded bg-neutral-800 px-2 py-1">
                                            {rec.evidence_type === 'measured'
                                                ? (t.measured_evidence ?? 'Measured evidence')
                                                : (t.content_evidence ?? 'Content review')}
                                        </span>
                                        {rec.created_at && (
                                            <span className="py-1 text-muted-foreground">{new Date(rec.created_at).toLocaleString()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">{t.evidence ?? 'Evidence'}</p>
                                        <p>{rec.evidence}</p>
                                        {rec.supporting_metrics && Object.keys(rec.supporting_metrics).length > 0 && (
                                            <dl className="mt-2 flex flex-wrap gap-2">
                                                {Object.entries(rec.supporting_metrics).map(([label, value]) => (
                                                    <div key={label} className="rounded bg-neutral-800 px-2 py-1 text-xs">
                                                        <dt className="inline text-muted-foreground">{label.replaceAll('_', ' ')}: </dt>
                                                        <dd className="inline font-medium">{value ?? '—'}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">{t.explanation ?? 'Why this matters'}</p>
                                        <p>{rec.explanation}</p>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">{t.suggested_action ?? 'Suggested Action'}</p>
                                        <p className="text-orange-300">{rec.suggested_action}</p>
                                    </div>
                                    {rec.hypothesis && (
                                        <div>
                                            <p className="mb-1 text-xs font-medium text-muted-foreground">{t.hypothesis ?? 'Testable hypothesis'}</p>
                                            <p>{rec.hypothesis}</p>
                                        </div>
                                    )}
                                    {rec.expected_outcome && <p className="text-xs text-muted-foreground">{rec.expected_outcome}</p>}
                                    {rec.review_note && (
                                        <p className="rounded-md border border-border px-3 py-2 text-xs">
                                            <span className="font-medium">{t.review_note ?? 'Internal review note'}: </span>
                                            {rec.review_note}
                                        </p>
                                    )}
                                    {rec.outcome && (
                                        <p className="rounded-md border border-border px-3 py-2 text-xs">
                                            <span className="font-medium">{t.actual_outcome ?? 'Measured outcome'}: </span>
                                            {rec.outcome}
                                        </p>
                                    )}
                                    {(rec.review_history?.length ?? 0) > 0 && (
                                        <div className="rounded-md border border-border px-3 py-2 text-xs">
                                            <p className="mb-2 font-medium">{t.review_history ?? 'Review history'}</p>
                                            <ul className="space-y-1 text-muted-foreground">
                                                {rec.review_history?.map((entry, index) => (
                                                    <li key={`${entry.at}-${index}`}>
                                                        {entry.status} · {new Date(entry.at).toLocaleString()} · reviewer #{entry.actor_user_id}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {t.confidence ?? 'Confidence'}: {rec.confidence_score ?? rec.confidence}
                                        {rec.confidence_explanation && ` — ${rec.confidence_explanation}`}
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {rec.status === 'pending' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => onReview(rec, 'accepted')}
                                                    disabled={isBusy}
                                                    className="rounded-md bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/30 disabled:opacity-50"
                                                >
                                                    {isBusy ? (t.saving ?? 'Saving…') : (t.accept ?? 'Accept')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onReview(rec, 'dismissed')}
                                                    disabled={isBusy}
                                                    className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium hover:bg-neutral-700 disabled:opacity-50"
                                                >
                                                    {t.dismiss ?? 'Dismiss'}
                                                </button>
                                            </>
                                        )}
                                        {rec.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => onReview(rec, 'rejected')}
                                                disabled={isBusy}
                                                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-neutral-800 disabled:opacity-50"
                                            >
                                                {t.reject ?? 'Reject'}
                                            </button>
                                        )}
                                        {rec.status === 'accepted' && (
                                            <button
                                                type="button"
                                                onClick={() => onReview(rec, 'applied')}
                                                disabled={isBusy}
                                                className="rounded-md bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                                            >
                                                {t.mark_applied ?? 'Mark applied'}
                                            </button>
                                        )}
                                        {rec.status === 'applied' && (
                                            <button
                                                type="button"
                                                onClick={() => onReview(rec, 'completed')}
                                                disabled={isBusy}
                                                className="rounded-md bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
                                            >
                                                {t.record_outcome ?? 'Record outcome'}
                                            </button>
                                        )}
                                        {rec.status === 'accepted' &&
                                            recommendationId !== undefined &&
                                            ['content_clarity', 'cta_optimization'].includes(rec.category) && (
                                                <div className="w-full space-y-2 rounded-lg border border-neutral-800 p-3">
                                                    <label className="block text-xs font-medium" htmlFor={`experiment-copy-${recommendationId}`}>
                                                        {rec.category === 'cta_optimization'
                                                            ? (t.proposed_cta_copy ?? 'Proposed CTA text')
                                                            : (t.proposed_headline ?? 'Proposed headline')}
                                                    </label>
                                                    <input
                                                        id={`experiment-copy-${recommendationId}`}
                                                        value={experimentCopy[recommendationId] ?? ''}
                                                        onChange={(event) =>
                                                            setExperimentCopy((current) => ({ ...current, [recommendationId]: event.target.value }))
                                                        }
                                                        maxLength={255}
                                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                                        placeholder={t.proposed_copy_placeholder ?? 'Enter the proposed copy to test'}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {t.experiment_copy_note ??
                                                            'Creates an inactive variant by replacing the first matching headline or CTA. Review it before activation.'}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => onAction(rec, 'experiment', experimentCopy[recommendationId])}
                                                        disabled={isBusy || !(experimentCopy[recommendationId] ?? '').trim()}
                                                        className="rounded-md bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                                                    >
                                                        {isBusy ? (t.saving ?? 'Saving…') : (t.draft_experiment ?? 'Create inactive draft variant')}
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {history.some((item) => item.status !== 'pending') && (
                <section className="copilot-card rounded-xl border border-border p-4" aria-labelledby="recommendation-history-heading">
                    <h3 id="recommendation-history-heading" className="mb-3 font-medium">
                        {t.recommendation_history ?? 'Reviewed recommendations'}
                    </h3>
                    <ul className="space-y-2">
                        {history
                            .filter((item) => item.status !== 'pending')
                            .map((item) => (
                                <li key={item.id ?? item.key} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="truncate">{item.title}</span>
                                    <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-xs">
                                        {t[`recommendation_${item.status}`] ?? item.status}
                                    </span>
                                </li>
                            ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

/* ── AI Advice Section ── */
function AiAdviceSection({ advice, t }: { advice: AiAdvice; t: Record<string, string> }) {
    return (
        <div className="space-y-4">
            {/* Explanations */}
            {advice.explanations.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <Lightbulb className="h-4 w-4 text-yellow-400" /> {t.ai_explanations ?? 'Insights'}
                    </h3>
                    <div className="space-y-3">
                        {advice.explanations.map((ex, i) => (
                            <div key={i} className="rounded-lg bg-neutral-800/30 p-3 text-sm">
                                <p className="mb-1 text-xs font-medium text-muted-foreground">{ex.key}</p>
                                <p>{ex.explanation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Copy Suggestions */}
            {advice.copy_suggestions.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <BookOpen className="h-4 w-4 text-cyan-400" /> {t.ai_copy_suggestions ?? 'Copy Suggestions'}
                    </h3>
                    <div className="space-y-4">
                        {advice.copy_suggestions.map((sug, i) => (
                            <div key={i} className="rounded-lg bg-neutral-800/30 p-3 text-sm">
                                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="rounded bg-neutral-700 px-1.5 py-0.5">{sug.type}</span>
                                </div>
                                {sug.original && (
                                    <div className="mb-2">
                                        <p className="text-xs text-muted-foreground">{t.original ?? 'Original'}:</p>
                                        <p className="text-neutral-400">{sug.original}</p>
                                    </div>
                                )}
                                <div className="mb-2">
                                    <p className="text-xs text-green-400">{t.suggested ?? 'Suggested'}:</p>
                                    <p className="font-medium">{sug.suggestion}</p>
                                </div>
                                {sug.rationale && (
                                    <p className="text-xs text-muted-foreground">
                                        {t.rationale ?? 'Rationale'}: {sug.rationale}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Experiment Hypotheses */}
            {advice.experiment_hypotheses.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <Target className="h-4 w-4 text-purple-400" /> {t.ai_experiment_hypotheses ?? 'Experiment Ideas'}
                    </h3>
                    <div className="space-y-3">
                        {advice.experiment_hypotheses.map((hyp, i) => (
                            <div key={i} className="rounded-lg bg-neutral-800/30 p-3 text-sm">
                                <p className="mb-1 font-medium">{hyp.hypothesis}</p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>
                                        {t.primary_metric ?? 'Metric'}: {hyp.primary_metric}
                                    </span>
                                </div>
                                {hyp.variant_description && <p className="mt-1 text-xs text-muted-foreground">{hyp.variant_description}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Next Steps */}
            {advice.next_steps.length > 0 && (
                <div className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                        <TrendingUp className="h-4 w-4 text-orange-400" /> {t.ai_next_steps ?? 'Next Steps'}
                    </h3>
                    <ol className="list-inside list-decimal space-y-2 text-sm">
                        {advice.next_steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}

/* ── Experiments Section ── */
function ExperimentsSection({
    funnel,
    metrics,
    t,
}: {
    funnel: CopilotPageProps['funnel'];
    metrics: CopilotMetrics | null;
    t: Record<string, string>;
}) {
    const variants = funnel.variants;

    return (
        <div className="space-y-4">
            <div className="copilot-card rounded-xl border border-border p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium">
                        <Target className="h-4 w-4 text-purple-400" /> {t.experiments ?? 'Experiments'}
                    </h3>
                    <Link
                        href={route('funnels.experiments.index', { funnel: funnel.id })}
                        className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-400 transition hover:bg-orange-500/30"
                    >
                        {t.manage_experiments ?? 'Manage experiments'}
                    </Link>
                </div>

                {variants.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No active variants. Create an A/B test variant in the funnel editor.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800 text-muted-foreground">
                                    <th className="pr-4 pb-2 font-medium">{t.variant ?? 'Variant'}</th>
                                    <th className="pr-4 pb-2 font-medium">Weight</th>
                                    <th className="pr-4 pb-2 font-medium">Active</th>
                                    <th className="pr-4 pb-2 font-medium">{t.views ?? 'Views'}</th>
                                    <th className="pb-2 font-medium">{t.conversions ?? 'Conversions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v) => (
                                    <tr key={v.id} className="border-b border-neutral-800/50">
                                        <td className="py-2 pr-4 font-medium">{v.name}</td>
                                        <td className="py-2 pr-4">{v.weight}%</td>
                                        <td className="py-2 pr-4">
                                            {v.is_active ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">{v.views}</td>
                                        <td className="py-2">{v.conversions}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {(metrics?.experiment_comparisons?.length ?? 0) > 0 && (
                <section className="copilot-card rounded-xl border border-border p-4">
                    <h3 className="mb-1 font-medium">{t.variant_comparisons ?? 'Observed variant comparison'}</h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                        {t.experiment_caution ??
                            'Rates are descriptive only. No winner is declared; validate assignment and sample size before drawing conclusions.'}
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[36rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800 text-muted-foreground">
                                    <th className="pr-4 pb-2 font-medium">{t.variant ?? 'Variant'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.control ?? 'Unassigned baseline'}</th>
                                    <th className="pr-4 pb-2 font-medium">{t.variant ?? 'Variant'} rate</th>
                                    <th className="pr-4 pb-2 font-medium">{t.difference ?? 'Difference (pp)'}</th>
                                    <th className="pb-2 font-medium">{t.sample_size ?? 'Sample'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics?.experiment_comparisons?.map((comparison) => (
                                    <tr key={comparison.variant_id} className="border-b border-neutral-800/50">
                                        <td className="py-2 pr-4">{comparison.variant_name}</td>
                                        <td className="py-2 pr-4">
                                            {comparison.control_conversion_rate}% ({comparison.control_views})
                                        </td>
                                        <td className="py-2 pr-4">
                                            {comparison.variant_conversion_rate}% ({comparison.variant_views})
                                        </td>
                                        <td className="py-2 pr-4">{comparison.difference_percentage_points}</td>
                                        <td className="py-2">
                                            {comparison.sample_sufficient
                                                ? (t.sufficient ?? 'Sufficient')
                                                : (t.insufficient_sample ?? 'Insufficient')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {metrics && !metrics.sample_size_sufficient && (
                <div className="copilot-card flex items-center gap-2 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t.insufficient_sample ?? 'Insufficient sample size for statistical comparison'}
                </div>
            )}
        </div>
    );
}

/* ── History Section ── */
function HistorySection({
    history,
    currentId,
    onLoad,
    t,
}: {
    history: AuditHistoryItem[];
    currentId: number | null;
    onLoad: (id: number) => void;
    t: Record<string, string>;
}) {
    const statusIcon = (s: string) => {
        switch (s) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-400" />;
            case 'running':
                return <Loader2 className="h-4 w-4 animate-spin text-orange-400" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };
    const statusKey = (s: string) => `status_${s}` as keyof typeof t;

    if (history.length === 0) {
        return (
            <div className="copilot-card flex flex-col items-center justify-center rounded-xl border border-border py-12 text-center">
                <Clock className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t.no_audits ?? 'No audits yet.'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {history.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onLoad(item.id)}
                    className={`copilot-card flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition hover:bg-neutral-800/30 ${
                        currentId === item.id ? 'ring-1 ring-orange-500/50' : ''
                    }`}
                >
                    {statusIcon(item.status)}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                            {item.date_from && item.date_to ? `${item.date_from} — ${item.date_to}` : (t[statusKey(item.status)] ?? item.status)}
                        </p>
                        {item.metrics_summary && (
                            <p className="text-xs text-muted-foreground">
                                {item.metrics_summary.views} views · {item.metrics_summary.conversions} conversions ·{' '}
                                {item.metrics_summary.conversion_rate}%
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                            {item.recommendation_count} {(t.recommendations ?? 'recs').toLowerCase()}
                        </p>
                        {item.has_ai_advice && <Sparkles className="mt-1 inline h-3 w-3 text-orange-400" />}
                    </div>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </p>
                </button>
            ))}
        </div>
    );
}
