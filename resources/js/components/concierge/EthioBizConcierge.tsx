import { Button } from '@/components/ui/button';
import { siteSessionId } from '@/lib/site-session';
import { type ConciergeTranslations, type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Bot, Languages, MessageCircle, Send, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

interface ConciergeMessage {
    role: 'assistant' | 'user';
    content: string;
    source?: 'ai' | 'knowledge';
    links?: ConciergeSuggestion[];
}

interface ConciergeSuggestion {
    label: string;
    url: string;
}

interface ConciergeReply {
    answer: string;
    source: 'ai' | 'knowledge';
    suggestions: ConciergeSuggestion[];
}

function isConciergeReply(value: unknown): value is ConciergeReply {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as ConciergeReply).answer === 'string' &&
        ((value as ConciergeReply).source === 'ai' || (value as ConciergeReply).source === 'knowledge') &&
        Array.isArray((value as ConciergeReply).suggestions)
    );
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function postJson(url: string, payload: Record<string, unknown>): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(payload),
    });
}

async function recordSiteEvent(event: string, locale: string, extra: Record<string, string> = {}): Promise<void> {
    try {
        await postJson('/site-events', { event, session_id: siteSessionId(), locale, ...extra });
    } catch {
        // Analytics are best-effort and must never break the UI.
    }
}

const FALLBACK_TRANSLATIONS: ConciergeTranslations = {
    title: 'EthioBiz Concierge',
    subtitle: 'English / አማርኛ answers about our services',
    open: 'Chat with the concierge',
    close: 'Close concierge chat',
    placeholder: 'Ask about services, pricing, or products…',
    send: 'Send question',
    sending: 'Thinking…',
    greeting: 'Hi! I can explain our services, point you to digital products, or guide you through the free business growth audit.',
    ai_source: 'AI answer from verified business info',
    knowledge_source: 'Answer from our published service and product catalog',
    disclaimer: 'Answers use our published services and products only. Please do not share sensitive information here.',
    error: 'The concierge is temporarily unavailable. You can still use the contact form or request a free audit.',
    unsupported: 'For commitments, custom pricing, or payment questions, please contact the owner directly.',
    quick_topics: [],
    language: { en: 'English', am: 'አማርኛ' },
};

export function EthioBizConcierge() {
    const { locale, translations } = usePage<SharedData>().props;
    const t = translations?.concierge ?? FALLBACK_TRANSLATIONS;
    const currentLocale = locale === 'am' ? 'am' : 'en';

    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ConciergeMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'assistant', content: t.greeting }]);
            recordSiteEvent('concierge_opened', currentLocale);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [isOpen, messages.length, currentLocale, t.greeting]);

    const ask = async (rawQuestion: string) => {
        const trimmed = rawQuestion.trim();
        if (!trimmed || isSending) return;

        const previousQuestions = messages
            .filter((message) => message.role === 'user')
            .map((message) => message.content)
            .slice(-4);

        setMessages((current) => [...current, { role: 'user', content: trimmed }]);
        setQuestion('');
        setError(null);
        setIsSending(true);

        try {
            const response = await postJson('/concierge/ask', {
                question: trimmed,
                previous_questions: previousQuestions,
                locale: currentLocale,
                session_id: siteSessionId(),
            });

            if (!response.ok) throw new Error('concierge-unavailable');

            const result: unknown = await response.json();
            if (!isConciergeReply(result)) throw new Error('concierge-invalid-response');

            setMessages((current) => [...current, { role: 'assistant', content: result.answer, source: result.source, links: result.suggestions }]);
        } catch {
            setError(t.error);
        } finally {
            setIsSending(false);
        }
    };

    const sendQuestion = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void ask(question);
    };

    const switchLocale = (nextLocale: 'en' | 'am') => {
        if (nextLocale === currentLocale) return;
        recordSiteEvent('concierge_language_selected', nextLocale, { topic: nextLocale });
        router.post(route('locale.update', { locale: nextLocale }), {}, { preserveScroll: true });
    };

    const handleSuggestionClick = (suggestion: ConciergeSuggestion) => {
        if (suggestion.url.startsWith('/marketplace/')) {
            recordSiteEvent('product_recommendation_clicked', currentLocale, { topic: 'products' });
        }
    };

    const showQuickTopics = messages.length <= 1 && t.quick_topics.length > 0;

    return (
        <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
            {isOpen && (
                <section
                    id="concierge-panel"
                    aria-label={t.title}
                    className="flex max-h-[min(36rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setIsOpen(false);
                    }}
                >
                    <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <Bot aria-hidden="true" className="h-5 w-5" />
                            <div>
                                <h2 className="text-sm font-semibold">{t.title}</h2>
                                <p className="text-xs opacity-80">{t.subtitle}</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t.close}
                            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                            onClick={() => setIsOpen(false)}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </header>

                    <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-4 py-2">
                        <Languages aria-hidden="true" className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                        {(['en', 'am'] as const).map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => switchLocale(code)}
                                aria-pressed={currentLocale === code}
                                className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                                    currentLocale === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t.language[code]}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4" aria-live="polite" aria-relevant="additions">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className="space-y-1">
                                <div
                                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                        message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-card text-card-foreground shadow-sm'
                                    }`}
                                >
                                    <p className="break-words whitespace-pre-wrap">{message.content}</p>
                                    {message.source && (
                                        <p className="mt-1 text-xs opacity-70">{message.source === 'ai' ? t.ai_source : t.knowledge_source}</p>
                                    )}
                                    {message.links && message.links.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {message.links.map((link) => (
                                                <li key={link.url + link.label}>
                                                    <a
                                                        href={link.url}
                                                        onClick={() => handleSuggestionClick(link)}
                                                        className="break-words text-xs font-semibold text-primary underline underline-offset-2"
                                                    >
                                                        {link.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <p className="text-sm text-muted-foreground" role="status">
                                {t.sending}
                            </p>
                        )}
                        {error && (
                            <div className="space-y-2">
                                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                                <p className="text-xs text-muted-foreground">{t.unsupported}</p>
                            </div>
                        )}
                        {showQuickTopics && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {t.quick_topics.slice(0, 6).map((topic) => (
                                    <button
                                        key={topic.question}
                                        type="button"
                                        onClick={() => void ask(topic.question)}
                                        className="rounded-full border border-primary/40 bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-primary/10"
                                    >
                                        {topic.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <p className="border-t border-border px-4 pt-2 text-[11px] leading-snug text-muted-foreground">{t.disclaimer}</p>

                    <form onSubmit={sendQuestion} className="flex items-center gap-2 p-3">
                        <label className="sr-only" htmlFor="concierge-question">
                            {t.placeholder}
                        </label>
                        <input
                            id="concierge-question"
                            type="text"
                            maxLength={500}
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder={t.placeholder}
                            disabled={isSending}
                            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:text-sm"
                        />
                        <Button type="submit" size="icon" aria-label={t.send} disabled={isSending || !question.trim()}>
                            <Send aria-hidden="true" />
                        </Button>
                    </form>
                </section>
            )}

            <Button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? 'concierge-panel' : undefined}
                aria-label={isOpen ? t.close : t.open}
                className="h-12 rounded-full px-5 shadow-lg"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
                <span className="sr-only">{isOpen ? t.close : t.open}</span>
            </Button>
        </div>
    );
}

export default EthioBizConcierge;
