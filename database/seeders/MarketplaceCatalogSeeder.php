<?php

namespace Database\Seeders;

use App\Models\MarketplaceTemplate;
use Illuminate\Database\Seeder;

class MarketplaceCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            ['mern-saas-starter', 'MERN SaaS Starter', 'A production-oriented MERN foundation for launching a SaaS product.', ['MongoDB', 'Express', 'React', 'Node.js', 'TypeScript'], ['authentication', 'api', 'testing', 'deployment']],
            ['stripe-subscription-starter', 'Stripe Billing Starter', 'A sample subscription product foundation with billing integration points.', ['MongoDB', 'Express', 'React', 'Node.js', 'Stripe'], ['billing', 'webhooks', 'customer-portal']],
            ['ai-chat-starter', 'AI Chat Starter', 'A full-stack chat interface and server-side AI integration starter.', ['React', 'Node.js', 'TypeScript'], ['chat-ui', 'streaming-api', 'server-side-secrets']],
            ['multi-tenant-saas-starter', 'Multi-tenant SaaS Starter', 'A foundation for tenant-aware SaaS applications.', ['MongoDB', 'Express', 'React', 'Node.js'], ['tenancy', 'authentication', 'roles']],
            ['admin-dashboard-template', 'Admin Dashboard Template', 'A responsive admin application shell with common product screens.', ['React', 'TypeScript', 'Tailwind CSS'], ['dashboard', 'tables', 'forms']],
            ['developer-portfolio-starter', 'Developer Portfolio Starter', 'A customizable portfolio site for software developers.', ['React', 'TypeScript', 'Tailwind CSS'], ['portfolio', 'projects', 'contact']],
            ['discord-bot-starter', 'Discord Bot Starter', 'A structured Discord bot project with command and event modules.', ['Node.js', 'TypeScript', 'Discord.js'], ['commands', 'events', 'configuration']],
            ['chrome-extension-starter', 'Chrome Extension Starter', 'A modern browser extension starter with popup and background worker.', ['TypeScript', 'React', 'Chrome Extensions'], ['popup', 'service-worker', 'storage']],
        ];

        foreach ($templates as [$slug, $name, $description, $stack, $modules]) {
            MarketplaceTemplate::query()->firstOrCreate(
                ['slug' => $slug],
                [
                    'type' => 'template',
                    'name' => $name,
                    'description' => $description,
                    'preview_images' => ['/images/marketplace/placeholder.svg'],
                    'tech_stack' => $stack,
                    'included_modules' => $modules,
                    'version' => '1.0.0',
                    'license' => 'Personal use',
                    'currency' => 'ETB',
                    'status' => 'published',
                    'owner_id' => null,
                ],
            );
        }

        $bundle = MarketplaceTemplate::query()->firstOrCreate(
            ['slug' => 'mern-developer-bundle'],
            [
                'type' => 'bundle',
                'name' => 'MERN Developer Bundle',
                'description' => 'A bundle of reusable MERN and developer workflow starter projects.',
                'preview_images' => ['/images/marketplace/placeholder.svg'],
                'tech_stack' => ['MongoDB', 'Express', 'React', 'Node.js', 'TypeScript'],
                'included_modules' => ['starter-projects', 'documentation'],
                'version' => '1.0.0',
                'license' => 'Personal use',
                'currency' => 'ETB',
                'status' => 'published',
                'owner_id' => null,
            ],
        );
        if (! $bundle->bundleItems()->exists()) {
            $bundle->bundleItems()->sync(
                MarketplaceTemplate::query()->whereIn('slug', [
                    'mern-saas-starter',
                    'multi-tenant-saas-starter',
                    'admin-dashboard-template',
                ])->pluck('id'),
            );
        }

        MarketplaceTemplate::query()->firstOrCreate(
            ['slug' => 'developer-pro-membership'],
            [
                'type' => 'membership',
                'name' => 'Developer Pro Membership',
                'description' => 'A planned membership for premium template and learning access. Recurring billing is not enabled yet.',
                'preview_images' => ['/images/marketplace/placeholder.svg'],
                'tech_stack' => ['MERN', 'TypeScript'],
                'included_modules' => ['premium-templates', 'member-updates'],
                'version' => '1.0.0',
                'license' => 'Member access',
                'currency' => 'ETB',
                'status' => 'published',
                'owner_id' => null,
            ],
        );
    }
}
