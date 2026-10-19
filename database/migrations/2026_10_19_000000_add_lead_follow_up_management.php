<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->timestamp('last_contacted_at')->nullable()->after('last_submitted_at');
            $table->string('lost_reason', 50)->nullable()->after('status');
            $table->index(['user_id', 'last_contacted_at']);
        });

        Schema::table('client_acquisition_settings', function (Blueprint $table) {
            $table->json('follow_up_templates')->nullable();
        });

        Schema::create('contact_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 50);
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
        });

        Schema::create('follow_up_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->timestamp('due_at');
            $table->string('status', 20)->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'due_at']);
            $table->index(['contact_id', 'status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_up_tasks');
        Schema::dropIfExists('contact_activities');

        Schema::table('client_acquisition_settings', function (Blueprint $table) {
            $table->dropColumn('follow_up_templates');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'last_contacted_at']);
            $table->dropColumn(['last_contacted_at', 'lost_reason']);
        });
    }
};
