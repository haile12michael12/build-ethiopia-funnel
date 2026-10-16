<?php

return [
    'services' => [
        ['key' => 'web_app', 'label_en' => 'Website or web application', 'label_am' => 'ድህረ ገጽ ወይም የድር መተግበሪያ'],
        ['key' => 'ai_chatbot', 'label_en' => 'AI applications and chatbots', 'label_am' => 'AI መተግበሪያዎች እና ቻትቦቶች'],
        ['key' => 'automation', 'label_en' => 'Business automation and integrations', 'label_am' => 'የንግድ ስራ አውቶሜሽን እና ውህደቶች'],
        ['key' => 'ecommerce', 'label_en' => 'E-commerce or marketplace', 'label_am' => 'ኢ-ኮሜርስ ወይም የገበያ መድረክ'],
        ['key' => 'content_creation', 'label_en' => 'Content creation and video production', 'label_am' => 'የይዘት ፈጠራ እና ቪዲዮ ማምረት'],
        ['key' => 'content_repurposing', 'label_en' => 'Social media content repurposing', 'label_am' => 'የማህበራዊ ሚዲያ ይዘት እንደገና ማዘጋጀት'],
        ['key' => 'technical_support', 'label_en' => 'Ongoing technical support', 'label_am' => 'ቀጣይ የቴክኒክ ድጋፍ'],
        ['key' => 'consultation', 'label_en' => 'Custom project or consultation', 'label_am' => 'ብጁ ፕሮጀክት ወይም ምክክር'],
    ],
    'budgets' => [
        ['key' => 'etb_under_25000', 'currency' => 'ETB', 'label_en' => 'Under ETB 25,000', 'label_am' => 'ከ25,000 ብር በታች', 'score' => 5],
        ['key' => 'etb_25000_100000', 'currency' => 'ETB', 'label_en' => 'ETB 25,000–100,000', 'label_am' => '25,000–100,000 ብር', 'score' => 15],
        ['key' => 'etb_100000_500000', 'currency' => 'ETB', 'label_en' => 'ETB 100,000–500,000', 'label_am' => '100,000–500,000 ብር', 'score' => 25],
        ['key' => 'etb_over_500000', 'currency' => 'ETB', 'label_en' => 'Over ETB 500,000', 'label_am' => 'ከ500,000 ብር በላይ', 'score' => 30],
        ['key' => 'usd_under_250', 'currency' => 'USD', 'label_en' => 'Under USD 250', 'label_am' => 'ከ250 ዶላር በታች', 'score' => 5],
        ['key' => 'usd_250_1000', 'currency' => 'USD', 'label_en' => 'USD 250–1,000', 'label_am' => '250–1,000 ዶላር', 'score' => 15],
        ['key' => 'usd_1000_5000', 'currency' => 'USD', 'label_en' => 'USD 1,000–5,000', 'label_am' => '1,000–5,000 ዶላር', 'score' => 25],
        ['key' => 'usd_over_5000', 'currency' => 'USD', 'label_en' => 'Over USD 5,000', 'label_am' => 'ከ5,000 ዶላር በላይ', 'score' => 30],
    ],
    'timelines' => [
        ['key' => 'within_1_month', 'label_en' => 'Within one month', 'label_am' => 'በአንድ ወር ውስጥ', 'score' => 20],
        ['key' => '1_to_3_months', 'label_en' => 'In 1–3 months', 'label_am' => 'በ1–3 ወራት ውስጥ', 'score' => 15],
        ['key' => '3_to_6_months', 'label_en' => 'In 3–6 months', 'label_am' => 'በ3–6 ወራት ውስጥ', 'score' => 10],
        ['key' => 'researching', 'label_en' => 'Exploring options', 'label_am' => 'አማራጮችን በመመርመር ላይ', 'score' => 5],
    ],
    'scoring_weights' => [
        'service_fit' => 20,
        'project_clarity' => 25,
        'budget' => 25,
        'timeline' => 20,
        'consultation' => 10,
    ],
    'qualified_score' => 70,
    'response_time_hours' => null,
    'response_email' => null,
    'whatsapp_url' => null,
    'meeting_url' => null,
    'analytics_funnel_id' => null,
];
