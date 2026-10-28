<?php

namespace App\Actions\Leads;

use App\Models\Contact;
use App\Models\ContactEmailPreference;
use App\Models\Funnel;
use App\Models\User;
use App\Services\Automation\AutomationEventRecorder;
use App\Services\EthiopianPhoneNormalizer;
use App\Services\FunnelAnalyticsSanitizer;
use App\Services\LeadScoringService;
use App\Services\OpportunityAutomationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Captures an appointment booking as a CRM-lite contact and submission.
 *
 * Scoring only uses the visitor's voluntarily provided details; company size,
 * personal attributes, and identity are never treated as qualification signals.
 */
class HandleAppointmentBooking
{
    public function __construct(
        private EthiopianPhoneNormalizer $phoneNormalizer,
        private LeadScoringService $scoring,
        private QualifyLead $qualifyLead,
        private AutomationEventRecorder $automationEvents,
        private FunnelAnalyticsSanitizer $analyticsSanitizer,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $settings
     * @return array{contact: Contact, submission: ContactSubmission, project: array<string, mixed>}
     */
    public function handle(User $owner, array $validated, Request $request, array $settings, ?Funnel $analyticsFunnel = null): array
    {
        $dispatchAutomationImmediately = config('queue.default') !== 'sync';

        return DB::transaction(function () use ($owner, $validated, $request, $settings, $analyticsFunnel, $dispatchAutomationImmediately): array {
            $email = mb_strtolower($validated['email']);
            $market = ($validated['market'] ?? 'ethiopia') === 'international' ? 'international' : 'ethiopia';
            $serviceLabel = collect($settings['services'] ?? [])
                ->firstWhere('key', $validated['service_key'])['label_en'] ?? $validated['service_key'];
            $meetingTypeLabel = collect($settings['appointment_meeting_types'] ?? [])
                ->firstWhere('key', $validated['meeting_type'])['label_en'] ?? $validated['meeting_type'];
            $phone = trim((string) ($validated['phone'] ?? ''));
            if ($phone !== '' && $market === 'ethiopia') {
                $phone = $this->phoneNormalizer->normalize($phone) ?? $phone;
            }

            $project = [
                'business_name' => $validated['company_name'],
                'contact_name' => $validated['contact_name'],
                'market' => $market,
                'country' => filled($validated['country'] ?? null) ? trim((string) $validated['country']) : ($market === 'ethiopia' ? 'Ethiopia' : null),
                'service_interests' => [$validated['service_key']],
                'service_label' => $serviceLabel,
                'project_description' => trim((string) ($validated['notes'] ?? '')),
                'meeting_type' => $validated['meeting_type'],
                'meeting_type_label' => $meetingTypeLabel,
                'budget' => null,
                'timeline' => null,
                'website' => $validated['website'] ?? null,
                'appointment' => [
                    'date' => $validated['date'],
                    'time' => $validated['time'],
                    'timezone' => $validated['timezone'] ?? $settings['appointment_timezone'],
                    'duration_minutes' => $validated['duration_minutes'] ?? $settings['appointment_slot_minutes'],
                    'notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
                ],
                'marketing_consent' => (bool) ($validated['marketing_consent'] ?? false),
                'attribution' => $validated['attribution'] ?? [],
            ];

            $score = $this->scoring->scoreClientProject([
                ...$project,
                'name' => trim($validated['contact_name']),
                'email' => $email,
                'phone' => $phone,
            ], $settings);

            $contact = Contact::firstOrNew(['user_id' => $owner->id, 'email' => $email]);
            $isNewContact = ! $contact->exists;
            $submissionCount = (int) data_get($contact->metadata, 'submission_count', 0) + 1;

            $contact->fill([
                'customer_user_id' => $contact->customer_user_id ?? $request->user()?->id,
                'funnel_id' => $analyticsFunnel?->id ?? $contact->funnel_id,
                'email' => $email,
                'name' => trim($validated['contact_name']),
                'phone' => $phone !== '' ? $phone : $contact->phone,
                'source' => $isNewContact ? 'appointment_booking' : $contact->source,
                'status' => $contact->status ?: 'new',
                'client_project' => $project,
                'lead_score' => $score['score'],
                'lead_score_breakdown' => $score['breakdown'],
                'lead_score_reasons' => $score['reasons'],
                'last_scored_at' => now(),
                'metadata' => [
                    ...($contact->metadata ?? []),
                    'submission_count' => $submissionCount,
                    'last_form_id' => 'appointment-booking',
                    'last_url' => $request->headers->get('referer'),
                    'last_attribution' => $validated['attribution'] ?? [],
                ],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'last_submitted_at' => now(),
            ]);
            $contact->save();

            $previousStatus = $contact->status;
            $this->qualifyLead->handle($contact, (int) $settings['qualified_score']);
            if ($contact->status !== $previousStatus) {
                $contact->activities()->create([
                    'actor_user_id' => $owner->id,
                    'type' => 'status_changed',
                    'payload' => [
                        'from' => $previousStatus,
                        'to' => $contact->status,
                        'reason' => 'configured qualification threshold',
                    ],
                ]);
            }

            $submission = $contact->submissions()->create([
                'funnel_id' => $analyticsFunnel?->id,
                'form_id' => 'appointment-booking',
                'fields' => $project,
                'attribution' => $validated['attribution'] ?? [],
                'source' => 'appointment_booking',
                'url' => $request->headers->get('referer'),
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            if ($project['marketing_consent']) {
                ContactEmailPreference::updateOrCreate(
                    ['user_id' => $owner->id, 'contact_id' => $contact->id],
                    ['status' => 'subscribed', 'source' => 'appointment_booking', 'consented_at' => now(), 'unsubscribed_at' => null],
                );
            }

            if ($isNewContact) {
                $this->automationEvents->record(
                    $owner,
                    'contact.created',
                    contact: $contact,
                    funnel: $analyticsFunnel,
                    payload: ['source' => 'appointment_booking'],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            if ($analyticsFunnel) {
                $analyticsFunnel->incrementConversions();
                $analyticsFunnel->events()->create([
                    'event_type' => 'conversion',
                    'contact_id' => $contact->id,
                    'submission_id' => $submission->id,
                    'form_id' => 'appointment-booking',
                    'attribution' => $this->analyticsSanitizer->attribution($validated['attribution'] ?? []),
                    'metadata' => ['lead_source' => 'appointment_booking'],
                    'occurred_at' => now(),
                ]);

                app(OpportunityAutomationService::class)->createFromSubmission($contact, $analyticsFunnel, $dispatchAutomationImmediately);
                $this->automationEvents->record(
                    $owner,
                    'funnel.form_submitted',
                    contact: $contact,
                    funnel: $analyticsFunnel,
                    submission: $submission,
                    payload: ['is_new_contact' => $isNewContact, 'submission_count' => $submissionCount, 'source' => 'appointment_booking'],
                    dispatch: $dispatchAutomationImmediately,
                );
            }

            return ['contact' => $contact, 'submission' => $submission, 'project' => $project];
        });
    }
}
