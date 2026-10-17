<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->unsignedInteger('lead_score')->default(0)->change();
            $table->timestamp('last_scored_at')->nullable();
        });

        Schema::table('funnel_events', function (Blueprint $table) {
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('scored_at')->nullable();
            $table->index(['contact_id', 'event_type', 'scored_at']);
        });

        Schema::create('lead_scoring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('event', 100);
            $table->string('field', 100);
            $table->string('value', 500)->nullable();
            $table->unsignedInteger('points');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'event', 'field', 'value'], 'lead_scoring_rules_match_unique');
            $table->index(['user_id', 'event', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_scoring_rules');

        Schema::table('funnel_events', function (Blueprint $table) {
            $table->dropIndex(['contact_id', 'event_type', 'scored_at']);
            $table->dropConstrainedForeignId('contact_id');
            $table->dropColumn('scored_at');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn('last_scored_at');
        });
    }
};
