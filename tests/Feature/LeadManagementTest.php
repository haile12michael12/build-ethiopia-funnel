<?php

use App\Models\Contact;
use App\Models\FollowUpTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function leadManagementContact(User $owner, array $overrides = []): Contact
{
    return $owner->contacts()->create(array_replace([
        'name' => 'Selam Tesfaye',
        'email' => fake()->unique()->safeEmail(),
        'phone' => '+251911223344',
        'source' => 'client_acquisition',
        'status' => 'reviewing',
        'lead_score' => 82,
        'client_project' => [
            'market' => 'ethiopia',
            'country' => 'Ethiopia',
            'service_interests' => ['web_app'],
            'service_labels' => ['Website or web application'],
            'budget' => 'etb_100000_500000',
            'budget_currency' => 'ETB',
            'budget_label' => 'ETB 100,000–500,000',
            'timeline_label' => 'Within one month',
        ],
    ], $overrides));
}

test('lead list supports server-side project filters and score sorting without exposing other owners', function () {
    $owner = User::factory()->create();
    $matching = leadManagementContact($owner);
    leadManagementContact($owner, [
        'client_project' => [
            'market' => 'international',
            'country' => 'Kenya',
            'service_interests' => ['automation'],
            'service_labels' => ['Automation'],
            'budget' => 'usd_1000_5000',
            'budget_currency' => 'USD',
        ],
        'lead_score' => 95,
    ]);
    leadManagementContact(User::factory()->create(), ['email' => 'private@example.test']);

    $this->actingAs($owner)
        ->withoutVite()
        ->get(route('contacts.index', [
            'market' => 'ethiopia',
            'service' => 'web_app',
            'budget' => 'etb_100000_500000',
            'budget_currency' => 'ETB',
            'score_min' => 80,
            'sort' => 'score',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('contacts')
            ->has('contacts.data', 1)
            ->where('contacts.data.0.id', $matching->id)
            ->where('contacts.data.0.lead_score', 82));
});

test('lead status changes, internal notes and contact attempts are recorded only for the contact owner', function () {
    $owner = User::factory()->create();
    $contact = leadManagementContact($owner);
    $other = User::factory()->create();

    $this->actingAs($owner)->patch(route('contacts.update', $contact), [
        'status' => 'proposal_sent',
    ])->assertRedirect();
    $this->assertDatabaseHas('contact_activities', [
        'contact_id' => $contact->id,
        'type' => 'status_changed',
    ]);

    $this->actingAs($owner)->patch(route('contacts.update', $contact), [
        'status' => 'lost',
        'lost_reason' => 'timing',
    ])->assertRedirect();
    expect($contact->fresh()->lost_reason)->toBe('timing');

    $this->actingAs($owner)->post(route('contacts.notes.store', $contact), [
        'note' => 'Internal context only.',
    ])->assertRedirect();
    $this->actingAs($owner)->post(route('contacts.contact-attempts.store', $contact), [
        'channel' => 'email',
        'note' => 'Prepared a draft; not sent automatically.',
    ])->assertRedirect();
    expect($contact->fresh()->last_contacted_at)->not->toBeNull();
    $this->assertDatabaseHas('contact_activities', ['contact_id' => $contact->id, 'type' => 'note_added']);
    $this->assertDatabaseHas('contact_activities', ['contact_id' => $contact->id, 'type' => 'contact_attempt']);

    $this->actingAs($other)->patch(route('contacts.update', $contact), ['status' => 'won'])->assertForbidden();
    $this->actingAs($other)->post(route('contacts.notes.store', $contact), ['note' => 'Private'])->assertForbidden();
    $this->actingAs($owner)->patch(route('contacts.update', $contact), ['status' => 'invalid'])->assertSessionHasErrors('status');
});

test('lead detail edits validate currency and recalculate score without replacing attribution', function () {
    $owner = User::factory()->create();
    $contact = leadManagementContact($owner, [
        'client_project' => [
            'business_name' => 'Addis Studio',
            'market' => 'ethiopia',
            'country' => 'Ethiopia',
            'service_interests' => ['web_app'],
            'service_labels' => ['Website or web application'],
            'project_description' => str_repeat('Detailed project description. ', 5),
            'budget' => 'etb_100000_500000',
            'budget_currency' => 'ETB',
            'budget_label' => 'ETB 100,000–500,000',
            'timeline' => 'within_1_month',
            'timeline_label' => 'Within one month',
            'attribution' => ['utm_source' => 'original'],
            'social_links' => [],
            'preferred_contact' => 'email',
        ],
    ]);

    $this->actingAs($owner)->put(route('contacts.details.update', $contact), [
        'name' => 'Updated Name',
        'email' => $contact->email,
        'phone' => '+251911223344',
        'business_name' => 'Updated Studio',
        'market' => 'ethiopia',
        'country' => 'Ethiopia',
        'service_interests' => ['web_app'],
        'project_description' => str_repeat('Updated project details. ', 5),
        'budget' => 'usd_over_5000',
        'timeline' => 'within_1_month',
        'website' => null,
        'additional_requirements' => null,
        'preferred_contact' => 'email',
    ])->assertSessionHasErrors('budget');

    $this->actingAs($owner)->put(route('contacts.details.update', $contact), [
        'name' => 'Updated Name',
        'email' => $contact->email,
        'phone' => '+251911223344',
        'business_name' => 'Updated Studio',
        'market' => 'ethiopia',
        'country' => 'Ethiopia',
        'service_interests' => ['web_app'],
        'project_description' => str_repeat('Updated project details. ', 5),
        'budget' => 'etb_100000_500000',
        'timeline' => 'within_1_month',
        'website' => null,
        'additional_requirements' => null,
        'preferred_contact' => 'email',
    ])->assertRedirect();

    expect($contact->fresh()->name)->toBe('Updated Name')
        ->and(data_get($contact->fresh()->client_project, 'attribution.utm_source'))->toBe('original')
        ->and(data_get($contact->fresh()->client_project, 'budget_currency'))->toBe('ETB')
        ->and($contact->fresh()->last_scored_at)->not->toBeNull();
    $this->assertDatabaseHas('contact_activities', ['contact_id' => $contact->id, 'type' => 'details_updated']);
});

test('follow-up tasks can be created completed and listed by due view without cross-owner access', function () {
    $owner = User::factory()->create();
    $contact = leadManagementContact($owner);
    $other = User::factory()->create();
    $foreignTask = FollowUpTask::query()->create([
        'user_id' => $other->id,
        'contact_id' => leadManagementContact($other)->id,
        'title' => 'Private task',
        'due_at' => now()->addDay(),
    ]);

    $this->actingAs($owner)->post(route('follow-up-tasks.store', $contact->id), [
        'title' => 'Call about discovery',
        'description' => 'Ask about the project scope.',
        'due_at' => now()->addDays(2)->format('Y-m-d\TH:i'),
    ])->assertRedirect();
    $task = $owner->followUpTasks()->firstOrFail();
    expect($task->contact_id)->toBe($contact->id)
        ->and($task->status)->toBe('pending');

    $this->actingAs($owner)->withoutVite()->get(route('follow-up-tasks.index', ['view' => 'upcoming']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('follow-up-tasks/index')->has('tasks.data', 1));
    $this->actingAs($owner)->patch(route('follow-up-tasks.update', $task), ['status' => 'completed'])->assertRedirect();
    expect($task->fresh()->status)->toBe('completed')
        ->and($task->fresh()->completed_at)->not->toBeNull();
    $this->actingAs($owner)->patch(route('follow-up-tasks.update', $task), ['due_at' => now()->addDays(3)->format('Y-m-d\TH:i')])->assertRedirect();
    $this->actingAs($owner)->patch(route('follow-up-tasks.update', $foreignTask), ['status' => 'cancelled'])->assertForbidden();
    $this->actingAs($other)->post(route('follow-up-tasks.store', $contact->id), [
        'title' => 'Unauthorized',
        'due_at' => now()->addHour()->format('Y-m-d\TH:i'),
    ])->assertForbidden();
});

test('lead analytics use actual contacts and opportunity outcomes for the selected period', function () {
    $owner = User::factory()->create();
    $contact = leadManagementContact($owner);
    $contact->submissions()->create([
        'fields' => ['form' => 'project'],
        'source' => 'client_acquisition',
    ]);
    $pipeline = $owner->pipelines()->create(['name' => 'Consulting', 'currency' => 'ETB']);
    $stage = $pipeline->stages()->create(['name' => 'Won', 'position' => 0, 'probability' => 100]);
    $owner->opportunities()->create([
        'pipeline_id' => $pipeline->id,
        'pipeline_stage_id' => $stage->id,
        'contact_id' => $contact->id,
        'title' => 'Recorded work',
        'value_cents' => 125000,
        'status' => 'won',
        'closed_at' => now(),
    ]);
    $owner->followUpTasks()->create([
        'contact_id' => $contact->id,
        'title' => 'Late follow-up',
        'due_at' => now()->subDay(),
    ]);

    $this->actingAs($owner)
        ->withoutVite()
        ->get(route('client-acquisition.analytics'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-acquisition/analytics')
            ->where('metrics.total_inquiries', 1)
            ->where('metrics.new_inquiries', 1)
            ->where('metrics.qualified_leads', 0)
            ->where('metrics.overdue_tasks', 1)
            ->where('metrics.won_revenue.0.currency', 'ETB')
            ->where('metrics.won_revenue.0.amount_minor', 125000));
});
