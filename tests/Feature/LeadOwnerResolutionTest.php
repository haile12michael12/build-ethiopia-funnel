<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('lead owner resolves from BUSINESS_AUDIT_OWNER_ID when it points to an existing account', function () {
    config(['business.owner_email' => 'admin@example.test']);
    $admin = User::factory()->create(['email' => 'admin@example.test']);
    $crmOwner = User::factory()->create();

    config(['business-audit.owner_id' => $crmOwner->id]);

    expect(User::configuredLeadOwner()?->id)->toBe($crmOwner->id)
        ->and(User::configuredLeadOwner()?->id)->not->toBe($admin->id);
});

test('lead owner falls back to the ADMIN_EMAIL account when BUSINESS_AUDIT_OWNER_ID is blank or stale', function () {
    config(['business.owner_email' => 'admin@example.test']);
    $admin = User::factory()->create(['email' => 'Admin@Example.Test']);

    config(['business-audit.owner_id' => null]);
    expect(User::configuredLeadOwner()?->id)->toBe($admin->id);

    // A stale numeric id (deleted account) must also fall back.
    config(['business-audit.owner_id' => 99999]);
    expect(User::configuredLeadOwner()?->id)->toBe($admin->id);
});

test('lead owner stays unresolved when neither setting points to an account', function () {
    config(['business.owner_email' => null, 'business-audit.owner_id' => null]);
    expect(User::configuredLeadOwner())->toBeNull();

    config(['business-audit.owner_id' => 99999]);
    expect(User::configuredLeadOwner())->toBeNull();
});

test('public audit submissions work with only ADMIN_EMAIL configured', function () {
    config(['business.owner_email' => 'admin@example.test', 'business-audit.owner_id' => null]);
    $admin = User::factory()->create(['email' => 'admin@example.test']);

    $this->post(route('business-audit.store'), [
        'name' => 'Selam Tesfaye',
        'business_name' => 'Addis Design Studio',
        'email' => 'selam@example.com',
        'phone' => '0911 223344',
        'website_status' => 'live',
        'service_interests' => ['website'],
        'budget' => 'over_500000',
        'timeline' => 'within_1_month',
    ])->assertRedirect();

    expect($admin->contacts()->where('email', 'selam@example.com')->exists())->toBeTrue();
});
