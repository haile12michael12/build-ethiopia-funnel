<?php

namespace App\Http\Controllers;

use App\Actions\Leads\CaptureLead;
use App\Http\Requests\StoreClientProjectRequest;
use App\Models\ClientAcquisitionSettings;
use App\Models\Contact;
use App\Models\Funnel;
use App\Models\Project;
use App\Models\SiteContent;
use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\FunnelVariantResolver;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ClientAcquisitionController extends Controller
{
    public function contact(): Response
    {
        return Inertia::render('contact');
    }

    public function show(Request $request, ClientAcquisitionConfiguration $configuration, FunnelVariantResolver $variantResolver): Response
    {
        $owner = $this->configuredOwner();
        $settings = $configuration->forOwner($owner->id);
        $variant = null;
        $analyticsFunnel = $this->publishedAnalyticsFunnel($owner, $settings['analytics_funnel_id']);

        if ($analyticsFunnel) {
            $assignment = $variantResolver->resolve($analyticsFunnel, $request);
            $candidateCopy = $this->variantCopy($assignment['variant']?->content ?? []);
            $variant = $assignment['variant'] && ($candidateCopy['headline'] || $candidateCopy['call_to_action'])
                ? $assignment['variant']
                : null;
            Cookie::queue(cookie(
                $assignment['cookie'],
                $variant ? $assignment['value'] : 'control',
                60 * 24 * 30,
                '/',
                null,
                false,
                false,
                false,
                'lax',
            ));
        }

        return Inertia::render('client-acquisition/index', [
            'services' => SiteContent::query()
                ->where('user_id', $owner->id)
                ->where('type', 'service')
                ->published()
                ->ordered()
                ->get(['id', 'title_en', 'title_am', 'summary_en', 'summary_am', 'image', 'slug']),
            'projects' => Project::query()
                ->where('user_id', $owner->id)
                ->published()
                ->featured()
                ->ordered()
                ->take(3)
                ->get(['id', 'title_en', 'title_am', 'slug', 'summary_en', 'summary_am', 'cover_image', 'technologies']),
            'testimonials' => SiteContent::query()
                ->where('type', 'testimonial')
                ->published()
                ->ordered()
                ->take(3)
                ->get(['id', 'title_en', 'title_am', 'summary_en', 'summary_am', 'person_name_en', 'person_name_am', 'person_role_en', 'person_role_am', 'company_en', 'company_am']),
            'settings' => [
                'services' => $settings['services'],
                'budgets' => $settings['budgets'],
                'timelines' => $settings['timelines'],
                'response_time_hours' => $settings['response_time_hours'],
                'response_email' => $settings['response_email'],
                'whatsapp_url' => $settings['whatsapp_url'],
                'meeting_url' => $settings['meeting_url'],
                'analytics_funnel_id' => $analyticsFunnel?->id,
            ],
            'experiment' => [
                'variant_id' => $variant?->id,
                ...$this->variantCopy($variant?->content ?? []),
            ],
        ]);
    }

    public function store(
        StoreClientProjectRequest $request,
        CaptureLead $captureLead,
        ClientAcquisitionConfiguration $configuration,
    ): RedirectResponse {
        $owner = $this->configuredOwner();
        $settings = $configuration->forOwner($owner->id);
        $analyticsFunnel = $this->publishedAnalyticsFunnel($owner, $settings['analytics_funnel_id']);
        $variantId = $request->validated('variant_id');

        if ($analyticsFunnel) {
            abort_unless(
                (string) $request->cookie('of_variant_'.$analyticsFunnel->id, 'control') === ($variantId === null ? 'control' : (string) $variantId),
                422,
                'The submitted experiment variant does not match this visitor’s assigned variant.',
            );

            if ($variantId !== null) {
                $analyticsFunnel->variants()
                    ->where('is_active', true)
                    ->findOrFail($variantId);
            }
        } elseif ($variantId !== null) {
            abort(422, 'An experiment variant requires a linked analytics funnel.');
        }

        $result = $captureLead->handleClientProject(
            $owner,
            $request->validated(),
            $request,
            $settings,
            $analyticsFunnel,
            $variantId,
        );

        return redirect()->to(URL::temporarySignedRoute(
            'client-acquisition.thank-you',
            now()->addMinutes(30),
            ['contact' => $result['contact']->id],
        ));
    }

    public function thankYou(
        Request $request,
        Contact $contact,
        ClientAcquisitionConfiguration $configuration,
    ): Response {
        $owner = $this->configuredOwner();
        abort_unless($contact->user_id === $owner->id && $contact->source === 'client_acquisition', 404);
        $settings = $configuration->forOwner($owner->id);
        $project = $contact->client_project ?? [];

        return Inertia::render('client-acquisition/thank-you', [
            'request' => [
                'name' => $contact->name,
                'email' => $contact->email,
                'business_name' => $project['business_name'] ?? null,
                'market' => $project['market'] ?? null,
                'country' => $project['country'] ?? null,
                'service_interests' => $project['service_interests'] ?? [],
                'project_description' => $project['project_description'] ?? null,
                'budget' => $project['budget'] ?? null,
                'timeline' => $project['timeline'] ?? null,
            ],
            'labels' => [
                'services' => collect($settings['services'])->mapWithKeys(fn (array $option) => [
                    $option['key'] => app()->getLocale() === 'am' ? ($option['label_am'] ?: $option['label_en']) : $option['label_en'],
                ]),
                'budgets' => collect($settings['budgets'])->mapWithKeys(fn (array $option) => [
                    $option['key'] => app()->getLocale() === 'am' ? ($option['label_am'] ?: $option['label_en']) : $option['label_en'],
                ]),
                'timelines' => collect($settings['timelines'])->mapWithKeys(fn (array $option) => [
                    $option['key'] => app()->getLocale() === 'am' ? ($option['label_am'] ?: $option['label_en']) : $option['label_en'],
                ]),
            ],
            'nextSteps' => [
                'response_time_hours' => $settings['response_time_hours'],
                'response_email' => $settings['response_email'],
                'whatsapp_url' => $settings['whatsapp_url'],
                'meeting_url' => $settings['meeting_url'],
            ],
        ]);
    }

    private function configuredOwner(): User
    {
        $owner = User::configuredLeadOwner();
        abort_unless($owner, 503, 'Client acquisition is not configured. Set ADMIN_EMAIL or BUSINESS_AUDIT_OWNER_ID to the business owner account.');

        return $owner;
    }

    private function publishedAnalyticsFunnel(User $owner, ?int $funnelId): ?Funnel
    {
        if (! $funnelId) {
            return null;
        }

        return $owner->funnels()
            ->where('is_published', true)
            ->find($funnelId);
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array{headline: string|null, call_to_action: string|null}
     */
    private function variantCopy(array $content): array
    {
        $headline = null;
        $callToAction = null;

        foreach (array_slice(is_array($content['sections'] ?? null) ? $content['sections'] : [], 0, 12) as $section) {
            foreach (array_slice(is_array($section['columns'] ?? null) ? $section['columns'] : [], 0, 4) as $column) {
                foreach (array_slice(is_array($column['blocks'] ?? null) ? $column['blocks'] : [], 0, 30) as $block) {
                    if (! is_array($block) || ! is_array($block['content'] ?? null)) {
                        continue;
                    }

                    $blockContent = $block['content'];
                    if ($headline === null && ($block['type'] ?? null) === 'text') {
                        $html = is_string($blockContent['html'] ?? null) ? $blockContent['html'] : '';
                        if (preg_match('/<h[12]\b[^>]*>(.*?)<\/h[12]>/is', $html, $matches)) {
                            $headline = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5));
                        }
                    }

                    if ($callToAction === null && ($block['type'] ?? null) === 'button') {
                        $label = $blockContent['label'] ?? $blockContent['text'] ?? null;
                        if (is_string($label) && trim(strip_tags($label)) !== '') {
                            $callToAction = trim(strip_tags($label));
                        }
                    }
                }
            }
        }

        return [
            'headline' => $headline !== '' ? $headline : null,
            'call_to_action' => $callToAction !== '' ? $callToAction : null,
        ];
    }
}
