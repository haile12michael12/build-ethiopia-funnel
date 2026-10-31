<?php

namespace App\Providers;

use App\Contracts\ConciergeAdvisor;
use App\Contracts\ContentDraftGenerator;
use App\Contracts\CopilotAdvisor;
use App\Contracts\FunnelGenerator;
use App\Listeners\ActivityEventSubscriber;
use App\Services\Ai\DisabledConciergeAdvisor;
use App\Services\Ai\DisabledContentDraftGenerator;
use App\Services\Ai\DisabledCopilotAdvisor;
use App\Services\Ai\DisabledFunnelGenerator;
use App\Services\Ai\OpenAICompatibleFunnelGenerator;
use App\Services\Ai\OpenAIConciergeAdvisor;
use App\Services\Ai\OpenAIContentDraftGenerator;
use App\Services\Ai\OpenAICopilotAdvisor;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ContentDraftGenerator::class, function () {
            if (config('funnel-ai.driver') === 'openai-compatible' && config('funnel-ai.api_key')) {
                return new OpenAIContentDraftGenerator;
            }

            return new DisabledContentDraftGenerator;
        });

        $this->app->bind(FunnelGenerator::class, function () {
            if (config('funnel-ai.driver') === 'openai-compatible' && config('funnel-ai.api_key')) {
                return new OpenAICompatibleFunnelGenerator;
            }

            return new DisabledFunnelGenerator;
        });

        $this->app->bind(CopilotAdvisor::class, function () {
            if (config('funnel-ai.driver') === 'openai-compatible' && config('funnel-ai.api_key')) {
                return new OpenAICopilotAdvisor;
            }

            return new DisabledCopilotAdvisor;
        });

        $this->app->bind(ConciergeAdvisor::class, function () {
            if (config('funnel-ai.driver') === 'openai-compatible' && config('funnel-ai.api_key')) {
                return new OpenAIConciergeAdvisor;
            }

            return new DisabledConciergeAdvisor;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app['events']->subscribe(ActivityEventSubscriber::class);
    }
}
