<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_acquisition_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('services');
            $table->json('budgets');
            $table->json('timelines');
            $table->json('scoring_weights');
            $table->unsignedTinyInteger('qualified_score')->default(70);
            $table->unsignedSmallInteger('response_time_hours')->nullable();
            $table->string('response_email')->nullable();
            $table->string('whatsapp_url')->nullable();
            $table->string('meeting_url')->nullable();
            $table->foreignId('analytics_funnel_id')->nullable()->constrained('funnels')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->json('client_project')->nullable();
            $table->json('lead_score_reasons')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['client_project', 'lead_score_reasons']);
        });

        Schema::dropIfExists('client_acquisition_settings');
    }
};
