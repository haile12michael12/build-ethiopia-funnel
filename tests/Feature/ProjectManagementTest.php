<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests cannot access admin project routes', function () {
    $this->get(route('projects.index'))->assertRedirect(route('login'));
    $this->get(route('projects.create'))->assertRedirect(route('login'));
    $this->post(route('projects.store'), [])->assertRedirect(route('login'));
});

test('authorized users can view their paginated projects list', function () {
    $user = User::factory()->create();
    Project::factory()->count(3)->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->has('projects.data', 3)
            ->has('stats')
            ->has('categories')
        );
});

test('authorized users can create a project with bilingual content and tech stack', function () {
    $user = User::factory()->create();

    $payload = [
        'title_en' => 'AI Customer Copilot',
        'title_am' => 'የደንበኞች አገልግሎት ረዳት',
        'summary_en' => 'Automated customer support using LLMs.',
        'summary_am' => 'በአርቴፊሻል ኢንተለጀንስ የሚሰራ የደንበኞች ድጋፍ ስርዓት።',
        'description_en' => 'Comprehensive enterprise integration.',
        'description_am' => 'የተሟላ የቴክኖሎጂ አሰራር ዝርዝር።',
        'category' => 'ai_automation',
        'technologies' => ['OpenAI', 'Python', 'Laravel'],
        'demo_url' => 'https://copilot.example.com',
        'repo_url' => 'https://github.com/example/copilot',
        'status' => 'published',
        'is_featured' => true,
        'sort_order' => 1,
    ];

    $response = $this->actingAs($user)->post(route('projects.store'), $payload);

    $response->assertRedirect(route('projects.index'));

    $this->assertDatabaseHas('projects', [
        'user_id' => $user->id,
        'title_en' => 'AI Customer Copilot',
        'title_am' => 'የደንበኞች አገልግሎት ረዳት',
        'category' => 'ai_automation',
        'status' => 'published',
        'is_published' => true,
        'is_featured' => true,
    ]);

    $project = Project::query()->where('title_en', 'AI Customer Copilot')->first();
    expect($project->technologies)->toBe(['OpenAI', 'Python', 'Laravel'])
        ->and($project->published_at)->not->toBeNull();
});

test('validation rejects invalid or missing required fields', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'title_en' => '',
        'category' => 'invalid_category_key',
        'demo_url' => 'not-a-valid-url',
    ]);

    $response->assertSessionHasErrors(['title_en', 'category', 'demo_url']);
});

test('project slugs remain unique automatically on collision', function () {
    $user = User::factory()->create();

    $first = Project::factory()->create([
        'user_id' => $user->id,
        'title_en' => 'Awesome SaaS App',
        'slug' => 'awesome-saas-app',
    ]);

    $secondSlug = Project::generateUniqueSlug('Awesome SaaS App');
    expect($secondSlug)->toBe('awesome-saas-app-2');

    $this->actingAs($user)->post(route('projects.store'), [
        'title_en' => 'Awesome SaaS App',
        'category' => 'saas',
        'status' => 'draft',
    ])->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'title_en' => 'Awesome SaaS App',
        'slug' => 'awesome-saas-app-2',
    ]);
});

test('users cannot edit or delete projects belonging to other users', function () {
    $owner = User::factory()->create();
    $attacker = User::factory()->create();

    $project = Project::factory()->create(['user_id' => $owner->id]);

    $this->actingAs($attacker)
        ->get(route('projects.edit', $project->id))
        ->assertForbidden();

    $this->actingAs($attacker)
        ->put(route('projects.update', $project->id), [
            'title_en' => 'Hacked Title',
            'category' => 'saas',
        ])
        ->assertForbidden();

    $this->actingAs($attacker)
        ->delete(route('projects.destroy', $project->id))
        ->assertForbidden();
});

test('image upload validation works and stores files to disk', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $file = UploadedFile::fake()->image('cover.jpg', 800, 600);

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'title_en' => 'Image Project',
        'category' => 'react_nextjs',
        'cover_image_file' => $file,
    ]);

    $response->assertRedirect(route('projects.index'));

    $project = Project::query()->where('title_en', 'Image Project')->first();
    expect($project->cover_image)->not->toBeNull();
    Storage::disk('public')->assertExists('projects/covers/'.$file->hashName());
});

test('user can publish, unpublish, and archive projects', function () {
    $user = User::factory()->create();
    $project = Project::factory()->draft()->create(['user_id' => $user->id]);

    // Publish
    $this->actingAs($user)->post(route('projects.publish', $project->id))->assertBack();
    expect($project->fresh()->is_published)->toBeTrue()
        ->and($project->fresh()->status)->toBe('published')
        ->and($project->fresh()->published_at)->not->toBeNull();

    // Unpublish
    $this->actingAs($user)->post(route('projects.unpublish', $project->id))->assertBack();
    expect($project->fresh()->is_published)->toBeFalse()
        ->and($project->fresh()->status)->toBe('draft');

    // Archive
    $this->actingAs($user)->post(route('projects.archive', $project->id))->assertBack();
    expect($project->fresh()->status)->toBe('archived')
        ->and($project->fresh()->is_published)->toBeFalse();
});
