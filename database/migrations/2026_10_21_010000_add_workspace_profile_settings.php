<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->string('type', 30)->default('agency');
            $table->string('country', 2)->nullable();
            $table->string('language', 5)->default('en');
            $table->string('timezone', 64)->default('UTC');
            $table->string('market', 20)->default('ethiopia');
            $table->string('currency', 3)->default('ETB');
        });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropColumn([
                'description',
                'type',
                'country',
                'language',
                'timezone',
                'market',
                'currency',
            ]);
        });
    }
};
