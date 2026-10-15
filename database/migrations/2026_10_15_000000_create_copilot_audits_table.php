<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('copilot_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('funnel_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('pending'); // pending, running, completed, failed
            $table->unsignedInteger('funnel_revision')->nullable();
            $table->json('content_snapshot')->nullable();
            $table->string('date_from')->nullable();
            $table->string('date_to')->nullable();
            $table->json('metrics')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('ai_advice')->nullable();
            $table->string('ai_provider')->nullable();
            $table->string('ai_model')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'funnel_id', 'created_at']);
            $table->index(['funnel_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('copilot_audits');
    }
};

