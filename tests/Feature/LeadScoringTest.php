<?php

use App\Jobs\CalculateLeadScore;
use App\Models\AutomationEvent;
use App\Models\Contact;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\LeadScoringRule;
use App\Models\User;
use App\Services\Automation\AutomationEventRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function scoreableFunnel(User $user): Funnel
{
    return $user->funnels()->create([
        'name' => 'Scoring funnel',
        'slug' => 'scoring-funnel',
        'content' => ['sections' => []],
        'settings' => [],
        'status' => 'published',
        'is_published' => true,
    ]);
}

test('queued lead scoring applies default rules once per analytics event', function () {
    $user = User::factory()->create();
    $funnel = scoreableFunnel($user);
    $contact = $user->contacts()->create([
        'funnel_id' => $funnel->id,
        'email' => 'developer@example.com',
        'source' => 'funnel_form',
        'status' => 'new',
    ]);
    $event = $funnel->events()->create([
        'contact_id' => $contact->id,
        'event_type' => 'form_submitted',
        'occurred_at' => now(),
    ]);
    $job = new CalculateLeadScore($event->id);

    $job->handle(app(AutomationEventRecorder::class));
    $job->handle(app(AutomationEventRecorder::class));

    expect($contact->fresh()->lead_score)->toBe(25)
        ->and($contact->fresh()->last_scored_at)->not->toBeNull()
        ->and($event->fresh()->scored_at)->not->toBeNull()
        ->and($contact->fresh()->metadata['lead_score_band'])->toBe('educational')
        ->and(LeadScoringRule::query()->where('user_id', $user->id)->count())->toBe(12);
    $this->assertDatabaseHas('automation_events', [
        'user_id' => $user->id,
        'contact_id' => $contact->id,
        'event_type' => 'contact.lead_score_updated',
    ]);

    $routingEvent = AutomationEvent::query()->where('contact_id', $contact->id)->firstOrFail();
    expect($routingEvent->payload)->toMatchArray([
        'previous_score' => 0,
        'lead_score' => 25,
        'previous_band' => null,
        'score_band' => 'educational',
    ]);
});

test('page engagement points use the configured page path and ignore another owner rules', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $funnel = scoreableFunnel($user);
    $contact = $user->contacts()->create([
        'funnel_id' => $funnel->id,
        'email' => 'visitor@example.com',
        'source' => 'funnel_form',
        'status' => 'new',
    ]);
    $event = $funnel->events()->create([
        'contact_id' => $contact->id,
        'event_type' => 'page_viewed',
        'metadata' => ['page' => '/pricing'],
        'occurred_at' => now(),
    ]);

    LeadScoringRule::query()->create([
        'user_id' => $otherUser->id,
        'event' => 'page_viewed',
        'field' => 'page',
        'value' => '/pricing',
        'points' => 200,
    ]);

    (new CalculateLeadScore($event->id))->handle(app(AutomationEventRecorder::class));

    expect($contact->fresh()->lead_score)->toBe(10);
});

test('lead capture asynchronously schedules scoring for linked analytics events', function () {
    Queue::fake();
    $user = User::factory()->create();
    $funnel = scoreableFunnel($user);
    $sessionId = '0f85d79b-17b2-461f-a7e1-6f3cba2c9b8d';
    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'view',
        'session_id' => $sessionId,
        'metadata' => ['page' => '/pricing'],
    ])->assertAccepted();

    $this->post(route('funnels.leads.store', $funnel), [
        'email' => 'linked@example.com',
        'session_id' => $sessionId,
    ])->assertRedirect();

    $contact = Contact::query()->where('email', 'linked@example.com')->firstOrFail();
    expect(FunnelEvent::query()
        ->where('contact_id', $contact->id)
        ->where('event_type', 'page_viewed')
        ->exists())->toBeTrue();
    Queue::assertPushed(CalculateLeadScore::class);
});

test('public analytics clients cannot report privileged purchase events', function () {
    $funnel = scoreableFunnel(User::factory()->create());

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'purchase_completed',
        'session_id' => 'b59e20af-b3a8-445c-8a66-23a4a9301f62',
    ])->assertForbidden();
});
