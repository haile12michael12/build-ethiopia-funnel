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

        $configured = array_replace($defaults, $settings->only([
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
            'follow_up_templates',
            'high_priority_score',
            'medium_priority_score',
        ]));

        $weights = $configured['scoring_weights'] ?? [];
        unset($weights['consultation']);
        $configured['scoring_weights'] = array_replace(
            $defaults['scoring_weights'],
            $weights,
        );
        foreach (['service_fit' => 25, 'project_clarity' => 15, 'budget' => 25, 'timeline' => 15, 'scope_completeness' => 10, 'contact_completeness' => 10] as $key => $maximum) {
            $configured['scoring_weights'][$key] = min($maximum, max(0, (int) $configured['scoring_weights'][$key]));
        }
        $configured['follow_up_templates'] ??= $defaults['follow_up_templates'];

        return $configured;
    }
}
