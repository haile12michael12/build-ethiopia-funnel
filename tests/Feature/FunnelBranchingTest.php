<?php

use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function branchingFunnel(User $user, string $slug, bool $published = true): Funnel
{
    return $user->funnels()->create([
        'name' => ucfirst(str_replace('-', ' ', $slug)),
        'slug' => $slug,
        'content' => ['sections' => []],
        'settings' => [],
        'step_branches' => [],
        'status' => $published ? 'published' : 'draft',
        'is_published' => $published,
    ]);
}

test('public step evaluation resolves the highest-priority matching branch and records analytics', function () {
    $owner = User::factory()->create();
    $funnel = branchingFunnel($owner, 'mern-saas-starter');
    $destination = branchingFunnel($owner, 'code-review');
    $funnel->update([
        'step_branches' => [
            'quiz' => [
                'defaultNextStepSlug' => 'mern-boilerplate',
                'branches' => [
                    [
                        'name' => 'Beginner learning path',
                        'priority' => 70,
                        'when' => ['field' => 'answers.experience', 'operator' => 'eq', 'value' => 'beginner'],
                        'nextStepSlug' => 'mern-course',
                    ],
                    [
                        'name' => 'Ready to launch SaaS',
                        'priority' => 100,
                        'when' => ['all' => [
                            ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'launch-saas'],
                            ['field' => 'answers.timeline', 'operator' => 'eq', 'value' => 'immediately'],
                        ]],
                        'nextStepSlug' => 'code-review',
                    ],
                ],
            ],
        ],
    ]);

    $sessionId = '84d4c49e-743e-43d6-a5d2-797935e61e80';
    $this->postJson(route('funnels.steps.evaluate', $funnel), [
        'step_slug' => 'quiz',
        'answers' => ['experience' => 'beginner', 'goal' => 'launch-saas', 'timeline' => 'immediately'],
        'session_id' => $sessionId,
        'attribution' => ['utm_source' => 'newsletter'],
    ])->assertOk()
        ->assertJsonPath('matched_branch', 'Ready to launch SaaS')
        ->assertJsonPath('next_step_slug', $destination->slug)
        ->assertJsonPath('next_step_url', route('funnels.show', $destination->slug));

    $event = FunnelEvent::query()->where('event_type', 'branch_evaluated')->firstOrFail();
    expect($event->metadata)->toMatchArray([
        'step_slug' => 'quiz',
        'matched_branch' => 'Ready to launch SaaS',
        'next_step_slug' => 'code-review',
    ])->and($event->session_id)->toBe(hash('sha256', $sessionId));
});

test('evaluation rejects unpublished funnels, malformed answers, and unavailable destinations', function () {
    $owner = User::factory()->create();
    $draft = branchingFunnel($owner, 'draft-root', false);
    $this->postJson(route('funnels.steps.evaluate', $draft), [
        'step_slug' => 'quiz',
        'answers' => [],
    ])->assertNotFound();

    $funnel = branchingFunnel($owner, 'published-root');
    $funnel->update([
        'step_branches' => [
            'quiz' => [
                'defaultNextStepSlug' => 'missing-destination',
                'branches' => [],
            ],
        ],
    ]);

    $this->postJson(route('funnels.steps.evaluate', $funnel), [
        'step_slug' => 'quiz',
        'answers' => ['timeline' => ['unexpected' => 'array']],
    ])->assertUnprocessable();

    $this->postJson(route('funnels.steps.evaluate', $funnel), [
        'step_slug' => 'quiz',
        'answers' => ['experience' => 'advanced', 'goal' => 'learn-full-stack', 'timeline' => 'soon'],
    ])->assertStatus(422)->assertJsonPath('message', 'The configured next step is not available.');
});

test('funnel drafts reject invalid branch operators and cross-account destinations', function () {
    $owner = User::factory()->create();
    $otherOwner = User::factory()->create();
    branchingFunnel($otherOwner, 'foreign-offer');

    $this->actingAs($owner)->post(route('funnels.store'), [
        'name' => 'Invalid branch funnel',
        'content' => json_encode(['sections' => []]),
        'settings' => json_encode([]),
        'step_branches' => json_encode([
            'developer-quiz' => [
                'defaultNextStepSlug' => 'foreign-offer',
                'branches' => [[
                    'name' => 'Invalid rule',
                    'priority' => 10,
                    'when' => ['field' => 'answers.goal', 'operator' => 'execute', 'value' => 'launch-saas'],
                    'nextStepSlug' => 'foreign-offer',
                ]],
            ],
        ]),
    ])->assertSessionHasErrors('step_branches');

    expect(Funnel::query()->where('slug', 'invalid-branch-funnel')->exists())->toBeFalse();
});
