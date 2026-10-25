<?php

use App\Contracts\ConciergeAdvisor;
use App\Models\ClientAcquisitionSettings;
use App\Models\MarketplaceTemplate;
use App\Models\SiteEvent;
use App\Models\User;
use App\Services\Ai\OpenAIConciergeAdvisor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function conciergeOwner(): User
{
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    return $owner;
}

test('concierge question endpoint is public and answers from deterministic knowledge without an AI provider', function () {
    conciergeOwner();

    $response = $this->withoutVite()->postJson(route('concierge.ask'), [
        'question' => 'What development services do you offer?',
    ])
        ->assertOk()
        ->assertJsonStructure(['answer', 'source', 'suggestions'])
        ->assertJsonPath('source', 'knowledge');

    expect(mb_strlen((string) $response->json('answer')))->toBeGreaterThan(20);
    expect(SiteEvent::where('event_type', 'concierge_question_answered')->count())->toBe(1);
});

test('concierge answers in Amharic when the locale is Amharic', function () {
    conciergeOwner();

    $response = $this->postJson(route('concierge.ask'), [
        'question' => 'ዋጋ ምን ያህል ነው?',
        'locale' => 'am',
    ])->assertOk()->assertJsonPath('source', 'knowledge');

    expect(mb_strlen((string) $response->json('answer')))->toBeGreaterThan(20)
        ->and(SiteEvent::where('event_type', 'concierge_question_answered')->value('locale'))->toBe('am');
});

test('concierge product suggestions link to real published catalog records only', function () {
    conciergeOwner();
    MarketplaceTemplate::query()->create([
        'slug' => 'lead-crm-starter',
        'name' => 'Lead CRM Starter',
        'description' => 'A CRM template for capturing and qualifying leads.',
        'amount_minor' => 150000,
        'currency' => 'ETB',
        'status' => 'published',
    ]);
    MarketplaceTemplate::query()->create([
        'slug' => 'unpublished-draft',
        'name' => 'Unpublished Draft',
        'description' => 'A template still awaiting review.',
        'amount_minor' => 90000,
        'currency' => 'ETB',
        'status' => 'pending_review',
    ]);

    $response = $this->postJson(route('concierge.ask'), [
        'question' => 'What digital products can I buy today?',
    ])->assertOk();

    $urls = collect($response->json('suggestions'))->pluck('url');
    expect($urls->contains('/marketplace/lead-crm-starter'))->toBeTrue()
        ->and($urls->contains('/marketplace/unpublished-draft'))->toBeFalse();
    expect($response->json('answer'))->toContain('Lead CRM Starter')
        ->and($response->json('answer'))->not->toContain('Unpublished Draft');
});

test('concierge hides the assistant endpoint when the owner disables it', function () {
    $owner = conciergeOwner();
    ClientAcquisitionSettings::query()->create([
        ...ClientAcquisitionSettings::defaults(),
        'user_id' => $owner->id,
        'concierge_enabled' => false,
    ]);

    $this->postJson(route('concierge.ask'), ['question' => 'Hello there'])
        ->assertNotFound();
});

test('concierge endpoint rejects oversized questions and too much history', function () {
    conciergeOwner();

    $this->postJson(route('concierge.ask'), ['question' => str_repeat('a', 501)])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['question']);

    $this->postJson(route('concierge.ask'), [
        'question' => 'What about automation?',
        'previous_questions' => ['one?', 'two?', 'three?', 'four?', 'five?'],
    ])->assertStatus(422)->assertJsonValidationErrors(['previous_questions']);
});

test('concierge endpoint is rate limited', function () {
    conciergeOwner();

    for ($attempt = 0; $attempt < 10; $attempt++) {
        $this->postJson(route('concierge.ask'), ['question' => 'Question number '.$attempt.'?'])
            ->assertOk();
    }

    $this->postJson(route('concierge.ask'), ['question' => 'One question too many?'])
        ->assertStatus(429);
});

test('concierge uses a configured AI advisor and labels the answer source as ai', function () {
    conciergeOwner();
    $this->app->bind(ConciergeAdvisor::class, fn () => new class implements ConciergeAdvisor
    {
        public function answer(array $context): array
        {
            return ['answer' => 'Grounded AI answer from the provider.'];
        }
    });

    $this->postJson(route('concierge.ask'), ['question' => 'Do you build AI chatbots?'])
        ->assertOk()
        ->assertJsonPath('source', 'ai')
        ->assertJsonPath('answer', 'Grounded AI answer from the provider.');
});

test('concierge falls back to deterministic knowledge when the AI advisor fails', function () {
    conciergeOwner();
    $this->app->bind(ConciergeAdvisor::class, fn () => new class implements ConciergeAdvisor
    {
        public function answer(array $context): array
        {
            throw new RuntimeException('Provider unavailable.');
        }
    });

    $this->postJson(route('concierge.ask'), ['question' => 'Can you automate my workflows?'])
        ->assertOk()
        ->assertJsonPath('source', 'knowledge');
});

