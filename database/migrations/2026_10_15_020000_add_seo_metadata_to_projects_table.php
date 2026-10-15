<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('seo_title_en')->nullable();
            $table->string('seo_title_am')->nullable();
            $table->string('seo_description_en', 300)->nullable();
            $table->string('seo_description_am', 300)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['seo_title_en', 'seo_title_am', 'seo_description_en', 'seo_description_am']);
        });
    }
};
