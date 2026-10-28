<?php

/*
|--------------------------------------------------------------------------
| Appointment booking defaults
|--------------------------------------------------------------------------
|
| Public B2B appointment/demo scheduler defaults. Every value can be
| overridden per business owner from the Client Acquisition settings page.
| Times are always interpreted in the configured appointment timezone and
| are never converted between currencies or timezones.
|
*/

return [
    'enabled' => env('APPOINTMENT_BOOKING_ENABLED', true),
    'timezone' => env('APPOINTMENT_TIMEZONE', 'Africa/Addis_Ababa'),
    'slot_minutes' => 60,
    'buffer_minutes' => 15,
    'advance_days' => 60,
    'max_per_day' => 4,
    'business_hours' => ['start' => '09:00', 'end' => '17:00'],
    'meeting_types' => [
        ['key' => 'demo', 'label_en' => 'Live product demo', 'label_am' => 'ትክክለኛ የፕሮድክቶ መሞከሪያ'],
        ['key' => 'consultation', 'label_en' => 'Strategy consultation', 'label_am' => 'የስትራቴጂ ምክክር'],
        ['key' => 'call', 'label_en' => 'Quick discovery call', 'label_am' => 'ፈጥነ የመግለጫ ጥሪ'],
    ],
];
