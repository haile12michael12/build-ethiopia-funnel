<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funnel_experiments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('funnel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('hypothesis');
            $table->string('target_step', 80)->nullable();
            $table->string('primary_metric', 40);
            $table->json('guardrail_metrics')->nullable();
            $table->json('allocations');
            $table->string('status', 20)->default('draft');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->json('activity_history')->nullable();
            $table->timestamps();
            $table->index(['funnel_id', 'status', 'starts_at', 'ends_at'], 'funnel_experiment_runtime_idx');
        });

        Schema::table('funnel_events', function (Blueprint $table) {
            $table->foreignId('experiment_id')->nullable()->constrained('funnel_experiments')->nullOnDelete();
            $table->index(['experiment_id', 'event_type', 'occurred_at'], 'funnel_event_experiment_metric_idx');
        });

        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->foreignId('experiment_id')->nullable()->constrained('funnel_experiments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('experiment_id');
        });
        Schema::table('funnel_events', function (Blueprint $table) {
            $table->dropIndex('funnel_event_experiment_metric_idx');
            $table->dropConstrainedForeignId('experiment_id');
        });
        Schema::dropIfExists('funnel_experiments');
    }
};
