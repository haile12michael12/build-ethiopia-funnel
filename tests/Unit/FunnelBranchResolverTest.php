<?php

use App\Services\FunnelBranchResolver;
use App\Services\FunnelRuleEngine;

function developerBranchResolver(): FunnelBranchResolver
{
    return new FunnelBranchResolver(new FunnelRuleEngine);
}

test('branch resolver chooses the first matching branch by descending priority', function () {
    $result = developerBranchResolver()->resolve([
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
            [
                'name' => 'Client project builder',
                'priority' => 90,
                'when' => ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'client-projects'],
                'nextStepSlug' => 'mern-boilerplate',
            ],
        ],
    ], ['answers' => ['experience' => 'beginner', 'goal' => 'launch-saas', 'timeline' => 'immediately']]);

    expect($result)->toBe([
        'matched_branch' => 'Ready to launch SaaS',
        'next_step_slug' => 'code-review',
    ]);
});

test('branch resolver uses the default destination when no branch matches', function () {
    $result = developerBranchResolver()->resolve([
        'defaultNextStepSlug' => 'mern-boilerplate',
        'branches' => [
            [
                'name' => 'Beginner learning path',
                'priority' => 70,
                'when' => ['field' => 'answers.experience', 'operator' => 'eq', 'value' => 'beginner'],
                'nextStepSlug' => 'mern-course',
            ],
        ],
    ], ['answers' => ['experience' => 'advanced']]);

    expect($result)->toBe([
        'matched_branch' => null,
        'next_step_slug' => 'mern-boilerplate',
    ]);
});

test('branch resolver rejects malformed branch rules and destinations', function () {
    $errors = developerBranchResolver()->validateConfiguration([
        'developer-quiz' => [
            'defaultNextStepSlug' => 'not valid',
            'branches' => [[
                'name' => '',
                'priority' => 100,
                'when' => ['field' => 'answers.goal', 'operator' => 'unknown', 'value' => 'launch-saas'],
                'nextStepSlug' => '../private',
            ]],
        ],
    ]);

    expect($errors)->not->toBeEmpty();
});
