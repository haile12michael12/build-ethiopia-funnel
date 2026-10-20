<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactActivity;
use App\Services\Automation\AutomationEventRecorder;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\LeadScoringService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    public function index(Request $request, ClientAcquisitionConfiguration $configuration)
    {
        $settings = $configuration->forOwner($request->user()->id);
        $filters = $this->validatedFilters($request);
        $contacts = $this->filteredContacts($request, $filters)
            ->with('funnel:id,name,slug')
            ->withMin(['followUpTasks as next_follow_up_at' => fn (Builder $query) => $query->where('status', 'pending')], 'due_at')
            ->when(($filters['sort'] ?? 'created_at') === 'score', fn (Builder $query) => $query->orderByDesc('lead_score'))
            ->when(($filters['sort'] ?? 'created_at') === 'next_follow_up_at', fn (Builder $query) => $query->orderByRaw('next_follow_up_at IS NULL')->orderBy('next_follow_up_at'))
            ->when(($filters['sort'] ?? 'created_at') === 'created_at', fn (Builder $query) => $query->latest())
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Contact $contact) => [
                'id' => $contact->id,
                'email' => $contact->email,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'status' => $contact->status,
                'lost_reason' => $contact->lost_reason,
                'source' => $contact->source,
                'lead_score' => $contact->lead_score,
                'market' => data_get($contact->client_project, 'market'),
                'service' => implode(', ', data_get($contact->client_project, 'service_labels', [])),
                'budget_label' => data_get($contact->client_project, 'budget_label'),
                'budget_currency' => data_get($contact->client_project, 'budget_currency'),
                'last_contacted_at' => $contact->last_contacted_at?->format('M j, Y g:i A'),
                'next_follow_up_at' => $contact->next_follow_up_at,
                'funnel' => $contact->funnel ? [
                    'id' => $contact->funnel->id,
                    'name' => $contact->funnel->name,
                    'slug' => $contact->funnel->slug,
                ] : null,
                'submission_count' => (int) data_get($contact->metadata, 'submission_count', 1),
                'last_submitted_at' => $contact->last_submitted_at?->format('M j, Y g:i A'),
                'created_at' => $contact->created_at->format('M j, Y'),
            ]);

        return Inertia::render('contacts', [
            'contacts' => $contacts,
            'stats' => [
                'total_contacts' => $request->user()->contacts()->count(),
                'new_contacts' => $request->user()->contacts()->where('status', 'new')->count(),
                'captured_today' => $request->user()->contacts()->whereDate('created_at', today())->count(),
            ],
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'funnel_id' => isset($filters['funnel_id']) ? (string) $filters['funnel_id'] : '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
                'market' => $filters['market'] ?? '',
                'service' => $filters['service'] ?? '',
                'budget_currency' => $filters['budget_currency'] ?? '',
                'budget' => $filters['budget'] ?? '',
                'score_min' => $filters['score_min'] ?? '',
                'score_max' => $filters['score_max'] ?? '',
                'follow_up_due' => $filters['follow_up_due'] ?? '',
                'sort' => $filters['sort'] ?? 'created_at',
            ],
            'filterOptions' => [
                'statuses' => Contact::STATUSES,
                'services' => collect($configuration->forOwner($request->user()->id)['services'])
                    ->map(fn (array $service) => ['key' => $service['key'], 'label' => $service['label_en']])
                    ->values(),
                'budgets' => collect($configuration->forOwner($request->user()->id)['budgets'])
                    ->map(fn (array $budget) => ['key' => $budget['key'], 'label' => $budget['label_en'], 'currency' => $budget['currency']])
                    ->values(),
                'funnels' => $request->user()
                    ->funnels()
                    ->orderBy('name')
                    ->get(['id', 'name']),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->validatedFilters($request);
        $contacts = $this->filteredContacts($request, $filters)
            ->with('funnel:id,name')
            ->latest('last_submitted_at')
            ->latest();

        return response()->streamDownload(function () use ($contacts): void {
            $output = fopen('php://output', 'wb');

            if ($output === false) {
                return;
            }

            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, [
                'Name',
                'Email',
                'Phone',
                'Status',
                'Source',
                'Funnel',
                'Submission Count',
                'Last Activity',
                'Created At',
            ], escape: '');

            foreach ($contacts->lazy(500) as $contact) {
                $row = [
                    $contact->name,
                    $contact->email,
                    $contact->phone,
                    $contact->status,
                    $contact->source,
                    $contact->funnel?->name,
                    (int) data_get($contact->metadata, 'submission_count', 1),
                    $contact->last_submitted_at?->toIso8601String(),
                    $contact->created_at->toIso8601String(),
                ];

                fputcsv(
                    $output,
                    array_map(fn ($value) => $this->sanitizeCsvCell($value), $row),
                    escape: '',
                );
            }

            fclose($output);
        }, 'openfunnels-contacts-'.today()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function show(Request $request, Contact $contact)
    {
        abort_unless($contact->user_id === $request->user()->id, 403);

        $contact->load([
            'funnel:id,name,slug',
            'emailPreference:id,contact_id,status,source,consented_at,unsubscribed_at',
            'submissions' => fn ($query) => $query->with('funnel:id,name,slug')->latest(),
            'developerAiRecommendations' => fn ($query) => $query->latest()->limit(5),
            'opportunities' => fn ($query) => $query
                ->with(['pipeline:id,name,currency', 'stage:id,name'])
                ->latest(),
            'activities.actor:id,name',
            'followUpTasks' => fn ($query) => $query->latest('due_at'),
            'websiteAssessments.assessor:id,name',
            'clientProjects.milestones',
        ]);
        $settings = app(ClientAcquisitionConfiguration::class)->forOwner($contact->user_id);
        $emailPreference = $contact->emailPreference;

        return Inertia::render('contact-detail', [
            'contact' => [
                'id' => $contact->id,
                'email' => $contact->email,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'status' => $contact->status,
                'lost_reason' => $contact->lost_reason,
                'source' => $contact->source,
                'lead_score' => $contact->lead_score,
                'lead_priority' => $contact->lead_score >= $settings['high_priority_score']
                    ? 'high'
                    : ($contact->lead_score >= $settings['medium_priority_score'] ? 'medium' : 'low'),
                'last_scored_at' => $contact->last_scored_at?->format('M j, Y g:i A'),
                'priority_thresholds' => [
                    'high' => $settings['high_priority_score'],
                    'medium' => $settings['medium_priority_score'],
                ],
                'lead_score_breakdown' => $contact->lead_score_breakdown ?? [],
                'lead_score_reasons' => $contact->lead_score_reasons ?? [],
                'business_audit' => $contact->business_audit,
                'client_project' => $contact->client_project,
                'tags' => $contact->tags ?? [],
                'metadata' => $contact->metadata ?? [],
                'notes' => data_get($contact->metadata, 'notes', []),
                'email_preference' => $contact->emailPreference ? [
                    'status' => $contact->emailPreference->status,
                    'source' => $contact->emailPreference->source,
                    'consented_at' => $contact->emailPreference->consented_at?->format('M j, Y g:i A'),
                    'unsubscribed_at' => $contact->emailPreference->unsubscribed_at?->format('M j, Y g:i A'),
                ] : [
                    'status' => 'unknown',
                    'source' => null,
                    'consented_at' => null,
                    'unsubscribed_at' => null,
                ],
                'funnel' => $contact->funnel ? [
                    'id' => $contact->funnel->id,
                    'name' => $contact->funnel->name,
                    'slug' => $contact->funnel->slug,
                ] : null,
                'ip_address' => $contact->ip_address,
                'user_agent' => $contact->user_agent,
                'last_submitted_at' => $contact->last_submitted_at?->format('M j, Y g:i A'),
                'last_contacted_at' => $contact->last_contacted_at?->format('M j, Y g:i A'),
                'created_at' => $contact->created_at->format('M j, Y g:i A'),
                'updated_at' => $contact->updated_at->format('M j, Y g:i A'),
                'submissions' => $contact->submissions->map(fn ($submission) => [
                    'id' => $submission->id,
                    'form_id' => $submission->form_id,
                    'variant_id' => $submission->variant_id,
                    'fields' => $submission->fields ?? [],
                    'source' => $submission->source,
                    'url' => $submission->url,
                    'ip_address' => $submission->ip_address,
                    'user_agent' => $submission->user_agent,
                    'created_at' => $submission->created_at->format('M j, Y g:i A'),
                    'funnel' => $submission->funnel ? [
                        'id' => $submission->funnel->id,
                        'name' => $submission->funnel->name,
                        'slug' => $submission->funnel->slug,
                    ] : null,
                ]),
                'activities' => $contact->activities->map(fn (ContactActivity $activity) => [
                    'id' => $activity->id,
                    'type' => $activity->type,
                    'payload' => $activity->payload ?? [],
                    'actor' => $activity->actor?->name,
                    'created_at' => $activity->created_at->format('M j, Y g:i A'),
                ]),
                'follow_up_tasks' => $contact->followUpTasks->map(fn ($task) => [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'due_at' => $task->due_at->format('Y-m-d\TH:i'),
                    'due_label' => $task->due_at->format('M j, Y g:i A'),
                    'status' => $task->status,
                    'completed_at' => $task->completed_at?->format('M j, Y g:i A'),
                ]),
                'follow_up_templates' => collect($settings['follow_up_templates'])
                    ->filter(fn (array $template) => $template['kind'] !== 'promotional' || $emailPreference?->status === 'subscribed')
                    ->values(),
                'opportunities' => $contact->opportunities->map(fn ($opportunity) => [
                    'id' => $opportunity->id,
                    'title' => $opportunity->title,
                    'value_cents' => $opportunity->value_cents,
                    'status' => $opportunity->status,
                    'expected_close_date' => $opportunity->expected_close_date?->format('Y-m-d'),
                    'pipeline' => [
                        'id' => $opportunity->pipeline->id,
                        'name' => $opportunity->pipeline->name,
                        'currency' => $opportunity->pipeline->currency,
                    ],
                    'stage' => [
                        'id' => $opportunity->stage->id,
                        'name' => $opportunity->stage->name,
                    ],
                ]),
                'developer_ai_recommendations' => $contact->developerAiRecommendations->map(fn ($recommendation) => [
                    'id' => $recommendation->id,
                    'status' => $recommendation->status,
                    'recommendations' => $recommendation->recommendations,
                    'error_message' => $recommendation->error_message,
                    'created_at' => $recommendation->created_at->format('M j, Y g:i A'),
                ]),
                'website_assessments' => $contact->websiteAssessments->map(fn ($assessment) => [
                    'id' => $assessment->id,
                    'website_url' => $assessment->website_url,
                    'status' => $assessment->status,
                    'has_website' => $assessment->has_website,
                    'mobile_usability_score' => $assessment->mobile_usability_score,
                    'content_quality_score' => $assessment->content_quality_score,
                    'technical_issues' => $assessment->technical_issues ?? [],
                    'suggested_improvements' => $assessment->suggested_improvements ?? [],
                    'evidence_url' => $assessment->evidence_url,
                    'notes' => $assessment->notes,
                    'assessor' => $assessment->assessor?->name,
                    'assessed_at' => $assessment->assessed_at?->format('M j, Y g:i A'),
                    'created_at' => $assessment->created_at->format('M j, Y g:i A'),
                ]),
                'client_projects' => $contact->clientProjects->map(fn ($project) => [
                    'id' => $project->id,
                    'title' => $project->title,
                    'status' => $project->status,
                    'currency' => $project->currency,
                    'budget_amount' => $project->budget_amount,
                    'scope_summary' => $project->scope_summary,
                    'agreed_deliverables' => $project->agreed_deliverables ?? [],
                    'start_date' => $project->start_date?->format('Y-m-d'),
                    'target_completion_date' => $project->target_completion_date?->format('Y-m-d'),
                    'completed_at' => $project->completed_at?->format('M j, Y g:i A'),
                    'milestones_count' => $project->milestones->count(),
                    'completed_milestones_count' => $project->milestones->where('status', 'completed')->count(),
                ]),
            ],
            'statusOptions' => Contact::STATUSES,
            'projectOptions' => [
                'services' => collect($settings['services'])->map(fn (array $option) => ['key' => $option['key'], 'label' => $option['label_en']])->values(),
                'budgets' => collect($settings['budgets'])->map(fn (array $option) => ['key' => $option['key'], 'label' => $option['label_en'], 'currency' => $option['currency']])->values(),
                'timelines' => collect($settings['timelines'])->map(fn (array $option) => ['key' => $option['key'], 'label' => $option['label_en']])->values(),
            ],
        ]);
    }

    public function updateDetails(
        Request $request,
        Contact $contact,
        ClientAcquisitionConfiguration $configuration,
        LeadScoringService $scoring,
    ) {
        abort_unless($contact->user_id === $request->user()->id, 403);
        abort_unless(is_array($contact->client_project), 404);

        $settings = $configuration->forOwner($contact->user_id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('contacts', 'email')->where(fn ($query) => $query->where('user_id', $contact->user_id))->ignore($contact->id),
            ],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^[+]?[\d\s().-]{7,30}$/'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'market' => ['required', Rule::in(['ethiopia', 'international'])],
            'country' => ['required', 'string', 'max:120'],
            'service_interests' => ['required', 'array', 'min:1', 'max:5'],
            'service_interests.*' => ['required', 'string', 'distinct', Rule::in(collect($settings['services'])->pluck('key')->all())],
            'project_description' => ['required', 'string', 'min:30', 'max:5000'],
            'budget' => ['required', Rule::in(collect($settings['budgets'])->pluck('key')->all())],
            'timeline' => ['required', Rule::in(collect($settings['timelines'])->pluck('key')->all())],
            'website' => ['nullable', 'url', 'max:2048'],
            'additional_requirements' => ['nullable', 'string', 'max:3000'],
            'preferred_contact' => ['required', Rule::in(['email', 'phone', 'whatsapp'])],
        ]);
        if ($validated['market'] === 'ethiopia' && mb_strtolower(trim($validated['country'])) !== 'ethiopia') {
            throw ValidationException::withMessages(['country' => 'Choose Ethiopia as the country for the Ethiopia market.']);
        }
        $budget = collect($settings['budgets'])->firstWhere('key', $validated['budget']);
        $currency = $validated['market'] === 'ethiopia' ? 'ETB' : 'USD';
        if (($budget['currency'] ?? null) !== $currency) {
            throw ValidationException::withMessages(['budget' => 'Choose a planning range in the selected market currency.']);
        }

        $project = [
            ...$contact->client_project,
            ...array_diff_key($validated, array_flip(['name', 'email', 'phone'])),
            'email' => mb_strtolower($validated['email']),
            'budget_currency' => $currency,
            'service_labels' => collect($settings['services'])
                ->filter(fn (array $service) => in_array($service['key'], $validated['service_interests'], true))
                ->pluck('label_en')->values()->all(),
            'budget_label' => $budget['label_en'],
            'timeline_label' => collect($settings['timelines'])->firstWhere('key', $validated['timeline'])['label_en'],
        ];
        $score = $scoring->scoreClientProject([
            ...$project,
            'name' => trim($validated['name']),
            'phone' => $validated['phone'] ?? '',
        ], $settings);
        $changedFields = array_values(array_filter(
            ['name', 'email', 'phone', 'business_name', 'market', 'country', 'service_interests', 'project_description', 'budget', 'timeline', 'website', 'additional_requirements', 'preferred_contact'],
            fn (string $field): bool => ($contact->{$field} ?? data_get($contact->client_project, $field)) !== ($validated[$field] ?? null),
        ));

        DB::transaction(function () use ($contact, $request, $validated, $project, $score, $changedFields): void {
            $contact->update([
                'name' => trim($validated['name']),
                'email' => mb_strtolower($validated['email']),
                'phone' => $validated['phone'] ?? null,
                'client_project' => $project,
                'lead_score' => $score['score'],
                'lead_score_breakdown' => $score['breakdown'],
                'lead_score_reasons' => $score['reasons'],
                'last_scored_at' => now(),
            ]);
            $contact->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => 'details_updated',
                'payload' => ['fields' => $changedFields],
            ]);
        });

        return back()->with('success', 'Lead details updated and score recalculated.');
    }

    public function update(Request $request, Contact $contact, AutomationEventRecorder $automationEvents)
    {
        abort_unless($contact->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Contact::STATUSES)],
            'lost_reason' => ['nullable', 'string', 'in:budget_mismatch,timing,scope_mismatch,no_response,other'],
        ]);

        DB::transaction(function () use ($request, $contact, $validated, $automationEvents): void {
            $previousStatus = $contact->status;
            $contact->update([
                'status' => $validated['status'],
                'lost_reason' => $validated['status'] === 'lost' ? ($validated['lost_reason'] ?? $contact->lost_reason) : null,
            ]);

            if ($contact->status !== $previousStatus) {
                $contact->activities()->create([
                    'actor_user_id' => $request->user()->id,
                    'type' => 'status_changed',
                    'payload' => [
                        'from' => $previousStatus,
                        'to' => $contact->status,
                        'lost_reason' => $contact->lost_reason,
                    ],
                ]);
                $automationEvents->record(
                    $request->user(),
                    'contact.status_changed',
                    contact: $contact,
                    funnel: $contact->funnel,
                    payload: ['from_status' => $previousStatus, 'to_status' => $contact->status],
                );
            }
        });

        return back()->with('success', 'Contact updated.');
    }

    public function storeNote(Request $request, Contact $contact)
    {
        abort_unless($contact->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $metadata = $contact->metadata ?? [];
        $notes = data_get($metadata, 'notes', []);
        $notes[] = [
            'id' => (string) str()->uuid(),
            'body' => $validated['note'],
            'created_at' => now()->toISOString(),
        ];

        data_set($metadata, 'notes', $notes);
        DB::transaction(function () use ($contact, $metadata, $request, $validated): void {
            $contact->update(['metadata' => $metadata]);
            $contact->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => 'note_added',
                'payload' => ['body' => $validated['note']],
            ]);
        });

        return back()->with('success', 'Note added.');
    }

    public function storeContactAttempt(Request $request, Contact $contact)
    {
        abort_unless($contact->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'channel' => ['required', 'string', 'in:email,phone,whatsapp,meeting,proposal'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($contact, $request, $validated): void {
            $contact->update(['last_contacted_at' => now()]);
            $contact->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => 'contact_attempt',
                'payload' => $validated,
            ]);
        });

        return back()->with('success', 'Contact attempt recorded. No message was sent.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedFilters(Request $request): array
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:'.implode(',', Contact::STATUSES)],
            'funnel_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'market' => ['nullable', 'in:ethiopia,international'],
            'service' => ['nullable', 'string', 'alpha_dash', 'max:40'],
            'budget_currency' => ['nullable', 'in:ETB,USD'],
            'budget' => ['nullable', 'string', 'alpha_dash', 'max:40'],
            'score_min' => ['nullable', 'integer', 'min:0', 'max:100'],
            'score_max' => ['nullable', 'integer', 'min:0', 'max:100', 'gte:score_min'],
            'follow_up_due' => ['nullable', 'in:overdue,today,upcoming'],
            'sort' => ['nullable', 'in:created_at,score,next_follow_up_at'],
        ]);

        if (isset($filters['search'])) {
            $filters['search'] = trim($filters['search']);
        }

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function filteredContacts(Request $request, array $filters): Builder
    {
        return $request->user()
            ->contacts()
            ->getQuery()
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $searchQuery) use ($search): void {
                    $searchQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['funnel_id'] ?? null, fn (Builder $query, int $funnelId) => $query->where('funnel_id', $funnelId))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['market'] ?? null, fn (Builder $query, string $market) => $query->where('client_project->market', $market))
            ->when($filters['service'] ?? null, fn (Builder $query, string $service) => $query->whereJsonContains('client_project->service_interests', $service))
            ->when($filters['budget_currency'] ?? null, fn (Builder $query, string $currency) => $query->where('client_project->budget_currency', $currency))
            ->when($filters['budget'] ?? null, fn (Builder $query, string $budget) => $query->where('client_project->budget', $budget))
            ->when(isset($filters['score_min']), fn (Builder $query) => $query->where('lead_score', '>=', $filters['score_min']))
            ->when(isset($filters['score_max']), fn (Builder $query) => $query->where('lead_score', '<=', $filters['score_max']))
            ->when($filters['follow_up_due'] ?? null, function (Builder $query, string $due): void {
                $query->whereHas('followUpTasks', function (Builder $taskQuery) use ($due): void {
                    $taskQuery->where('status', 'pending')
                        ->when($due === 'overdue', fn (Builder $builder) => $builder->where('due_at', '<', now()))
                        ->when($due === 'today', fn (Builder $builder) => $builder->whereDate('due_at', today()))
                        ->when($due === 'upcoming', fn (Builder $builder) => $builder->where('due_at', '>', now()->endOfDay()));
                });
            });
    }

    private function sanitizeCsvCell(mixed $value): string
    {
        $cell = (string) ($value ?? '');

        if (preg_match('/^[\x00-\x20]*[=+\-@]/u', $cell) === 1) {
            return "'".$cell;
        }

        return $cell;
    }
}
