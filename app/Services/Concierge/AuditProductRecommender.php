<?php

namespace App\Services\Concierge;

use App\Models\MarketplaceTemplate;

class AuditProductRecommender
{
    /**
     * Maps audit service interests to keywords in real published catalog records only.
     *
     * @var array<string, list<string>>
     */
    private const SERVICE_KEYWORDS = [
        'website' => ['website', 'landing', 'funnel', 'page'],
        'marketing' => ['marketing', 'email', 'lead', 'campaign'],
        'branding' => ['brand', 'design', 'template'],
        'automation' => ['automation', 'workflow', 'n8n', 'integration', 'crm'],
        'ecommerce' => ['ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'product'],
        'ai_chatbot' => ['ai', 'chatbot', 'bot', 'assistant', 'gpt'],
        'custom_web_app' => ['app', 'saas', 'starter', 'dashboard', 'portal', 'crm'],
    ];

    /**
     * @param  list<string>  $serviceInterests
     * @return list<array{name: string, description: string, price_display: string, amount_minor: int, currency: string, url: string}>
     */
    public function forServices(array $serviceInterests): array
    {
        $keywords = collect($serviceInterests)
            ->flatMap(fn (string $service): array => self::SERVICE_KEYWORDS[$service] ?? [])
            ->unique()
            ->values();

        if ($keywords->isEmpty()) {
            return [];
        }

        $templates = MarketplaceTemplate::query()
            ->businessStore()
            ->where('status', 'published')
            ->where('amount_minor', '>', 0)
            ->orderBy('name')
            ->limit(40)
            ->get(['id', 'slug', 'name', 'description', 'category', 'amount_minor', 'currency']);

        return $templates
            ->map(function (MarketplaceTemplate $template) use ($keywords): ?array {
                $haystack = mb_strtolower($template->name.' '.$template->category.' '.$template->description);
                $matched = $keywords->first(fn (string $keyword): bool => str_contains($haystack, $keyword));

                if ($matched === null) {
                    return null;
                }

                return [
                    'name' => $template->name,
                    'description' => mb_substr((string) $template->description, 0, 200),
                    'price_display' => number_format($template->amount_minor / 100, 2).' '.$template->currency,
                    'amount_minor' => (int) $template->amount_minor,
                    'currency' => (string) $template->currency,
                    'url' => '/marketplace/'.$template->slug,
                    'template_id' => $template->id,
                ];
            })
            ->filter()
            ->take(3)
            ->values()
            ->all();
    }
}
