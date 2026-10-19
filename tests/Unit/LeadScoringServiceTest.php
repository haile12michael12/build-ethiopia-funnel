<?php

use App\Services\LeadScoringService;

test('lead score combines bounded readiness and intent values', function () {
    $result = app(LeadScoringService::class)->score([
        'business_name' => 'A business',
        'website_status' => 'needs_improvement',
        'service_interests' => ['website'],
        'budget' => '25000_100000',
        'timeline' => '1_to_3_months',
    ]);

    expect($result['score'])->toBe(75)
        ->and(array_sum($result['breakdown']))->toBe(75);
});

test('empty audit answers receive a zero score', function () {
    expect(app(LeadScoringService::class)->score([]))->toBe([
        'score' => 0,
        'breakdown' => [
            'business_profile' => 0,
            'website_readiness' => 0,
            'service_interest' => 0,
            'budget' => 0,
            'timeline' => 0,
        ],
    ]);
});

test('client project scores stay bounded and explain every group without comparing currencies', function () {
    $settings = config('client-acquisition');
    $project = [
        'name' => 'Selam Tesfaye',
        'email' => 'selam@example.com',
        'phone' => '+251911223344',
        'market' => 'international',
        'service_interests' => ['web_app'],
        'project_description' => str_repeat('Detailed project description. ', 5),
        'budget' => 'etb_over_500000',
        'budget_currency' => 'ETB',
        'timeline' => 'within_1_month',
        'additional_requirements' => str_repeat('Scope detail. ', 10),
    ];

    $result = app(LeadScoringService::class)->scoreClientProject($project, $settings);

    expect($result['score'])->toBeLessThanOrEqual(100)
        ->and($result['breakdown']['budget'])->toBe(0)
        ->and($result['reasons'])->toHaveCount(6)
        ->and($result['reasons'][2]['reason'])->toContain('currencies are never converted')
        ->and(array_sum($result['breakdown']))->toBe($result['score']);
});

test('unknown budget scores no budget points and zero weights disable score rules', function () {
    $settings = config('client-acquisition');
    $project = [
        'market' => 'ethiopia',
        'service_interests' => [],
        'project_description' => '',
        'timeline' => null,
        'budget' => null,
    ];
    $scoring = app(LeadScoringService::class);

    $unknown = $scoring->scoreClientProject($project, $settings);
    $settings['scoring_weights'] = array_fill_keys(array_keys($settings['scoring_weights']), 0);
    $disabled = $scoring->scoreClientProject($project, $settings);

    expect($unknown['breakdown']['budget'])->toBe(0)
        ->and($unknown['reasons'][2]['reason'])->toContain('treated as unknown')
        ->and($disabled['score'])->toBe(0)
        ->and(array_sum($disabled['breakdown']))->toBe(0);
});
