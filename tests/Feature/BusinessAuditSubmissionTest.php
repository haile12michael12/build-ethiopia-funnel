<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function validBusinessAuditPayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Selam Tesfaye',
        'business_name' => 'Addis Design Studio',
        'email' => 'selam@example.com',
        'phone' => '0911 223344',
        'website' => 'https://addis.example.com',
        'website_status' => 'live',
        'service_interests' => ['website', 'marketing'],
        'budget' => 'over_500000',
        'timeline' => 'within_1_month',
    ], $overrides);
}

test('public audit form renders configured choices without requiring login', function () {
    $this->withoutVite()
        ->get(route('business-audit.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit/business-growth')
            ->has('options.services')
            ->where('options.budgets.0.value', 'under_25000'));
});

test('audit submissions create a scored contact, submission history, and signed report for the configured owner', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $response = $this->post(route('business-audit.store'), validBusinessAuditPayload())
        ->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    expect($contact->phone)->toBe('+251911223344')
        ->and($contact->source)->toBe('business_audit')
        ->and($contact->status)->toBe('qualified')
        ->and($contact->lead_score)->toBe(85)
        ->and($contact->lead_score_breakdown)->toBe([
            'business_profile' => 10,
            'website_readiness' => 10,
            'service_interest' => 10,
            'budget' => 30,
            'timeline' => 25,
        ])
        ->and(data_get($contact->business_audit, 'business_name'))->toBe('Addis Design Studio')
        ->and($contact->submissions)->toHaveCount(1)
        ->and($otherUser->contacts()->count())->toBe(0);

    $this->assertDatabaseHas('contact_submissions', [
        'contact_id' => $contact->id,
        'source' => 'business_audit',
    ]);
    $this->assertDatabaseHas('automation_events', [
        'user_id' => $owner->id,
        'contact_id' => $contact->id,
        'event_type' => 'contact.created',
        'status' => 'pending',
    ]);
    expect($response->headers->get('Location'))
        ->toContain('/business-growth-audit/thank-you/'.$contact->id)
        ->toContain('signature=');

    $this->withoutVite()
        ->get($response->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit/thank-you')
            ->where('audit.business_name', 'Addis Design Studio')
            ->where('audit.score', 85)
            ->where('audit.report.label', 'Ready to grow')
            ->has('audit.report.recommendations', 3));
});

test('repeat audits update the existing owner contact and preserve every submission', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $this->post(route('business-audit.store'), validBusinessAuditPayload())->assertRedirect();
    $this->post(route('business-audit.store'), validBusinessAuditPayload([
        'business_name' => 'Selam Trading',
        'phone' => '',
        'website_status' => 'no_website',
        'budget' => 'under_25000',
        'timeline' => 'researching',
    ]))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    expect($owner->contacts()->count())->toBe(1)
        ->and($contact->submissions()->count())->toBe(2)
        ->and(data_get($contact->metadata, 'submission_count'))->toBe(2)
        ->and(data_get($contact->business_audit, 'business_name'))->toBe('Selam Trading')
        ->and($contact->phone)->toBe('+251911223344')
        ->and($owner->automationEvents()->where('event_type', 'contact.created')->count())->toBe(1);
});

test('invalid audit values and phone numbers do not create a contact', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $this->post(route('business-audit.store'), validBusinessAuditPayload([
        'phone' => '12345',
        'budget' => 'unlimited',
    ]))->assertSessionHasErrors(['phone', 'budget']);

    $this->assertDatabaseMissing('contacts', ['email' => 'selam@example.com']);
});

test('audit submission fails explicitly until a valid owner is configured', function () {
    config(['business-audit.owner_id' => null]);

    $this->post(route('business-audit.store'), validBusinessAuditPayload())
        ->assertStatus(503);

    $this->assertDatabaseMissing('contacts', ['email' => 'selam@example.com']);
});

test('thank-you report requires a valid temporary signature', function () {
    $contact = User::factory()->create()->contacts()->create([
        'email' => 'private@example.com',
        'business_audit' => ['business_name' => 'Private Studio'],
        'lead_score' => 10,
        'lead_score_breakdown' => [],
    ]);

    $this->get(route('business-audit.thank-you', $contact))
        ->assertForbidden();
});
