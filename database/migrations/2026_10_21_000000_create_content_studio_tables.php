<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_studio_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('brand_name', 160)->nullable();
            $table->string('brand_voice', 500)->nullable();
            $table->text('brand_guidelines')->nullable();
            $table->timestamps();
        });

        Schema::create('content_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portfolio_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('content_type', 40);
            $table->string('platform', 30);
            $table->string('format', 40);
            $table->string('title');
            $table->longText('body')->nullable();
            $table->string('audience', 255);
            $table->string('market', 30);
            $table->string('service', 120);
            $table->string('objective', 40);
            $table->string('tone', 120);
            $table->string('language', 5);
            $table->string('call_to_action', 255)->nullable();
            $table->string('status', 20)->default('idea')->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->string('published_url', 2048)->nullable();
            $table->text('failure_details')->nullable();
            $table->boolean('is_generated')->default(false);
            $table->string('prompt_template_key', 80)->nullable();
            $table->string('provider', 80)->nullable();
            $table->string('provider_model', 120)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'scheduled_at']);
            $table->index(['user_id', 'platform', 'status']);
        });

        Schema::create('content_draft_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_draft_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->longText('body')->nullable();
            $table->string('reason', 40);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['content_draft_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_draft_versions');
        Schema::dropIfExists('content_drafts');
        Schema::dropIfExists('content_studio_settings');
    }
};
