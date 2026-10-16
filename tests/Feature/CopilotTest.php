<?php

use App\Contracts\CopilotAdvisor;
use App\Models\CopilotAudit;
use App\Models\CopilotRecommendation;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\User;
use App\Services\Ai\OpenAICopilotAdvisor;
use App\Services\FunnelOptimizationEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function copilotFunnel(User $user, bool $published = true, array $content = []): Funnel
{
    return $user->funnels()->create([
        'name' => 'Copilot Test Funnel',
        'slug' => 'copilot-test-funnel-'.random_int(1, 99999),
        'content' => $content ?: ['sections' => [
            [
                'id' => 'sec-1',
                'type' => 'section',
                'layout' => 'single',
                'columns' => [[
                    'id' => 'col-1',
                    'type' => 'column',
                    'width' => 100,
                    'blocks' => [
                        ['id' => 'b-1', 'type' => 'text', 'content' => ['html' => '<h1>Headline</h1>'], 'settings' => []],
                        ['id' => 'b-2', 'type' => 'button', 'content' => ['label' => 'Get Started'], 'settings' => []],
                        ['id' => 'b-3', 'type' => 'form', 'content' => ['fields' => [
                            ['id' => 'f-1', 'type' => 'email', 'name' => 'email', 'label' => 'Email', 'required' => true],
                        ]], 'settings' => []],
                    ],
                    'settings' => [],
                ]],
                'settings' => [],
            ],
        ]],
        'settings' => ['backgroundColor' => '#ffffff', 'maxWidth' => '1200px'],
        'status' => $published ? 'published' : 'draft',
        'is_published' => $published,
    ]);
}

function seedEvents(Funnel $funnel, int $views = 50, int $ctaClicks = 10, int $formStarts = 8, int $conversions = 3): void
{
    for ($i = 1; $i <= $views; $i++) {
        $funnel->events()->create([
            'event_type' => 'view',
            'session_id' => hash('sha256', "session-{$i}"),
            'occurred_at' => now()->subDays(random_int(0, 14)),
        ]);
    }
    for ($i = 1; $i <= $ctaClicks; $i++) {
        $funnel->events()->create([
            'event_type' => 'cta_click',
            'session_id' => hash('sha256', "session-{$i}"),
            'occurred_at' => now()->subDays(random_int(0, 14)),
        ]);
    }
    for ($i = 1; $i <= $formStarts; $i++) {
        $funnel->events()->create([
            'event_type' => 'form_start',
            'session_id' => hash('sha256', "session-{$i}"),
            'occurred_at' => now()->subDays(random_int(0, 14)),
        ]);
    }
    for ($i = 1; $i <= $conversions; $i++) {
        $funnel->events()->create([
            'event_type' => 'conversion',
            'session_id' => hash('sha256', "session-{$i}"),
            'occurred_at' => now()->subDays(random_int(0, 14)),
        ]);
    }
}

// ── Authorization Tests ─────────────────────────────────────────────

test('guests cannot access copilot', function () {
    $funnel = copilotFunnel(User::factory()->create());

    $this->get(route('copilot.show', $funnel))->assertRedirect('/login');
    $this->postJson(route('copilot.audit', $funnel))->assertUnauthorized();
});

test('owners can view their funnel copilot', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->withoutVite();
    $this->actingAs($user)->get(route('copilot.show', $funnel))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('copilot')
            ->where('funnel.id', $funnel->id)
            ->where('funnel.name', 'Copilot Test Funnel')
            ->has('auditHistory')
        );
});

test('users cannot view another users copilot', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $funnel = copilotFunnel($owner);

    $this->actingAs($other)->get(route('copilot.show', $funnel))->assertForbidden();
    $this->actingAs($other)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(30)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertForbidden();
});

test('users cannot view another users audit history', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $funnel = copilotFunnel($owner);

    $audit = CopilotAudit::create([
        'user_id' => $owner->id,
        'funnel_id' => $funnel->id,
        'status' => 'completed',
        'metrics' => ['views' => 100],
        'recommendations' => [],
    ]);

    $this->actingAs($other)
        ->getJson(route('copilot.audit.show', [$funnel, $audit]))
        ->assertForbidden();
});

// ── Validation Tests ────────────────────────────────────────────────

test('invalid date ranges are rejected', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => 'not-a-date',
        'date_to' => now()->toDateString(),
    ])->assertUnprocessable();
});

test('date range exceeding 90 days is rejected', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(120)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertStatus(422);
});

