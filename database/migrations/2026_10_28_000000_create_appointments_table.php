<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->string('company_name');
            $table->string('contact_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('service_key', 40);
            $table->string('service_label');
            $table->string('meeting_type', 40)->default('demo');
            $table->timestamp('start_at')->index();
            $table->string('timezone', 64)->default('Africa/Addis_Ababa');
            $table->unsignedSmallInteger('duration_minutes')->default(30);
            $table->string('status', 20)->default('confirmed')->index();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('rescheduled_from_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status'], 'appointments_user_status_index');
            $table->index(['user_id', 'start_at'], 'appointments_user_start_index');
            $table->index(['contact_id'], 'appointments_contact_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
