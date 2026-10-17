<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('funnel_events', function (Blueprint $table) {
            $table->dropForeign(['funnel_id']);
            $table->foreignId('funnel_id')->nullable()->change();
            $table->foreign('funnel_id')->references('id')->on('funnels')->nullOnDelete();
        });

        Schema::create('developer_audit_reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('token_hash', 64)->unique();
            $table->unsignedTinyInteger('score');
            $table->json('report');
            $table->timestamp('unlocked_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['contact_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developer_audit_reports');

        Schema::table('funnel_events', function (Blueprint $table) {
            $table->dropForeign(['funnel_id']);
            $table->foreign('funnel_id')->references('id')->on('funnels')->cascadeOnDelete();
        });
    }
};