test('date_to before date_from is rejected', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->toDateString(),
        'date_to' => now()->subDays(10)->toDateString(),
    ])->assertUnprocessable();
});

// ── Optimization Engine Tests ───────────────────────────────────────

test('engine detects missing CTA', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => [
        ['id' => 's1', 'type' => 'section', 'layout' => 'single', 'columns' => [[
            'id' => 'c1', 'type' => 'column', 'width' => 100, 'blocks' => [
                ['id' => 'b1', 'type' => 'text', 'content' => ['html' => '<h1>Test</h1>'], 'settings' => []],
            ], 'settings' => [],
        ]], 'settings' => []],
    ]]);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(30)->toDateString(), now()->toDateString());

    $keys = collect($result['recommendations'])->pluck('key');
    expect($keys)->toContain('missing_cta')
        ->and($keys)->toContain('missing_form');
});

test('engine detects missing headline', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => [
        ['id' => 's1', 'type' => 'section', 'layout' => 'single', 'columns' => [[
            'id' => 'c1', 'type' => 'column', 'width' => 100, 'blocks' => [
                ['id' => 'b1', 'type' => 'text', 'content' => ['html' => '<p>No heading here</p>'], 'settings' => []],
                ['id' => 'b2', 'type' => 'button', 'content' => ['label' => 'Click'], 'settings' => []],
                ['id' => 'b3', 'type' => 'form', 'content' => ['fields' => [
                    ['id' => 'f1', 'type' => 'email', 'name' => 'email', 'label' => 'Email', 'required' => true],
                ]], 'settings' => []],
            ], 'settings' => [],
        ]], 'settings' => []],
    ]]);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect(collect($result['recommendations'])->pluck('key'))->toContain('missing_headline');
});

test('engine detects empty funnel', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => []]);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect(collect($result['recommendations'])->pluck('key'))->toContain('empty_funnel');
});

test('engine detects form friction with many fields', function () {
    $user = User::factory()->create();
    $fields = [];
    for ($i = 1; $i <= 8; $i++) {
        $fields[] = ['id' => "f{$i}", 'type' => 'text', 'name' => "field{$i}", 'label' => "Field {$i}", 'required' => true];
    }
    $funnel = copilotFunnel($user, true, ['sections' => [
        ['id' => 's1', 'type' => 'section', 'layout' => 'single', 'columns' => [[
            'id' => 'c1', 'type' => 'column', 'width' => 100, 'blocks' => [
                ['id' => 'b1', 'type' => 'text', 'content' => ['html' => '<h1>Title</h1>'], 'settings' => []],
                ['id' => 'b2', 'type' => 'button', 'content' => ['label' => 'Go'], 'settings' => []],
                ['id' => 'b3', 'type' => 'form', 'content' => ['fields' => $fields], 'settings' => []],
            ], 'settings' => [],
        ]], 'settings' => []],
    ]]);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    $keys = collect($result['recommendations'])->pluck('key');
    expect($keys)->toContain('form_friction_fields')
        ->and($keys)->toContain('form_missing_email');
});

test('engine reports low sample size warning', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);
    // Only add 5 views — below threshold
    foreach (range(1, 5) as $i) {
        $funnel->events()->create([
            'event_type' => 'view',
            'occurred_at' => now()->subDays(1),
        ]);
    }

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect($result['metrics']['sample_size_sufficient'])->toBeFalse()
        ->and(collect($result['recommendations'])->pluck('key'))->toContain('low_sample_size');
});

test('engine computes correct metrics', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);
    seedEvents($funnel, views: 100, ctaClicks: 20, formStarts: 15, conversions: 5);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(30)->toDateString(), now()->toDateString());

    expect($result['metrics']['views'])->toBe(100)
        ->and($result['metrics']['cta_clicks'])->toBe(20)
        ->and($result['metrics']['form_starts'])->toBe(15)
        ->and($result['metrics']['conversions'])->toBe(5)
        ->and($result['metrics']['conversion_rate'])->toBe(5.0)
        ->and($result['metrics']['cta_click_rate'])->toBe(20.0)
        ->and($result['metrics']['sample_size_sufficient'])->toBeTrue()
        ->and($result['metrics']['data_quality'])->toBe('good');
});

