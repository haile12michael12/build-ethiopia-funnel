<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_acquisition_settings', function (Blueprint $table): void {
            $table->boolean('concierge_enabled')->default(true);
            $table->string('telegram_url')->nullable();
            $table->string('concierge_intro_en', 1000)->nullable();
            $table->string('concierge_intro_am', 1000)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('client_acquisition_settings', function (Blueprint $table): void {
            $table->dropColumn(['concierge_enabled', 'telegram_url', 'concierge_intro_en', 'concierge_intro_am']);
        });
    }
};
