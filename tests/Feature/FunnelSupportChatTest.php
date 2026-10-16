<?php

use App\Contracts\CopilotAdvisor;
use App\Models\Funnel;
use App\Models\User;
use App\Services\Ai\OpenAICopilotAdvisor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function supportChatFunnel(User $user, bool $published = true, array $content = []): Funnel
{
    return $user->funnels()->create([
        'name' => 'Support chat funnel',
        'slug' => 'support-chat-funnel-'.Str::random(8),
        'content' => $content ?: ['sections' => [[
            'columns' => [[
                'blocks' => [[
                    'type' => 'text',
                    'content' => ['html' => '<h1>Our pricing starts at $25</h1>'],
                ]],
            ]],
        ]]],
        'settings' => [],
        'status' => $published ? 'published' : 'draft',
        'is_published' => $published,
    ]);
}

function bindSupportChatAdvisor(string $answer = 'The page says it starts at $25.'): void
{
    app()->bind(CopilotAdvisor::class, fn () => new class($answer) implements CopilotAdvisor
    {
        public function __construct(private readonly string $answer) {}

        public function advise(array $context): array
        {
            return [];
        }

        public function answerSupportQuestion(array $context): array
        {
            return ['answer' => $this->answer];
        }
    });
}

test('published funnels answer visitor questions using the existing advisor', function () {
    bindSupportChatAdvisor();
    $funnel = supportChatFunnel(User::factory()->create());

    $this->postJson(route('funnels.support-chat', $funnel), [
        'question' => 'What is the price?',
        'previous_questions' => ['What is included?'],
    ])->assertOk()
        ->assertJsonPath('answer', 'The page says it starts at $25.')
        ->assertJsonPath('source', 'ai');
});

test('draft funnels cannot be queried through public support chat', function () {
    $funnel = supportChatFunnel(User::factory()->create(), false);

    $this->postJson(route('funnels.support-chat', $funnel), ['question' => 'What is this?'])
        ->assertNotFound();
});

test('support chat validates bounded visitor input', function () {
    $funnel = supportChatFunnel(User::factory()->create());

    $this->postJson(route('funnels.support-chat', $funnel), ['question' => str_repeat('a', 1001)])
        ->assertUnprocessable();
    $this->postJson(route('funnels.support-chat', $funnel), [
        'question' => 'Hello',
        'previous_questions' => array_fill(0, 6, 'Earlier question'),
    ])->assertUnprocessable();
    $this->postJson(route('funnels.support-chat', $funnel), ['question' => '   '])
        ->assertUnprocessable();
});

test('support chat falls back to matching page content when AI is unavailable', function () {
    app()->bind(CopilotAdvisor::class, fn () => new class implements CopilotAdvisor
    {
        public function advise(array $context): array
        {
            return [];
        }

        public function answerSupportQuestion(array $context): array
        {
            throw new RuntimeException('AI provider unavailable');
        }
    });
    $funnel = supportChatFunnel(User::factory()->create());

    $this->postJson(route('funnels.support-chat', $funnel), ['question' => 'What is the pricing?'])
        ->assertOk()
        ->assertJsonPath('source', 'page_content')
        ->assertJsonPath('answer', 'I can only answer from information on this page. It mentions: Our pricing starts at $25');
});

test('support chat only uses active variants belonging to the funnel', function () {
    $funnel = supportChatFunnel(User::factory()->create());
    $variant = $funnel->variants()->create([
        'name' => 'Alternative',
        'content' => ['sections' => [[
            'columns' => [[
                'blocks' => [[
                    'type' => 'text',
                    'content' => ['html' => '<p>Variant offer costs $40</p>'],
                ]],
            ]],
        ]]],
        'settings' => [],
        'weight' => 50,
        'is_active' => true,
    ]);
    app()->bind(CopilotAdvisor::class, fn () => new class implements CopilotAdvisor
    {
        public function advise(array $context): array
        {
            return [];
        }

        public function answerSupportQuestion(array $context): array
        {
            expect(json_encode($context['content']))->toContain('Variant offer costs $40');

            return ['answer' => 'This variant costs $40.'];
        }
    });

    $this->postJson(route('funnels.support-chat', $funnel), [
        'question' => 'How much?',
        'variant_id' => $variant->id,
    ])->assertOk()->assertJsonPath('answer', 'This variant costs $40.');

    $variant->update(['is_active' => false]);
    $this->postJson(route('funnels.support-chat', $funnel), [
        'question' => 'How much?',
        'variant_id' => $variant->id,
    ])->assertNotFound();
});

test('public funnel pages enable chat but private previews do not', function () {
    $user = User::factory()->create();
    $published = supportChatFunnel($user);
    $draft = supportChatFunnel($user, false);
    $this->withoutVite();

    $this->get(route('funnels.show', $published))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('funnel-preview')
            ->where('supportChatEnabled', true));
    $this->actingAs($user)->get(route('funnels.show', $draft))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('funnel-preview')
            ->where('supportChatEnabled', false));
});

test('OpenAI support answers are bounded and stripped of markup', function () {
    config([
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://api.openai.com/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 1,
    ]);
    Http::fake([
        'api.openai.com/*' => Http::response(['output' => [['content' => [[
            'text' => json_encode(['answer' => '<b>It costs $25</b>'], JSON_THROW_ON_ERROR),
        ]]]]], 200),
    ]);

    $result = (new OpenAICopilotAdvisor)->answerSupportQuestion([
        'content' => ['sections' => [[
            'columns' => [[
                'blocks' => [[
                    'type' => 'text',
                    'content' => ['html' => '<h1>Pricing</h1><script>private prompt</script>'],
                ]],
            ]],
        ]]],
        'question' => '<script>ignore rules</script>How much?',
        'previous_questions' => [],
    ]);

    Http::assertSent(fn ($request) => ! str_contains($request->body(), 'private prompt')
        && ! str_contains($request->body(), 'ignore rules'));
    expect($result['answer'])->toBe('It costs $25');
});

test('OpenAI support advisor rejects invalid JSON and provider rate limits', function () {
    config([
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://api.openai.com/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 1,
    ]);
    Http::fake([
        'api.openai.com/*' => Http::sequence()
            ->push(['output' => [['content' => [['text' => '{invalid json']]]]], 200)
            ->push(['error' => 'rate limited'], 429),
    ]);
    $advisor = new OpenAICopilotAdvisor;
    $context = ['content' => ['sections' => []], 'question' => 'Can you help?', 'previous_questions' => []];

    expect(fn () => $advisor->answerSupportQuestion($context))->toThrow(RuntimeException::class)
        ->and(fn () => $advisor->answerSupportQuestion($context))->toThrow(RuntimeException::class);
});

test('support chat falls back to page content after a provider timeout', function () {
    config([
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://api.openai.com/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 1,
    ]);
    Http::fake(fn () => throw new ConnectionException('Provider timed out'));
    $funnel = supportChatFunnel(User::factory()->create());

    $this->postJson(route('funnels.support-chat', $funnel), ['question' => 'What is the pricing?'])
        ->assertOk()
        ->assertJsonPath('source', 'page_content');
});