test('engine returns floating zero rates when there are no views', function () {
    $funnel = copilotFunnel(User::factory()->create());

    $metrics = (new FunnelOptimizationEngine)->computeMetrics($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect($metrics['conversion_rate'])->toBe(0.0)
        ->and($metrics['cta_click_rate'])->toBe(0.0)
        ->and($metrics['form_completion_rate'])->toBe(0.0);
});

test('engine marks inconsistent analytics and preserves observed raw rates', function () {
    $funnel = copilotFunnel(User::factory()->create());
    $funnel->events()->create(['event_type' => 'view', 'occurred_at' => now()]);
    foreach (range(1, 2) as $index) {
        $funnel->events()->create(['event_type' => 'conversion', 'occurred_at' => now()]);
    }

    $metrics = (new FunnelOptimizationEngine)->computeMetrics($funnel, now()->toDateString(), now()->toDateString());

    expect($metrics['conversion_rate'])->toBe(200.0)
        ->and($metrics['data_quality'])->toBe('inconsistent')
        ->and($metrics['data_warnings'])->toContain('Conversion events exceed view events in this period.');
});

test('engine reports measured form-step drop-offs by unique session', function () {
    $funnel = copilotFunnel(User::factory()->create());
    foreach (['session-a', 'session-b', 'session-c'] as $session) {
        $funnel->events()->create([
            'event_type' => 'form_step',
            'form_id' => 'lead-form',
            'session_id' => hash('sha256', $session),
            'metadata' => ['step' => '1'],
            'occurred_at' => now(),
        ]);
    }
    foreach (['session-a', 'session-b'] as $session) {
        $funnel->events()->create([
            'event_type' => 'form_step',
            'form_id' => 'lead-form',
            'session_id' => hash('sha256', $session),
            'metadata' => ['step' => '2'],
            'occurred_at' => now(),
        ]);
    }

    $metrics = (new FunnelOptimizationEngine)->computeMetrics($funnel, now()->toDateString(), now()->toDateString());

    expect($metrics['form_steps'])->toHaveCount(2)
        ->and($metrics['form_steps'][0]['sessions'])->toBe(3)
        ->and($metrics['form_steps'][0]['drop_offs'])->toBe(1)
        ->and($metrics['form_steps'][1]['sessions'])->toBe(2)
        ->and($metrics['form_steps'][1]['drop_offs'])->toBeNull();
});

test('engine reports stored source and device breakdowns without inventing missing values', function () {
    $funnel = copilotFunnel(User::factory()->create());
    $funnel->events()->create([
        'event_type' => 'view',
        'attribution' => ['utm_source' => 'newsletter', 'device' => 'mobile'],
        'metadata' => ['device' => 'mobile'],
        'occurred_at' => now(),
    ]);
    $funnel->events()->create([
        'event_type' => 'conversion',
        'attribution' => ['utm_source' => 'newsletter', 'device' => 'mobile'],
        'occurred_at' => now(),
    ]);

    $metrics = (new FunnelOptimizationEngine)->computeMetrics($funnel, now()->toDateString(), now()->toDateString());

    expect($metrics['traffic_sources'][0])->toMatchArray([
        'label' => 'newsletter',
        'views' => 1,
        'conversions' => 1,
        'conversion_rate' => 100.0,
    ])->and($metrics['devices'][0]['label'])->toBe('mobile');
});

test('engine handles empty datasets correctly', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect($result['metrics']['views'])->toBe(0)
        ->and($result['metrics']['conversion_rate'])->toBe(0.0)
        ->and($result['metrics']['data_quality'])->toBe('no_data');
});

test('engine applies correct date filtering', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    // Events inside range
    $funnel->events()->create(['event_type' => 'view', 'occurred_at' => now()->subDays(3)]);
    $funnel->events()->create(['event_type' => 'conversion', 'occurred_at' => now()->subDays(3)]);

    // Event outside range
    $funnel->events()->create(['event_type' => 'view', 'occurred_at' => now()->subDays(60)]);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(7)->toDateString(), now()->toDateString());

    expect($result['metrics']['views'])->toBe(1)
        ->and($result['metrics']['conversions'])->toBe(1);
});

test('engine detects low conversion rate', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);
    seedEvents($funnel, views: 200, ctaClicks: 5, formStarts: 3, conversions: 1);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(30)->toDateString(), now()->toDateString());

    expect(collect($result['recommendations'])->pluck('key'))->toContain('low_conversion_rate');
});

test('engine detects no conversions with traffic', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);
    seedEvents($funnel, views: 50, ctaClicks: 5, formStarts: 3, conversions: 0);

    $engine = new FunnelOptimizationEngine;
    $result = $engine->analyze($funnel, now()->subDays(30)->toDateString(), now()->toDateString());

    expect(collect($result['recommendations'])->pluck('key'))->toContain('no_conversions');
});

