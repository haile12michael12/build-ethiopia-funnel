<?php

use App\Contracts\CopilotAdvisor;
use App\Jobs\GenerateDeveloperAiRecommendations;
use App\Models\Contact;
use App\Models\DeveloperAiRecommendation;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Marketplace\MarketplaceAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    test()->withoutVite();
});

test('workspace invitations assign scoped roles and only the invited email can accept', function () {
    $owner = User::factory()->create();
    $invitee = User::factory()->create(['email' => 'editor@example.com']);
    $workspace = Workspace::query()->create([
        'owner_id' => $owner->id,
        'name' => 'Product Team',
        'slug' => 'product-team-unique',
    ]);
    $workspace->members()->attach($owner->id, ['role' => 'owner']);

    $this->actingAs($owner)->post(route('workspaces.invitations.store', $workspace), [
        'email' => $invitee->email,
        'role' => 'editor',
    ])->assertRedirect(route('workspaces.index'))
        ->assertSessionHas('workspace_invite_url');

    $url = session('workspace_invite_url');
    $token = explode('/', trim(parse_url($url, PHP_URL_PATH), '/'))[1];
    $this->actingAs(User::factory()->create(['email' => 'other@example.com']))
        ->get(route('workspaces.invitations.show', $token))
        ->assertForbidden();

    $this->actingAs($invitee)->get(route('workspaces.invitations.show', $token))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('workspaces/accept')
            ->where('workspace', 'Product Team')
            ->where('role', 'editor'));
    $this->actingAs($invitee)->post(route('workspaces.invitations.accept', $token))
        ->assertRedirect(route('workspaces.index'));

    expect($workspace->fresh()->members()->whereKey($invitee->id)->firstOrFail()->pivot->role)->toBe('editor')
        ->and($workspace->invitations()->firstOrFail()->accepted_at)->not->toBeNull();
});

test('workspace admins cannot grant admin role and viewers cannot submit workspace templates', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $viewer = User::factory()->create();
    $editor = User::factory()->create();
    $workspace = Workspace::query()->create([
        'owner_id' => $owner->id,
        'name' => 'Roles Team',
        'slug' => 'roles-team-unique',
    ]);
    $workspace->members()->attach($owner->id, ['role' => 'owner']);
    $workspace->members()->attach($admin->id, ['role' => 'admin']);
    $workspace->members()->attach($viewer->id, ['role' => 'viewer']);
    $workspace->members()->attach($editor->id, ['role' => 'editor']);

    $this->actingAs($admin)->post(route('workspaces.invitations.store', $workspace), [
        'email' => 'new-admin@example.com',
        'role' => 'admin',
    ])->assertForbidden();

    $this->actingAs($viewer)->post(route('marketplace.submissions.store'), [
        'type' => 'template',
        'name' => 'Viewer submission',
        'description' => 'Not allowed.',
        'tech_stack' => ['React'],
        'included_modules' => ['forms'],
        'version' => '1.0.0',
        'license' => 'Personal use',
        'workspace_id' => $workspace->id,
    ])->assertForbidden();

    $this->actingAs($editor)->post(route('marketplace.submissions.store'), [
        'type' => 'template',
        'name' => 'Workspace starter',
        'description' => 'A team contribution.',
        'tech_stack' => ['React'],
        'included_modules' => ['forms'],
        'version' => '1.0.0',
        'license' => 'Team use',
        'workspace_id' => $workspace->id,
    ])->assertRedirect(route('marketplace.index'));
    $this->actingAs($viewer)->get(route('marketplace.index'))
        ->assertInertia(fn ($page) => $page
            ->where('mySubmissions.0.name', 'Workspace starter')
            ->where('mySubmissions.0.workspace', 'Roles Team'));
});

test('workspace members can access approved workspace template artifacts', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $workspace = Workspace::query()->create([
        'owner_id' => $owner->id,
        'name' => 'Shared Assets',
        'slug' => 'shared-assets-unique',
    ]);
    $workspace->members()->attach($owner->id, ['role' => 'owner']);
    $workspace->members()->attach($member->id, ['role' => 'analyst']);
    $template = MarketplaceTemplate::query()->create([
        'workspace_id' => $workspace->id,
        'owner_id' => $owner->id,
        'slug' => 'shared-workspace-template',
        'type' => 'template',
        'name' => 'Shared template',
        'description' => 'Team artifact',
        'tech_stack' => ['React'],
        'included_modules' => ['forms'],
        'version' => '1.0.0',
        'license' => 'Team use',
        'status' => 'published',
        'file_path' => 'marketplace/shared/template.zip',
        'amount_minor' => 1000,
        'currency' => 'ETB',
    ]);

    expect(app(MarketplaceAccessService::class)->hasAccess($member, $template))->toBeTrue();
});

