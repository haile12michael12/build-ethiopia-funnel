<?php

use App\Models\FunnelVariant;
use App\Models\User;
use App\Services\DeveloperFunnelInstaller;
use App\Services\Automation\WorkflowDefinitionValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('installer creates the developer funnel pages, branching, experiment, and nurture draft', function () {
    $user = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($user);

    expect($landing->slug)->toBe('mern-saas-starter')
        ->and($user->funnels()->whereIn('slug', [
            'mern-saas-starter',
            'mern-starter-delivery',
            'developer-quiz',
            'mern-boilerplate',
            'mern-course',
            'code-review',
            'thank-you',
        ])->count())->toBe(7)
        ->and($user->funnels()->where('is_published', true)->count())->toBe(7);

    $quiz = $user->funnels()->where('slug', 'developer-quiz')->firstOrFail();
    expect($quiz->step_branches['developer-quiz']['defaultNextStepSlug'])->toBe('mern-boilerplate')
        ->and($quiz->step_branches['developer-quiz']['branches'][1]['priority'])->toBe(100);

    $variant = $landing->variants()->firstOrFail();
    expect($variant->is_active)->toBeTrue()
        ->and($variant->settings['conversion_goal'])->toBe('form_submit')
        ->and($variant->content['sections'][0]['columns'][0]['blocks'][0]['content']['text'])
        ->toBe('Stop rebuilding auth, APIs, and deployment setup.');

    $workflow = $user->automationWorkflows()->where('name', 'MERN Starter Welcome + Nurture')->firstOrFail();
    expect($workflow->status)->toBe('draft')
        ->and($workflow->draft_definition['trigger']['config']['funnel_id'])->toBe($landing->id)
        ->and(collect($workflow->draft_definition['nodes'])->where('type', 'send_email')->pluck('config.subject')->all())->toBe([
            'Your MERN starter is ready',
            'The MERN folder structure I use in production',
            'The auth mistake that breaks most MERN apps',
            'From MERN starter to deployed SaaS',
            'Get the complete MERN SaaS Boilerplate',
            'Last chance: MERN starter bonus',
        ]);

    $routingWorkflow = $user->automationWorkflows()->where('name', 'MERN Lead Score Routing')->firstOrFail();
    expect($routingWorkflow->draft_definition['trigger']['type'])->toBe('contact.lead_score_updated')
        ->and(app(WorkflowDefinitionValidator::class)->validate(
            $routingWorkflow->draft_definition,
            $user,
        ))->toBeEmpty();

    expect(app(DeveloperFunnelInstaller::class)->installFor($user)->id)->toBe($landing->id)
        ->and(FunnelVariant::query()->where('funnel_id', $landing->id)->count())->toBe(1)
        ->and($user->automationWorkflows()->where('name', 'MERN Starter Welcome + Nurture')->count())->toBe(1)
        ->and($user->automationWorkflows()->where('name', 'MERN Lead Score Routing')->count())->toBe(1);
});

test('quiz submission evaluates branching and stores quiz answers on the opted-in contact', function () {
    $user = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($user);
    $quiz = $user->funnels()->where('slug', 'developer-quiz')->firstOrFail();
    $sessionId = '862ed206-a8b6-4b04-8dc7-cc1621190cd4';

    $this->post(route('funnels.leads.store', $landing), [
        'email' => 'quiz-user@example.com',
        'name' => 'Quiz User',
        'session_id' => $sessionId,
    ])->assertRedirect();

    $this->postJson(route('funnels.steps.evaluate', $quiz), [
        'step_slug' => 'developer-quiz',
        'answers' => ['experience' => 'advanced', 'goal' => 'launch-saas', 'timeline' => 'immediately'],
        'session_id' => $sessionId,
    ])->assertOk()
        ->assertJsonPath('matched_branch', 'Ready to launch SaaS')
        ->assertJsonPath('next_step_slug', 'code-review');

    $contact = $user->contacts()->where('email', 'quiz-user@example.com')->firstOrFail();
    expect($contact->metadata['developer_quiz_answers'])->toBe([
        'experience' => 'advanced',
        'goal' => 'launch-saas',
        'timeline' => 'immediately',
    ]);
    $this->assertDatabaseHas('funnel_events', ['funnel_id' => $quiz->id, 'event_type' => 'quiz_completed', 'contact_id' => $contact->id]);
});

test('developer funnel install fails explicitly when a required slug belongs to another account', function () {
    $otherOwner = User::factory()->create();
    $otherOwner->funnels()->create([
        'slug' => 'code-review',
        'name' => 'Existing funnel',
        'content' => ['sections' => []],
        'settings' => [],
    ]);
    $owner = User::factory()->create();

    expect(fn () => app(DeveloperFunnelInstaller::class)->installFor($owner))
        ->toThrow(\Illuminate\Validation\ValidationException::class);
});

test('authenticated owners can install the developer funnel starter', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('funnels.developer-starter.store'))
        ->assertRedirect(route('funnel-editor.edit', $user->funnels()->where('slug', 'mern-saas-starter')->value('id')));

    expect($user->funnels()->where('slug', 'mern-saas-starter')->exists())->toBeTrue();
});
