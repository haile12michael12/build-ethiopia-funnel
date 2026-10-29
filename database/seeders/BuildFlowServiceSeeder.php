<?php

namespace Database\Seeders;

use App\Models\SiteContent;
use App\Models\User;
use Illuminate\Database\Seeder;

class BuildFlowServiceSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::configuredBusinessOwner();

        if (! $owner) {
            $this->command?->warn('Skipping the BuildFlow service listing: configure ADMIN_EMAIL and create that owner account before seeding.');

            return;
        }

        SiteContent::query()->firstOrCreate(
            ['slug' => 'construction-management-platform-development'],
            [
                'user_id' => $owner->id,
                'type' => 'service',
                'title_en' => 'Construction Management Platform Development',
                'summary_en' => 'Custom construction-management platforms and contractor marketplaces, informed by the open-source BuildFlow project.',
                'body_en' => 'We help organizations plan and build software for construction project workflows and contractor marketplaces. BuildFlow is an open-source reference platform covering project management, contractor matching, payment and invoicing, and real-time project monitoring. Scope, delivery, and pricing are agreed after discovery.',
                'category' => 'Construction software',
                'highlights_en' => [
                    'Construction project management workflows',
                    'Contractor marketplace and matching',
                    'Payment and invoicing integrations',
                    'Real-time project collaboration and monitoring',
                ],
                'status' => 'published',
                'published_at' => now(),
                'sort_order' => 0,
            ],
        );
    }
}
