<?php

namespace App\Http\Controllers;

use App\Jobs\CalculateLeadScore;
use App\Models\Contact;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\FunnelExperiment;
use App\Services\FunnelAnalyticsSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FunnelAnalyticsController extends Controller
{
    public function store(Request $request, Funnel $funnel, FunnelAnalyticsSanitizer $sanitizer): JsonResponse
    {
        abort_unless($funnel->is_published || $request->user()?->can('update', $funnel), 404);

        $validated = $request->validate([
            'event_type' => ['required', Rule::in([
                'view',
                'cta_click',
                'form_start',
                'form_step',
                'form_validation_error',
                'page_viewed',
                'service_page_viewed',
                'portfolio_item_viewed',
                'form_started',
                'form_submitted',
                'quiz_completed',
                'lead_created',
                'email_sent',
                'email_opened',
                'email_clicked',
                'offer_viewed',
                'checkout_started',
                'purchase_completed',
                'branch_evaluated',
                'code_audit_completed',
                'code_audit_report_unlocked',
                'playground_simulated',
                'starter_exported',
            ])],
            'session_id' => ['nullable', 'uuid'],
            'event_id' => ['nullable', 'uuid'],
            'form_id' => ['nullable', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'variant_id' => ['nullable', 'integer'],
            'experiment_id' => ['nullable', 'integer'],
            'attribution' => ['nullable', 'array:utm_source,utm_medium,utm_campaign,utm_term,utm_content,referrer,landing_page,device'],
            'attribution.utm_source' => ['nullable', 'string', 'max:100', 'not_regex:/@/'],
            'attribution.utm_medium' => ['nullable', 'string', 'max:100', 'not_regex:/@/'],
            'attribution.utm_campaign' => ['nullable', 'string', 'max:100', 'not_regex:/@/'],
            'attribution.utm_term' => ['nullable', 'string', 'max:100', 'not_regex:/@/'],
            'attribution.utm_content' => ['nullable', 'string', 'max:100', 'not_regex:/@/'],
            'attribution.referrer' => ['nullable', 'url', 'max:2000'],
            'attribution.landing_page' => ['nullable', 'string', 'max:255'],
            'attribution.device' => ['nullable', Rule::in(['mobile', 'tablet', 'desktop'])],
            'metadata' => ['nullable', 'array:page,device,step,cta,block_id', 'max:5'],
            'metadata.page' => ['nullable', 'string', 'max:255'],
            'metadata.device' => ['nullable', Rule::in(['mobile', 'tablet', 'desktop'])],
            'metadata.step' => ['nullable', 'integer', 'min:1', 'max:100'],
            'metadata.cta' => ['nullable', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'metadata.block_id' => ['nullable', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_-]+$/'],
        ]);

        $serverEvents = [
            'form_submitted',
            'quiz_completed',
            'lead_created',
            'email_sent',
            'email_opened',
            'email_clicked',
            'checkout_started',
            'purchase_completed',
            'branch_evaluated',
            'code_audit_completed',
            'code_audit_report_unlocked',
            'playground_simulated',
            'starter_exported',
        ];
        abort_if(
            in_array($validated['event_type'], $serverEvents, true) && ! $request->user()?->can('update', $funnel),
            403,
        );

        if ($funnel->is_published && ! $request->user()?->can('update', $funnel)) {
            $assignedVariant = (string) $request->cookie('of_variant_'.$funnel->id, 'control');
            $submittedVariant = isset($validated['variant_id']) ? (string) $validated['variant_id'] : 'control';
            abort_unless($assignedVariant === $submittedVariant, 422, 'The reported variant does not match this visitor’s assignment.');
        }

        $experiment = null;
        if (isset($validated['experiment_id'])) {
            $experiment = $funnel->experiments()->findOrFail($validated['experiment_id']);
            $submittedVariant = isset($validated['variant_id']) ? (string) $validated['variant_id'] : 'control';
            abort_unless(
                $experiment->isAcceptingTraffic()
                && in_array((int) ($validated['variant_id'] ?? 0), $experiment->assignedVariantIds(), true) === isset($validated['variant_id'])
                && (string) $request->cookie('of_experiment_'.$funnel->id) === $experiment->id.':'.$submittedVariant,
                422,
                'The reported experiment assignment is invalid or no longer active.',
            );
        } elseif ($funnel->is_published && ! $request->user()?->can('update', $funnel)) {
            abort_unless(
                ! $funnel->experiments()->get()->contains(fn (FunnelExperiment $item) => $item->isAcceptingTraffic()),
                422,
                'An active experiment assignment is required.',
            );
        }

        if (isset($validated['variant_id'])) {
            abort_unless($funnel->variants()->whereKey($validated['variant_id'])->exists(), 422, 'Invalid experiment variant.');
            if ($experiment) {
                abort_unless(in_array((int) $validated['variant_id'], $experiment->assignedVariantIds(), true), 422, 'The variant is not part of this experiment.');
            } else {
                abort_unless($funnel->variants()->whereKey($validated['variant_id'])->where('is_active', true)->exists(), 422, 'Invalid experiment variant.');
            }
        }

        $sessionId = isset($validated['session_id']) ? hash('sha256', $validated['session_id']) : null;
        $contactId = $sessionId
            ? FunnelEvent::query()
                ->where('funnel_id', $funnel->id)
                ->where('session_id', $sessionId)
                ->whereNotNull('contact_id')
                ->value('contact_id')
            : null;
        if ($contactId && ! Contact::query()->where('user_id', $funnel->user_id)->whereKey($contactId)->exists()) {
            $contactId = null;
        }

        $eventTypes = match ($validated['event_type']) {
            'view' => ['view', 'page_viewed'],
            'form_start' => ['form_start', 'form_started'],
            default => [$validated['event_type']],
        };
        $attribution = $sanitizer->attribution($validated['attribution'] ?? []);
        $metadata = $sanitizer->eventMetadata($validated['metadata'] ?? []);
        $scoreEventIds = DB::transaction(function () use ($funnel, $validated, $sessionId, $contactId, $eventTypes, $attribution, $metadata): array {
            $ids = [];
            foreach ($eventTypes as $eventType) {
                $attributes = [
                    'contact_id' => $contactId,
                    'session_id' => $sessionId,
                    'form_id' => $validated['form_id'] ?? null,
                    'variant_id' => $validated['variant_id'] ?? null,
                    'experiment_id' => $validated['experiment_id'] ?? null,
                    'client_event_id' => $validated['event_id'] ?? null,
                    'attribution' => $attribution,
                    'metadata' => $metadata,
                    'occurred_at' => now(),
                ];
                $event = isset($validated['event_id'])
                    ? $funnel->events()->firstOrCreate([
                        'event_type' => $eventType,
                        'client_event_id' => $validated['event_id'],
                    ], $attributes)
                    : $funnel->events()->create(['event_type' => $eventType, ...$attributes]);

                if ($event->wasRecentlyCreated && $eventType === 'page_viewed' && $contactId) {
                    $ids[] = $event->id;
                }
            }

            return $ids;
        });

        foreach ($scoreEventIds as $eventId) {
            $scoring = CalculateLeadScore::dispatch($eventId)
                ->onQueue(config('automation.queue', 'default'));
            if (config('queue.default') === 'sync') {
                $scoring->afterResponse();
            }
        }

        return response()->json(['recorded' => true], 202);
    }
}
