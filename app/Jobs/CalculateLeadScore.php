<?php

namespace App\Jobs;

use App\Models\Contact;
use App\Models\FunnelEvent;
use App\Models\LeadScoringRule;
use App\Services\Automation\AutomationEventRecorder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class CalculateLeadScore implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    public function __construct(public int $funnelEventId) {}

    public function handle(AutomationEventRecorder $automationEvents): void
    {
        DB::transaction(function () use ($automationEvents): void {
            $event = FunnelEvent::query()->lockForUpdate()->find($this->funnelEventId);
            if (! $event || $event->scored_at || ! $event->contact_id) {
                return;
            }

            $contact = Contact::query()->lockForUpdate()
                ->whereKey($event->contact_id)
                ->where('user_id', $event->funnel()->value('user_id'))
                ->first();
            if (! $contact) {
                return;
            }

            $this->ensureDefaultRules($contact->user_id);
            $context = [
                'event' => $event->event_type,
                'page' => data_get($event->metadata, 'page'),
                'form_id' => $event->form_id,
                'metadata' => $event->metadata ?? [],
                'attribution' => $event->attribution ?? [],
            ];
            $points = LeadScoringRule::query()
                ->where('user_id', $contact->user_id)
                ->where('event', $event->event_type)
                ->where('active', true)
                ->get()
                ->sum(function (LeadScoringRule $rule) use ($context): int {
                    $actual = data_get($context, $rule->field);
                    $expected = $rule->value;

                    return $actual !== null && (string) $actual === (string) $expected
                        ? $rule->points
                        : 0;
                });

            $previousScore = $contact->lead_score;
            $nextScore = $previousScore + $points;
            $nextBand = $this->band($nextScore);
            $metadata = $contact->metadata ?? [];
            $previousBand = $metadata['lead_score_band'] ?? null;
            if ($points > 0) {
                $metadata['lead_score_band'] = $nextBand;
            }
            $contact->forceFill([
                'lead_score' => $nextScore,
                'last_scored_at' => now(),
                'metadata' => $metadata,
            ])->save();

            if ($points > 0 && $previousBand !== $nextBand) {
                $automationEvents->record(
                    $contact->user,
                    'contact.lead_score_updated',
                    contact: $contact,
                    funnel: $event->funnel,
                    payload: [
                        'previous_score' => $previousScore,
                        'lead_score' => $nextScore,
                        'previous_band' => $previousBand,
                        'score_band' => $nextBand,
                    ],
                );
            }

            $event->forceFill(['scored_at' => now()])->save();
        });
    }

    private function ensureDefaultRules(int $userId): void
    {
        if (LeadScoringRule::query()->where('user_id', $userId)->exists()) {
            return;
        }

        $defaults = [
            ['event' => 'page_viewed', 'field' => 'page', 'value' => '/pricing', 'points' => 10],
            ['event' => 'form_submitted', 'field' => 'event', 'value' => 'form_submitted', 'points' => 25],
            ['event' => 'quiz_completed', 'field' => 'event', 'value' => 'quiz_completed', 'points' => 20],
            ['event' => 'email_opened', 'field' => 'event', 'value' => 'email_opened', 'points' => 5],
            ['event' => 'email_clicked', 'field' => 'event', 'value' => 'email_clicked', 'points' => 10],
            ['event' => 'checkout_started', 'field' => 'event', 'value' => 'checkout_started', 'points' => 40],
            ['event' => 'purchase_completed', 'field' => 'event', 'value' => 'purchase_completed', 'points' => 100],
        ];

        foreach ($defaults as $rule) {
            LeadScoringRule::query()->firstOrCreate(
                ['user_id' => $userId, 'event' => $rule['event'], 'field' => $rule['field'], 'value' => $rule['value']],
                ['points' => $rule['points'], 'active' => true],
            );
        }

    }

    private function band(int $score): string
    {
        return match (true) {
            $score < 40 => 'educational',
            $score < 80 => 'offers',
            default => 'consulting',
        };
    }
}
