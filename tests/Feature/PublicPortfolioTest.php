<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests can browse published projects in public portfolio', function () {
    $user = User::factory()->create();
    config(['business.owner_email' => $user->email]);

    $published = Project::factory()->published()->create([
        'user_id' => $user->id,
        'title_en' => 'Live Enterprise Portal',
    ]);

    $draft = Project::factory()->draft()->create([
        'user_id' => $user->id,
        'title_en' => 'Hidden Secret Project',
    ]);

    $this->get(route('portfolio.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.title_en', 'Live Enterprise Portal')
        );
});

test('draft and unpublished projects return 404 to public visitors', function () {
    $user = User::factory()->create();
    config(['business.owner_email' => $user->email]);

    $draft = Project::factory()->draft()->create([
        'user_id' => $user->id,
        'slug' => 'internal-draft-tool',
    ]);

    $this->get(route('portfolio.show', $draft->slug))->assertNotFound();
});

test('scheduled future projects are suppressed from public view', function () {
    $user = User::factory()->create();
    config(['business.owner_email' => $user->email]);

    $futureProject = Project::factory()->create([
        'user_id' => $user->id,
        'slug' => 'future-launch',
        'status' => 'published',
        'is_published' => true,
        'published_at' => now()->addDays(5),
    ]);

    $this->get(route('portfolio.show', $futureProject->slug))->assertNotFound();

    $this->get(route('portfolio.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/index')
            ->has('projects.data', 0)
        );
});

test('authenticated owner can preview an unpublished project', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $owner->email]);
    $draft = Project::factory()->draft()->create([
        'user_id' => $owner->id,
        'title_en' => 'WIP Automation Engine',
    ]);

    $this->actingAs($owner)
        ->get(route('projects.preview', $draft->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/show')
            ->where('previewMode', true)
            ->where('project.title_en', 'WIP Automation Engine')
        );
});

test('guests cannot preview draft projects', function () {
    $user = User::factory()->create();
    $draft = Project::factory()->draft()->create(['user_id' => $user->id]);

    $this->get(route('projects.preview', $draft->id))->assertRedirect(route('login'));
});

test('public portfolio supports category filtering and search queries', function () {
    $user = User::factory()->create();
    config(['business.owner_email' => $user->email]);

    Project::factory()->published()->create([
        'user_id' => $user->id,
        'title_en' => 'E-Commerce Marketplace',
        'category' => 'ecommerce',
    ]);

    Project::factory()->published()->create([
        'user_id' => $user->id,
        'title_en' => 'AI Automation Pipeline',
        'category' => 'ai_automation',
    ]);

    // Filter category
    $this->get(route('portfolio.index', ['category' => 'ecommerce']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.title_en', 'E-Commerce Marketplace')
        );

    // Search query
    $this->get(route('portfolio.index', ['search' => 'Pipeline']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/index')
            ->has('projects.data', 1)
            ->where('projects.data.0.title_en', 'AI Automation Pipeline')
        );
});

test('public project detail page displays related projects from the same category', function () {
    $user = User::factory()->create();
    config(['business.owner_email' => $user->email]);

    $main = Project::factory()->published()->create([
        'user_id' => $user->id,
        'category' => 'saas',
        'slug' => 'main-saas-platform',
    ]);

    $related = Project::factory()->published()->create([
        'user_id' => $user->id,
        'category' => 'saas',
        'slug' => 'second-saas-platform',
    ]);

    $unrelated = Project::factory()->published()->create([
        'user_id' => $user->id,
        'category' => 'ecommerce',
        'slug' => 'unrelated-ecommerce',
    ]);

    $this->get(route('portfolio.show', $main->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/show')
            ->where('previewMode', false)
            ->has('relatedProjects', 1)
            ->where('relatedProjects.0.id', $related->id)
        );
});
