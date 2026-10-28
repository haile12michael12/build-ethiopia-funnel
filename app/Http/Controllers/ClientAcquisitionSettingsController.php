<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\LeadScoringService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClientAcquisitionSettingsController extends Controller
{
    public function edit(Request $request, ClientAcquisitionConfiguration $configuration): Response
    {
        $this->authorizeOwner($request);

        $settings = $configuration->forOwner($request->user()->id);
        $funnels = $request->user()->funnels()
            ->where('is_published', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('client-acquisition/settings', [
            'settings' => $settings,
            'funnels' => $funnels,
            'analyticsFunnelUnavailable' => $settings['analytics_funnel_id'] !== null
                && ! $funnels->contains('id', $settings['analytics_funnel_id']),
        ]);
    }

    public function update(Request $request, ClientAcquisitionConfiguration $configuration, LeadScoringService $scoring): RedirectResponse
    {
        $this->authorizeOwner($request);
        $previous = $configuration->forOwner($request->user()->id);
        $validated = $request->validate([
            'services' => ['required', 'array', 'min:1', 'max:20'],
            'services.*.key' => ['required', 'string', 'alpha_dash', 'max:40'],
            'services.*.label_en' => ['required', 'string', 'max:120'],
            'services.*.label_am' => ['nullable', 'string', 'max:120'],
            'budgets' => ['required', 'array', 'min:2', 'max:30'],
            'budgets.*.key' => ['required', 'string', 'alpha_dash', 'max:40'],
            'budgets.*.currency' => ['required', 'in:ETB,USD'],
            'budgets.*.label_en' => ['required', 'string', 'max:120'],
            'budgets.*.label_am' => ['nullable', 'string', 'max:120'],
            'budgets.*.score' => ['required', 'integer', 'min:0', 'max:100'],
            'timelines' => ['required', 'array', 'min:1', 'max:20'],
            'timelines.*.key' => ['required', 'string', 'alpha_dash', 'max:40'],
            'timelines.*.label_en' => ['required', 'string', 'max:120'],
            'timelines.*.label_am' => ['nullable', 'string', 'max:120'],
            'timelines.*.score' => ['required', 'integer', 'min:0', 'max:100'],
            'scoring_weights' => ['required', 'array'],
            'scoring_weights.service_fit' => ['required', 'integer', 'min:0', 'max:25'],
            'scoring_weights.project_clarity' => ['required', 'integer', 'min:0', 'max:15'],
            'scoring_weights.budget' => ['required', 'integer', 'min:0', 'max:25'],
            'scoring_weights.timeline' => ['required', 'integer', 'min:0', 'max:15'],
            'scoring_weights.scope_completeness' => ['required', 'integer', 'min:0', 'max:10'],
            'scoring_weights.contact_completeness' => ['required', 'integer', 'min:0', 'max:10'],
            'follow_up_templates' => ['required', 'array', 'min:1', 'max:20'],
            'follow_up_templates.*.key' => ['required', 'string', 'alpha_dash', 'max:40'],
            'follow_up_templates.*.label_en' => ['required', 'string', 'max:120'],
            'follow_up_templates.*.label_am' => ['nullable', 'string', 'max:120'],
            'follow_up_templates.*.body_en' => ['required', 'string', 'max:3000'],
            'follow_up_templates.*.body_am' => ['nullable', 'string', 'max:3000'],
            'follow_up_templates.*.kind' => ['required', 'in:transactional,promotional'],
            'qualified_score' => ['required', 'integer', 'min:0', 'max:100'],
            'high_priority_score' => ['required', 'integer', 'min:0', 'max:100'],
            'medium_priority_score' => ['required', 'integer', 'min:0', 'max:100'],
            'response_time_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'response_email' => ['nullable', 'email:rfc', 'max:255'],
            'whatsapp_url' => ['nullable', 'url:https', 'max:2048'],
            'meeting_url' => ['nullable', 'url:https', 'max:2048'],
            'analytics_funnel_id' => ['nullable', 'integer', 'exists:funnels,id'],
            'concierge_enabled' => ['sometimes', 'boolean'],
            'telegram_url' => ['sometimes', 'nullable', 'url:https', 'max:2048'],
            'concierge_intro_en' => ['sometimes', 'nullable', 'string', 'max:600'],
            'concierge_intro_am' => ['sometimes', 'nullable', 'string', 'max:600'],
            'appointment_enabled' => ['sometimes', 'boolean'],
            'appointment_timezone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'appointment_slot_minutes' => ['sometimes', 'nullable', 'integer', 'min:15', 'max:240'],
            'appointment_buffer_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:120'],
            'appointment_advance_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
            'appointment_max_per_day' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:20'],
            'appointment_business_hours' => ['sometimes', 'nullable', 'array'],
            'appointment_business_hours.start' => ['sometimes', 'nullable', 'date_format:H:i'],
            'appointment_business_hours.end' => ['sometimes', 'nullable', 'date_format:H:i'],
            'appointment_meeting_types' => ['sometimes', 'nullable', 'array', 'min:1', 'max:10'],
            'appointment_meeting_types.*.key' => ['required', 'string', 'alpha_dash', 'max:40'],
            'appointment_meeting_types.*.label_en' => ['required', 'string', 'max:120'],
            'appointment_meeting_types.*.label_am' => ['nullable', 'string', 'max:120'],
        ]);

        $this->validateUniqueKeys($validated);
        $templateKeys = collect($validated['follow_up_templates'])->pluck('key');
        if ($templateKeys->unique()->count() !== $templateKeys->count()) {
            throw ValidationException::withMessages([
                'follow_up_templates' => 'Each follow-up template must have a unique key.',
            ]);
        }
        $weights = $validated['scoring_weights'];
        if (array_sum($weights) > 100) {
            throw ValidationException::withMessages([
                'scoring_weights' => 'Scoring weights must add up to 100 points or fewer.',
            ]);
        }
        if ($validated['high_priority_score'] <= $validated['medium_priority_score']) {
            throw ValidationException::withMessages([
                'high_priority_score' => 'The high-priority threshold must be greater than the medium-priority threshold.',
            ]);
        }
        foreach ($validated['budgets'] as $index => $budget) {
            if ($budget['score'] > $weights['budget']) {
                throw ValidationException::withMessages([
                    "budgets.{$index}.score" => 'Budget points cannot exceed the configured budget weight.',
                ]);
            }
        }
        foreach ($validated['timelines'] as $index => $timeline) {
            if ($timeline['score'] > $weights['timeline']) {
                throw ValidationException::withMessages([
                    "timelines.{$index}.score" => 'Timeline points cannot exceed the configured timeline weight.',
                ]);
            }
        }

        $analyticsFunnelId = $validated['analytics_funnel_id'] ?? null;
        if ($analyticsFunnelId !== null) {
            $ownedPublishedFunnel = $request->user()->funnels()
                ->where('is_published', true)
                ->whereKey($analyticsFunnelId)
                ->exists();
            if (! $ownedPublishedFunnel) {
                throw ValidationException::withMessages([
                    'analytics_funnel_id' => 'Choose one of your published funnels.',
                ]);
            }
        }

        $request->user()->clientAcquisitionSettings()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                ...$validated,
                'response_time_hours' => $validated['response_time_hours'] ?? null,
                'response_email' => $validated['response_email'] ?? null,
                'whatsapp_url' => $validated['whatsapp_url'] ?? null,
                'meeting_url' => $validated['meeting_url'] ?? null,
                'analytics_funnel_id' => $analyticsFunnelId,
                'concierge_enabled' => array_key_exists('concierge_enabled', $validated)
                    ? (bool) $validated['concierge_enabled']
                    : (bool) ($previous['concierge_enabled'] ?? true),
                'telegram_url' => array_key_exists('telegram_url', $validated)
                    ? ($validated['telegram_url'] ?? null)
                    : ($previous['telegram_url'] ?? null),
                'concierge_intro_en' => array_key_exists('concierge_intro_en', $validated)
                    ? ($validated['concierge_intro_en'] ?? null)
                    : ($previous['concierge_intro_en'] ?? null),
                'concierge_intro_am' => array_key_exists('concierge_intro_am', $validated)
                    ? ($validated['concierge_intro_am'] ?? null)
                    : ($previous['concierge_intro_am'] ?? null),
                'appointment_enabled' => array_key_exists('appointment_enabled', $validated)
                    ? (bool) $validated['appointment_enabled']
                    : (bool) ($previous['appointment_enabled'] ?? true),
                'appointment_timezone' => array_key_exists('appointment_timezone', $validated)
                    ? ($validated['appointment_timezone'] ?? null)
                    : ($previous['appointment_timezone'] ?? null),
                'appointment_slot_minutes' => array_key_exists('appointment_slot_minutes', $validated)
                    ? ($validated['appointment_slot_minutes'] ?? null)
                    : ($previous['appointment_slot_minutes'] ?? null),
                'appointment_buffer_minutes' => array_key_exists('appointment_buffer_minutes', $validated)
                    ? ($validated['appointment_buffer_minutes'] ?? null)
                    : ($previous['appointment_buffer_minutes'] ?? null),
                'appointment_advance_days' => array_key_exists('appointment_advance_days', $validated)
                    ? ($validated['appointment_advance_days'] ?? null)
                    : ($previous['appointment_advance_days'] ?? null),
                'appointment_max_per_day' => array_key_exists('appointment_max_per_day', $validated)
                    ? ($validated['appointment_max_per_day'] ?? null)
                    : ($previous['appointment_max_per_day'] ?? null),
                'appointment_business_hours' => array_key_exists('appointment_business_hours', $validated)
                    ? ($validated['appointment_business_hours'] ?? null)
                    : ($previous['appointment_business_hours'] ?? null),
                'appointment_meeting_types' => array_key_exists('appointment_meeting_types', $validated)
                    ? ($validated['appointment_meeting_types'] ?? null)
                    : ($previous['appointment_meeting_types'] ?? null),
            ],
        );

        Cache::forget('shared:concierge-enabled');

        $updated = $configuration->forOwner($request->user()->id);
        if (array_diff_assoc($updated['scoring_weights'], $previous['scoring_weights'])
            || $updated['budgets'] !== $previous['budgets']
            || $updated['timelines'] !== $previous['timelines']
            || $updated['services'] !== $previous['services']) {
            $request->user()->contacts()
                ->whereNotNull('client_project')
                ->chunkById(100, function ($contacts) use ($scoring, $updated): void {
                    foreach ($contacts as $contact) {
                        $project = [
                            ...($contact->client_project ?? []),
                            'name' => $contact->name,
                            'email' => $contact->email,
                            'phone' => $contact->phone,
                        ];
                        $score = $scoring->scoreClientProject($project, $updated);
                        $contact->forceFill([
                            'lead_score' => $score['score'],
                            'lead_score_breakdown' => $score['breakdown'],
                            'lead_score_reasons' => $score['reasons'],
                            'last_scored_at' => now(),
                        ])->save();
                    }
                });
        }

        return back()->with('success', 'Client acquisition settings updated.');
    }

    private function authorizeOwner(Request $request): void
    {
        abort_unless(User::configuredLeadOwner()?->id === $request->user()->id, 403);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function validateUniqueKeys(array $validated): void
    {
        foreach (['services', 'budgets', 'timelines', 'appointment_meeting_types'] as $group) {
            $keys = collect($validated[$group] ?? [])->pluck('key');
            if ($keys->unique()->count() !== $keys->count()) {
                throw ValidationException::withMessages([
                    $group => 'Each option must have a unique key.',
                ]);
            }
        }
    }
}
