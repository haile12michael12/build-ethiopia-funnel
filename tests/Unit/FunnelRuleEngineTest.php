<?php

use App\Services\FunnelRuleEngine;

test('rule engine supports the configured comparison operators', function () {
    $engine = new FunnelRuleEngine;
    $context = [
        'answers' => [
            'experience' => 'intermediate',
            'goal' => 'launch-saas',
            'timeline' => 'immediately',
            'score' => 8,
            'topics' => ['auth', 'deployment'],
        ],
        'empty' => '',
    ];

    $rules = [
        ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'launch-saas'],
        ['field' => 'answers.goal', 'operator' => 'neq', 'value' => 'client-projects'],
        ['field' => 'answers.score', 'operator' => 'gt', 'value' => 7],
        ['field' => 'answers.score', 'operator' => 'gte', 'value' => 8],
        ['field' => 'answers.score', 'operator' => 'lt', 'value' => 9],
        ['field' => 'answers.score', 'operator' => 'lte', 'value' => 8],
        ['field' => 'answers.goal', 'operator' => 'in', 'value' => ['launch-saas', 'learn-full-stack']],
        ['field' => 'answers.goal', 'operator' => 'notIn', 'value' => ['client-projects']],
        ['field' => 'answers.topics', 'operator' => 'contains', 'value' => 'auth'],
        ['field' => 'answers.goal', 'operator' => 'startsWith', 'value' => 'launch'],
        ['field' => 'answers.goal', 'operator' => 'endsWith', 'value' => 'saas'],
        ['field' => 'answers.timeline', 'operator' => 'exists'],
        ['field' => 'empty', 'operator' => 'empty'],
    ];

    foreach ($rules as $rule) {
        expect($engine->matches($rule, $context))->toBeTrue();
    }

    expect($engine->matches(['field' => 'answers.missing', 'operator' => 'exists'], $context))->toBeFalse()
        ->and($engine->matches(['field' => 'answers.missing', 'operator' => 'empty'], $context))->toBeTrue();
});

test('rule engine evaluates nested all any and not conditions', function () {
    $engine = new FunnelRuleEngine;
    $rule = [
        'all' => [
            ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'launch-saas'],
            [
                'any' => [
                    ['field' => 'answers.timeline', 'operator' => 'eq', 'value' => 'soon'],
                    ['field' => 'answers.timeline', 'operator' => 'eq', 'value' => 'immediately'],
                ],
            ],
            [
                'not' => [
                    'field' => 'answers.experience',
                    'operator' => 'eq',
                    'value' => 'beginner',
                ],
            ],
        ],
        'any' => [],
    ];

    expect($engine->matches($rule, [
        'answers' => ['goal' => 'launch-saas', 'timeline' => 'immediately', 'experience' => 'intermediate'],
    ]))->toBeTrue()
        ->and($engine->matches($rule, [
            'answers' => ['goal' => 'launch-saas', 'timeline' => 'immediately', 'experience' => 'beginner'],
        ]))->toBeFalse();
});

test('invalid rules return validation errors instead of being evaluated', function () {
    $engine = new FunnelRuleEngine;
    $invalid = [
        'field' => 'answers.goal',
        'operator' => 'eval',
        'value' => 'launch-saas',
    ];

    expect($engine->validate($invalid))->not->toBeEmpty();
    expect(fn () => $engine->matches($invalid, ['answers' => ['goal' => 'launch-saas']]))
        ->toThrow(InvalidArgumentException::class);
});