test('openai concierge advisor redacts personal identifiers before calling the provider', function () {
    config([
        'funnel-ai.driver' => 'openai-compatible',
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://ai-provider.test/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 5,
    ]);
    Http::fake([
        'ai-provider.test/*' => Http::response([
            'output' => [['content' => [['text' => json_encode(['answer' => 'Provider answered.'])]]]],
        ]),
    ]);

    $advisor = app(ConciergeAdvisor::class);
    expect($advisor)->toBeInstanceOf(OpenAIConciergeAdvisor::class);

    $result = $advisor->answer([
        'knowledge' => ['business_name' => 'Hailab'],
        'question' => 'Reach me at selam@example.com or +251 911 22 33 44 about a website',
        'previous_questions' => [],
        'locale' => 'en',
    ]);

    expect($result['answer'])->toBe('Provider answered.');
    Http::assertSent(function ($request): bool {
        $body = (string) $request->body();

        return ! str_contains($body, 'selam@example.com')
            && ! str_contains($body, '251 911 22 33 44')
            && str_contains($body, '[redacted]');
    });
});

test('openai concierge provider outage falls back to knowledge instead of failing the page', function () {
    conciergeOwner();
    config([
        'funnel-ai.driver' => 'openai-compatible',
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://ai-provider.test/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 5,
    ]);
    Http::fake(['ai-provider.test/*' => Http::response('provider error', 500)]);

    $this->postJson(route('concierge.ask'), ['question' => 'What about automation?'])
        ->assertOk()
        ->assertJsonPath('source', 'knowledge');
});

test('site events accept only whitelisted types and never store personal fields', function () {
    $this->postJson(route('site-events.store'), [
        'event' => 'concierge_opened',
        'session_id' => 'sess-privacy-1',
        'locale' => 'en',
        'email' => 'visitor@example.com',
        'name' => 'Selam Tesfaye',
        'note' => 'My phone is 0911223344',
    ])->assertOk()->assertJson(['recorded' => true]);

    $this->postJson(route('site-events.store'), ['event' => 'not_a_real_event'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['event']);

    $event = SiteEvent::firstOrFail();
    $serialized = json_encode($event->toArray(), JSON_UNESCAPED_UNICODE);

    expect(SiteEvent::count())->toBe(1)
        ->and($event->session_hash)->toBe(hash('sha256', 'sess-privacy-1'))
        ->and($serialized)->not->toContain('visitor@example.com')
        ->and($serialized)->not->toContain('Selam')
        ->and($serialized)->not->toContain('0911223344');
});

test('site events deduplicate the same visitor and type within one day', function () {
    $this->postJson(route('site-events.store'), ['event' => 'audit_started', 'session_id' => 'sess-dedupe'])->assertOk();
    $this->postJson(route('site-events.store'), ['event' => 'audit_started', 'session_id' => 'sess-dedupe'])->assertOk();
    $this->postJson(route('site-events.store'), ['event' => 'audit_completed', 'session_id' => 'sess-dedupe'])->assertOk();

    expect(SiteEvent::where('event_type', 'audit_started')->count())->toBe(1)
        ->and(SiteEvent::where('event_type', 'audit_completed')->count())->toBe(1);
});

test('audit page renders localized form choices when the session locale is Amharic', function () {
    conciergeOwner();
    $this->session(['locale' => 'am']);

    $this->withoutVite()
        ->get(route('business-audit.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit/business-growth')
            ->where('locale', 'am')
            ->where('options.markets.0.label', 'ኢትዮጵያ')
            ->where('options.timelines.0.label', 'በአንድ ወር ውስጥ')
            ->has('options.international_budgets', 4));
});

test('audit admin settings persist concierge configuration for the owner only', function () {
    $owner = conciergeOwner();
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->put(route('client-acquisition.settings.update'), [
            ...ClientAcquisitionSettings::defaults(),
            'concierge_enabled' => false,
        ])
        ->assertForbidden();

    $this->actingAs($owner)
        ->put(route('client-acquisition.settings.update'), [
            ...ClientAcquisitionSettings::defaults(),
            'concierge_enabled' => false,
            'telegram_url' => 'https://t.me/hailab_ethiopia',
            'concierge_intro_en' => 'Single-owner studio serving Ethiopian and global businesses.',
        ])
        ->assertRedirect();

    $settings = $owner->clientAcquisitionSettings()->firstOrFail();
    expect((bool) $settings->concierge_enabled)->toBeFalse()
        ->and($settings->telegram_url)->toBe('https://t.me/hailab_ethiopia')
        ->and($settings->concierge_intro_en)->toBe('Single-owner studio serving Ethiopian and global businesses.');
});
