<?php

namespace App\Http\Controllers;

use App\Jobs\CalculateLeadScore;
use App\Jobs\SendLeadCaptureNotifications;
use App\Models\Contact;
use App\Models\ContactEmailPreference;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\FunnelExperiment;
use App\Services\Automation\AutomationEventRecorder;
use App\Services\FunnelAnalyticsSanitizer;
use App\Services\OpportunityAutomationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class LeadCaptureController extends Controller
{
    use AuthorizesRequests;

    public function store(
        Request $request,
        Funnel $funnel,
        OpportunityAutomationService $opportunityAutomation,
        AutomationEventRecorder $automationEvents,
        FunnelAnalyticsSanitizer $analyticsSanitizer,
    ) {
        if (! $funnel->is_published) {
            $this->authorize('update', $funnel);
        }

        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'form_id' => ['nullable', 'string', 'max:100'],
            'fields' => ['nullable', 'array', 'max:50'],
            'fields.*' => ['nullable', 'string', 'max:5000'],
            'attribution' => ['nullable', 'array'],
            'attribution.utm_source' => ['nullable', 'string', 'max:255'],
            'attribution.utm_medium' => ['nullable', 'string', 'max:255'],
            'attribution.utm_campaign' => ['nullable', 'string', 'max:255'],
            'attribution.utm_term' => ['nullable', 'string', 'max:255'],
            'attribution.utm_content' => ['nullable', 'string', 'max:255'],
            'attribution.referrer' => ['nullable', 'url', 'max:2000'],
            'attribution.device' => ['nullable', Rule::in(['mobile', 'tablet', 'desktop'])],
            'session_id' => ['nullable', 'uuid'],
            'variant_id' => ['nullable', 'integer'],
            'experiment_id' => ['nullable', 'integer'],
        ]);

        $experiment = null;
        if (isset($validated['experiment_id'])) {
            $experiment = $funnel->experiments()->findOrFail($validated['experiment_id']);
            $submittedVariant = isset($validated['variant_id']) ? (string) $validated['variant_id'] : 'control';
            abort_unless(
                $experiment->isAcceptingTraffic()
                && (string) $request->cookie('of_experiment_'.$funnel->id) === $experiment->id.':'.$submittedVariant,
                422,
                'The submitted experiment assignment is invalid or no longer active.',
            );
            if (isset($validated['variant_id'])) {
                abort_unless(in_array((int) $validated['variant_id'], $experiment->assignedVariantIds(), true), 422, 'The submitted variant is not part of this experiment.');
            }
        } elseif ($funnel->is_published && ! $request->user()?->can('update', $funnel)) {
            abort_unless(
                ! $funnel->experiments()->get()->contains(fn (FunnelExperiment $item) => $item->isAcceptingTraffic()),
                422,
                'An active experiment assignment is required.',
            );
        }

        if (isset($validated['variant_id']) && ! $experiment && ! $funnel->variants()->whereKey($validated['variant_id'])->where('is_active', true)->exists()) {
            abort(422, 'Invalid experiment variant.');
        }
        if ($funnel->is_published && ! $request->user()?->can('update', $funnel) && ! isset($validated['experiment_id'])) {
            $assignedVariant = (string) $request->cookie('of_variant_'.$funnel->id, 'control');
            $submittedVariant = isset($validated['variant_id']) ? (string) $validated['variant_id'] : 'control';
            abort_unless($assignedVariant === $submittedVariant, 422, 'The submitted variant does not match this visitor’s assignment.');
        }

        [$contact, $submission, $scoreEventIds] = DB::transaction(function () use (
            $request,
            $validated,
            $funnel,
            $experiment,
            $opportunityAutomation,
            $automationEvents,
            $analyticsSanitizer,
        ) {
            $dispatchAutomationImmediately = config('queue.default') !== 'sync';
            $email = strtolower($validated['email']);
            $contact = Contact::firstOrNew([
                'user_id' => $funnel->user_id,
                'email' => $email,
            ]);
            $isNewContact = ! $contact->exists;
            $metadata = $contact->metadata ?? [];
            $submissionCount = (int) data_get($metadata, 'submission_count', 0) + 1;

            $contact->fill([
                'funnel_id' => $funnel->id,
                'email' => $email,
                'name' => $validated['name'] ?? $contact->name,
                'phone' => $validated['phone'] ?? $contact->phone,
                'source' => 'funnel_form',
                'status' => $contact->status ?: 'new',
                'metadata' => [
                    ...$metadata,
                    'submission_count' => $submissionCount,
                    'last_form_id' => $validated['form_id'] ?? null,
                    'last_fields' => $validated['fields'] ?? [],
                    'last_url' => $request->headers->get('referer'),
                    'last_attribution' => $validated['attribution'] ?? [],
                ],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'last_submitted_at' => now(),
            ]);
            $contact->save();

            $sessionId = isset($validated['session_id']) ? hash('sha256', $validated['session_id']) : null;
            if ($sessionId) {
                FunnelEvent::query()
                    ->where('funnel_id', $funnel->id)
                    ->where('session_id', $sessionId)
                    ->whereNull('contact_id')
                    ->update(['contact_id' => $contact->id]);
            }

            $submission = $contact->submissions()->create([
                'funnel_id' => $funnel->id,
                'variant_id' => $validated['variant_id'] ?? null,
                'experiment_id' => $experiment?->id,
                'form_id' => $validated['form_id'] ?? null,
                'fields' => $validated['fields'] ?? [],
                'attribution' => $validated['attribution'] ?? [],
                'source' => 'funnel_form',
                'url' => $request->headers->get('referer'),
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            if ($this->isAffirmative(data_get($validated, 'fields.marketing_consent'))) {
                ContactEmailPreference::updateOrCreate(
                    ['user_id' => $funnel->user_id, 'contact_id' => $contact->id],
                    ['status' => 'subscribed', 'source' => 'funnel_form', 'consented_at' => now(), 'unsubscribed_at' => null],
                );
            }

            $funnel->incrementConversions();
            $funnel->events()->create([
                'event_type' => 'conversion',
                'contact_id' => $contact->id,
                'submission_id' => $submission->id,
                'variant_id' => $validated['variant_id'] ?? null,
                'experiment_id' => $experiment?->id,
                'session_id' => $sessionId,
                'form_id' => $validated['form_id'] ?? null,
                'attribution' => $analyticsSanitizer->attribution($validated['attribution'] ?? []),
                'occurred_at' => now(),
            ]);
            $funnel->events()->create([
                'event_type' => 'form_submitted',
                'contact_id' => $contact->id,
                'submission_id' => $submission->id,
                'variant_id' => $validated['variant_id'] ?? null,
                'experiment_id' => $experiment?->id,
                'session_id' => $sessionId,
                'form_id' => $validated['form_id'] ?? null,
                'attribution' => $analyticsSanitizer->attribution($validated['attribution'] ?? []),
                'occurred_at' => now(),
            ]);

            if ($isNewContact) {
                $funnel->events()->create([
                    'event_type' => 'lead_created',
                    'contact_id' => $contact->id,
                    'submission_id' => $submission->id,
                    'variant_id' => $validated['variant_id'] ?? null,
                    'experiment_id' => $experiment?->id,
                    'session_id' => $sessionId,
                    'form_id' => $validated['form_id'] ?? null,
                    'attribution' => $analyticsSanitizer->attribution($validated['attribution'] ?? []),
                    'occurred_at' => now(),
                ]);
                $automationEvents->record(
                    $funnel->user,
                    'contact.created',
                    contact: $contact,
                    funnel: $funnel,
                    payload: ['source' => 'funnel_form'],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            $opportunityAutomation->createFromSubmission($contact, $funnel, $dispatchAutomationImmediately);
            $automationEvents->record(
                $funnel->user,
                'funnel.form_submitted',
                contact: $contact,
                funnel: $funnel,
                submission: $submission,
                payload: [
                    'is_new_contact' => $isNewContact,
                    'submission_count' => $submissionCount,
                ],
                dispatch: $dispatchAutomationImmediately,
            );

            $scoreEventIds = FunnelEvent::query()
                ->where('contact_id', $contact->id)
                ->whereIn('event_type', ['page_viewed', 'form_submitted', 'quiz_completed'])
                ->whereNull('scored_at')
                ->pluck('id')
                ->all();

            return [$contact, $submission, $scoreEventIds];
        });

        foreach ($scoreEventIds as $eventId) {
            $scoring = CalculateLeadScore::dispatch((int) $eventId)
                ->onQueue(config('automation.queue', 'default'));
            if (config('queue.default') === 'sync') {
                $scoring->afterResponse();
            }
        }

        try {
            $notification = SendLeadCaptureNotifications::dispatch($contact->id, $funnel->id, $submission->id)
                ->onQueue(config('automation.queue', 'default'));
            if (config('queue.default') === 'sync') {
                $notification->afterResponse();
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', 'Thanks. Your information was submitted.');
    }

    private function isAffirmative(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on', 'subscribed'], true);
    }
}
