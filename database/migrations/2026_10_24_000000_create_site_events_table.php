<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_events', function (Blueprint $table): void {
            $table->id();
            $table->string('event_type', 60)->index();
            $table->string('session_hash', 64)->nullable()->index();
            $table->string('path', 255)->nullable();
            $table->string('locale', 5)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_events');
    }
};
