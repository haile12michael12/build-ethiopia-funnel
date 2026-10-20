<?php

use App\Contracts\ContentDraftGenerator;
use App\Models\ContentDraft;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function contentBrief(): array
{
    return [
        'content_type' => 'linkedin_post',
        'platform' => 'linkedin',
        'format' => 'post',
        'audience' => 'Small Ethiopian businesses',
        'market' => 'ethiopia',
        'service' => 'web_app',
        'objective' => 'awareness',
        'tone' => 'clear and helpful',
        'language' => 'en',
        'call_to_action' => 'Learn more',
    ];
}

function contentDraft(User $user, array $attributes = []): ContentDraft
{
    return $user->contentDrafts()->create([
        ...contentBrief(),
        'title' => 'A draft title',
        'body' => 'Draft body copy.',
        'status' => 'draft',
        ...$attributes,
    ]);
}

test('guests cannot access the content studio', function () {
    $this->get(route('content-studio.index'))->assertRedirect('/login');
    $this->post(route('content-studio.generate'), contentBrief())->assertRedirect('/login');
});

test('owners can view the content library and create manual ideas', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get(route('content-studio.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('content-studio/index')->has('drafts.data'));

    $this->post(route('content-studio.store'), [
        ...contentBrief(),
        'title' => 'Content idea',
        'body' => 'A human-written draft.',
    ])->assertRedirect();

    $this->assertDatabaseHas('content_drafts', [
        'user_id' => $user->id,
        'title' => 'Content idea',
        'status' => 'idea',
        'is_generated' => false,
    ]);
});

test('content draft data is private to its owner', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $draft = contentDraft($owner);

    $this->actingAs($other)->get(route('content-studio.edit', $draft))->assertNotFound();
    $this->actingAs($other)->put(route('content-studio.update', $draft), [
        ...contentBrief(),
        'title' => 'Stolen edit',
        'body' => 'Not allowed.',
    ])->assertNotFound();
    $this->actingAs($other)->post(route('content-studio.approve', $draft))->assertNotFound();

    expect($draft->fresh()->title)->toBe('A draft title');
});

test('AI generation stores a private editable draft with provider and template metadata', function () {
    $user = User::factory()->create();
    $project = $user->projects()->create([
        'title_en' => 'Verified portfolio item',
        'slug' => 'verified-portfolio-item',
        'summary_en' => 'A published portfolio summary.',
        'description_en' => 'A published portfolio description.',
        'category' => 'saas',
        'status' => 'published',
        'is_published' => true,
    ]);
    config()->set('funnel-ai.driver', 'openai-compatible');
    config()->set('funnel-ai.api_key', 'test-secret');
    config()->set('funnel-ai.model', 'test-model');
    Http::fake([
        '*' => Http::response([
            'output' => [[
                'content' => [[
                    'text' => json_encode(['title' => 'Generated title', 'body' => 'Generated draft copy.']),
                ]],
            ]],
        ], 200),
    ]);

    $this->actingAs($user)->post(route('content-studio.generate'), [
        ...contentBrief(),
        'portfolio_project_id' => $project->id,
    ])->assertRedirect();

    $draft = ContentDraft::query()->firstOrFail();
    expect($draft->title)->toBe('Generated title')
        ->and($draft->body)->toBe('Generated draft copy.')
        ->and($draft->status)->toBe('draft')
        ->and($draft->is_generated)->toBeTrue()
        ->and($draft->provider_model)->toBe('test-model')
        ->and($draft->portfolio_project_id)->toBe($project->id);
    $this->assertDatabaseHas('content_draft_versions', [
        'content_draft_id' => $draft->id,
        'reason' => 'generated',
    ]);
    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-secret')
        && str_contains($request['input'], 'Verified portfolio item')
        && ! str_contains($request['input'], $user->email));
});

test('AI generation fails explicitly when the provider response is invalid', function () {
    $user = User::factory()->create();
    config()->set('funnel-ai.driver', 'openai-compatible');
    config()->set('funnel-ai.api_key', 'test-secret');
    Http::fake(['*' => Http::response(['output' => [['content' => [['text' => 'not json']]]]], 200)]);

    $this->actingAs($user)->from(route('content-studio.create'))
        ->post(route('content-studio.generate'), contentBrief())
        ->assertRedirect(route('content-studio.create'))
        ->assertSessionHasErrors('generation');

    expect(ContentDraft::query()->count())->toBe(0);
});

test('content must pass through review and approval before scheduling and manual publication', function () {
    $user = User::factory()->create();
    $draft = contentDraft($user);
    $this->actingAs($user)->post(route('content-studio.review', $draft))->assertRedirect();
    expect($draft->fresh()->status)->toBe('in_review');

    $this->post(route('content-studio.approve', $draft))->assertRedirect();
    expect($draft->fresh()->status)->toBe('approved')
        ->and($draft->fresh()->approved_at)->not->toBeNull();

    $this->post(route('content-studio.schedule', $draft), [
        'scheduled_at' => now()->addDay()->toDateTimeString(),
    ])->assertRedirect();
    expect($draft->fresh()->status)->toBe('scheduled');

    $this->post(route('content-studio.publish', $draft), [
        'confirmed' => true,
        'published_url' => 'https://example.com/verified-post',
    ])->assertRedirect();
    expect($draft->fresh()->status)->toBe('published')
        ->and($draft->fresh()->published_at)->not->toBeNull()
        ->and($draft->fresh()->published_url)->toBe('https://example.com/verified-post');
});

test('editing a draft records the previous version and clears approval state', function () {
    $user = User::factory()->create();
    $draft = contentDraft($user, ['status' => 'approved', 'approved_at' => now()]);

    $this->actingAs($user)->put(route('content-studio.update', $draft), [
        ...contentBrief(),
        'title' => 'Updated title',
        'body' => 'Updated body.',
    ])->assertRedirect();

    expect($draft->fresh()->title)->toBe('Updated title')
        ->and($draft->fresh()->status)->toBe('draft')
        ->and($draft->fresh()->approved_at)->toBeNull()
        ->and($draft->versions()->first()->title)->toBe('A draft title');
});

test('only owned published portfolio projects can be used as AI references', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $project = $otherUser->projects()->create([
        'title_en' => 'Private project',
        'slug' => 'private-project',
        'status' => 'published',
        'is_published' => true,
    ]);
    config()->set('funnel-ai.driver', 'openai-compatible');
    config()->set('funnel-ai.api_key', 'test-secret');

    $this->actingAs($user)->post(route('content-studio.generate'), [
        ...contentBrief(),
        'portfolio_project_id' => $project->id,
    ])->assertSessionHasErrors('portfolio_project_id');
});
