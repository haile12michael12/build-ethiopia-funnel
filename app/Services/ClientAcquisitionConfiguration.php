<?php

namespace App\Services;

use App\Models\ClientAcquisitionSettings;

class ClientAcquisitionConfiguration
{
    /**
     * @return array<string, mixed>
     */
    public function forOwner(?int $ownerId): array
    {
        $defaults = ClientAcquisitionSettings::defaults();
        $settings = $ownerId
            ? ClientAcquisitionSettings::query()->where('user_id', $ownerId)->first()
            : null;

        if (! $settings) {
            return $defaults;
        }

        return array_replace($defaults, $settings->only([
            'services',
            'budgets',
            'timelines',
            'scoring_weights',
            'qualified_score',
            'response_time_hours',
            'response_email',
            'whatsapp_url',
            'meeting_url',
            'analytics_funnel_id',
        ]));
    }
}
