<?php

use App\Models\User;
use App\Models\FollowUpTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/admin')->assertRedirect('/login');
});

test('customers can visit their dashboard', function () {
    config(['business.owner_email' => 'admin@example.test']);
    $this->actingAs(User::factory()->create())->get('/dashboard')->assertOk();
});

test('the configured owner can visit the admin dashboard', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $owner->email]);

    $this->actingAs($owner)->get('/admin')->assertOk();
});

test('dashboard operational summaries use owner-scoped CRM and portfolio data and support segment filters', function () {
    $user = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $user->email]);
    $other = User::factory()->create();
    $contact = $user->contacts()->create([
        'email' => 'ethiopian-prospect@example.test',
        'name' => 'Ethiopian Prospect',
        'status' => 'new',
        'client_project' => [
            'market' => 'ethiopia',
            'service_interests' => ['web_app'],
        ],
    ]);
    $user->contacts()->create([
        'email' => 'qualified-prospect@example.test',
        'name' => 'Qualified Prospect',
        'status' => 'qualified',
        'client_project' => [
            'market' => 'international',
            'service_interests' => ['automation'],
        ],
    ]);
    $other->contacts()->create([
        'email' => 'other-account@example.test',
        'name' => 'Other Account',
        'status' => 'new',
        'client_project' => [
            'market' => 'ethiopia',
            'service_interests' => ['web_app'],
        ],
    ]);
    FollowUpTask::query()->create([
        'user_id' => $user->id,
        'contact_id' => $contact->id,
        'title' => 'Follow up today',
        'due_at' => now()->addHour(),
        'status' => 'pending',
    ]);
    $user->projects()->create([
        'title_en' => 'Published portfolio',
        'slug' => 'published-portfolio',
        'status' => 'published',
        'is_published' => true,
    ]);

    $this->actingAs($user)->get('/admin?market=ethiopia&service=web_app&status=new')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('operations.new_prospects', 1)
            ->where('operations.qualified_leads', 0)
            ->where('operations.follow_ups_today', 1)
            ->where('operations.published_portfolio_projects', 1)
            ->where('stats.total_contacts', 2)
            ->where('filters.market', 'ethiopia')
            ->where('filters.service', 'web_app')
        );
});
