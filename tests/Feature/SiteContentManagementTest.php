<?php

use App\Models\SiteContent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests cannot access site content management', function () {
    $this->get(route('site-content.index', 'blog'))->assertRedirect(route('login'));
    $this->post(route('site-content.store', 'blog'), [])->assertRedirect(route('login'));
});

test('users can create bilingual content with SEO metadata and publish it', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('site-content.store', 'service'), [
        'title_en' => 'Custom software engineering',
        'title_am' => 'ብጁ የሶፍትዌር ምህንድስና',
        'summary_en' => 'Software built for your business.',
        'summary_am' => 'ለንግድዎ የተዘጋጀ ሶፍትዌር።',
        'body_en' => 'We design and build software products.',
        'body_am' => 'የሶፍትዌር ምርቶችን እንነድፋለን እና እንገነባለን።',
        'highlights' => ['Laravel applications', 'AI integrations'],
        'seo_title_en' => 'Custom software | Hailab',
        'seo_description_en' => 'Custom software design and implementation.',
        'status' => 'published',
        'sort_order' => 1,
    ])->assertRedirect(route('site-content.index', 'service'));

    $content = SiteContent::query()->where('title_en', 'Custom software engineering')->firstOrFail();
    expect($content->user_id)->toBe($user->id)
        ->and($content->slug)->toBe('custom-software-engineering')
        ->and($content->highlights)->toBe(['Laravel applications', 'AI integrations'])
        ->and($content->published_at)->not->toBeNull();
});

test('users cannot edit or delete another users content', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $content = SiteContent::query()->create([
        'user_id' => $owner->id,
        'type' => 'blog',
        'title_en' => 'Owner article',
        'slug' => 'owner-article',
        'body_en' => 'Article content.',
        'status' => 'draft',
    ]);

    $this->actingAs($otherUser)
        ->get(route('site-content.edit', ['type' => 'blog', 'entry' => $content->id]))
        ->assertNotFound();
    $this->actingAs($otherUser)
        ->delete(route('site-content.destroy', ['type' => 'blog', 'entry' => $content->id]))
        ->assertNotFound();

    $this->assertDatabaseHas('site_contents', ['id' => $content->id]);
});

test('public blog only renders published entries and supports bilingual pages', function () {
    $user = User::factory()->create();
    $article = SiteContent::query()->create([
        'user_id' => $user->id,
        'type' => 'blog',
        'title_en' => 'Published article',
        'title_am' => 'የታተመ ጽሑፍ',
        'slug' => 'published-article',
        'body_en' => 'Published body.',
        'body_am' => 'የታተመ ይዘት።',
        'status' => 'published',
        'published_at' => now()->subMinute(),
    ]);
    SiteContent::query()->create([
        'user_id' => $user->id,
        'type' => 'blog',
        'title_en' => 'Draft article',
        'slug' => 'draft-article',
        'body_en' => 'Draft body.',
        'status' => 'draft',
    ]);
    $page = SiteContent::query()->create([
        'user_id' => $user->id,
        'type' => 'page',
        'title_en' => 'About Hailab',
        'title_am' => 'ስለ Hailab',
        'slug' => 'about',
        'body_en' => 'About our team.',
        'body_am' => 'ስለ ቡድናችን።',
        'status' => 'published',
        'published_at' => now()->subMinute(),
    ]);

    $this->get(route('blog.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $response) => $response
            ->component('blog')
            ->has('articles.data', 1)
            ->where('articles.data.0.id', $article->id)
        );

    $this->get(route('blog.show', $article->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $response) => $response
            ->component('site-content/show')
            ->where('content.title_am', 'የታተመ ጽሑፍ')
        );

    $this->get(route('blog.show', 'draft-article'))->assertNotFound();
    $this->get(route('about'))
        ->assertOk()
        ->assertInertia(fn (Assert $response) => $response
            ->component('site-content/show')
            ->where('content.id', $page->id)
        );
});

test('site content admin lists are restricted to the selected type and owner', function () {
    $user = User::factory()->create();
    SiteContent::query()->create([
        'user_id' => $user->id,
        'type' => 'service',
        'title_en' => 'Owned service',
        'slug' => 'owned-service',
        'body_en' => 'Description.',
        'status' => 'draft',
    ]);
    SiteContent::query()->create([
        'user_id' => User::factory()->create()->id,
        'type' => 'service',
        'title_en' => 'Other service',
        'slug' => 'other-service',
        'body_en' => 'Description.',
        'status' => 'draft',
    ]);
    SiteContent::query()->create([
        'user_id' => $user->id,
        'type' => 'blog',
        'title_en' => 'Owned article',
        'slug' => 'owned-article',
        'body_en' => 'Description.',
        'status' => 'draft',
    ]);

    $this->actingAs($user)
        ->get(route('site-content.index', 'service'))
        ->assertOk()
        ->assertInertia(fn (Assert $response) => $response
            ->component('site-content/index')
            ->has('entries.data', 1)
            ->where('entries.data.0.title_en', 'Owned service')
        );
});
