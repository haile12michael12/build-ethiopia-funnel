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