test('developer ai recommendations are queued with minimized inputs then held for human review', function () {
    Queue::fake();
    $user = User::factory()->create();
    $funnel = $user->funnels()->create([
        'slug' => 'developer-quiz',
        'name' => 'Developer quiz',
        'content' => ['sections' => []],
        'settings' => [],
    ]);
    $contact = Contact::query()->create([
        'user_id' => $user->id,
        'funnel_id' => $funnel->id,
        'email' => 'lead@example.com',
        'name' => 'Private Lead Name',
        'source' => 'developer_quiz',
        'status' => 'new',
        'lead_score' => 55,
        'metadata' => ['developer_quiz_answers' => ['goal' => 'launch-saas']],
        'lead_score_reasons' => [['key' => 'quiz', 'points' => 20, 'reason' => 'Completed quiz']],
        'business_audit' => ['company_name' => 'Private Org', 'revenue' => 'unknown'],
    ]);

    $this->actingAs($user)->post(route('contacts.developer-ai-recommendations.store', $contact))
        ->assertRedirect();

    $recommendation = DeveloperAiRecommendation::query()->firstOrFail();
    expect($recommendation->status)->toBe('queued')
        ->and($recommendation->context_snapshot)->not->toHaveKey('email')
        ->and(json_encode($recommendation->context_snapshot))->not->toContain('Private Lead Name')
        ->and(json_encode($recommendation->context_snapshot))->not->toContain('Private Org');
    Queue::assertPushed(GenerateDeveloperAiRecommendations::class);

    $result = [
        'explanations' => [],
        'copy_suggestions' => [],
        'experiment_hypotheses' => [
            ['hypothesis' => 'Show a starter tailored to launch goals.', 'primary_metric' => 'offer_viewed', 'variant_description' => 'Focused next step'],
        ],
        'next_steps' => ['Review the launch-oriented starter offer.'],
    ];
    $this->mock(CopilotAdvisor::class, fn ($mock) => $mock->shouldReceive('advise')->once()->andReturn($result));
    app(GenerateDeveloperAiRecommendations::class, ['recommendationId' => $recommendation->id])
        ->handle(app(CopilotAdvisor::class));

    expect($recommendation->fresh()->status)->toBe('pending_review')
        ->and($recommendation->fresh()->recommendations)->toBe($result);

    $this->actingAs($user)->patch(
        route('contacts.developer-ai-recommendations.review', [$contact, $recommendation]),
        ['decision' => 'accepted'],
    )->assertRedirect();
    expect($recommendation->fresh()->status)->toBe('accepted')
        ->and($recommendation->fresh()->reviewed_at)->not->toBeNull();
});

test('ai recommendation requests are restricted to the contact owner and developer leads', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $contact = $owner->contacts()->create([
        'email' => 'ordinary@example.com',
        'source' => 'business_audit',
        'status' => 'new',
    ]);

    $this->actingAs($other)->post(route('contacts.developer-ai-recommendations.store', $contact))
        ->assertForbidden();
    $this->actingAs($owner)->post(route('contacts.developer-ai-recommendations.store', $contact))
        ->assertStatus(422);
});

test('ai recommendation provider failures are recorded without exposing provider errors', function () {
    $user = User::factory()->create();
    $funnel = $user->funnels()->create([
        'slug' => 'developer-quiz',
        'name' => 'Developer quiz',
        'content' => ['sections' => []],
        'settings' => [],
    ]);
    $contact = $user->contacts()->create([
        'funnel_id' => $funnel->id,
        'email' => 'failed-ai@example.com',
        'source' => 'developer_quiz',
        'status' => 'new',
    ]);
    $recommendation = $contact->developerAiRecommendations()->create([
        'user_id' => $user->id,
        'status' => 'queued',
        'context_snapshot' => ['lead_score' => 0],
    ]);

    $this->mock(CopilotAdvisor::class, fn ($mock) => $mock->shouldReceive('advise')->once()->andThrow(new RuntimeException('provider secret detail')));
    (new GenerateDeveloperAiRecommendations($recommendation->id))->handle(app(CopilotAdvisor::class));

    expect($recommendation->fresh()->status)->toBe('failed')
        ->and($recommendation->fresh()->error_message)->toBe('AI recommendations could not be generated. Please try again later.')
        ->and($recommendation->fresh()->error_message)->not->toContain('provider secret detail');
});
