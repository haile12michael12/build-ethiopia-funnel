<?php

namespace App\Http\Controllers;

use App\Models\ClientAcquisitionSettings;
use App\Services\ClientAcquisitionConfiguration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClientAcquisitionSettingsController extends Controller
{
    public function edit(Request $request, ClientAcquisitionConfiguration $configuration): Response
    {
        $this->authorizeOwner($request);

        return Inertia::render('client-acquisition/settings', [
            'settings' => $configuration->forOwner($request->user()->id),
            'funnels' => $request->user()->funnels()
                ->where('is_published', true)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, ClientAcquisitionConfiguration $configuration): RedirectResponse
    {
        $this->authorizeOwner($request);
        $defaults = ClientAcquisitionSettings::defaults();
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
            'scoring_weights.service_fit' => ['required', 'integer', 'min:0', 'max:100'],
            'scoring_weights.project_clarity' => ['required', 'integer', 'min:0', 'max:100'],
            'scoring_weights.budget' => ['required', 'integer', 'min:0', 'max:100'],
            'scoring_weights.timeline' => ['required', 'integer', 'min:0', 'max:100'],
            'scoring_weights.consultation' => ['required', 'integer', 'min:0', 'max:100'],
            'qualified_score' => ['required', 'integer', 'min:0', 'max:100'],
            'response_time_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'response_email' => ['nullable', 'email:rfc', 'max:255'],
            'whatsapp_url' => ['nullable', 'url:https', 'max:2048'],
            'meeting_url' => ['nullable', 'url:https', 'max:2048'],
            'analytics_funnel_id' => ['nullable', 'integer', 'exists:funnels,id'],
        ]);

        $this->validateUniqueKeys($validated);
        $weights = $validated['scoring_weights'];
        if (array_sum($weights) > 100) {
            throw ValidationException::withMessages([
                'scoring_weights' => 'Scoring weights must add up to 100 points or fewer.',
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
            ],
        );

        return back()->with('success', 'Client acquisition settings updated.');
    }

    private function authorizeOwner(Request $request): void
    {
        $ownerId = config('business-audit.owner_id');
        abort_unless(is_numeric($ownerId) && (int) $ownerId === $request->user()->id, 403);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function validateUniqueKeys(array $validated): void
    {
        foreach (['services', 'budgets', 'timelines'] as $group) {
            $keys = collect($validated[$group])->pluck('key');
            if ($keys->unique()->count() !== $keys->count()) {
                throw ValidationException::withMessages([
                    $group => 'Each option must have a unique key.',
                ]);
            }
        }
    }
}
