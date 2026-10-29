<?php

use App\Models\MarketplaceTemplate;
use App\Models\SiteContent;
use App\Models\User;
use Database\Seeders\BuildFlowServiceSeeder;
use Database\Seeders\MarketplaceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('BuildFlow is listed as a published marketplace product', function () {
    $seeder = new MarketplaceCatalogSeeder;
    $seeder->run();
    $seeder->run();

    $product = MarketplaceTemplate::query()
        ->where('slug', 'buildflow-construction-management-platform')
        ->firstOrFail();

    expect($product->type)->toBe('template')
        ->and($product->status)->toBe('published')
        ->and($product->amount_minor)->toBeNull()
        ->and($product->documentation_url)->toBe('https://github.com/haile12michael12/BuildFlow')
        ->and(MarketplaceTemplate::query()->where('slug', $product->slug)->count())->toBe(1);

    $this->get(route('marketplace.show', $product->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('marketplace/show')
            ->where('product.name', 'BuildFlow Construction Management Platform')
            ->where('product.tech_stack', ['PHP', 'Laravel', 'gRPC', 'Protocol Buffers', 'PostgreSQL', 'Redis', 'RabbitMQ', 'Docker', 'Kubernetes'])
            ->where('checkoutEnabled', false)
        );
});

test('BuildFlow service appears on the public services page for the configured owner', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $owner->email]);

    $seeder = new BuildFlowServiceSeeder;
    $seeder->run();
    $seeder->run();

    $service = SiteContent::query()
        ->where('slug', 'construction-management-platform-development')
        ->firstOrFail();

    expect($service->user_id)->toBe($owner->id)
        ->and($service->type)->toBe('service')
        ->and($service->status)->toBe('published')
        ->and(SiteContent::query()->where('slug', $service->slug)->count())->toBe(1);

    $this->get(route('services'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('services')
            ->where('services.0.slug', 'construction-management-platform-development')
        );
});

test('BuildFlow service seeding does not assign an unconfigured owner', function () {
    config(['business.owner_email' => null]);

    (new BuildFlowServiceSeeder)->run();

    expect(SiteContent::query()->where('slug', 'construction-management-platform-development')->exists())->toBeFalse();
});