test('zero conversions at the sample-size threshold triggers a tracking recommendation', function () {
    $funnel = copilotFunnel(User::factory()->create());
    seedEvents($funnel, views: 30, ctaClicks: 0, formStarts: 0, conversions: 0);

    $result = (new FunnelOptimizationEngine)->analyze($funnel, now()->subDays(30)->toDateString(), now()->toDateString());

    expect($result['metrics']['sample_size_sufficient'])->toBeTrue()
        ->and(collect($result['recommendations'])->pluck('key'))->toContain('no_conversions');
});

test('engine exposes descriptive experiment comparisons without declaring a winner', function () {
    $funnel = copilotFunnel(User::factory()->create());
    $variant = $funnel->variants()->create([
        'name' => 'Draft treatment',
        'content' => $funnel->content,
        'settings' => [],
        'weight' => 50,
        'is_active' => true,
    ]);

    foreach (range(1, 100) as $index) {
        $funnel->events()->create(['event_type' => 'view', 'occurred_at' => now()]);
        $funnel->events()->create(['event_type' => 'view', 'variant_id' => $variant->id, 'occurred_at' => now()]);
    }
    $funnel->events()->create(['event_type' => 'conversion', 'occurred_at' => now()]);
    $funnel->events()->create(['event_type' => 'conversion', 'variant_id' => $variant->id, 'occurred_at' => now()]);

    $result = (new FunnelOptimizationEngine)->analyze($funnel, now()->toDateString(), now()->toDateString());

    expect($result['metrics']['variants'][0]['views'])->toBe(100)
        ->and($result['metrics']['control']['views'])->toBe(100)
        ->and($result['metrics']['experiment_comparisons'][0]['sample_sufficient'])->toBeTrue()
        ->and($result['metrics']['experiment_comparisons'][0]['winner_declared'])->toBeFalse();
});

// ── AI Advisor Tests ────────────────────────────────────────────────

test('audit completes with valid AI response', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->app->bind(CopilotAdvisor::class, function () {
        return new class implements CopilotAdvisor
        {
            public function advise(array $context): array
            {
                return [
                    'explanations' => [['key' => 'test', 'explanation' => 'Test explanation']],
                    'copy_suggestions' => [['key' => 'headline', 'type' => 'headline', 'original' => 'Old', 'suggestion' => 'New', 'rationale' => 'Better']],
                    'experiment_hypotheses' => [['hypothesis' => 'Test hypothesis', 'primary_metric' => 'conversion_rate', 'variant_description' => 'Alt layout']],
                    'next_steps' => ['Step one', 'Step two'],
                ];
            }
        };
    });

    $response = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
        'include_ai' => true,
    ]);

    $response->assertOk();
    $audit = $response->json('audit');
    expect($audit['status'])->toBe('completed')
        ->and($audit['has_ai_advice'])->toBeTrue()
        ->and($audit['ai_advice']['explanations'])->toHaveCount(1)
        ->and($audit['ai_advice']['copy_suggestions'])->toHaveCount(1)
        ->and($audit['ai_advice']['experiment_hypotheses'])->toHaveCount(1)
        ->and($audit['ai_advice']['next_steps'])->toHaveCount(2);
});

test('audit still completes when AI fails', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->app->bind(CopilotAdvisor::class, function () {
        return new class implements CopilotAdvisor
        {
            public function advise(array $context): array
            {
                throw new \RuntimeException('AI provider unavailable');
            }
        };
    });

    $response = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
        'include_ai' => true,
    ]);

    $response->assertOk();
    $audit = $response->json('audit');
    expect($audit['status'])->toBe('completed')
        ->and($audit['has_ai_advice'])->toBeFalse()
        ->and($audit['recommendations'])->toBeArray();
});

test('audit without AI flag skips advisor', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $response = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
        'include_ai' => false,
    ]);

    $response->assertOk();
    expect($response->json('audit.has_ai_advice'))->toBeFalse();
});

test('OpenAI advisor rejects malformed JSON without requiring a live provider', function () {
    config([
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://api.openai.com/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 1,
    ]);
    Http::fake([
        'api.openai.com/*' => Http::response(['output' => [['content' => [['text' => '{invalid json']]]]], 200),
    ]);

    expect(fn () => (new OpenAICopilotAdvisor)->advise([
        'content' => ['sections' => []],
        'metrics' => [],
        'findings' => [],
        'language' => 'en',
    ]))->toThrow(RuntimeException::class);
});

