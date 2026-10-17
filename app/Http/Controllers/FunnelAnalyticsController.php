<?php

namespace App\Http\Controllers;

use App\Jobs\CalculateLeadScore;
use App\Models\Contact;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FunnelAnalyticsController extends Controller
{
    public function store(Request $request, Funnel $funnel): JsonResponse
    {
        abort_unless($funnel->is_published || $request->user()?->can('update', $funnel), 404);

        $validated = $request->validate([
            'event_type' => ['required', Rule::in([
                'view',
                'cta_click',
                'form_start',
                'form_step',
                'page_viewed',
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
            'form_id' => ['nullable', 'string', 'max:100'],
            'variant_id' => ['nullable', 'integer'],
            'attribution' => ['nullable', 'array'],
            'attribution.*' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array', 'max:20'],
            'metadata.*' => ['nullable', 'string', 'max:500'],
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

        if (isset($validated['variant_id']) && ! $funnel->variants()->whereKey($validated['variant_id'])->exists()) {
            abort(422, 'Invalid experiment variant.');
        }

        $sessionId = isset($validated['session_id']) ? hash('sha256', $validated['session_id']) : null;
        $contactId = $sessionId
            ? FunnelEvent::query()
                ->where('session_id', $sessionId)
                ->whereNotNull('contact_id')
                ->whereHas('funnel', fn ($query) => $query->where('user_id', $funnel->user_id))
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
        $scoreEventIds = DB::transaction(function () use ($funnel, $validated, $sessionId, $contactId, $eventTypes): array {
            $ids = [];
            foreach ($eventTypes as $eventType) {
                $event = $funnel->events()->create([
                    ...$validated,
                    'event_type' => $eventType,
                    'contact_id' => $contactId,
                    'session_id' => $sessionId,
                    'metadata' => [
                        ...($validated['metadata'] ?? []),
                    ],
                    'occurred_at' => now(),
                ]);
                if ($eventType === 'page_viewed' && $contactId) {
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
