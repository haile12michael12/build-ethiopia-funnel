<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type')->index();
            $table->string('title_en');
            $table->string('title_am')->nullable();
            $table->string('slug')->unique();
            $table->text('summary_en')->nullable();
            $table->text('summary_am')->nullable();
            $table->longText('body_en')->nullable();
            $table->longText('body_am')->nullable();
            $table->string('image')->nullable();
            $table->string('category')->nullable();
            $table->json('highlights_en')->nullable();
            $table->json('highlights_am')->nullable();
            $table->string('person_name_en')->nullable();
            $table->string('person_name_am')->nullable();
            $table->string('person_role_en')->nullable();
            $table->string('person_role_am')->nullable();
            $table->string('company_en')->nullable();
            $table->string('company_am')->nullable();
            $table->string('status')->default('draft')->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('seo_title_en')->nullable();
            $table->string('seo_title_am')->nullable();
            $table->string('seo_description_en', 300)->nullable();
            $table->string('seo_description_am', 300)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_contents');
    }
};
