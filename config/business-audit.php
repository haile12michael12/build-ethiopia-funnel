<?php

return [
    'owner_id' => env('BUSINESS_AUDIT_OWNER_ID'),
    'qualified_score' => 70,
    'options' => [
        'website_statuses' => [
            ['value' => 'live', 'label' => 'Yes, it is live'],
            ['value' => 'needs_improvement', 'label' => 'Yes, but it needs improvement'],
            ['value' => 'no_website', 'label' => 'No website yet'],
        ],
        'services' => [
            ['value' => 'website', 'label' => 'Website design'],
            ['value' => 'marketing', 'label' => 'Digital marketing'],
            ['value' => 'branding', 'label' => 'Branding'],
            ['value' => 'automation', 'label' => 'Business automation'],
            ['value' => 'ecommerce', 'label' => 'E-commerce'],
        ],
        'budgets' => [
            ['value' => 'under_25000', 'label' => 'Under ETB 25,000'],
            ['value' => '25000_100000', 'label' => 'ETB 25,000–100,000'],
            ['value' => '100000_500000', 'label' => 'ETB 100,000–500,000'],
            ['value' => 'over_500000', 'label' => 'Over ETB 500,000'],
        ],
        'timelines' => [
            ['value' => 'within_1_month', 'label' => 'Within one month'],
            ['value' => '1_to_3_months', 'label' => 'In 1–3 months'],
            ['value' => '3_to_6_months', 'label' => 'In 3–6 months'],
            ['value' => 'researching', 'label' => 'Just researching'],
        ],
    ],
];
