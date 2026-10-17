<?php

namespace App\Services;

use App\Jobs\CalculateLeadScore;
use App\Models\Contact;
use App\Models\FunnelEvent;
use Illuminate\Support\Facades\DB;

class DeveloperProductSignalRecorder
{
    private const EVENTS = [
        'code_audit_completed',
        'code_audit_report_unlocked',
        'playground_simulated',
        'starter_exported',
    ];

    public function record(Contact $contact, string $eventType, ?int $reportId = null): void
    {
        if (! in_array($eventType, self::EVENTS, true)) {
            throw new \InvalidArgumentException('Unsupported developer product event.');
        }

        $event = DB::transaction(function () use ($contact, $eventType, $reportId): ?FunnelEvent {
            $existing = FunnelEvent::query()
                ->where('contact_id', $contact->id)
                ->where('event_type', $eventType)
                ->when($reportId !== null, fn ($query) => $query->where('metadata->report_id', $reportId))
                ->exists();
            if ($existing) {
                return null;
            }

            return FunnelEvent::query()->create([
                'funnel_id' => null,
                'contact_id' => $contact->id,
                'event_type' => $eventType,
                'metadata' => $reportId === null ? [] : ['report_id' => $reportId],
                'occurred_at' => now(),
            ]);
        });

        if (! $event) {
            return;
        }

        DB::afterCommit(function () use ($event): void {
            $job = CalculateLeadScore::dispatch($event->id)
                ->onQueue(config('automation.queue', 'default'));
            if (config('queue.default') === 'sync') {
                $job->afterResponse();
            }
        });
    }
}
