<?php

namespace App\Services\Concierge;

use App\Models\MarketplaceTemplate;
use App\Models\Project;
use App\Models\SiteContent;
use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;

class ConciergeKnowledgeBase
{
    public function __construct(private readonly ClientAcquisitionConfiguration $configuration) {}

    /**
     * Verified, public business facts only. Prices and availability come from live records.
     *
     * @return array<string, mixed>
     */
    public function snapshot(?string $locale = null): array
    {
        $locale ??= app()->getLocale();

        return array_filter([
            'business_name' => config('app.name'),
            'intro' => $this->intro($locale),
            'services' => $this->services($locale),
            'products' => $this->products(),
            'portfolio' => $this->portfolio($locale),
            'links' => $this->links(),
            'contact_channels' => array_filter($this->contactChannels()),
        ], fn (mixed $value): bool => $value !== null && $value !== [] && $value !== '');
    }

    private function intro(string $locale): ?string
    {
        $settings = $this->ownerSettings();
        $intro = $locale === 'am'
            ? ($settings['concierge_intro_am'] ?: $settings['concierge_intro_en'])
            : $settings['concierge_intro_en'];

        return filled($intro) ? mb_substr((string) $intro, 0, 600) : null;
    }

    /**
     * @return list<array<string, string>>
     */
    private function services(string $locale): array
    {
        $ownerId = User::configuredBusinessOwner()?->id ?? 0;
        $published = SiteContent::query()
            ->where('user_id', $ownerId)
            ->where('type', 'service')
            ->published()
            ->ordered()
            ->limit(10)
            ->get();

        if ($published->isNotEmpty()) {
            return $published->map(fn (SiteContent $service): array => array_filter([
                'title' => (string) $service->localized('title', $locale),
                'summary' => filled($service->localized('summary', $locale))
                    ? mb_substr((string) $service->localized('summary', $locale), 0, 300)
                    : null,
                'url' => '/services#'.$service->slug,
            ]))->values()->all();
        }

        $key = $locale === 'am' ? 'label_am' : 'label_en';

        return collect($this->ownerSettings()['services'] ?? [])
            ->take(10)
            ->map(fn (array $service): array => [
                'title' => (string) ($service[$key] ?? $service['label_en'] ?? ''),
                'url' => '/services',
            ])
            ->filter(fn (array $service): bool => $service['title'] !== '')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function products(): array
    {
        return MarketplaceTemplate::query()
            ->businessStore()
            ->where('status', 'published')
            ->orderBy('name')
            ->limit(12)
            ->get(['id', 'slug', 'name', 'description', 'category', 'amount_minor', 'currency', 'preview_images'])
            ->map(fn (MarketplaceTemplate $product): array => [
                'name' => $product->name,
                'description' => mb_substr((string) $product->description, 0, 240),
                'category' => $product->category,
                'price_display' => (int) $product->amount_minor === 0
                    ? 'Free'
                    : number_format($product->amount_minor / 100, 2).' '.$product->currency,
                'amount_minor' => (int) $product->amount_minor,
                'currency' => (string) $product->currency,
                'url' => '/marketplace/'.$product->slug,
                'has_image' => isset($product->preview_images[0]),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, string>>
     */
    private function portfolio(string $locale): array
    {
        $ownerId = User::configuredBusinessOwner()?->id ?? 0;

        return Project::query()
            ->where('user_id', $ownerId)
            ->published()
            ->featured()
            ->ordered()
            ->limit(6)
            ->get(['slug', 'title_en', 'title_am'])
            ->map(fn (Project $project): array => [
                'title' => (string) ($locale === 'am' && filled($project->title_am) ? $project->title_am : $project->title_en),
                'url' => '/portfolio/'.$project->slug,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    private function links(): array
    {
        return [
            'services' => url('/services'),
            'products' => url('/marketplace'),
            'portfolio' => url('/portfolio'),
            'contact' => url('/contact'),
            'start_project' => url('/start-project'),
            'business_audit' => url('/business-growth-audit'),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function contactChannels(): array
    {
        $settings = $this->ownerSettings();

        return array_filter([
            'email' => $settings['response_email'] ?? null,
            'whatsapp' => $settings['whatsapp_url'] ?? null,
            'meeting' => $settings['meeting_url'] ?? null,
            'telegram' => $settings['telegram_url'] ?? null,
        ], fn (?string $value): bool => filled($value));
    }

    /**
     * @return array<string, mixed>
     */
    private function ownerSettings(): array
    {
        return $this->configuration->forOwner(User::configuredBusinessOwner()?->id);
    }
}