test('OpenAI advisor strips markup from validated text and fixes the primary metric', function () {
    config([
        'funnel-ai.api_key' => 'test-key',
        'funnel-ai.endpoint' => 'https://api.openai.com/v1/responses',
        'funnel-ai.model' => 'test-model',
        'funnel-ai.timeout' => 1,
    ]);
    Http::fake([
        'api.openai.com/*' => Http::response(['output' => [['content' => [[
            'text' => json_encode([
                'explanations' => [['key' => 'key', 'explanation' => '<b>Observed</b> fact']],
                'copy_suggestions' => [['key' => 'cta', 'type' => 'cta', 'suggestion' => '<script>bad()</script>Start now', 'rationale' => 'Test it']],
                'experiment_hypotheses' => [['hypothesis' => 'Test copy', 'primary_metric' => 'fabricated_metric', 'variant_description' => 'New copy']],
                'next_steps' => ['Review the draft'],
            ], JSON_THROW_ON_ERROR),
        ]]]]], 200),
    ]);

    $advice = (new OpenAICopilotAdvisor)->advise([
        'content' => ['sections' => []],
        'metrics' => [],
        'findings' => [],
        'language' => 'en',
    ]);

    expect($advice['explanations'][0]['explanation'])->toBe('Observed fact')
        ->and($advice['copy_suggestions'][0]['suggestion'])->toBe('bad()Start now')
        ->and($advice['experiment_hypotheses'][0]['primary_metric'])->toBe('conversion_rate');
});

// ── Audit Persistence Tests ─────────────────────────────────────────

test('audits are persisted and retrievable', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk();

    $audit = CopilotAudit::where('funnel_id', $funnel->id)->firstOrFail();
    expect($audit->user_id)->toBe($user->id)
        ->and($audit->status)->toBe('completed')
        ->and($audit->metrics)->toBeArray()
        ->and($audit->recommendations)->toBeArray();

    // Retrieve specific audit
    $this->actingAs($user)
        ->getJson(route('copilot.audit.show', [$funnel, $audit]))
        ->assertOk()
        ->assertJsonPath('audit.id', $audit->id);
});

test('recommendations persist with evidence metrics and casts', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => []]);

    $response = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk();

    $saved = CopilotRecommendation::findOrFail($response->json('audit.recommendations.0.id'));
    expect($saved->funnel_id)->toBe($funnel->id)
        ->and($saved->user_id)->toBe($user->id)
        ->and($saved->supporting_metrics)->toBeArray()
        ->and($saved->confidence_score)->toBeInt()
        ->and($saved->status)->toBe('pending')
        ->and($funnel->copilotRecommendations()->count())->toBeGreaterThan(0);
});

test('repeated audits reuse an existing pending recommendation', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => []]);
    $payload = [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ];

    $firstResponse = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), $payload)->assertOk();
    $firstId = $firstResponse->json('audit.recommendations.0.id');
    $secondResponse = $this->postJson(route('copilot.audit', $funnel), $payload)->assertOk();

    expect($secondResponse->json('audit.recommendations.0.id'))->toBe($firstId)
        ->and($funnel->copilotRecommendations()->where('key', 'empty_funnel')->where('status', 'pending')->count())->toBe(1);
});

test('accepted and dismissed recommendations retain their status and allow later review', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => []]);
    $payload = [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ];
    $audit = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), $payload)->assertOk()->json('audit');
    $recommendation = CopilotRecommendation::findOrFail($audit['recommendations'][0]['id']);

    $this->postJson(route('copilot.recommendations.accept', [$funnel, $recommendation]))
        ->assertOk()
        ->assertJsonPath('recommendation.status', 'accepted');
    expect($recommendation->fresh()->pending_fingerprint)->toBeNull()
        ->and($recommendation->fresh()->accepted_at)->not->toBeNull();

    $nextAudit = $this->postJson(route('copilot.audit', $funnel), $payload)->assertOk()->json('audit');
    expect($nextAudit['recommendations'][0]['id'])->not->toBe($recommendation->id)
        ->and($funnel->copilotRecommendations()->where('status', 'pending')->count())->toBeGreaterThan(0);

    $newPending = CopilotRecommendation::findOrFail($nextAudit['recommendations'][0]['id']);
    $this->postJson(route('copilot.recommendations.dismiss', [$funnel, $newPending]))
        ->assertOk()
        ->assertJsonPath('recommendation.status', 'dismissed');
    expect($newPending->fresh()->dismissed_at)->not->toBeNull();
});

