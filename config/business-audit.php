<?php

return [
    'owner_id' => env('BUSINESS_AUDIT_OWNER_ID'),
    'qualified_score' => 70,
    'options' => [
        'markets' => [
            ['value' => 'ethiopia', 'label' => 'Ethiopia', 'label_am' => 'ኢትዮጵያ'],
            ['value' => 'international', 'label' => 'International', 'label_am' => 'ዓለም አቀፍ'],
        ],
        'website_statuses' => [
            ['value' => 'live', 'label' => 'Yes, it is live', 'label_am' => 'አለብኝ፣ ሕይወት ላይ ነው'],
            ['value' => 'needs_improvement', 'label' => 'Yes, but it needs improvement', 'label_am' => 'አለብኝ፣ ግን ማሻሻያ ያስፈልገዋል'],
            ['value' => 'no_website', 'label' => 'No website yet', 'label_am' => 'እስካሁን ድህረ ገጽ የለኝም'],
        ],
        'services' => [
            ['value' => 'website', 'label' => 'Website design', 'label_am' => 'ድህረ ገጽ ንደስ'],
            ['value' => 'marketing', 'label' => 'Digital marketing', 'label_am' => 'ዲጂታል ግብይት'],
            ['value' => 'branding', 'label' => 'Branding', 'label_am' => 'የፊርማ ማጠናከሪያ'],
            ['value' => 'automation', 'label' => 'Business automation', 'label_am' => 'የንግድ ስራ አውቶሜሽን'],
            ['value' => 'ecommerce', 'label' => 'E-commerce', 'label_am' => 'ኢ-ኮሜርስ'],
            ['value' => 'ai_chatbot', 'label' => 'AI chatbot or assistant', 'label_am' => 'ኤአ ቻትቦት ወይም ረዳት'],
            ['value' => 'custom_web_app', 'label' => 'Custom web application', 'label_am' => 'ብጁ የድር መተግበሪያ'],
        ],
        'budgets' => [
            ['value' => 'under_25000', 'label' => 'Under ETB 25,000', 'currency' => 'ETB'],
            ['value' => '25000_100000', 'label' => 'ETB 25,000–100,000', 'currency' => 'ETB'],
            ['value' => '100000_500000', 'label' => 'ETB 100,000–500,000', 'currency' => 'ETB'],
            ['value' => 'over_500000', 'label' => 'Over ETB 500,000', 'currency' => 'ETB'],
        ],
        'international_budgets' => [
            ['value' => 'usd_under_250', 'label' => 'Under USD 250', 'currency' => 'USD'],
            ['value' => 'usd_250_1000', 'label' => 'USD 250–1,000', 'currency' => 'USD'],
            ['value' => 'usd_1000_5000', 'label' => 'USD 1,000–5,000', 'currency' => 'USD'],
            ['value' => 'usd_over_5000', 'label' => 'Over USD 5,000', 'currency' => 'USD'],
        ],
        'timelines' => [
            ['value' => 'within_1_month', 'label' => 'Within one month', 'label_am' => 'በአንድ ወር ውስጥ'],
            ['value' => '1_to_3_months', 'label' => 'In 1–3 months', 'label_am' => 'በ1–3 ወራት ውስጥ'],
            ['value' => '3_to_6_months', 'label' => 'In 3–6 months', 'label_am' => 'በ3–6 ወራት ውስጥ'],
            ['value' => 'researching', 'label' => 'Just researching', 'label_am' => 'በመመርመር ላይ ብቻ'],
        ],
    ],
];
