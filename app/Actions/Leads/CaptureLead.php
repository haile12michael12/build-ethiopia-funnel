<?php

namespace App\Actions\Leads;

use App\Models\Contact;
use App\Models\ContactEmailPreference;
use App\Models\ContactSubmission;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\User;
use App\Jobs\SendLeadCaptureNotifications;
use App\Services\Automation\AutomationEventRecorder;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\EthiopianPhoneNormalizer;
use App\Services\LeadScoringService;
use App\Services\OpportunityAutomationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class CaptureLead
{
    public function __construct(
        private EthiopianPhoneNormalizer $phoneNormalizer,
        private LeadScoringService $scoring,
        private UpdateLeadScore $updateLeadScore,
        private QualifyLead $qualifyLead,
        private AutomationEventRecorder $automationEvents,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return array{contact: Contact, submission: ContactSubmission}
     */
    public function handle(User $owner, array $validated, Request $request): array
    {
        $dispatchAutomationImmediately = config('queue.default') !== 'sync';

        return DB::transaction(function () use ($owner, $validated, $request, $dispatchAutomationImmediately): array {
            $email = strtolower($validated['email']);
            $contact = Contact::firstOrNew(['user_id' => $owner->id, 'email' => $email]);
            $isNewContact = ! $contact->exists;
            $audit = [
                'business_name' => $validated['business_name'],
                'website' => $validated['website'] ?? null,
                'website_status' => $validated['website_status'],
                'service_interests' => $validated['service_interests'],
                'budget' => $validated['budget'],
                'timeline' => $validated['timeline'],
            ];
            $submissionCount = (int) data_get($contact->metadata, 'submission_count', 0) + 1;

            $contact->fill([
                'email' => $email,
                'name' => $validated['name'],
                'phone' => filled($validated['phone'] ?? null)
                    ? $this->phoneNormalizer->normalize($validated['phone'])
                    : $contact->phone,
                'source' => $isNewContact ? 'business_audit' : $contact->source,
                'status' => $contact->status ?: 'new',
                'business_audit' => $audit,
                'metadata' => [
                    ...($contact->metadata ?? []),
                    'submission_count' => $submissionCount,
                    'last_form_id' => 'business-growth-audit',
                    'last_url' => $request->headers->get('referer'),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'last_submitted_at' => now(),
            ]);
            $contact->save();

            $this->updateLeadScore->handle($contact, $audit, $this->scoring);
            $this->qualifyLead->handle($contact);

            $submission = $contact->submissions()->create([
                'fields' => $audit,
                'source' => 'business_audit',
                'url' => $request->headers->get('referer'),
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            if ($isNewContact) {
                $this->automationEvents->record(
                    $owner,
                    'contact.created',
                    contact: $contact,
                    payload: ['source' => 'business_audit'],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            return ['contact' => $contact, 'submission' => $submission];
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{contact: Contact, submission: ContactSubmission}
     */
    public function handleClientProject(
        User $owner,
        array $validated,
        Request $request,
        array $settings,
        ?Funnel $analyticsFunnel = null,
        ?int $variantId = null,
    ): array {
        $dispatchAutomationImmediately = config('queue.default') !== 'sync';

        $result = DB::transaction(function () use ($owner, $validated, $request, $settings, $analyticsFunnel, $variantId, $dispatchAutomationImmediately): array {
            $email = mb_strtolower($validated['email']);
            $contact = Contact::firstOrNew(['user_id' => $owner->id, 'email' => $email]);
            $isNewContact = ! $contact->exists;
            $project = [
                'business_name' => $validated['business_name'] ?? null,
                'market' => $validated['market'],
                'country' => trim($validated['country']),
                'service_interests' => $validated['service_interests'],
                'project_description' => trim($validated['project_description']),
                'budget' => $validated['budget'],
                'timeline' => $validated['timeline'],
                'website' => $validated['website'] ?? null,
                'social_links' => $validated['social_links'] ?? [],
                'preferred_contact' => $validated['preferred_contact'],
                'additional_requirements' => $validated['additional_requirements'] ?? null,
                'marketing_consent' => (bool) ($validated['marketing_consent'] ?? false),
                'attribution' => $validated['attribution'] ?? [],
            ];
            $serviceLabels = collect($settings['services'])
                ->filter(fn (array $service) => in_array($service['key'], $project['service_interests'], true))
                ->pluck('label_en')
                ->values()
                ->all();
            $budgetLabel = collect($settings['budgets'])->firstWhere('key', $project['budget'])['label_en'] ?? $project['budget'];
            $timelineLabel = collect($settings['timelines'])->firstWhere('key', $project['timeline'])['label_en'] ?? $project['timeline'];
            $project['service_labels'] = $serviceLabels;
            $project['budget_label'] = $budgetLabel;
            $project['timeline_label'] = $timelineLabel;
            $score = $this->scoring->scoreClientProject($project, $settings);
            $submissionCount = (int) data_get($contact->metadata, 'submission_count', 0) + 1;
            $phone = trim((string) ($validated['phone'] ?? ''));
            if ($phone !== '' && $project['country'] === 'Ethiopia') {
                $phone = $this->phoneNormalizer->normalize($phone) ?? $phone;
            }

            $contact->fill([
                'funnel_id' => $analyticsFunnel?->id ?? $contact->funnel_id,
                'email' => $email,
                'name' => trim($validated['name']),
                'phone' => $phone !== '' ? $phone : $contact->phone,
                'source' => $isNewContact ? 'client_acquisition' : $contact->source,
                'status' => $contact->status ?: 'new',
                'client_project' => $project,
                'lead_score' => $score['score'],
                'lead_score_breakdown' => $score['breakdown'],
                'lead_score_reasons' => $score['reasons'],
                'metadata' => [
                    ...($contact->metadata ?? []),
                    'submission_count' => $submissionCount,
                    'last_form_id' => 'client-acquisition',
                    'last_url' => $request->headers->get('referer'),
                    'last_attribution' => $validated['attribution'] ?? [],
                ],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'last_submitted_at' => now(),
            ]);
            $contact->save();
            $this->qualifyLead->handle($contact, (int) $settings['qualified_score']);

            $submission = $contact->submissions()->create([
                'funnel_id' => $analyticsFunnel?->id,
                'variant_id' => $variantId,
                'form_id' => 'client-acquisition',
                'fields' => $project,
                'attribution' => $validated['attribution'] ?? [],
                'source' => 'client_acquisition',
                'url' => $request->headers->get('referer'),
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            if ($project['marketing_consent']) {
                ContactEmailPreference::updateOrCreate(
                    ['user_id' => $owner->id, 'contact_id' => $contact->id],
                    ['status' => 'subscribed', 'source' => 'client_acquisition', 'consented_at' => now(), 'unsubscribed_at' => null],
                );
            }

            if ($isNewContact) {
                $this->automationEvents->record(
                    $owner,
                    'contact.created',
                    contact: $contact,
                    funnel: $analyticsFunnel,
                    payload: ['source' => 'client_acquisition'],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            if ($analyticsFunnel) {
                $sessionId = isset($validated['session_id']) ? hash('sha256', $validated['session_id']) : null;
                $analyticsFunnel->incrementConversions();
                $analyticsFunnel->events()->create([
                    'event_type' => 'conversion',
                    'variant_id' => $variantId,
                    'session_id' => $sessionId,
                    'form_id' => 'client-acquisition',
                    'attribution' => $validated['attribution'] ?? [],
                    'metadata' => [
                        'market' => $project['market'],
                        'services' => implode(',', $project['service_interests']),
                        'qualified' => (string) ((int) ($score['score'] >= (int) $settings['qualified_score'])),
                    ],
                    'occurred_at' => now(),
                ]);

                app(OpportunityAutomationService::class)->createFromSubmission($contact, $analyticsFunnel, $dispatchAutomationImmediately);
                $this->automationEvents->record(
                    $owner,
                    'funnel.form_submitted',
                    contact: $contact,
                    funnel: $analyticsFunnel,
                    submission: $submission,
                    payload: [
                        'is_new_contact' => $isNewContact,
                        'submission_count' => $submissionCount,
                        'source' => 'client_acquisition',
                    ],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            return ['contact' => $contact, 'submission' => $submission];
        });

        if ($analyticsFunnel) {
            try {
                $notification = SendLeadCaptureNotifications::dispatch(
                    $result['contact']->id,
                    $analyticsFunnel->id,
                    $result['submission']->id,
                )->onQueue(config('automation.queue', 'default'));
                if (config('queue.default') === 'sync') {
                    $notification->afterResponse();
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return $result;
    }
}