test('users cannot act on recommendations for a different funnel', function () {
    $user = User::factory()->create();
    $firstFunnel = copilotFunnel($user, true, ['sections' => []]);
    $otherFunnel = copilotFunnel($user, true, ['sections' => []]);
    $audit = $this->actingAs($user)->postJson(route('copilot.audit', $firstFunnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk()->json('audit');
    $recommendation = CopilotRecommendation::findOrFail($audit['recommendations'][0]['id']);

    $this->postJson(route('copilot.recommendations.accept', [$otherFunnel, $recommendation]))->assertNotFound();
});

test('users cannot access another users recommendation actions', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $funnel = copilotFunnel($owner, true, ['sections' => []]);
    $audit = $this->actingAs($owner)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk()->json('audit');
    $recommendation = CopilotRecommendation::findOrFail($audit['recommendations'][0]['id']);

    $this->actingAs($other)
        ->postJson(route('copilot.recommendations.dismiss', [$funnel, $recommendation]))
        ->assertForbidden();
});

test('accepted recommendations create only inactive draft variants with hypothesis metadata', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user, true, ['sections' => []]);
    $audit = $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk()->json('audit');
    $recommendation = CopilotRecommendation::findOrFail($audit['recommendations'][0]['id']);

    $this->postJson(route('copilot.recommendations.experiment', [$funnel, $recommendation]))->assertStatus(409);
    $this->postJson(route('copilot.recommendations.accept', [$funnel, $recommendation]))->assertOk();
    $response = $this->postJson(route('copilot.recommendations.experiment', [$funnel, $recommendation]))->assertCreated();
    $variant = $funnel->variants()->findOrFail($response->json('variant.id'));

    expect($variant->is_active)->toBeFalse()
        ->and($variant->content)->toBe($funnel->content)
        ->and(data_get($variant->settings, 'copilot_experiment.recommendation_id'))->toBe($recommendation->id)
        ->and(data_get($variant->settings, 'copilot_experiment.primary_metric'))->toBe('conversion_rate')
        ->and(data_get($variant->settings, 'copilot_experiment.status'))->toBe('draft')
        ->and($response->json('variant.editor_url'))->toBe(route('funnel-editor.edit', $funnel));

    $this->postJson(route('copilot.recommendations.experiment', [$funnel, $recommendation]))->assertCreated();
    expect($funnel->variants()->count())->toBe(1);
});

test('copilot page shows latest audit and history', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    CopilotAudit::create([
        'user_id' => $user->id,
        'funnel_id' => $funnel->id,
        'status' => 'completed',
        'metrics' => ['views' => 42, 'conversions' => 5, 'conversion_rate' => 11.9],
        'recommendations' => [['key' => 'test', 'title' => 'Test']],
        'completed_at' => now(),
    ]);

    $this->withoutVite();
    $this->actingAs($user)->get(route('copilot.show', $funnel))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('copilot')
            ->where('latestAudit.status', 'completed')
            ->has('auditHistory', 1)
        );
});

test('audit stores funnel revision and content snapshot', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);
    $funnel->update(['revision' => 5]);

    $this->actingAs($user)->postJson(route('copilot.audit', $funnel), [
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ])->assertOk();

    $audit = CopilotAudit::where('funnel_id', $funnel->id)->firstOrFail();
    expect($audit->funnel_revision)->toBe(5)
        ->and($audit->content_snapshot)->toBeArray()
        ->and($audit->content_snapshot)->toHaveKey('sections');
});

// ── Regression Tests ────────────────────────────────────────────────

test('existing funnel endpoints still work', function () {
    $user = User::factory()->create();

    $this->withoutVite();
    $this->actingAs($user)->get(route('funnels.index'))->assertOk();
    $this->actingAs($user)->get(route('funnel-editor'))->assertOk();
});

test('existing analytics events still accepted', function () {
    $funnel = copilotFunnel(User::factory()->create());

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'view',
        'session_id' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ])->assertAccepted();
});

test('existing variant operations still work', function () {
    $user = User::factory()->create();
    $funnel = copilotFunnel($user);

    $this->actingAs($user)->post(route('funnels.variants.store', $funnel), [
        'name' => 'Copilot Test Variant',
        'weight' => 50,
        'content' => json_encode(['sections' => []]),
        'settings' => json_encode(['backgroundColor' => '#000000']),
    ])->assertRedirect();

    expect($funnel->variants()->count())->toBe(1);
});
