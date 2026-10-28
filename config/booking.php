<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Calendar booking defaults
    |--------------------------------------------------------------------------
    |
    | Default timezone for new booking pages and how long before the start a
    | reminder email is queued for invitees. The scheduler entry in
    | routes/console.php must run for reminders to be delivered.
    |
    */

    'default_timezone' => env('BOOKING_DEFAULT_TIMEZONE', 'Africa/Addis_Ababa'),

    'reminder_hours_before' => (int) env('BOOKING_REMINDER_HOURS', 24),

    // Duration choices (minutes) offered when creating a booking page.
    'durations' => [15, 20, 30, 45, 60, 90, 120],

    // Hard caps so public booking pages cannot be opened indefinitely.
    'max_advance_days' => 60,
    'max_min_notice_hours' => 72,

    // Curated timezone choices shown in the owner settings form. The public
    // booking page accepts any valid IANA identifier for slot display.
    'timezones' => [
        'Africa/Addis_Ababa',
        'Africa/Nairobi',
        'Africa/Cairo',
        'Africa/Lagos',
        'Asia/Dubai',
        'Europe/London',
        'Europe/Berlin',
        'America/New_York',
        'America/Chicago',
        'America/Los_Angeles',
        'UTC',
    ],
];
