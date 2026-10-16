<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('copilot_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('funnel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('audit_id')->nullable()->constrained('copilot_audits')->nullOnDelete();
            $table->string('key');
            $table->string('title');
            $table->string('category', 60);
            $table->string('evidence_type', 40);
            $table->text('evidence');
            $table->text('explanation');
            $table->text('suggested_action');
            $table->text('expected_outcome')->nullable();
            $table->text('hypothesis')->nullable();
            $table->unsignedTinyInteger('priority');
            $table->unsignedTinyInteger('confidence_score');
            $table->string('confidence_explanation');
            $table->string('confidence', 20);
            $table->string('effort', 20);
            $table->json('supporting_metrics')->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('pending_fingerprint')->nullable()->unique();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'funnel_id', 'status', 'created_at']);
            $table->index(['audit_id', 'key']);
        });

        Schema::table('copilot_audits', function (Blueprint $table) {
            $table->text('ai_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('copilot_audits', function (Blueprint $table) {
            $table->dropColumn('ai_error');
        });

        Schema::dropIfExists('copilot_recommendations');
    }
};
