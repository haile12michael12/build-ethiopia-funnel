import { Button } from '@/components/ui/button';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

interface FunnelSupportChatProps {
    funnelId: number;
    variantId?: number | null;
}

interface ChatMessage {
    role: 'assistant' | 'user';
    content: string;
    source?: 'ai' | 'page_content';
}

interface ChatResponse {
    answer: string;
    source: 'ai' | 'page_content';
}

function isChatResponse(value: unknown): value is ChatResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'answer' in value &&
        typeof value.answer === 'string' &&
        'source' in value &&
        (value.source === 'ai' || value.source === 'page_content')
    );
}

export function FunnelSupportChat({ funnelId, variantId }: FunnelSupportChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Hi! Ask me a question about this page.' }]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const sendQuestion = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedQuestion = question.trim();
        if (!trimmedQuestion || isSending) return;

        const previousQuestions = messages
            .filter((message) => message.role === 'user')
            .map((message) => message.content)
            .slice(-5);
        setMessages((current) => [...current, { role: 'user', content: trimmedQuestion }]);
        setQuestion('');
        setError(null);
        setIsSending(true);

        try {
            const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(`/funnels/${funnelId}/support-chat`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                },
                body: JSON.stringify({
                    question: trimmedQuestion,
                    previous_questions: previousQuestions,
                    variant_id: variantId,
                }),
            });

            if (!response.ok) throw new Error('The support assistant is temporarily unavailable.');

            const result: unknown = await response.json();
            if (!isChatResponse(result)) {
                throw new Error('The support assistant returned an invalid response.');
            }

            setMessages((current) => [...current, { role: 'assistant', content: result.answer, source: result.source }]);
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'The support assistant is temporarily unavailable.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
            {isOpen && (
                <section
                    id="funnel-support-panel"
                    aria-label="Funnel support chat"
                    className="flex max-h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setIsOpen(false);
                    }}
                >
                    <header className="flex items-center justify-between bg-gray-950 px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                            <Bot aria-hidden="true" className="h-5 w-5 text-orange-400" />
                            <div>
                                <h2 className="text-sm font-semibold">Page support</h2>
                                <p className="text-xs text-gray-300">Ask about the information here</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Close support chat"
                            className="text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </header>

                    <div className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4" aria-live="polite" aria-relevant="additions">
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                    message.role === 'user' ? 'ml-auto bg-orange-500 text-white' : 'bg-white text-gray-800 shadow-sm'
                                }`}
                            >
                                <p className="break-words whitespace-pre-wrap">{message.content}</p>
                                {message.source === 'page_content' && <p className="mt-1 text-xs text-gray-500">Page-content fallback</p>}
                            </div>
                        ))}
                        {isSending && (
                            <p className="text-sm text-gray-500" role="status">
                                Thinking…
                            </p>
                        )}
                        {error && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                                {error}
                            </p>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <p className="border-t border-gray-100 px-4 pt-2 text-xs text-gray-500">
                        AI responses use this page’s content. Don’t share sensitive information.
                    </p>
                    <form onSubmit={sendQuestion} className="flex items-center gap-2 p-3">
                        <label className="sr-only" htmlFor="funnel-support-question">
                            Ask a question
                        </label>
                        <input
                            id="funnel-support-question"
                            type="text"
                            maxLength={1000}
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder="Type your question…"
                            disabled={isSending}
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 sm:text-sm"
                        />
                        <Button type="submit" size="icon" aria-label="Send question" disabled={isSending || !question.trim()}>
                            <Send aria-hidden="true" />
                        </Button>
                    </form>
                </section>
            )}

            <Button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? 'funnel-support-panel' : undefined}
                aria-label={isOpen ? 'Close page support chat' : 'Open page support chat'}
                className="h-12 rounded-full px-5 shadow-lg"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
                <span className="sr-only">{isOpen ? 'Close support chat' : 'Chat with us'}</span>
            </Button>
        </div>
    );
}
