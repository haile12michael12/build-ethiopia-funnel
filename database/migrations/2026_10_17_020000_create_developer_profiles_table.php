<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('developer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('github_username', 39);
            $table->string('github_profile_url', 255);
            $table->timestamp('github_connected_at');
            $table->string('primary_language', 100)->nullable();
            $table->json('detected_stack')->nullable();
            $table->unsignedInteger('public_repo_count')->default(0);
            $table->boolean('has_saas_repo')->default(false);
            $table->string('preferred_stack', 100)->nullable();
            $table->string('experience_level', 50)->nullable();
            $table->timestamps();

            $table->index('github_username');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developer_profiles');
    }
};
