<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('website_url');
            $table->string('status')->default('completed'); // needs_review, completed
            $table->boolean('has_website')->default(true);
            $table->unsignedTinyInteger('mobile_usability_score')->nullable(); // 0-100
            $table->unsignedTinyInteger('content_quality_score')->nullable(); // 0-100
            $table->json('technical_issues')->nullable();
            $table->json('suggested_improvements')->nullable();
            $table->string('evidence_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('assessed_at')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_assessments');
    }
};
