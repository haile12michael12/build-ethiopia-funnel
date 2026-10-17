<?php

return [
    'reviewer_emails' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('MARKETPLACE_REVIEWER_EMAILS', '')),
    ))),
    'default_revenue_share_percent' => 70,
];
