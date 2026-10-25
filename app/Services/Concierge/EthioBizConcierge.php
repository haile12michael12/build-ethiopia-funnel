<?php

namespace App\Services\Concierge;

use App\Contracts\ConciergeAdvisor;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class EthioBizConcierge
{
    public function __construct(
        private readonly ConciergeAdvisor $advisor,
        private readonly ConciergeKnowledgeBase $knowledgeBase,
    ) {}

    /**
     * @param  array<int, string>  $previousQuestions
     * @return array{answer: string, source: 'ai'|'knowledge', suggestions: list<array{label: string, url: string}>}
     */
    public function reply(string $question, array $previousQuestions = [], ?string $locale = null): array
    {
        $locale ??= app()->getLocale();
        $knowledge = $this->knowledgeBase->snapshot($locale);
        $topic = $this->detectTopic($question);
        $source = 'knowledge';

        try {
            $result = $this->advisor->answer([
                'knowledge' => $knowledge,
                'question' => $question,
                'previous_questions' => array_slice($previousQuestions, -4),
                'locale' => $locale,
            ]);

            if (! is_string($result['answer'] ?? null) || trim($result['answer']) === '') {
                throw new Exception('The AI provider returned an invalid concierge answer.');
            }

            $answer = mb_substr(trim(strip_tags($result['answer'])), 0, 1500);
            $source = 'ai';
        } catch (Exception $exception) {
            Log::info('Concierge fell back to the deterministic knowledge answer.', [
                'exception' => $exception::class,
            ]);
            $answer = $this->knowledgeFallback($knowledge, $topic, $locale);
        }

        return [
            'answer' => $answer,
            'source' => $source,
            'suggestions' => $this->suggestions($knowledge, $topic),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function greeting(?string $locale = null): array
    {
        $locale ??= app()->getLocale();
        $knowledge = $this->knowledgeBase->snapshot($locale);

        return [
            'answer' => $this->knowledgeFallback($knowledge, null, $locale),
            'source' => 'knowledge',
            'suggestions' => $this->suggestions($knowledge, null),
        ];
    }

    private function detectTopic(string $question): ?string
    {
        $normalized = mb_strtolower($question);
        $topics = [
            'pricing' => ['price', 'cost', 'how much', 'quote', 'estimate', 'budget', 'fee', 'rate', 'woga', 'ዋጋ', 'እውዕል', 'ወጪ', 'ግምት'],
            'products' => ['product', 'template', 'buy', 'shop', 'store', 'marketplace', 'starter kit', 'ሳንዳቅ', 'ምርት', 'ገበያ'],
            'portfolio' => ['portfolio', 'project you', 'case study', 'previous work', 'sample work', 'example project', 'ፕሮጀክት', 'ስራ', 'ምሳሌ'],
            'automation' => ['automation', 'n8n', 'workflow', 'integrate', 'integration', 'crm', 'lead', 'አውቶሜሽን', 'ስራ አሰራር'],
            'ai' => ['ai', 'chatbot', 'gpt', 'llm', 'machine learning', 'assistant', 'ቻትቦት', 'አርቴፊሻል'],
            'web' => ['website', 'web site', 'web app', 'web application', 'e-commerce', 'ecommerce', 'online store', 'landing page', 'ድህረ ገጽ', 'ገበያ'],
            'contact' => ['contact', 'talk', 'call', 'consult', 'meeting', 'telegram', 'whatsapp', 'hire', 'get in touch', 'ግንኙነት', 'ምክክር', 'እንጠራ'],
            'audit' => ['audit', 'assessment', 'growth', 'review my', 'ግምገማ', 'ኦዲት'],
            'services' => ['service', 'offer', 'do you build', 'develop', 'solutions', 'አገልግሎት', 'ሰራጭ'],
        ];

        foreach ($topics as $topic => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($normalized, $needle)) {
                    return $topic;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $knowledge
     */
    private function knowledgeFallback(array $knowledge, ?string $topic, string $locale): string
    {
        $am = $locale === 'am';
        $services = collect($knowledge['services'] ?? [])->take(4);
        $products = collect($knowledge['products'] ?? []);

        if ($services->isEmpty() && $products->isEmpty()) {
            return $am
                ? 'አገልግሎቶቻችንን ለማየት የአገልግሎቶች ገጻችንን ይመልከቱ፤ ለማንኛውም ጥያቄ የመጀመሪያ ፕሮጀክት ቅጹን ይሙሉ ወይም ነጻ የዕድገት ግምገማ ይጠይቁ።'
                : 'I could not load the service catalog right now. Please browse our services page, start a project request, or book the free growth audit for a personal answer.';
        }

        return match ($topic) {
            'pricing' => $am
                ? 'የዋጋ ግምት በፕሮጀክቱ ክልኩላ ላይ ይመሰረታል። በነጻ የዕድገት ግምገማ ወይም የመጀመሪያ ፕሮጀክት ቅጽ በመሙላት ትክክለኛ ግምት ማግኘት ይችላሉ።'
                : 'Pricing depends on your project scope, so I never guess numbers. The free growth audit or the start-a-project form is the fastest way to get a real estimate from the owner.',
            'products' => $this->listAnswer($products->take(3), 'name', 'price_display', $am, 'products'),
            'portfolio' => $am
                ? 'የተጠናቀቁ ፕሮጀክቶቻችንን በፖርትፎሊዎ ገጽ ላይ ማየት ይችላሉ፤ የተለየ ዕቅድ ካለዎት በቀጥታ ይጠይቁን።'
                : 'You can review completed work on the portfolio page. If you have a similar goal in mind, tell us the details and we will match you to the closest case study.',
            'automation' => $am
                ? 'የንግድ አውቶሜሽን፣ ኤን8ኤን ውህደቶች እና ሲአርኤም መፍትሔዎችን እንሰራለን። ምርጫዎችን ለማየት የአውቶሜሽን አገልግሎት ይመልከቱ ወይም ቅጹን ይሙሉ።'
                : 'We build business automation, n8n workflows, and CRM integrations. Check the automation service details or send a project request describing your workflow.',
            'ai' => $am
                ? 'ኤአ ማመልከቻዎችን፣ ቻትቦቶችን እና የኤልኤልኤም ስራዎችን እናዘጋጃለን። የፕሮጀክት ሀሳብዎን በቅጹ ይላኩ።'
                : 'We develop AI applications, chatbots, and LLM workflows. Share your use case through the start-a-project form and we will confirm feasibility honestly.',
            'web' => $am
                ? 'ድህረ ገጾችን፣ የድር መተግበሪያዎችን እና ኢ-ኮሜርስ መድረኮችን እንሠራለን። ፍላጎትዎን በግምገማ ወይም በፕሮጀክት ቅጽ ይግለጹ።'
                : 'We build websites, custom web applications, and e-commerce platforms. Describe your goal in the growth audit or project form for grounded advice.',
            'contact' => $am
                ? 'ለማነጋገር የመጀመሪያ ፕሮጀክት ቅጽ፣ የመገናኛ ገጽ ወይም ነጻ የዕድገት ግምገማ ይጠቀሙ።'
                : 'The fastest ways to reach us are the start-a-project form, the contact page, or the free growth audit. Tell us your goal and the owner responds personally.',
            'audit' => $am
                ? 'ነጻ የዕድገት ግምገማችን ስለንግድዎ ሁኔታ ጠቃሚ ምክር ይሰጣል፤ አሁን መጀመር ይችላሉ።'
                : 'Our free business growth audit turns a few answers into a practical starting-point report. You can begin it any time from the audit page.',
            'services' => $this->listAnswer($services, 'title', 'summary', $am, 'services'),
            default => $am
                ? 'የሶፍትዌር ልማት፣ የአርቴፊሻል ኢንተለጀንስ መፍትሔዎች፣ አውቶሜሽን እና ዲጂታል ምርቶችን እናቀርባለን። በተለየ ጥያቄ ካለዎት የነጻ ግምገማ ይጠይቁ።'
                : 'We build software, AI solutions, automation, and digital products. The free growth audit is the best next step for a tailored answer.',
        };
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     */
    private function listAnswer(Collection $items, string $titleKey, string $detailKey, bool $am, string $kind): string
    {
        if ($items->isEmpty()) {
            return $am
                ? 'አሁን ለዚህ መልስ የሚሆን የተለጠፈ መረጃ የለም፤ እባክዎ የፕሮጀክት ቅጹን ይሙሉ።'
                : 'Nothing published matches that request right now. Please send a project request and the owner will follow up personally.';
        }

        $lines = $items
            ->map(fn (array $item): string => '- '.$item[$titleKey].(filled($item[$detailKey] ?? null)
                ? ' ('.mb_substr((string) $item[$detailKey], 0, 120).')'
                : ''))
            ->implode("\n");

        $lead = $am
            ? ($kind === 'products' ? 'እንጂ ዛሬ የተለጠፉ ምርቶች፡' : 'ዋና ዋና አገልግሎቶቻችን፡')
            : ($kind === 'products' ? 'Here are the products published today:' : 'Our main services are:');

        return $lead."\n".$lines;
    }

    /**
     * Server-generated links keep suggestions grounded in real catalog records.
     *
     * @param  array<string, mixed>  $knowledge
     * @return list<array{label: string, url: string}>
     */
    private function suggestions(array $knowledge, ?string $topic): array
    {
        $links = $knowledge['links'] ?? [];
        $suggestions = [];

        if ($topic === 'products') {
            foreach (collect($knowledge['products'] ?? [])->take(2) as $product) {
                $suggestions[] = ['label' => (string) $product['name'], 'url' => (string) $product['url']];
            }
        }

        if ($topic === 'portfolio') {
            foreach (collect($knowledge['portfolio'] ?? [])->take(2) as $project) {
                $suggestions[] = ['label' => (string) $project['title'], 'url' => (string) $project['url']];
            }
        }

        if ($topic === 'pricing' || $topic === 'audit') {
            $suggestions[] = ['label' => 'Free Business Growth Audit', 'url' => (string) ($links['business_audit'] ?? '/business-growth-audit')];
        }

        $suggestions[] = ['label' => 'Start a Project', 'url' => (string) ($links['start_project'] ?? '/start-project')];

        $channels = $knowledge['contact_channels'] ?? [];
        if (isset($channels['telegram'])) {
            $suggestions[] = ['label' => 'Telegram', 'url' => (string) $channels['telegram']];
        } elseif (isset($channels['whatsapp'])) {
            $suggestions[] = ['label' => 'WhatsApp', 'url' => (string) $channels['whatsapp']];
        }

        return collect($suggestions)
            ->unique(fn (array $suggestion): string => $suggestion['url'])
            ->take(4)
            ->values()
            ->all();
    }
}
