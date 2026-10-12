<?php

namespace App\Actions\Leads;

use App\Models\Contact;
use App\Models\ContactSubmission;
use App\Models\User;
use App\Services\Automation\AutomationEventRecorder;
use App\Services\EthiopianPhoneNormalizer;
use App\Services\LeadScoringService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
}
