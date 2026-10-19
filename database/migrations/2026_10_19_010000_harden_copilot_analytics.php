<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('funnel_events', function (Blueprint $table) {
            $table->uuid('client_event_id')->nullable();
            $table->foreignId('submission_id')->nullable()->constrained('contact_submissions')->nullOnDelete();
            $table->unique(['funnel_id', 'event_type', 'client_event_id'], 'funnel_event_idempotency_unique');
            $table->unique(['submission_id', 'event_type'], 'funnel_event_submission_unique');
        });

        Schema::table('copilot_recommendations', function (Blueprint $table) {
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->text('outcome')->nullable();
            $table->json('review_history')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('completed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('copilot_recommendations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_note', 'outcome', 'review_history', 'reviewed_at', 'applied_at', 'completed_at']);
        });

        Schema::table('funnel_events', function (Blueprint $table) {
            $table->dropUnique('funnel_event_submission_unique');
            $table->dropUnique('funnel_event_idempotency_unique');
            $table->dropConstrainedForeignId('submission_id');
            $table->dropColumn('client_event_id');
        });
    }
};
